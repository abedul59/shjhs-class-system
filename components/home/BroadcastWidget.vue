<template>
  <div class="broadcast-wrapper">
    <!-- 設備名稱設定鈕 (僅在教室網路下顯示) -->
    <div v-if="isIpBrownlisted && !activeBroadcast" class="device-badge" @click="setDeviceName" title="點擊設定此台電腦的廣播專屬名稱">
      <span v-if="!deviceName" class="pulse-dot"></span>
      💻 廣播接收名稱：<span class="d-name">{{ deviceName || '尚未設定 (點擊綁定)' }}</span>
    </div>

    <!-- 廣播橫幅本體 -->
    <div v-if="activeBroadcast" class="broadcast-container">
      <div class="broadcast-content">
        <span class="broadcast-icon">📢 系統廣播：</span>
        <div class="broadcast-text">
          <span>{{ activeBroadcast.text }}</span>
        </div>
      </div>
    </div>

    <!-- 💡 核心修正：隱藏的實體音效播放器，大幅提高背景分頁的播放成功率 -->
    <audio ref="audioPlayerRef" style="display: none;" preload="auto"></audio>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
const supabase = useSupabaseClient()

const props = defineProps({
  isIpBrownlisted: { type: Boolean, default: false }
})

const activeBroadcast = ref(null) 
let pollingInterval = null
let scheduleInterval = null
let hideTimeout = null 
const lastTriggeredScheduleTime = ref('')
const myIp = ref('')
const deviceName = ref('')

// 綁定實體播放器
const audioPlayerRef = ref(null)

const fetchMyIp = async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    myIp.value = data.ip
  } catch (e) {}
}

const sounds = {
  bell_ring: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/bell_ring.mp3',
  door_bell: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/door_bell.mp3',
  computer_error: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/computer_error.mp3',
  water_droplet: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/water_droplet.mp3',
  glass: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/glass.mp3',
  tap: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/tap.mp3',
  branch_break: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/branch_break.mp3',
  button_tiny: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/button_tiny.mp3',
  button_click: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/button_click.mp3',
  button_push: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/button_push.mp3',
  camera_flashing: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/camera_flashing.mp3',
  cd_tray: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/cd_tray.mp3',
  door_bump: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/door_bump.mp3',
  keyboard_desk: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/keyboard_desk.mp3',
  metal_plate: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/metal_plate.mp3',
  pop_cork: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/pop_cork.mp3',
  snap: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/snap.mp3',
  staple_gun: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/staple_gun.mp3',
  chord_1: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_1.mp3',
  chord_2: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_2.mp3',
  chord_3: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_3.mp3',
  heater_1: 'https://s3.amazonaws.com/freecodecamp/drums/Heater-1.mp3',
  heater_2: 'https://s3.amazonaws.com/freecodecamp/drums/Heater-2.mp3',
  heater_3: 'https://s3.amazonaws.com/freecodecamp/drums/Heater-3.mp3',
  kick_n_hat: 'https://s3.amazonaws.com/freecodecamp/drums/Kick_n_Hat.mp3',
  punchy_kick: 'https://s3.amazonaws.com/freecodecamp/drums/punchy_kick_1.mp3',
  side_stick: 'https://s3.amazonaws.com/freecodecamp/drums/side_stick_1.mp3',
  brk_snr: 'https://s3.amazonaws.com/freecodecamp/drums/Brk_Snr.mp3',
  dry_ohh: 'https://s3.amazonaws.com/freecodecamp/drums/Dry_Ohh.mp3',
  dsc_oh: 'https://s3.amazonaws.com/freecodecamp/drums/Dsc_Oh.mp3'
}

const setDeviceName = () => {
  const input = prompt('請為這台電腦設定專屬名稱（例如：701教室），以便後台進行單獨廣播：', deviceName.value)
  if (input !== null) {
    deviceName.value = input.trim()
    localStorage.setItem('broadcast_device_name', deviceName.value)
    alert(`✅ 已成功將此電腦綁定為「${deviceName.value}」！\n後台指定發送給這個名稱時，就只有這台電腦會響起。`)
  }
}

// 💡 核心修正：透過實體的 <audio> 標籤播放，抵抗背景分頁阻擋
const playSoundSingle = (soundUrl) => {
  return new Promise((resolve) => {
    if (!audioPlayerRef.value) return resolve() // 防呆

    let isResolved = false
    const finish = () => { 
      if (!isResolved) { 
        isResolved = true
        audioPlayerRef.value.onended = null
        audioPlayerRef.value.onerror = null
        resolve() 
      } 
    }
    
    audioPlayerRef.value.src = soundUrl
    audioPlayerRef.value.load()
    audioPlayerRef.value.onended = finish
    audioPlayerRef.value.onerror = finish
    
    // 強制 8 秒後必定往下走，避免任何卡死
    setTimeout(finish, 8000) 
    
    const playPromise = audioPlayerRef.value.play()
    if (playPromise !== undefined) {
      playPromise.catch((e) => {
        console.warn("⚠️ 背景分頁自動播放可能被阻擋", e)
        finish()
      })
    } else {
      finish()
    }
  })
}

const speakText = (text) => {
  return new Promise((resolve) => {
    if (!text || !window.speechSynthesis) return resolve()
    
    let isResolved = false
    const finish = () => { if (!isResolved) { isResolved = true; resolve() } }

    window.speechSynthesis.cancel() 
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-TW'
    utterance.rate = 1.0 
    utterance.onend = finish
    utterance.onerror = finish
    
    setTimeout(finish, 15000) 
    window.speechSynthesis.speak(utterance)
  })
}

const triggerBroadcast = async (broadcastData) => {
  activeBroadcast.value = { text: broadcastData.text }
  
  if (hideTimeout) clearTimeout(hideTimeout)
  
  // 1. 播放音效 (加入防錯保護)
  const soundKey = broadcastData.sound || 'bell_ring'
  if (soundKey !== 'none' && sounds[soundKey]) {
    const count = broadcastData.playCount || 1
    for (let i = 0; i < count; i++) {
      await playSoundSingle(sounds[soundKey])
      await new Promise(r => setTimeout(r, 500)) 
    }
  }

  // 2. 語音朗讀
  const ttsCount = broadcastData.textPlayCount || 1
  for (let i = 0; i < ttsCount; i++) {
    await speakText(broadcastData.text)
    if (i < ttsCount - 1) await new Promise(r => setTimeout(r, 800)) 
  }

  // 3. 畫面保留時間
  const durationSec = broadcastData.displayDuration || 120 
  hideTimeout = setTimeout(() => { 
    activeBroadcast.value = null 
  }, durationSec * 1000)
}

const shouldProcessBroadcast = (targetNameOrIP) => {
  if (!props.isIpBrownlisted) return false; 
  if (targetNameOrIP && targetNameOrIP.trim() !== '') {
    const target = targetNameOrIP.trim()
    return myIp.value === target || deviceName.value === target;
  }
  return true; 
}

const pollManualBroadcast = async () => {
  if (!props.isIpBrownlisted) return; 
  
  try {
    const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'broadcast_settings').maybeSingle()
    if (data && data.setting_value && data.setting_value.manual) {
      const config = data.setting_value.manual
      const lastPlayedStamp = Number(localStorage.getItem('last_played_broadcast')) || 0
      
      if (config.triggerTimestamp > lastPlayedStamp) {
        if (shouldProcessBroadcast(config.targetIP)) { 
          triggerBroadcast(config) 
        }
        localStorage.setItem('last_played_broadcast', config.triggerTimestamp)
      }
    }
  } catch (e) {}
}

const checkSchedules = async () => {
  if (!props.isIpBrownlisted) return; 

  const now = new Date()
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const currentSec = now.getSeconds()

  // 💡 核心修正：將觸發寬容度拉長到 15 秒，避免背景分頁被瀏覽器降速而錯過廣播
  if (currentSec > 15 || lastTriggeredScheduleTime.value === currentHHMM) return

  try {
    const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'broadcast_settings').maybeSingle()
    if (data && data.setting_value && data.setting_value.schedules) {
      const activeSchedules = data.setting_value.schedules.filter(s => s.isActive)
      for (const schedule of activeSchedules) {
        if (schedule.time === currentHHMM && shouldProcessBroadcast(schedule.targetIP)) {
          lastTriggeredScheduleTime.value = currentHHMM
          triggerBroadcast(schedule)
          break
        }
      }
    }
  } catch (e) {}
}

onMounted(() => {
  deviceName.value = localStorage.getItem('broadcast_device_name') || ''
  
  fetchMyIp().then(() => {
    pollManualBroadcast()
    pollingInterval = setInterval(pollManualBroadcast, 5000) 
    scheduleInterval = setInterval(checkSchedules, 1000)     
  })
})

onUnmounted(() => {
  if (pollingInterval) clearInterval(pollingInterval)
  if (scheduleInterval) clearInterval(scheduleInterval)
  if (hideTimeout) clearTimeout(hideTimeout)
})
</script>

<style scoped>
.broadcast-wrapper { width: 100%; }

.device-badge {
  text-align: right; font-size: 0.85rem; color: #94a3b8; cursor: pointer;
  margin-bottom: 8px; padding-right: 5px; transition: 0.2s;
  display: flex; align-items: center; justify-content: flex-end; gap: 5px;
}
.device-badge:hover { color: #3b82f6; }
.d-name { font-weight: bold; color: #64748b; }
.device-badge:hover .d-name { color: #2563eb; text-decoration: underline; }

.pulse-dot {
  width: 8px; height: 8px; background-color: #ef4444; border-radius: 50%;
  animation: pulse-dot-anim 1s infinite alternate;
}
@keyframes pulse-dot-anim { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0.4; transform: scale(1.2); } }

.broadcast-container {
  width: 100%; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f;
  padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
  border: 2px solid #b45309; position: relative; overflow: hidden;
  animation: slide-down 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-sizing: border-box; z-index: 50;
}
.broadcast-container::after { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent); animation: shine 3s infinite; }
.broadcast-content { display: flex; align-items: center; font-size: 1.3rem; font-weight: 900; }
.broadcast-icon { margin-right: 15px; animation: pulse-icon 1s infinite alternate; white-space: nowrap; }
.broadcast-text { width: 100%; animation: scroll-text 10s linear infinite alternate; }

@keyframes slide-down { 0% { opacity: 0; transform: translateY(-20px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes shine { 0% { left: -100%; } 20% { left: 200%; } 100% { left: 200%; } }
@keyframes pulse-icon { 0% { transform: scale(1); color: #78350f; } 100% { transform: scale(1.2); color: #dc2626; text-shadow: 0 0 5px #fca5a5; } }
@keyframes scroll-text { 0% { transform: translateX(0); } 100% { transform: translateX(20px); } }
</style>
