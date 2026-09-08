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

// 💡 接收來自外層的 IP 判定結果
const props = defineProps({
  isIpBrownlisted: {
    type: Boolean,
    default: false
  }
})

// === 廣播狀態 ===
const activeBroadcast = ref(null) 
let pollingInterval = null
let scheduleInterval = null

// 避免重複觸發的紀錄
const lastManualTrigger = ref(0)
const lastTriggeredScheduleTime = ref('')

// === 音效庫 ===
const sounds = {
  chime: 'https://actions.google.com/sounds/v1/alarms/dosimeter_alarm.ogg', 
  bell: 'https://actions.google.com/sounds/v1/alarms/school_bell.ogg',     
  alert: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg'      
}

// === 播放聲音邏輯 ===
const playSound = async (soundKey, count = 1) => {
  const audioUrl = sounds[soundKey] || sounds.chime
  for (let i = 0; i < count; i++) {
    try {
      const audio = new Audio(audioUrl)
      await audio.play()
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (err) {
      console.warn("⚠️ 瀏覽器阻擋了自動播放音效")
      break
    }
  }
}

// === 觸發廣播畫面與音效 ===
const triggerBroadcast = (broadcastData) => {
  activeBroadcast.value = { text: broadcastData.text }
  if (broadcastData.sound && broadcastData.sound !== 'none') {
    playSound(broadcastData.sound, broadcastData.playCount || 1)
  }
  setTimeout(() => { activeBroadcast.value = null }, 15000)
}

// === 1. 每 5 秒檢查手動廣播 ===
const pollManualBroadcast = async () => {
  // 🛡️ 核心防護：如果不是教室指定的 IP，直接中止執行，不浪費效能也不會發出聲音！
  if (!props.isIpBrownlisted) return;

  try {
    const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'broadcast_settings').maybeSingle()
    if (data && data.setting_value) {
      const config = data.setting_value
      if (config.manual && config.manual.triggerTimestamp > lastManualTrigger.value) {
        if (lastManualTrigger.value !== 0) { triggerBroadcast(config.manual) }
        lastManualTrigger.value = config.manual.triggerTimestamp
      }
    }
  } catch (e) {}
}

// === 2. 每 1 秒檢查定時排程 ===
const checkSchedules = async () => {
  // 🛡️ 核心防護：如果不是教室指定的 IP，直接中止執行！
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
        if (schedule.time === currentHHMM) {
          lastTriggeredScheduleTime.value = currentHHMM
          triggerBroadcast(schedule)
          break
        }
      }
    }
  } catch (e) {}
}

// === 生命週期管理 ===
onMounted(() => {
  pollManualBroadcast()
  pollingInterval = setInterval(pollManualBroadcast, 5000) 
  scheduleInterval = setInterval(checkSchedules, 1000)     
})

onUnmounted(() => {
  if (pollingInterval) clearInterval(pollingInterval)
  if (scheduleInterval) clearInterval(scheduleInterval)
})
</script>


<style scoped>
.broadcast-container {
  width: 100%;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #78350f;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 20px; /* 與下方的跑馬燈保持距離 */
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
  border: 2px solid #b45309;
  position: relative;
  overflow: hidden;
  animation: slide-down 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-sizing: border-box;
}

/* 讓廣播橫幅有閃爍的光澤特效 */
.broadcast-container::after {
  content: '';
  position: absolute;
  top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent);
  animation: shine 3s infinite;
}

.broadcast-content {
  display: flex;
  align-items: center;
  font-size: 1.3rem;
  font-weight: 900;
}

.broadcast-icon {
  margin-right: 15px;
  animation: pulse-icon 1s infinite alternate;
  white-space: nowrap;
}

.broadcast-text {
  width: 100%;
  /* 類似跑馬燈的來回滾動效果 */
  animation: scroll-text 10s linear infinite alternate;
}

@keyframes slide-down {
  0% { opacity: 0; transform: translateY(-20px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes shine {
  0% { left: -100%; }
  20% { left: 200%; }
  100% { left: 200%; }
}

@keyframes pulse-icon {
  0% { transform: scale(1); color: #78350f; }
  100% { transform: scale(1.2); color: #dc2626; text-shadow: 0 0 5px #fca5a5; }
}

@keyframes scroll-text {
  0% { transform: translateX(0); }
  100% { transform: translateX(20px); }
}
</style>
