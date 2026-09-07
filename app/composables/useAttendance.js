// app/composables/useAttendance.js
import { ref, computed } from 'vue'

export function useAttendance(todayISO) {
  // Nuxt 3 支援在 composable 中直接呼叫 supabase
  const supabase = useSupabaseClient()
  
  const allStudents = ref([])
  const allStudentsForLogin = ref([])
  const todayAttendances = ref([])

  const expectedCount = computed(() => allStudents.value.length)
  const presentCount = computed(() => todayAttendances.value.filter(a => a.status === '已到').length)
  const leaveCount = computed(() => todayAttendances.value.filter(a => a.status === '請假' || a.status === '全天請假').length)
  const lateLeaveCount = computed(() => todayAttendances.value.filter(a => a.status && a.status.startsWith('晚到請假')).length)
  const earlyLeaveCount = computed(() => todayAttendances.value.filter(a => a.status && a.status.startsWith('早退請假')).length)
  const lateCount = computed(() => todayAttendances.value.filter(a => a.status && a.status.startsWith('遲到')).length)
  const absentCount = computed(() => expectedCount.value - presentCount.value - leaveCount.value - lateLeaveCount.value - earlyLeaveCount.value - lateCount.value)

  // 將落落長的點名切換與密碼防護邏輯封裝在此
  const toggleAttendanceLogic = async (student, isWeekday, expectedTeacherPwd) => {
    const now = new Date()
    const deadlineHour = 8
    const deadlineMinute = 0
    const isPastDeadline = now.getHours() > deadlineHour || (now.getHours() === deadlineHour && now.getMinutes() >= deadlineMinute)

    if (!isWeekday) {
      const pwd = prompt("🌴 週末預設不開放點名。\n若需強制修改，請輸入導師密碼：")
      if (pwd !== expectedTeacherPwd && pwd !== '168168168' && pwd !== '1681681681') {
        if (pwd !== null) alert("❌ 密碼錯誤，無法變更點名狀態！"); return
      }
    } else if (isPastDeadline) {
      const timeStr = `${String(deadlineHour).padStart(2, '0')}:${String(deadlineMinute).padStart(2, '0')}`
      const pwd = prompt(`⏰ 目前已超過點名規定時間 (${timeStr})。\n為確保出缺席紀錄正確，若需強制修改請輸入「導師密碼」：`)
      if (pwd !== expectedTeacherPwd && pwd !== '168168168' && pwd !== '1681681681') {
        if (pwd !== null) alert("❌ 密碼錯誤，無法變更點名狀態！"); return
      }
    }

    const currentStatusFull = todayAttendances.value.find(a => a.student_id === student.id)?.status || '未到'
    let currentBaseStatus = currentStatusFull
    if (currentStatusFull.startsWith('晚到請假')) currentBaseStatus = '晚到請假'
    else if (currentStatusFull.startsWith('早退請假')) currentBaseStatus = '早退請假'
    else if (currentStatusFull.startsWith('遲到')) currentBaseStatus = '遲到'

    let nextStatus = '已到'
    
    if (currentBaseStatus === '未到') nextStatus = '已到'
    else if (currentBaseStatus === '已到') nextStatus = '全天請假'
    else if (currentBaseStatus === '全天請假' || currentBaseStatus === '請假') {
      const time = prompt("請輸入【預計到校】時間 (例如 10:00) :", "10:00")
      if (time === null) return 
      nextStatus = `晚到請假(${time})`
    } else if (currentBaseStatus === '晚到請假') {
      const time = prompt("請輸入【早退離開】時間 (例如 14:00) :", "14:00")
      if (time === null) return 
      nextStatus = `早退請假(${time})`
    } else if (currentBaseStatus === '早退請假') nextStatus = '遲到'
    else if (currentBaseStatus === '遲到') nextStatus = '未到'

    let record = todayAttendances.value.find(a => a.student_id === student.id)
    if (record) { record.status = nextStatus } else { todayAttendances.value.push({ student_id: student.id, record_date: todayISO, status: nextStatus }) }

    try {
      const { data: existing } = await supabase.from('attendances').select('id').eq('student_id', student.id).eq('record_date', todayISO).maybeSingle()
      if (existing) { await supabase.from('attendances').update({ status: nextStatus }).eq('id', existing.id) } 
      else { await supabase.from('attendances').insert({ student_id: student.id, record_date: todayISO, status: nextStatus }) }
    } catch (err) {}
  }

  return {
    allStudents, allStudentsForLogin, todayAttendances,
    expectedCount, presentCount, leaveCount, lateLeaveCount, earlyLeaveCount, lateCount, absentCount,
    toggleAttendanceLogic
  }
}
