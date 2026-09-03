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

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

import ExamDashboard from '~~/components/home/ExamDashboard.vue'
import AttendanceGrid from '~~/components/home/AttendanceGrid.vue'
import ContactBook from '~~/components/home/ContactBook.vue'
import ClassNotes from '~~/components/home/ClassNotes.vue'
import SeatingAndHygiene from '~~/components/home/SeatingAndHygiene.vue'
import NoticeBoards from '~~/components/home/NoticeBoards.vue'
import ControlPanel from '~~/components/home/ControlPanel.vue'
import LargeScheduleModal from '~~/components/home/LargeScheduleModal.vue'

const supabase = useSupabaseClient()

const showEmergencyModal = ref(false)
const showSeatingChartLocal = ref(false)
const showHygieneLocal = ref(false)
const isHistoryVisibleOnIndex = ref(false)

const isAnnouncementVisibleOnIndex = ref(true)
const isNoticeBoardVisibleOnIndex = ref(true)
const isParentAnnouncementVisibleOnIndex = ref(true)

const isIpWhitelisted = ref(false)
const isIpBrownlisted = ref(false)
const currentIpStr = ref('')

const unreadMsgCount = ref(0)

const announcements = ref([])
const parentAnnouncements = ref([])
const scheduleData = ref(null)

const scheduleButtonConfig = ref({ isVisible: false, visibility: 'both', teacherOnlyInBrownlist: true })
const showLargeSchedule = ref(false)

const clockFontSize = ref(35) 

const isExamModeView = ref(false)
const examData = ref({ isExamModeEnabled: true, theme: 'midnight', title: '', periods: [] })
const indexButtonSettings = ref({
  parentBind: true, parentMsg: true, studentMsg: true, assignments: true, discipline: true, hygiene: true, seats: true, emergency: true, admin: true, schedule: true, exams: true
})

const examThemes = {
  midnight: { name: '午夜藍 (Midnight)', bg: '#0f172a', border: '#334155', title: '#f8fafc', clock: '#fbbf24', text: '#cbd5e1', accent: '#3b82f6', success: '#10b981', danger: '#ef4444', panelBg: '#1e293b' },
  blackboard: { name: '經典黑板 (Blackboard)', bg: '#1a3627', border: '#5b3a1a', title: '#ffffff', clock: '#fbbf24', text: '#e2e8f0', accent: '#fca5a5', success: '#a7f3d0', danger: '#f87171', panelBg: '#234a36' },
  slate: { name: '沉穩灰 (Slate)', bg: '#334155', border: '#64748b', title: '#f8fafc', clock: '#38bdf8', text: '#f1f5f9', accent: '#818cf8', success: '#34d399', danger: '#f87171', panelBg: '#475569' },
  matcha: { name: '抹茶綠 (Matcha)', bg: '#2f3e36', border: '#5b6a5a', title: '#ecfdf5', clock: '#a7f3d0', text: '#d1fae5', accent: '#6ee7b7', success: '#10b981', danger: '#fca5a5', panelBg: '#3b4d45' },
  burgundy: { name: '勃根地紅 (Burgundy)', bg: '#450a0a', border: '#7f1d1d', title: '#fee2e2', clock: '#fca5a5', text: '#fecaca', accent: '#f87171', success: '#a7f3d0', danger: '#fbbf24', panelBg: '#591111' },
  ocean: { name: '深海湛藍 (Ocean)', bg: '#083344', border: '#164e63', title: '#cffafe', clock: '#67e8f9', text: '#a5f3fc', accent: '#22d3ee', success: '#34d399', danger: '#fca5a5', panelBg: '#114358' },
  mocha: { name: '摩卡棕 (Mocha)', bg: '#3e2723', border: '#784315', title: '#fef3c7', clock: '#fde047', text: '#fde68a', accent: '#fbbf24', success: '#6ee7b7', danger: '#fca5a5', panelBg: '#5c3a21' },
  purple: { name: '星空紫 (Purple)', bg: '#2e1065', border: '#4c1d95', title: '#ede9fe', clock: '#c4b5fd', text: '#ddd6fe', accent: '#a78bfa', success: '#6ee7b7', danger: '#fca5a5', panelBg: '#3b187d' },
  retro: { name: '復古紙質 (Retro)', bg: '#e7e5e4', border: '#94a3b8', title: '#1c1917', clock: '#b45309', text: '#44403c', accent: '#78350f', success: '#15803d', danger: '#b91c1c', panelBg: '#f5f5f4' },
  minimal: { name: '極簡白 (Minimal)', bg: '#ffffff', border: '#cbd5e1', title: '#0f172a', clock: '#0284c7', text: '#334155', accent: '#3b82f6', success: '#16a34a', danger: '#dc2626', panelBg: '#f8fafc' }
}

const defaultHygieneData = {
  isVisibleOnIndex: false,
  morning: {
    title: '704 班 教室和外掃區 早上掃地工作分配表', note: '', in_hygiene: '內衛生', in_hygiene_names: '季昀苓', in_hygiene_work: '',
    board: '講台掃拖、講桌', board_names: '葉柏妍、許壹淳', board_work: '整理黑板', sweep: '教室地板掃地', sweep_names: '呂有陞\n田孟任\n林珈媗', sweep_mop_work: '',
    mop: '教室地板拖地', mop_names: '張歆悅\n葉佳妤', window: '擦窗戶', window_names: '楊佩綺、王翊潔', window_work: '', hallway: '教室走廊', hallway_names: '林科甫、徐亦佐', hallway_work: '',
    trash: '倒垃圾', trash_names: '王聰文\n王麟賢', trash_work: '', out_area: '北側人行道', out_hygiene: '外衛生', out_hygiene_names: '', out_hygiene_work: '', out_sweep1: '', out_sweep1_names: '', out_sweep_work: '', out_sweep2_names: '', out_sweep3_names: ''
  },
  lunch: {
    title: '704 午餐搬運、中午打掃輪值表', sub: '',
    clean_header: '清潔組', clean_h1: '', clean_h2: '', clean_h3: '', clean_h4: '', clean_h5: '', clean_h6: '', clean_n1: '', clean_n2: '', clean_n3: '', clean_n4: '', clean_n5: '', clean_n6: '',
    move_header: '搬餐組', move_h1: '', move_h2: '', move_h3: '', move_h4: '', move_h5: '', move_h6: '', move_n1: '', move_n2: '', move_n3: '', move_n4: '', move_n5: '', move_n6: '',
    serve_header: '配膳組', serve_h1: '', serve_h2: '', serve_h3: '', serve_h4: '', serve_h5: '', serve_h6: '', serve_n1: '', serve_n2: '', serve_n3: '', serve_n4: '', serve_n5: '', serve_n6: '',
    note1: '', note2: ''
  },
  squad: { title: '704 各項小隊成員工作', leader_desc: '', leaders: ['', '', '', '', '', ''], duty_desc: ['', '', '', '', '', ''], duties: ['', '', '', '', '', ''], helper_desc: ['', '', '', '', ''], helpers: ['', '', '', '', ''], errand_desc: ['', '', '', ''], errands: ['', '', '', ''], minion_desc: '', minions: ['', ''], other_desc: '', others: ['', '', ''] }
}
const hygieneData = ref(JSON.parse(JSON.stringify(defaultHygieneData)))

const currentThemeStyles = computed(() => {
  const t = examThemes[examData.value.theme] || examThemes.midnight
  return { '--ex-bg': t.bg, '--ex-border': t.border, '--ex-title': t.title, '--ex-clock': t.clock, '--ex-text': t.text, '--ex-accent': t.accent, '--ex-success': t.success, '--ex-danger': t.danger, '--ex-panel-bg': t.panelBg }
})

const checkIpRules = async () => {
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json')
    const { ip } = await ipRes.json()
    currentIpStr.value = ip 
    const { data: rules } = await supabase.from('ip_rules').select('ip_range, rule_type')
    if (rules && rules.length > 0) {
      isIpWhitelisted.value = rules.filter(r => r.rule_type === '白名單').some(r => ip.startsWith(r.ip_range))
      isIpBrownlisted.value = rules.filter(r => r.rule_type === '褐名單').some(r => ip.startsWith(r.ip_range))
    }
  } catch (e) { console.error('IP check failed', e) }
}

const logVisit = async () => {
  if (sessionStorage.getItem('visit_logged')) return
  try {
    const ua = navigator.userAgent
    let role = '匿名來訪者'
    if (sessionStorage.getItem('schedule_admin_logged_in') === 'true' || sessionStorage.getItem('exams_admin_logged_in') === 'true') role = '導師'
    await supabase.from('visitor_logs').insert([{ ip_address: currentIpStr.value || '未知IP', device_info: ua, role: role }])
    sessionStorage.setItem('visit_logged', 'true')
  } catch (e) {}
}

const logRoleVisit = async (roleName) => {
  try { await supabase.from('visitor_logs').insert([{ ip_address: currentIpStr.value || '未知IP', device_info: navigator.userAgent, role: roleName }]) } catch (e) { console.error(e) }
}

const privacyFilter = (txt) => {
  let result = String(txt || '')
  if (!isIpWhitelisted.value && allStudents.value.length > 0) {
    const sortedStudents = [...allStudents.value].sort((a, b) => (b.real_name || '').length - (a.real_name || '').length)
    sortedStudents.forEach(stu => {
      if (stu.real_name && stu.hidden_name && stu.real_name.trim() !== '') { result = result.split(stu.real_name).join(stu.hidden_name) }
    })
  }
  return result
}

const formatNL = (txt) => privacyFilter(txt).replace(/\n/g, '<br>')
const formatDateTime = (dtStr) => {
  if (!dtStr) return ''
  return new Date(dtStr).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

const dDate = new Date()
const todayISO = `${dDate.getFullYear()}-${String(dDate.getMonth()+1).padStart(2,'0')}-${String(dDate.getDate()).padStart(2,'0')}`
const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const todayDisplay = `${dDate.getFullYear()}年${dDate.getMonth()+1}月${dDate.getDate()}日${days[dDate.getDay()]}`

const currentTime = ref('')
const nowTick = ref(Date.now())
let timer = null

const updateTime = () => {
  const now = new Date()
  nowTick.value = now.getTime()
  currentTime.value = now.toLocaleTimeString('zh-TW', { hour12: false })
}

const scheduleDisplay = computed(() => {
  if (!scheduleData.value || !scheduleData.value.periods) return null
  const currentDayIndex = new Date(nowTick.value).getDay() - 1 
  if (currentDayIndex < 0 || currentDayIndex > 4) return null 
  
  const now = new Date(nowTick.value)
  const nowMins = now.getHours() * 60 + now.getMinutes()
  let currentClass = { status: '下課中', label: '目前', subject: '休息時間', teacher: '' }
  let nextClass = null
  
  for (let i = 0; i < scheduleData.value.periods.length; i++) {
    const p = scheduleData.value.periods[i]
    if (!p.startTime || !p.endTime) continue
    const [sh, sm] = p.startTime.split(':').map(Number)
    const [eh, em] = p.endTime.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    
    const dayData = p.days[currentDayIndex]
    if (!dayData || !dayData.subject) continue
    
    if (nowMins >= startMins && nowMins <= endMins) {
      currentClass = { status: '上課中', label: p.name, subject: dayData.subject, teacher: dayData.teacher }
      for (let j = i + 1; j < scheduleData.value.periods.length; j++) {
        const nextP = scheduleData.value.periods[j]
        const nextDayData = nextP.days[currentDayIndex]
        if (nextDayData && nextDayData.subject) { nextClass = { subject: nextDayData.subject }; break }
      }
      break
    }
    if (nowMins < startMins && !nextClass) { nextClass = { subject: dayData.subject } }
  }
  return { current: currentClass, next: nextClass }
})

const examStatus = computed(() => {
  if (!examData.value || !examData.value.periods || examData.value.periods.length === 0) return { state: 'WAITING', periods: [] }
  const now = new Date(nowTick.value)
  const nowMins = now.getHours() * 60 + now.getMinutes()

  let current = null; let next = null; let state = 'WAITING'
  const periods = JSON.parse(JSON.stringify(examData.value.periods))

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i]
    if (!p.startTime || !p.endTime) continue
    const [sh, sm] = p.startTime.split(':').map(Number)
    const [eh, em] = p.endTime.split(':').map(Number)
    const startMins = sh * 60 + sm; const endMins = eh * 60 + em
    p.isActive = false

    if (nowMins >= startMins && nowMins <= endMins) {
      state = 'TESTING'; current = p; p.isActive = true
      if (i + 1 < periods.length) next = periods[i + 1]
      break
    }
    if (nowMins < startMins) {
      if (state !== 'TESTING') { state = i === 0 ? 'WAITING' : 'BREAK'; next = p }
      break
    }
  }

  const lastP = periods[periods.length - 1]
  if (lastP && lastP.endTime) {
    const [lsh, lsm] = lastP.endTime.split(':').map(Number)
    if (!current && !next && nowMins >= (lsh * 60 + lsm)) { state = 'FINISHED' }
  }
  return { state, current, next, periods }
})

const countdownMinutes = computed(() => {
  if (examStatus.value.state !== 'TESTING' || !examStatus.value.current) return 999;
  const currentTick = nowTick.value; const now = new Date(currentTick);
  const [eh, em] = examStatus.value.current.endTime.split(':').map(Number);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em, 0);
  return Math.floor((end.getTime() - currentTick) / 60000);
})

const countdownText = computed(() => {
  if (examStatus.value.state !== 'TESTING' || !examStatus.value.current) return '';
  const currentTick = nowTick.value; const now = new Date(currentTick);
  const [eh, em] = examStatus.value.current.endTime.split(':').map(Number);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em, 0);
  
  const diffMs = end.getTime() - currentTick;
  if (diffMs <= 0) return '00:00';
  const diffMins = Math.floor(diffMs / 60000); const diffSecs = Math.floor((diffMs % 60000) / 1000);
  return `${String(diffMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`;
})

const parentNotices = ref([])
const officerPasswords = ref({ academic: '', counseling: '', discipline: '', teacher: '168168168' })
const seatingChart = ref({ isVisible: false, isRotated: false, seats: [], settings: {} })

const contactBookItems = ref([])
const isEditingContact = ref(false)
const editingContactItems = ref([])

const classNoteItems = ref([])
const isEditingClassNotes = ref(false)
const editingClassNoteItems = ref([])

const currentEditorRole = ref('') 

const showPwdModal = ref(false)
const pwdTarget = ref('')
const pwdModalTitle = ref('')
const pwdModalDesc = ref('')
const pwdInput = ref('')

const openPwdModal = (target) => {
  pwdTarget.value = target
  pwdInput.value = ''
  if (target === 'emergency') { 
    pwdModalTitle.value = '🚨 緊急通知系統解鎖'; pwdModalDesc.value = '請輸入「導師」密碼：' 
  } else if (target === 'contact') { 
    pwdModalTitle.value = '✏️ 編輯聯絡簿解鎖'; pwdModalDesc.value = '請輸入「學藝股長」、「輔導股長」或「導師」密碼：' 
  } else if (target === 'classNotes') { 
    pwdModalTitle.value = '⚡ 編輯注意事項解鎖'; pwdModalDesc.value = '請輸入「學藝股長」、「輔導股長」或「導師」密碼：' 
  }
  showPwdModal.value = true
}

const closePwdModal = () => { showPwdModal.value = false }

const submitPwd = async () => {
  const pwd = pwdInput.value
  const teacherPwd = officerPasswords.value.teacher || '168168168'

  if (pwdTarget.value === 'emergency') {
    if (pwd === teacherPwd) { showPwdModal.value = false; showEmergencyModal.value = true; await logRoleVisit('導師') } else { alert("❌ 密碼錯誤！") }
  } 
  else if (pwdTarget.value === 'contact') {
    if (officerPasswords.value.academic && pwd === officerPasswords.value.academic) { currentEditorRole.value = '學藝股長'; isEditingContact.value = true; editingContactItems.value = [...contactBookItems.value]; showPwdModal.value = false; await logRoleVisit('學藝股長') } 
    else if (officerPasswords.value.counseling && pwd === officerPasswords.value.counseling) { currentEditorRole.value = '輔導股長'; isEditingContact.value = true; editingContactItems.value = [...contactBookItems.value]; showPwdModal.value = false; await logRoleVisit('輔導股長') } 
    else if (pwd === teacherPwd) { currentEditorRole.value = '導師'; isEditingContact.value = true; editingContactItems.value = [...contactBookItems.value]; showPwdModal.value = false; await logRoleVisit('導師') } 
    else { alert("❌ 密碼錯誤！請確認密碼是否正確。") }
  }
  else if (pwdTarget.value === 'classNotes') {
    if (officerPasswords.value.academic && pwd === officerPasswords.value.academic) { currentEditorRole.value = '學藝股長'; isEditingClassNotes.value = true; editingClassNoteItems.value = [...classNoteItems.value]; showPwdModal.value = false; await logRoleVisit('學藝股長') } 
    else if (officerPasswords.value.counseling && pwd === officerPasswords.value.counseling) { currentEditorRole.value = '輔導股長'; isEditingClassNotes.value = true; editingClassNoteItems.value = [...classNoteItems.value]; showPwdModal.value = false; await logRoleVisit('輔導股長') } 
    else if (pwd === teacherPwd) { currentEditorRole.value = '導師'; isEditingClassNotes.value = true; editingClassNoteItems.value = [...classNoteItems.value]; showPwdModal.value = false; await logRoleVisit('導師') } 
    else { alert("❌ 密碼錯誤！請確認密碼是否正確。") }
  }
}

const allStudents = ref([])
const todayAttendances = ref([])

// 💡 修正：計算人數時，改用 startsWith 支援「遲到_07:44」這類帶有精準時間的字串！
const expectedCount = computed(() => allStudents.value.length)
const presentCount = computed(() => todayAttendances.value.filter(a => a.status === '已到').length)
const leaveCount = computed(() => todayAttendances.value.filter(a => a.status === '請假').length)
const lateCount = computed(() => todayAttendances.value.filter(a => a.status && a.status.startsWith('遲到')).length)
const absentCount = computed(() => expectedCount.value - presentCount.value - leaveCount.value - lateCount.value)

const toggleAttendance = async (student) => {
  const currentStatus = todayAttendances.value.find(a => a.student_id === student.id)?.status || '未到'
  let nextStatus = '已到'
  
  // 💡 修正：狀態切換循環也要支援 startsWith
  if (currentStatus === '未到') nextStatus = '已到'; 
  else if (currentStatus === '已到') nextStatus = '請假'; 
  else if (currentStatus === '請假') nextStatus = '遲到'; 
  else if (currentStatus.startsWith('遲到')) nextStatus = '未到';

  let record = todayAttendances.value.find(a => a.student_id === student.id)
  if (record) { record.status = nextStatus } else { todayAttendances.value.push({ student_id: student.id, record_date: todayISO, status: nextStatus }) }

  try {
    const { data: existing } = await supabase.from('attendances').select('id').eq('student_id', student.id).eq('record_date', todayISO).maybeSingle()
    if (existing) { await supabase.from('attendances').update({ status: nextStatus }).eq('id', existing.id) } 
    else { await supabase.from('attendances').insert({ student_id: student.id, record_date: todayISO, status: nextStatus }) }
  } catch (err) { console.error(err) }
}

const fetchData = async () => {
  const { data: boardData } = await supabase.from('contact_books').select('contact_items').eq('record_date', todayISO).maybeSingle()
  contactBookItems.value = boardData?.contact_items || []

  const { data: sysData } = await supabase.from('system_settings').select('*')
    .in('setting_key', [
      'board_officer_passwords', 'seating_chart_data', 'hygiene_management_data', 
      'contact_history_visible', 'index_button_settings', 'announcements_data', 
      'class_schedule_data', 'exam_schedule_data', 'parent_notices_data', 
      'class_notes_data', 'announcement_board_visible', 'parent_notices_board_visible',
      'parent_announcements_data', 'parent_announcement_board_visible', 'schedule_button_settings',
      'index_clock_size'
    ])
  
  if (sysData) {
    const pwdSetting = sysData.find(s => s.setting_key === 'board_officer_passwords')
    if (pwdSetting) officerPasswords.value = { ...officerPasswords.value, ...pwdSetting.setting_value }
    
    const histSetting = sysData.find(s => s.setting_key === 'contact_history_visible')
    if (histSetting) isHistoryVisibleOnIndex.value = histSetting.setting_value

    const btnSetting = sysData.find(s => s.setting_key === 'index_button_settings')
    if (btnSetting && btnSetting.setting_value) { indexButtonSettings.value = { ...indexButtonSettings.value, ...btnSetting.setting_value } }

    const annSetting = sysData.find(s => s.setting_key === 'announcements_data')
    if (annSetting && annSetting.setting_value) { announcements.value = (annSetting.setting_value || []).sort((a, b) => new Date(b.date) - new Date(a.date)) }

    const pAnnSetting = sysData.find(s => s.setting_key === 'parent_announcements_data')
    if (pAnnSetting && pAnnSetting.setting_value) { parentAnnouncements.value = (pAnnSetting.setting_value || []).sort((a, b) => new Date(b.date) - new Date(a.date)) }

    const annVisSetting = sysData.find(s => s.setting_key === 'announcement_board_visible')
    if (annVisSetting !== undefined && annVisSetting.setting_value !== null) {
      isAnnouncementVisibleOnIndex.value = annVisSetting.setting_value
    }

    const pAnnVisSetting = sysData.find(s => s.setting_key === 'parent_announcement_board_visible')
    if (pAnnVisSetting !== undefined && pAnnVisSetting.setting_value !== null) {
      isParentAnnouncementVisibleOnIndex.value = pAnnVisSetting.setting_value
    }

    const noticeVisSetting = sysData.find(s => s.setting_key === 'parent_notices_board_visible')
    if (noticeVisSetting !== undefined && noticeVisSetting.setting_value !== null) {
      isNoticeBoardVisibleOnIndex.value = noticeVisSetting.setting_value
    }

    const schSetting = sysData.find(s => s.setting_key === 'class_schedule_data')
    if (schSetting && schSetting.setting_value) { scheduleData.value = schSetting.setting_value }
    
    const schBtnSetting = sysData.find(s => s.setting_key === 'schedule_button_settings')
    if (schBtnSetting && schBtnSetting.setting_value) {
      scheduleButtonConfig.value = { teacherOnlyInBrownlist: true, ...schBtnSetting.setting_value }
    }

    const clockSetting = sysData.find(s => s.setting_key === 'index_clock_size')
    if (clockSetting && clockSetting.setting_value) {
      clockFontSize.value = Number(clockSetting.setting_value) || 35
    }

    const exSetting = sysData.find(s => s.setting_key === 'exam_schedule_data')
    if (exSetting && exSetting.setting_value) { examData.value = { ...examData.value, ...exSetting.setting_value } }

    const noticesSetting = sysData.find(s => s.setting_key === 'parent_notices_data')
    if (noticesSetting && noticesSetting.setting_value) {
      const allNotices = (noticesSetting.setting_value || []).sort((a, b) => Number(a.id) - Number(b.id))
      parentNotices.value = allNotices.filter(n => {
        const startOk = !n.startDate || n.startDate <= todayISO
        const endOk = !n.endDate || n.endDate >= todayISO
        return startOk && endOk
      }).map(n => n.content) 
    } else { parentNotices.value = [] }

    const classNotesSetting = sysData.find(s => s.setting_key === 'class_notes_data')
    if (classNotesSetting && classNotesSetting.setting_value) {
      classNoteItems.value = classNotesSetting.setting_value[todayISO] || []
    } else {
      classNoteItems.value = []
    }

    const seatSetting = sysData.find(s => s.setting_key === 'seating_chart_data')
    if (seatSetting) {
      const rawValue = seatSetting.setting_value || {}
      const normalizedSeats = (rawValue.seats || []).map(seat => {
        if (seat.content !== undefined) {
          const lines = String(seat.content || '').split('\n')
          return { id: seat.id, isHidden: seat.isHidden, seatNum: lines[0] || '', name: lines[1] || '', other: lines.slice(2).join(' ') || '' }
        }
        return seat
      })
      seatingChart.value = { isVisible: rawValue.isVisible || false, isRotated: rawValue.isRotated || false, seats: normalizedSeats, settings: rawValue.settings || {} }
    }
    
    const hygieneSetting = sysData.find(s => s.setting_key === 'hygiene_management_data')
    if (hygieneSetting && hygieneSetting.setting_value) { hygieneData.value = { ...JSON.parse(JSON.stringify(defaultHygieneData)), ...hygieneSetting.setting_value } }
  }

  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  
  if (sData) {
    allStudents.value = sData.filter(s => !s.hide_attendance)
  }

  const { data: attData } = await supabase.from('attendances').select('*').eq('record_date', todayISO)
  if (attData) todayAttendances.value = attData

  try {
    const { data: msgData } = await supabase.from('private_messages')
      .select('*')
      .neq('sender_role', '導師')

    if (msgData) {
      const unreadParents = msgData.filter(m => m.chat_type === '家長' && (m.is_read_by_teacher === false || m.is_read_by_admin === false)).length
      const unreadStudents = msgData.filter(m => m.chat_type === '學生' && (m.is_read_by_teacher === false || m.is_read_by_admin === false)).length
      unreadMsgCount.value = isIpBrownlisted.value ? (unreadParents + unreadStudents) : unreadParents
    }
  } catch (e) {
    console.error('無法取得未讀私訊數量', e)
  }
}

const isScheduleButtonVisible = computed(() => {
  if (!scheduleButtonConfig.value.isVisible) return false
  if (scheduleButtonConfig.value.visibility === 'both') return true
  if (scheduleButtonConfig.value.visibility === 'inside' && isIpBrownlisted.value) return true
  if (scheduleButtonConfig.value.visibility === 'outside' && !isIpBrownlisted.value) return true
  return false
})

const openLargeSchedule = () => {
  showLargeSchedule.value = true
}

onMounted(() => { 
  updateTime(); timer = setInterval(updateTime, 1000); 
  checkIpRules().then(() => { logVisit(); fetchData() }) 
})
onUnmounted(() => { if (timer) clearInterval(timer) })

const addContactItem = () => { editingContactItems.value.push('') }
const removeContactItem = (idx) => { editingContactItems.value.splice(idx, 1) }
const updateEditingContactItem = (index, value) => { editingContactItems.value[index] = value }

const saveContactItems = async () => {
  try {
    await supabase.from('contact_books').upsert({ record_date: todayISO, contact_items: editingContactItems.value }, { onConflict: 'record_date' })
    alert("✅ 聯絡簿已成功更新發布！")
    contactBookItems.value = [...editingContactItems.value]; isEditingContact.value = false
  } catch (error) { alert("❌ 聯絡簿儲存失敗：" + error.message) }
}

const addClassNoteItem = () => { editingClassNoteItems.value.push('') }
const removeClassNoteItem = (idx) => { editingClassNoteItems.value.splice(idx, 1) }
const updateEditingClassNoteItem = (index, value) => { editingClassNoteItems.value[index] = value }

const saveClassNoteItems = async () => {
  try {
    const { data: currentSettings } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'class_notes_data').maybeSingle()
    
    let updatedData = currentSettings?.setting_value || {}
    updatedData[todayISO] = editingClassNoteItems.value

    await supabase.from('system_settings').upsert({
      setting_key: 'class_notes_data',
      setting_value: updatedData
    }, { onConflict: 'setting_key' })

    alert("✅ 注意事項已成功更新發布！")
    classNoteItems.value = [...editingClassNoteItems.value]
    isEditingClassNotes.value = false
  } catch (error) { alert("❌ 儲存失敗：" + error.message) }
}
</script>

<style scoped>
.page-container { min-height: 100vh; background-color: #f3f4f6; padding: 20px; font-family: sans-serif; display: flex; flex-direction: column; gap: 20px; transition: 0.3s; }
.is-exam-mode { padding: 0; background: var(--ex-bg); overflow: hidden; }

.main-split { display: flex; gap: 20px; align-items: flex-start; }
.left-panel { flex: 1; display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.right-panel { flex: 1; min-width: 0; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 20px; box-sizing: border-box; }
.pwd-modal-content { background: white; padding: 25px 30px; border-radius: 12px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center;}
.pwd-modal-content h3 { margin: 0 0 15px 0; color: #1e293b; font-size: 1.4rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
.pwd-desc { color: #64748b; font-size: 1.05rem; margin-bottom: 20px; }
.pwd-input { width: 100%; padding: 12px 15px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 25px; font-size: 1.2rem; text-align: center; box-sizing: border-box;}
.pwd-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
.pwd-actions { display: flex; justify-content: center; gap: 15px; }
.pwd-actions button { padding: 10px 25px; border-radius: 8px; font-weight: bold; font-size: 1.05rem; cursor: pointer; border: none;}
.confirm-btn { background: #3b82f6; color: white; }
.cancel-btn { background: #e2e8f0; color: #475569; }

@media (max-width: 1024px) { .main-split { flex-direction: column; } }
@media (max-width: 768px) {
  .page-container { padding: 10px; }
}

:deep(.text-sm) { font-size: 0.9rem !important; line-height: 1.5; }
:deep(.text-xs) { font-size: 0.75rem !important; color: #64748b; font-weight: normal; line-height: 1.4; }
:deep(.mt-10) { margin-top: 10px; }
:deep(.mt-15) { margin-top: 15px; }

:deep(.custom-table) { width: 100%; border-collapse: collapse; min-width: 800px; text-align: center; font-size: 0.95rem; }
:deep(.custom-table th), :deep(.custom-table td) { border: 1px solid #000; padding: 8px; vertical-align: middle; }
:deep(.custom-table th) { background-color: #f1f5f9; font-weight: bold; }
:deep(.header-row th) { background-color: #e2e8f0; }
:deep(.morning-table td:nth-child(1)), :deep(.morning-table td:nth-child(2)) { font-weight: bold; }
:deep(.lunch-table th) { background: transparent; font-weight: bold; }
:deep(.lunch-table td) { background: transparent; }
:deep(.seat-num), :deep(.seat-number) { font-size: 1.2rem; font-weight: bold; }

:deep(.morning-table tbody tr td:nth-child(2)) { font-size: var(--name-size, 25px) !important; font-weight: bold !important; }
:deep(.morning-table tbody tr td[rowspan] + td) { font-size: inherit !important; font-weight: normal !important; }
:deep(.morning-table tbody tr td[rowspan] + td + td) { font-size: var(--name-size, 25px) !important; font-weight: bold !important; }
:deep(.lunch-table tbody tr:nth-child(even) td) { font-size: var(--name-size, 25px) !important; font-weight: bold !important; }
:deep(.squad-table tbody tr td:nth-child(2)) { font-size: var(--name-size, 25px) !important; font-weight: bold !important; }
:deep(.squad-table tbody tr td[rowspan] + td) { font-size: inherit !important; font-weight: normal !important; }
:deep(.squad-table tbody tr td[rowspan] + td + td) { font-size: var(--name-size, 25px) !important; font-weight: bold !important; }
</style>
