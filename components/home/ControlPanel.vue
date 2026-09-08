<template>
  <div class="control-card">
    
    <!-- 🕒 時鐘與 ⛅ 天氣區塊 -->
    <div class="top-status-bar">
      <ClockWidget 
        :clockConfig="clockConfig"
        :clockFontSize="clockFontSize"
        :currentTime="currentTime"
        :unreadMsgCount="unreadMsgCount"
      />

      <!-- 💡 新增的獨立天氣元件 -->
      <WeatherWidget />
    </div>

    <!-- 🎯 以下為動作按鈕與課表元件 -->
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
import ClockWidget from './ClockWidget.vue'
import HomeActionButtons from './HomeActionButtons.vue'
import WeatherWidget from './WeatherWidget.vue' // 引入天氣元件

const props = defineProps({
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
</script>

<style scoped>
.control-card { 
  background: white; 
  border-radius: 8px; 
  padding: 20px; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.05); 
  border: 1px solid #e2e8f0; 
  text-align: center; 
}

/* 將時鐘與天氣水平並排，手機版自動換行 */
.top-status-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 25px;
}

@media (min-width: 768px) {
  .top-status-bar {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
