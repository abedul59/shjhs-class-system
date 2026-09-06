<template>
  <div class="attendance-wrapper">
    
    <!-- 📊 頂部統計數據列 (擴充為 7 格) -->
    <div class="stats-row">
      <div class="stat-box stat-expected">
        應到: <strong>{{ expectedCount }}</strong>
      </div>
      <div class="stat-box stat-present">
        已到: <strong>{{ presentCount }}</strong>
      </div>
      <div class="stat-box stat-leave">
        全天請假: <strong>{{ leaveCount }}</strong>
      </div>
      <div class="stat-box stat-late-leave">
        晚到請假: <strong>{{ lateLeaveCount }}</strong>
      </div>
      <div class="stat-box stat-early-leave">
        早退請假: <strong>{{ earlyLeaveCount }}</strong>
      </div>
      <div class="stat-box stat-late">
        遲到: <strong>{{ lateCount }}</strong>
      </div>
      <div class="stat-box stat-absent">
        未到: <strong>{{ absentCount }}</strong>
      </div>
    </div>

    <!-- 👨‍🎓 學生卡片網格 -->
    <div class="grid-container">
      <button 
        v-for="student in allStudents" 
        :key="student.id"
        class="student-card"
        :class="getStatusClass(student.id)"
        @click="$emit('toggle-attendance', student)"
      >
        <div class="st-num">{{ student.seat_number }}</div>
        <div class="st-name">{{ privacyFilter(student.real_name || student.hidden_name) }}</div>
        <!-- 狀態會顯示包含時間的字串，例如 晚到請假(10:00) -->
        <div class="st-status">{{ getStatusText(student.id) }}</div>
      </button>
    </div>

  </div>
</template>

<script setup>
const props = defineProps({
  allStudents: { type: Array, default: () => [] },
  todayAttendances: { type: Array, default: () => [] },
  expectedCount: { type: Number, default: 0 },
  presentCount: { type: Number, default: 0 },
  leaveCount: { type: Number, default: 0 },
  lateLeaveCount: { type: Number, default: 0 }, // 新增晚到
  earlyLeaveCount: { type: Number, default: 0 }, // 新增早退
  lateCount: { type: Number, default: 0 },
  absentCount: { type: Number, default: 0 },
  privacyFilter: { type: Function, default: (val) => val }
})

defineEmits(['toggle-attendance'])

const getStatusText = (studentId) => {
  const record = props.todayAttendances.find(a => a.student_id === studentId)
  return record?.status || '未到'
}

// 根據不同狀態套用專屬的顏色 Class
const getStatusClass = (studentId) => {
  const status = getStatusText(studentId)
  if (status === '已到') return 'is-present'
  if (status === '全天請假' || status === '請假') return 'is-leave'
  if (status.startsWith('晚到請假')) return 'is-late-leave'
  if (status.startsWith('早退請假')) return 'is-early-leave'
  if (status.startsWith('遲到')) return 'is-late'
  return 'is-absent' // 預設未到 (紅色)
}
</script>

<style scoped>
.attendance-wrapper { background: transparent; width: 100%; }

/* --- 📊 統計列樣式 --- */
.stats-row { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center; }
.stat-box { flex: 1; text-align: center; padding: 10px; border-radius: 8px; font-size: 1rem; border: 1px solid transparent; min-width: 90px; }
.stat-box strong { font-size: 1.15rem; margin-left: 2px; }

/* 統計列色彩對應 */
.stat-expected { background-color: #f8fafc; border-color: #e2e8f0; color: #334155; }
.stat-present { background-color: #dcfce7; border-color: #bbf7d0; color: #166534; }
.stat-leave { background-color: #fef9c3; border-color: #fde047; color: #a16207; }
.stat-late-leave { background-color: #ffedd5; border-color: #fdba74; color: #c2410c; } /* 晚到請假(橘) */
.stat-early-leave { background-color: #f3e8ff; border-color: #d8b4fe; color: #6b21a8; } /* 早退請假(紫) */
.stat-late { background-color: #dbeafe; border-color: #bfdbfe; color: #1d4ed8; }
.stat-absent { background-color: #fee2e2; border-color: #fca5a5; color: #991b1b; }

/* --- 👨‍🎓 學生網格樣式 --- */
.grid-container { display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; }

.student-card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 5px; border-radius: 10px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s ease; font-family: inherit; }
.student-card:hover { filter: brightness(0.95); transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }

.st-num { font-size: 1.1rem; font-weight: bold; margin-bottom: 5px; }
.st-name { font-size: 1.2rem; font-weight: 900; margin-bottom: 8px; letter-spacing: 1px; }
.st-status { font-size: 0.9rem; font-weight: bold; white-space: pre-wrap; line-height: 1.3;}

/* 學生卡片狀態色彩對應 */
.is-absent { background-color: #fee2e2; border-color: #fca5a5; color: #991b1b; } 
.is-present { background-color: #dcfce7; border-color: #86efac; color: #14532d; } 
.is-leave { background-color: #fef9c3; border-color: #fde047; color: #713f12; }  
.is-late-leave { background-color: #ffedd5; border-color: #fdba74; color: #c2410c; } 
.is-early-leave { background-color: #f3e8ff; border-color: #d8b4fe; color: #6b21a8; } 
.is-late { background-color: #dbeafe; border-color: #93c5fd; color: #1e3a8a; }    

/* --- RWD --- */
@media (max-width: 1024px) { .grid-container { grid-template-columns: repeat(5, 1fr); } }
@media (max-width: 768px) {
  .grid-container { grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .stats-row { gap: 8px; }
}
@media (max-width: 480px) {
  .grid-container { grid-template-columns: repeat(3, 1fr); }
  .st-name { font-size: 1.1rem; }
}
</style>
