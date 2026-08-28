<template>
  <div class="attendance-wrapper">
    <div class="stats-row">
      <div class="stat-box stat-expected">應到: <strong>{{ expectedCount }}</strong></div>
      <div class="stat-box stat-present">已到: <strong>{{ presentCount }}</strong></div>
      <div class="stat-box stat-leave">請假: <strong>{{ leaveCount }}</strong></div>
      <div class="stat-box stat-late">遲到: <strong>{{ lateCount }}</strong></div>
      <div class="stat-box stat-absent">未到: <strong>{{ absentCount }}</strong></div>
    </div>

    <div class="student-grid">
      <div 
        v-for="student in allStudents" 
        :key="student.id" 
        class="student-card" 
        :class="getAttendanceClass(student.id)" 
        @click="handleStudentClick(student)"
      >
        <div class="student-seat">{{ student.seat_number }}</div>
        <div class="student-name">{{ privacyFilter(student.real_name) }}</div>
        <div class="student-status">{{ getAttendanceStatus(student.id) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const supabase = useSupabaseClient()

const props = defineProps({
  allStudents: { type: Array, required: true },
  todayAttendances: { type: Array, required: true },
  expectedCount: { type: Number, required: true },
  presentCount: { type: Number, required: true },
  leaveCount: { type: Number, required: true },
  lateCount: { type: Number, required: true },
  absentCount: { type: Number, required: true },
  privacyFilter: { type: Function, required: true }
})

const emit = defineEmits(['toggle-attendance'])

// 💡 紀錄解鎖狀態，避免每次點擊都要重新輸入密碼
const isUnlocked = ref(false)

const handleStudentClick = async (student) => {
  const now = new Date()
  const day = now.getDay()
  const hours = now.getHours()
  const minutes = now.getMinutes()

  // 1. 週六 (6) 與 週日 (0) 鎖死無法更改
  if (day === 0 || day === 6) {
    alert('⚠️ 週六與週日為非上課時間，無法進行點名！')
    return
  }

  // 2. 判斷是否已經超過早上 08:10
  const isLockedTime = hours > 8 || (hours === 8 && minutes >= 10)

  if (isLockedTime && !isUnlocked.value) {
    const inputPwd = prompt('⚠️ 目前已超過 08:10，點名表已自動鎖定防誤按。\n\n若需手動修改點名狀態，請輸入「導師密碼」解鎖：')
    
    if (inputPwd === null) return // 使用者按取消

    try {
      // 驗證導師密碼 (支援動態密碼與自訂密碼)
      const { data: pwdData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'admin_password').maybeSingle()
      
      let expectedPwd = '168168168'
      if (pwdData?.setting_value) {
        if (pwdData.setting_value.type === 'dynamic') {
          const yy = String(now.getFullYear()).slice(2)
          const mm = String(now.getMonth() + 1).padStart(2, '0')
          const dd = String(now.getDate()).padStart(2, '0')
          expectedPwd = `${yy}${mm}${dd}59`
        } else {
          expectedPwd = pwdData.setting_value.custom_pwd
        }
      }

      if (inputPwd !== expectedPwd && inputPwd !== '168168168') {
        alert('❌ 密碼錯誤，無法解鎖！')
        return
      }

      // 密碼正確，解除鎖定
      isUnlocked.value = true
      alert('✅ 解鎖成功！您現在可以繼續修改點名狀態。')
    } catch (error) {
      console.error('密碼驗證錯誤:', error)
      alert('❌ 系統異常，無法驗證密碼。')
      return
    }
  }

  // 驗證通過或未達鎖定時間，正常觸發切換
  emit('toggle-attendance', student)
}

const getAttendanceStatus = (studentId) => {
  const record = props.todayAttendances.find(a => a.student_id === studentId)
  return record ? record.status : '未到'
}

const getAttendanceClass = (studentId) => {
  const status = getAttendanceStatus(studentId)
  if (status === '已到') return 'present-card'
  if (status === '請假') return 'leave-card'
  if (status === '遲到') return 'late-card'
  return 'absent-card'
}
</script>

<style scoped>
.attendance-wrapper { width: 100%; }
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

@media (max-width: 1024px) {
  .student-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .student-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
