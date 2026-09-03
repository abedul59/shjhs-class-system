<template>
  <div class="attendance-section">
    <!-- 頂部統計列 -->
    <div class="stats-row">
      <div class="stat-box default">應到: <strong>{{ expectedCount }}</strong></div>
      <div class="stat-box success">已到: <strong>{{ presentCount }}</strong></div>
      <div class="stat-box warning">請假: <strong>{{ leaveCount }}</strong></div>
      <div class="stat-box late">遲到: <strong>{{ lateCount }}</strong></div>
      <div class="stat-box danger">未到: <strong>{{ absentCount }}</strong></div>
    </div>

    <!-- 學生點名網格 -->
    <div class="attendance-grid">
      <div v-for="student in allStudents" :key="student.id"
           class="student-card"
           :class="getCardClass(student)"
           @click="$emit('toggle-attendance', student)">
        <span class="seat-num">{{ student.seat_number }}</span>
        <span class="stu-name">{{ privacyFilter(student.real_name) }}</span>
        <span class="stu-status">{{ getStudentStatus(student) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  allStudents: Array,
  todayAttendances: Array,
  expectedCount: Number,
  presentCount: Number,
  leaveCount: Number,
  lateCount: Number,
  absentCount: Number,
  privacyFilter: Function
})

defineEmits(['toggle-attendance'])

// 取得該學生的出缺席文字
const getStudentStatus = (student) => {
  const record = props.todayAttendances.find(a => a.student_id === student.id)
  return record ? record.status : '未到'
}

// 💡 修正：依據狀態文字決定卡片顏色，改用 startsWith 支援包含時間的遲到字串
const getCardClass = (student) => {
  const status = getStudentStatus(student)
  if (status === '已到') return 'status-present'
  if (status === '請假') return 'status-leave'
  if (status && status.startsWith('遲到')) return 'status-late' // 修正這裡！
  return 'status-absent' // 預設(未到)
}
</script>

<style scoped>
.attendance-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 統計列樣式 */
.stats-row { 
  display: flex; 
  gap: 10px; 
  flex-wrap: wrap;
}
.stat-box { 
  flex: 1; 
  padding: 12px 15px; 
  border-radius: 8px; 
  text-align: center; 
  font-size: 1.1rem; 
  border: 1px solid transparent; 
  min-width: 100px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.stat-box strong { 
  font-size: 1.3rem; 
  margin-left: 5px; 
}

/* 網格與卡片樣式 */
.attendance-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); 
  gap: 12px; 
}
.student-card { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  padding: 15px 10px; 
  border-radius: 8px; 
  cursor: pointer; 
  transition: transform 0.1s ease, box-shadow 0.2s ease; 
  border: 1px solid transparent; 
  user-select: none; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.student-card:active { 
  transform: scale(0.95); 
}
.student-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.seat-num { font-size: 1.4rem; font-weight: bold; margin-bottom: 5px; }
.stu-name { font-size: 1.05rem; font-weight: bold; margin-bottom: 8px; }
.stu-status { font-size: 0.95rem; }

/* 💡 對應的顏色定義 */
.stat-box.default { background: #f8fafc; border-color: #e2e8f0; color: #475569; }

.stat-box.success, .status-present { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
.stat-box.warning, .status-leave { background: #fef3c7; border-color: #fde68a; color: #92400e; }
.stat-box.late, .status-late { background: #e0e7ff; border-color: #c7d2fe; color: #3730a3; }
.stat-box.danger, .status-absent { background: #fee2e2; border-color: #fecaca; color: #991b1b; }

@media (max-width: 768px) {
  .attendance-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}
</style>
