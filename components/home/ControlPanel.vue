<template>
  <div class="control-card">
    
    <BroadcastWidget :isIpBrownlisted="isIpBrownlisted" />
    <MarqueeWidget :marqueeData="marqueeSettings" />

    <div class="top-status-bar">
      <!-- 💡 將日期與時鐘包裝成一個群組 -->
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

    <!-- 💡 狀態一：下課時，按鈕區縮小為左側懸浮按鈕 (位置偏下) -->
    <div v-if="isButtonsCollapsed" class="floating-btn-container btn-pos" @click="isButtonsCollapsed = false" title="展開功能選單">
      <div class="floating-btn">
        <span class="icon">⚙️</span>
        <span class="text">功<br>能<br>鍵</span>
      </div>
    </div>

    <!-- 💡 狀態二：展開時的完整按鈕區 -->
    <div v-show="!isButtonsCollapsed" class="action-buttons-wrapper">
      
      <!-- 💡 允許導師手動再把它收起來 -->
      <div class="header-action" v-if="!isClassTime">
        <button @click="isButtonsCollapsed = true" class="btn-collapse">
          ◀ 收起功能按鈕
        </button>
      </div>

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

  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
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
  isHistoryVisibleOnIndex: Boolean,
  
  // 💡 新增傳入上下課狀態
  isClassTime: { type: Boolean, default: false }
})

const emit = defineEmits(['enterExam', 'openLargeSchedule', 'openPwd', 'update:showSeatingChartLocal', 'update:showHygieneLocal'])

// === 💡 按鈕自動收合邏輯 ===
const isButtonsCollapsed = ref(false)

watch(() => props.isClassTime, (newIsClassTime) => {
  // 上課時展開 (false)，下課時收合 (true)
  isButtonsCollapsed.value = !newIsClassTime
}, { immediate: true })


// === 💡 日期字串邏輯 ===
const currentDateStr = ref('')
let dateTimer = null

const updateDate = () => {
  const d = new Date()
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentDateStr.value = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}`
}

onMounted(() => {
  updateDate()
  dateTimer = setInterval(updateDate, 60000) 
})

onUnmounted(() => {
  if (dateTimer) clearInterval(dateTimer)
})
</script>

<style scoped>
.control-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: center; }
.top-status-bar { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; margin-bottom: 25px; }

.clock-date-group { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.date-display { font-weight: 900; color: #475569; letter-spacing: 2px; }

/* 💡 按鈕外層容器增加動畫 */
.action-buttons-wrapper {
  transition: all 0.3s ease;
  width: 100%;
}

/* 💡 手動收起按鈕 (與點名板一致的樣式) */
.header-action {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}
.btn-collapse {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px dashed #cbd5e1;
  padding: 6px 15px;
  border-radius: 20px;
  font-size: 0.95rem;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}
.btn-collapse:hover {
  background-color: #e2e8f0;
  color: #1e293b;
  border-color: #94a3b8;
}

/* 💡 左側懸浮按鈕樣式 (使用橘黃色系區分) */
.floating-btn-container {
  position: fixed;
  left: 0;
  z-index: 100;
  cursor: pointer;
}

/* 將按鈕位置固定在畫面的垂直 65% 處，避免跟點名板的 50% 撞在一起 */
.btn-pos {
  top: 65%;
  transform: translateY(-50%);
}

.floating-btn {
  background-color: #f59e0b; 
  color: white;
  padding: 15px 8px 15px 12px;
  border-radius: 0 12px 12px 0;
  box-shadow: 2px 4px 10px rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 1.1rem;
  line-height: 1.2;
  transition: background-color 0.2s, padding-left 0.2s, transform 0.2s;
  border: 1px solid #d97706;
  border-left: none;
}

.floating-btn:hover {
  background-color: #d97706;
  padding-left: 18px;
}

@media (min-width: 768px) { .top-status-bar { flex-direction: row; flex-wrap: wrap; } }
</style>
