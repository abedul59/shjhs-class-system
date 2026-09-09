<template>
  <div class="control-card">
    
    <!-- 🔊 廣播接收器 (加入 IP 限制防護) -->
    <BroadcastWidget :isIpBrownlisted="isIpBrownlisted" />

    <!-- 📢 跑馬燈區塊 -->
    <MarqueeWidget :marqueeData="marqueeSettings" />

    <!-- 🕒 時鐘與天氣 -->
    <div class="top-status-bar">
      <ClockWidget 
        :clockConfig="clockConfig"
        :clockFontSize="clockFontSize"
        :currentTime="currentTime"
        :unreadMsgCount="unreadMsgCount"
      />
      <WeatherWidget />
    </div>

    <!-- 🎯 動作按鈕群 (接收 openBroadcast 事件) -->
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
      @openBroadcast="showTeacherBroadcastModal = true"
    />

    <!-- 💡 獨立的教師廣播站面板彈窗 -->
    <TeacherBroadcastModal :show="showTeacherBroadcastModal" @close="showTeacherBroadcastModal = false" />

  </div>
</template>

<script setup>
import { ref } from 'vue'
import BroadcastWidget from './BroadcastWidget.vue'
import MarqueeWidget from './MarqueeWidget.vue'
import ClockWidget from './ClockWidget.vue'
import HomeActionButtons from './HomeActionButtons.vue'
import WeatherWidget from './WeatherWidget.vue'
import TeacherBroadcastModal from './TeacherBroadcastModal.vue'

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

// 控制廣播面板的顯示狀態
const showTeacherBroadcastModal = ref(false)
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
