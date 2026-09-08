<template>
  <div class="control-card">
    
    <!-- 🔊 新增：獨立運作的廣播接收器 (放在最頂層) -->
    <BroadcastWidget />

    <!-- 📢 獨立跑馬燈區塊 -->
    <MarqueeWidget :marqueeData="marqueeSettings" />

    <!-- 🕒 時鐘與 ⛅ 天氣區塊 -->
    <div class="top-status-bar">
      <ClockWidget 
        :clockConfig="clockConfig"
        :clockFontSize="clockFontSize"
        :currentTime="currentTime"
        :unreadMsgCount="unreadMsgCount"
      />
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
import BroadcastWidget from './BroadcastWidget.vue' // 💡 引入廣播元件
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
.top-status-bar { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; margin-bottom: 25px; }
@media (min-width: 768px) { .top-status-bar { flex-direction: row; flex-wrap: wrap; } }
</style>
