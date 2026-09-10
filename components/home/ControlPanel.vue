<template>
  <div class="control-card">
    
    <BroadcastWidget :isIpBrownlisted="isIpBrownlisted" />
    <MarqueeWidget :marqueeData="marqueeSettings" />

    <div class="top-status-bar">
      <!-- 💡 修正：將日期與時鐘包裝成一個群組，日期在上方，完全不破壞 ClockWidget -->
      <div class="clock-date-group">
        <div class="date-display" :style="{ fontSize: (clockConfig?.dateSize || 18) + 'px' }">
          {{ currentDateStr }}
        </div>
        <ClockWidget 
          :clockConfig="clockConfig"
          :clockFontSize="clockFontSize"
          :currentTime="currentTime"
          :unreadMsgCount="unreadMsgCount"
        />
      </div>
      <WeatherWidget />
    </div>

    <!-- 🎯 動作按鈕群 (完整保留您的元件寫法) -->
    <HomeActionButtons 
      :scheduleDisplay="scheduleDisplay"
      :scheduleButtonConfig="scheduleButtonConfig"
      :isIpBrownlisted="isIpBrownlisted"
      :examData="examData"
      :indexButtonSettings="indexButtonSettings"
      :isScheduleButtonVisible="isScheduleButtonVisible"
      :seatingChart="seatingChart"
      :showSeatingChartLocal="showSeatingChartLocal"
      :hygieneData="hygieneData"
      :showHygieneLocal="showHygieneLocal"
      :isHistoryVisibleOnIndex="isHistoryVisibleOnIndex"
      @enterExam="$emit('enterExam')"
      @openLargeSchedule="$emit('openLargeSchedule')"
      @openPwd="(val) => $emit('openPwd', val)"
      @update:showSeatingChartLocal="(val) => $emit('update:showSeatingChartLocal', val)"
      @update:showHygieneLocal="(val) => $emit('update:showHygieneLocal', val)"
    />

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import BroadcastWidget from './BroadcastWidget.vue'
import MarqueeWidget from './MarqueeWidget.vue'
import ClockWidget from './ClockWidget.vue'
import HomeActionButtons from './HomeActionButtons.vue'
import WeatherWidget from './WeatherWidget.vue'

const props = defineProps({
  marqueeSettings: { type: Object, default: () => ({}) },
  clockConfig: { type: Object, default: () => ({}) },
  clockFontSize: Number,
  currentTime: String,
  unreadMsgCount: Number,
  scheduleDisplay: Object,
  scheduleButtonConfig: Object,
  isIpBrownlisted: Boolean,
  examData: Object,
  indexButtonSettings: { type: Object, default: () => ({}) },
  isScheduleButtonVisible: Boolean,
  seatingChart: Object,
  showSeatingChartLocal: Boolean,
  hygieneData: Object,
  showHygieneLocal: Boolean,
  isHistoryVisibleOnIndex: Boolean
})

const emit = defineEmits(['enterExam', 'openLargeSchedule', 'openPwd', 'update:showSeatingChartLocal', 'update:showHygieneLocal'])

// === 💡 新增：單純提供日期字串的邏輯 ===
const currentDateStr = ref('')
let dateTimer = null

const updateDate = () => {
  const d = new Date()
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentDateStr.value = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}`
}

onMounted(() => {
  updateDate()
  dateTimer = setInterval(updateDate, 60000) // 每 60 秒檢查一次，確保午夜會自動換日
})

onUnmounted(() => {
  if (dateTimer) clearInterval(dateTimer)
})
</script>

<style scoped>
.control-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: center; }
.top-status-bar { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; margin-bottom: 25px; }

/* 💡 新增的群組排版：讓日期跟時鐘對齊 */
.clock-date-group { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.date-display { font-weight: 900; color: #475569; letter-spacing: 2px; }

@media (min-width: 768px) { .top-status-bar { flex-direction: row; flex-wrap: wrap; } }
</style>
