<template>
  <div v-if="activeBroadcast" class="broadcast-container">
    <div class="broadcast-content">
      <span class="broadcast-icon">📢 系統廣播：</span>
      <div class="broadcast-text">
        <span>{{ activeBroadcast.text }}</span>
      </div>
    </div>
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
let hideTimeout = null // 💡 用來控制畫面關閉的計時器
const lastTriggeredScheduleTime = ref('')
const myIp = ref('')

const fetchMyIp = async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    myIp.value = data.ip
  } catch (e) {}
}

// 💡 全面換成 100% 相容所有瀏覽器的 .mp3 格式 (開源 CDN)
const sounds = {
  bell_ring: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/bell_ring.mp3',
  door_bell: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/door_bell.mp3',
  button_tiny: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/button_tiny.mp3',
  computer_error: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/computer_error.mp3',
  water_droplet: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/water_droplet.mp3',
  glass: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/glass.mp3',
  tap: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/tap.mp3',
  branch_break: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/branch_break.mp3'
}

const playSoundSingle = (soundUrl) => {
  return new Promise((resolve) => {
    const audio = new Audio(soundUrl)
    let isResolved = false
    const finish = () => { if (!isResolved) { isResolved = true; resolve() } }
    
    audio.onended = finish
    audio.onerror = finish
    setTimeout(finish, 8000) 
    
    audio.play().catch((e) => {
      console.warn("⚠️ 瀏覽器阻擋自動播放", e)
      finish()
    }) 
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
  
  // 每次觸發新廣播時，清除舊的關閉計時器
  if (hideTimeout) clearTimeout(hideTimeout)
  
  // 1. 播放 .mp3 音效
  if (broadcastData.sound && broadcastData.sound !== 'none' && sounds[broadcastData.sound]) {
    const count = broadcastData.playCount || 1
    for (let i = 0; i < count; i++) {
      await playSoundSingle(sounds[broadcastData.sound])
      await new Promise(r => setTimeout(r, 500)) 
    }
  }

  // 2. 語音朗讀
  const ttsCount = broadcastData.textPlayCount || 1
  for (let i = 0; i < ttsCount; i++) {
    await speakText(broadcastData.text)
    if (i < ttsCount - 1) await new Promise(r => setTimeout(r, 800)) 
  }

  // 3. 💡 語音結束後，依照設定的時間保留在畫面上 (預設 120 秒 = 2 分鐘)
  const durationSec = broadcastData.displayDuration || 120 
  hideTimeout = setTimeout(() => { 
    activeBroadcast.value = null 
  }, durationSec * 1000)
}

const shouldProcessBroadcast = (targetIP) => {
  if (!props.isIpBrownlisted) return false; 
  if (targetIP && targetIP.trim() !== '') {
    return myIp.value === targetIP.trim();
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

  if (currentSec > 2 || lastTriggeredScheduleTime.value === currentHHMM) return

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
