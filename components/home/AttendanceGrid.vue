<template>
  <div>
    <div class="stats-row">
      <div class="stat-box stat-expected">應到: <strong>{{ expectedCount }}</strong></div>
      <div class="stat-box stat-present">已到: <strong>{{ presentCount }}</strong></div>
      <div class="stat-box stat-leave">請假: <strong>{{ leaveCount }}</strong></div>
      <div class="stat-box stat-late">遲到: <strong>{{ lateCount }}</strong></div>
      <div class="stat-box stat-absent">未到: <strong>{{ absentCount }}</strong></div>
    </div>

    <div class="student-grid">
      <div v-for="student in allStudents" :key="student.id" class="student-card" :class="getAttendanceClass(student.id)" @click="$emit('toggle-attendance', student)">
        <div class="student-seat">{{ student.seat_number }}</div>
        <div class="student-name">{{ privacyFilter(student.real_name) }}</div>
        <div class="student-status">{{ getAttendanceStatus(student.id) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps(['allStudents', 'todayAttendances', 'expectedCount', 'presentCount', 'leaveCount', 'lateCount', 'absentCount', 'privacyFilter'])
defineEmits(['toggle-attendance'])

const getAttendanceRecord = (studentId) => props.todayAttendances.find(a => a.student_id === studentId)
const getAttendanceStatus = (studentId) => getAttendanceRecord(studentId)?.status || '未到'
const getAttendanceClass = (studentId) => {
  const status = getAttendanceStatus(studentId)
  if (status === '已到') return 'present-card'
  if (status === '請假') return 'leave-card'
  if (status === '遲到') return 'late-card'
  return 'absent-card'
}
</script>

<style scoped>
.stats-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;}
.stat-box { flex: 1; padding: 12px; border-radius: 6px; text-align: center; font-size: 1.05rem; font-weight: bold; min-width: 80px; }
.stat-expected { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.stat-present { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.stat-leave { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.stat-late { background: #e0e7ff; color: #3730a3; border: 1px solid #a5b4fc; }
.stat-absent { background: #ffe4e6; color: #e11d48; border: 1px solid #fca5a5; }

.student-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.student-card { border-radius: 6px; padding: 15px 10px; text-align: center; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; user-select: none; transition: 0.1s transform, 0.3s background-color; }
.student-card:active { transform: scale(0.95); }
.student-seat { font-size: 1.2rem; margin-bottom: 5px; }
.student-name { font-size: 1.1rem; margin-bottom: 5px; }
.student-status { font-size: 0.9rem; opacity: 0.9; }

.absent-card { background: #ffe4e6; color: #e11d48; border: 2px solid transparent; }
.absent-card .student-name { color: #be123c; }
.present-card { background: #dcfce7; color: #166534; border: 2px solid transparent; }
.present-card .student-name { color: #14532d; }
.leave-card { background: #fef3c7; color: #92400e; border: 2px solid transparent; }
.leave-card .student-name { color: #78350f; }
.late-card { background: #e0e7ff; color: #3730a3; border: 2px solid transparent; }
.late-card .student-name { color: #312e81; }

@media (max-width: 1024px) { .student-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .student-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
