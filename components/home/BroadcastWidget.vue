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
const lastTriggeredScheduleTime = ref('')
const myIp = ref('') // 存放本機 IP

// 抓取本機 IP
const fetchMyIp = async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    myIp.value = data.ip
  } catch (e) {}
}

const sounds = {
  bell: 'https://actions.google.com/sounds/v1/alarms/school_bell.ogg',
  alert: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  digital_alarm: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
  bugle: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg',
  clock_ring: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg',
  boing: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg',
  pop: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
  slide_whistle: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle_up.ogg',
  text_msg: 'https://actions.google.com/sounds/v1/communication/getting_a_text.ogg',
  cash_register: 'https://actions.google.com/sounds/v1/foley/cash_register.ogg',
  clock_tick: 'https://actions.google.com/sounds/v1/household/clock_ticking.ogg',
  clear_throat: 'https://actions.google.com/sounds/v1/human_voices/human_clearing_throat.ogg',
  guitar: 'https://actions.google.com/sounds/v1/instruments/acoustic_guitar_strum.ogg',
  harp: 'https://actions.google.com/sounds/v1/instruments/orchestral_harp_glissando_up.ogg',
  xylophone: 'https://actions.google.com/sounds/v1/instruments/xylophone_up.ogg',
  sci_fi_beep: 'https://actions.google.com/sounds/v1/science_fiction/sci_fi_beep.ogg',
  robot: 'https://actions.google.com/sounds/v1/science_fiction/robot_code.ogg',
  hammer: 'https://actions.google.com/sounds/v1/tools/hammer_hitting_wood.ogg',
  bike_bell: 'https://actions.google.com/sounds/v1/transportation/bicycle_bell.ogg',
  car_horn: 'https://actions.google.com/sounds/v1/transportation/car_horn.ogg',
  train: 'https://actions.google.com/sounds/v1/transportation/train_whistle.ogg',
  thunder: 'https://actions.google.com/sounds/v1/weather/thunder_crack.ogg',
  rooster: 'https://actions.google.com/sounds/v1/animals/rooster_crowing.ogg',
  dog: 'https://actions.google.com/sounds/v1/animals/dog_barking.ogg',
  cat: 'https://actions.google.com/sounds/v1/animals/cat_meow.ogg'
}

// 播放音效 (防卡死機制)
const playSoundSingle = (soundUrl) => {
  return new Promise((resolve) => {
    const audio = new Audio(soundUrl)
    let isResolved = false
    const finish = () => { if (!isResolved) { isResolved = true; resolve() } }
    
    audio.onended = finish
    audio.onerror = finish
    setTimeout(finish, 8000) // 強制 8 秒後無論如何往下走
    
    audio.play().catch((e) => {
      console.warn("⚠️ 瀏覽器阻擋自動播放，請確認已點擊過網頁！", e)
      finish()
    }) 
  })
}

// 語音朗讀 (防卡死機制)
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
    
    setTimeout(finish, 15000) // 強制 15 秒後往下走
    window.speechSynthesis.speak(utterance)
  })
}

const triggerBroadcast = async (broadcastData) => {
  activeBroadcast.value = { text: broadcastData.text }
  
  // 1. 播放音效
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

  // 3. 關閉畫面
  setTimeout(() => { activeBroadcast.value = null }, 5000)
}

// 驗證 IP
const shouldProcessBroadcast = (targetIP) => {
  if (!props.isIpBrownlisted) return false; 
  if (targetIP && targetIP.trim() !== '') {
    return myIp.value === targetIP.trim();
  }
  return true; 
}

// 💡 監聽手動廣播 (改用 localStorage 紀錄，絕不漏接！)
const pollManualBroadcast = async () => {
  if (!props.isIpBrownlisted) return; 
  
  try {
    const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'broadcast_settings').maybeSingle()
    if (data && data.setting_value && data.setting_value.manual) {
      const config = data.setting_value.manual
      const lastPlayedStamp = Number(localStorage.getItem('last_played_broadcast')) || 0
      
      // 如果資料庫的發送時間戳記 > 本機播過的時間戳記 = 有新廣播！
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
