<template>
  <div class="control-card">
    
    <BroadcastWidget :isIpBrownlisted="isIpBrownlisted" />
    <MarqueeWidget :marqueeData="marqueeSettings" />

    <div class="top-status-bar">
      <!-- 💡 新增：科任老師廣播入口按鈕 (使用 NuxtLink 直接跳轉) -->
      <NuxtLink to="/teacher-broadcast" class="teacher-broadcast-btn">
        👨‍🏫 教師廣播站
      </NuxtLink>

      <ClockWidget :clockConfig="clockConfig" :clockFontSize="clockFontSize" :currentTime="currentTime" :unreadMsgCount="unreadMsgCount" />
      <WeatherWidget />
    </div>

    <!-- ...其餘下方按鈕與課表保持原樣... -->
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
</script>

<style scoped>
.control-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: center; }
.top-status-bar { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; margin-bottom: 25px; }
@media (min-width: 768px) { .top-status-bar { flex-direction: row; flex-wrap: wrap; } }

/* 💡 科任按鈕專屬樣式 */
.teacher-broadcast-btn {
  background: #8b5cf6; color: white; text-decoration: none; padding: 10px 20px;
  border-radius: 50px; font-weight: bold; font-size: 1.1rem;
  box-shadow: 0 4px 6px rgba(139,92,246,0.3); transition: 0.2s;
  display: inline-flex; align-items: center;
}
.teacher-broadcast-btn:hover { background: #7c3aed; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(139,92,246,0.4); }
</style>
