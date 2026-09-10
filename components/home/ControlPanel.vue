<template>
  <div class="control-panel-wrapper">
    
    <!-- ==================== 跑馬燈區塊 ==================== -->
    <div v-if="marqueeSettings?.isVisible !== false" class="marquee-container" :style="marqueeStyle">
      <marquee scrollamount="5">{{ marqueeSettings?.text || '上課專心！下課安心！團隊合作最省力，尊重他人最有利。' }}</marquee>
    </div>

    <!-- ==================== 中間：日期時鐘與天氣區塊 ==================== -->
    <div class="middle-dashboard">
      
      <!-- 💡 獨立的日期與時鐘群組 -->
      <div class="datetime-container">
        
        <!-- 獨立的日期顯示，自動吃後台傳來的 dateSize (若無則預設 1.15rem) -->
        <div class="date-display" :style="{ fontSize: clockConfig?.dateSize ? clockConfig.dateSize + 'px' : '1.15rem' }">
          {{ currentDateStr }}
        </div>

        <!-- 原本單純的時鐘區塊 (不受日期影響，可自由切換樣式) -->
        <div class="clock-widget-container" :style="clockStyle">
          <span v-if="clockConfig?.showIcon" class="clock-icon">🕒</span> 
          <span class="time-text">{{ currentTime }}</span>
        </div>
        
      </div>

      <!-- 天氣小工具 -->
      <div class="weather-widget">
        <div class="weather-location">📍 新化區</div>
        <div class="weather-info">
          今日 ⛅ 22° ~ 31° <span class="divider">|</span> 明日 ☁️ 24° ~ 31°
        </div>
      </div>
      
    </div>

    <!-- ==================== 課表顯示區塊 ==================== -->
    <div class="schedule-display-bar" v-if="scheduleDisplay && isIpBrownlisted">
      <div class="current-class">
        <span class="status-dot"></span> 
        {{ scheduleDisplay.current.label }}：
        <strong class="subject">{{ scheduleDisplay.current.subject }}</strong>
        <span class="teacher" v-if="scheduleDisplay.current.teacher">({{ scheduleDisplay.current.teacher }})</span>
      </div>
      <div class="next-class" v-if="scheduleDisplay.next">
        <span class="divider">|</span> 下節課：{{ scheduleDisplay.next.subject }}
      </div>
    </div>

    <!-- ==================== 下方操作按鈕網格 ==================== -->
    <div class="action-buttons-grid">
      <button v-if="indexButtonSettings?.parentBind !== false" class="btn btn-bind" @click="$emit('openPwd', 'bind')">
        👨‍👩‍👧 綁定
      </button>
      
      <button v-if="indexButtonSettings?.parentMsg !== false" class="btn btn-parent-msg" @click="$emit('openPwd', 'parentMsg')">
        💬 家長私訊 <span v-if="unreadMsgCount > 0" class="badge">{{ unreadMsgCount }}</span>
      </button>
      
      <button v-if="indexButtonSettings?.studentMsg !== false" class="btn btn-student-msg" @click="$emit('openPwd', 'studentMsg')">
        💬 學生私訊
      </button>
      
      <button v-if="indexButtonSettings?.parentLeave !== false" class="btn btn-leave" @click="$emit('openPwd', 'leave')">
        📝 家長代學生請假
      </button>

      <button v-if="indexButtonSettings?.assignments !== false" class="btn btn-hw" @click="$emit('openPwd', 'hw')">
        📚 作業管理
      </button>
      
      <button v-if="indexButtonSettings?.discipline !== false" class="btn btn-discipline" @click="$emit('openPwd', 'discipline')">
        ⚖️ 秩序管理
      </button>
      
      <button v-if="indexButtonSettings?.hygiene !== false" class="btn btn-hygiene" @click="$emit('update:showHygieneLocal', !showHygieneLocal)">
        🧹 衛生管理
      </button>
      
      <button v-if="indexButtonSettings?.seats !== false" class="btn btn-seat" @click="$emit('update:showSeatingChartLocal', !showSeatingChartLocal)">
        🪑 座位管理
      </button>

      <button v-if="indexButtonSettings?.schedule !== false && isScheduleButtonVisible" class="btn btn-schedule" @click="$emit('openLargeSchedule')">
        📅 課表管理
      </button>
      
      <button v-if="indexButtonSettings?.admin !== false" class="btn btn-admin" @click="$emit('openPwd', 'admin')">
        ⚙️ 後台
      </button>
      
      <button v-if="isHistoryVisibleOnIndex" class="btn btn-history" @click="$emit('openPwd', 'history')">
        📅 查詢近期聯絡簿
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  marqueeSettings: { type: Object, default: () => ({}) },
  clockConfig: { type: Object, default: () => ({}) },
  currentTime: { type: String, default: '' },
  unreadMsgCount: { type: Number, default: 0 },
  scheduleDisplay: { type: Object, default: null },
  scheduleButtonConfig: { type: Object, default: () => ({}) },
  isIpBrownlisted: { type: Boolean, default: false },
  examData: { type: Object, default: () => ({}) },
  indexButtonSettings: { type: Object, default: () => ({}) },
  isScheduleButtonVisible: { type: Boolean, default: true },
  seatingChart: { type: Object, default: () => ({}) },
  showSeatingChartLocal: { type: Boolean, default: false },
  hygieneData: { type: Object, default: () => ({}) },
  showHygieneLocal: { type: Boolean, default: false },
  isHistoryVisibleOnIndex: { type: Boolean, default: false }
})

const emit = defineEmits([
  'enterExam', 
  'openLargeSchedule', 
  'openPwd', 
  'update:showSeatingChartLocal', 
  'update:showHygieneLocal'
])

// === 💡 獨立的日期自動更新邏輯 ===
const currentDateStr = ref('')
let dateTimer = null

const updateDate = () => {
  const d = new Date()
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentDateStr.value = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}`
}

onMounted(() => {
  updateDate()
  dateTimer = setInterval(updateDate, 60000) // 每分鐘檢查一次跨夜換日
})

onUnmounted(() => {
  if (dateTimer) clearInterval(dateTimer)
})

// === 樣式計算 ===
const marqueeStyle = computed(() => {
  return {
    backgroundColor: props.marqueeSettings?.bgColor || '#fce7f3',
    color: props.marqueeSettings?.textColor || '#db2777',
    fontSize: (props.marqueeSettings?.fontSize || 18) + 'px',
    fontWeight: 'bold',
    padding: '10px 15px',
    borderRadius: '8px',
    marginBottom: '15px'
  }
})

const clockStyle = computed(() => {
  const size = props.clockConfig?.size || 45
  return {
    backgroundColor: props.clockConfig?.bgColor || '#111111',
    color: props.clockConfig?.textColor || '#d4af37',
    border: `2px solid ${props.clockConfig?.textColor || '#d4af37'}`,
    boxShadow: `0 0 15px ${props.clockConfig?.textColor || '#d4af37'}40`,
    '--clock-size': `${size}px`
  }
})
</script>

<style scoped>
.control-panel-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* --- 跑馬燈 --- */
.marquee-container {
  width: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

/* --- 中間：時鐘與天氣 --- */
.middle-dashboard {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* 💡 將日期與時鐘包在一起的直向容器 */
.datetime-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px; /* 日期與時鐘的間距 */
}

/* 💡 獨立的日期文字樣式 */
.date-display {
  color: #475569; /* 預設沉穩的鐵灰色 */
  font-weight: 900;
  letter-spacing: 2px;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
}

/* 恢復單純的時鐘框樣式 */
.clock-widget-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 30px;
  border-radius: 12px;
  gap: 15px;
  font-size: var(--clock-size);
  font-weight: 900;
  font-family: 'Arial', sans-serif;
  line-height: 1;
}

.clock-icon {
  font-size: calc(var(--clock-size) * 0.8);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

/* --- 天氣小工具 --- */
.weather-widget {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 50px;
  padding: 10px 25px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  font-weight: bold;
}
.weather-location {
  color: #0369a1;
  background: #e0f2fe;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.95rem;
}
.weather-info {
  color: #475569;
  font-size: 0.95rem;
}
.weather-info .divider {
  color: #cbd5e1;
  margin: 0 8px;
}

/* --- 課表顯示條 --- */
.schedule-display-bar {
  background: white;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 12px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  font-size: 1.1rem;
  color: #334155;
  flex-wrap: wrap;
}
.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  background-color: #3b82f6;
  border-radius: 50%;
  margin-right: 5px;
  animation: blink 2s infinite;
}
.subject { color: #10b981; font-size: 1.15rem; }
.teacher { color: #64748b; font-size: 0.95rem; }
.schedule-display-bar .divider { color: #cbd5e1; }

@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

/* --- 下方操作按鈕網格 --- */
.action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
}

.btn {
  padding: 12px 8px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: bold;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  white-space: nowrap;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  filter: brightness(1.05);
}

.badge {
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 5px;
}

/* 各按鈕專屬配色 */
.btn-bind { background: #f59e0b; }
.btn-parent-msg { background: #10b981; }
.btn-student-msg { background: #3b82f6; }
.btn-leave { background: #14b8a6; }
.btn-hw { background: #8b5cf6; }
.btn-discipline { background: #3730a3; }
.btn-hygiene { background: #0ea5e9; }
.btn-seat { background: #0f766e; }
.btn-schedule { background: #d97706; }
.btn-admin { background: #64748b; }
.btn-history { background: #ec4899; }

@media (max-width: 768px) {
  .middle-dashboard { flex-direction: column; gap: 15px; }
  .weather-widget { width: 100%; justify-content: center; }
  .schedule-display-bar { flex-direction: column; gap: 5px; text-align: center; }
  .schedule-display-bar .divider { display: none; }
  .action-buttons-grid { grid-template-columns: repeat(2, 1fr); }
  .datetime-container { width: 100%; }
  .clock-widget-container { width: 100%; padding: 15px 10px; }
}
</style>
