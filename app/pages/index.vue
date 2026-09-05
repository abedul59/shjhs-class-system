<template>
  <div class="page-container" :class="{ 'is-exam-mode': isExamModeView }">
    
    <!-- 大考儀表板核心運算 -->
    <ExamModeManager 
      v-if="isExamModeView && isIpBrownlisted" 
      :examData="examData" :nowTick="nowTick" :currentTime="currentTime" :isIpBrownlisted="isIpBrownlisted"
      @exit="isExamModeView = false" 
    />

    <div v-if="!isExamModeView" class="normal-home-content">
      
      <!-- 頂部身分狀態列 -->
      <TopIdentityBanner 
        v-if="!isIpBrownlisted" 
        :currentIdentity="currentIdentity" 
        @change-identity="showIdentityModal = true" 
      />

      <div v-if="isContentVisible">
        <!-- 💡 班級公佈欄 (已恢復正常渲染) -->
        <NoticeBoards 
          :isIpBrownlisted="isIpBrownlisted" 
          :isNoticeBoardVisibleOnIndex="isNoticeBoardVisibleOnIndex" 
          :parentNotices="parentNotices" 
          :isParentAnnouncementVisibleOnIndex="isParentAnnouncementVisibleOnIndex" 
          :parentAnnouncements="parentAnnouncements" 
          :isAnnouncementVisibleOnIndex="isAnnouncementVisibleOnIndex" 
          :announcements="announcements" 
          :privacyFilter="privacyFilter" 
          :formatDateTime="formatDateTime" 
          :formatNL="formatNL" 
        />

        <div class="main-split">
          <div class="left-panel">
            
            <ControlPanel 
              :clockConfig="clockConfig" 
              :currentTime="currentTime" 
              :unreadMsgCount="unreadMsgCount" 
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
              @enterExam="isExamModeView = true" 
              @openLargeSchedule="openLargeSchedule" 
              @openPwd="openPwdModal" 
              @update:showSeatingChartLocal="showSeatingChartLocal = $event" 
              @update:showHygieneLocal="showHygieneLocal = $event" 
            />
            
            <AttendanceGrid 
              v-if="isIpBrownlisted" 
              :allStudents="allStudents" 
              :todayAttendances="todayAttendances" 
              :expectedCount="expectedCount" 
              :presentCount="presentCount" 
              :leaveCount="leaveCount" 
              :lateCount="lateCount" 
              :absentCount="absentCount" 
              :privacyFilter="privacyFilter" 
              @toggle-attendance="toggleAttendance" 
            />
            
            <div v-if="isIpBrownlisted && !isWeekday" class="weekend-prompt">
              🌴 今天是週末，點名版僅供查閱，點擊需輸入導師密碼解鎖。
            </div>
          </div>

          <div class="right-panel">
            <ClassNotes :classNoteItems="classNoteItems" :editingClassNoteItems="editingClassNoteItems" :isEditingClassNotes="isEditingClassNotes" :todayDisplay="todayDisplay" :privacyFilter="privacyFilter" @open-pwd="openPwdModal('classNotes')" @cancel-edit="isEditingClassNotes = false" @save-items="saveClassNoteItems" @add-item="addClassNoteItem" @remove-item="removeClassNoteItem" @update-item="updateEditingClassNoteItem" />
            <ContactBook :contactBookItems="contactBookItems" :editingContactItems="editingContactItems" :isEditingContact="isEditingContact" :todayDisplay="todayDisplay" :privacyFilter="privacyFilter" @open-pwd="openPwdModal('contact')" @cancel-edit="isEditingContact = false" @save-items="saveContactItems" @add-item="addContactItem" @remove-item="removeContactItem" @update-item="updateEditingContactItem" />
          </div>
        </div>
        
        <SeatingAndHygiene :seatingChart="seatingChart" :showSeatingChartLocal="showSeatingChartLocal" :indexButtonSettings="indexButtonSettings" :hygieneData="hygieneData" :showHygieneLocal="showHygieneLocal" :privacyFilter="privacyFilter" :formatNL="formatNL" />
      </div>
      
      <!-- 未通過驗證的鎖定畫面 -->
      <SystemLockedGuard v-else />
    </div> 

    <!-- 模態彈窗區 -->
    <PasswordModal :show="showPwdModal" :title="pwdModalTitle" :desc="pwdModalDesc" :target="pwdTarget" :officerPasswords="officerPasswords" @close="showPwdModal = false" @success="handlePwdSuccess" />
    <IdentityModal :show="showIdentityModal" :students="allStudentsForLogin" :schools="availableSchools" :expectedTeacherPwd="expectedTeacherPwd" :hasCurrentIdentity="currentIdentity !== '匿名來訪者'" :privacyFilter="privacyFilter" @close="showIdentityModal = false" @verified="handleIdentityVerified" />
    <LargeScheduleModal v-if="showLargeSchedule" :scheduleData="scheduleData" :scheduleButtonConfig="scheduleButtonConfig" :isIpBrownlisted="isIpBrownlisted" :privacyFilter="privacyFilter" @close="showLargeSchedule = false" />
    <EmergencyModal v-if="showEmergencyModal" @close="showEmergencyModal = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// 引用的所有元件
import ExamModeManager from '~~/components/home/ExamModeManager.vue'
import TopIdentityBanner from '~~/components/home/TopIdentityBanner.vue'
import SystemLockedGuard from '~~/components/home/SystemLockedGuard.vue'
import AttendanceGrid from '~~/components/home/AttendanceGrid.vue'
import ContactBook from '~~/components/home/ContactBook.vue'
import ClassNotes from '~~/components/home/ClassNotes.vue'
import SeatingAndHygiene from '~~/components/home/SeatingAndHygiene.vue'
import NoticeBoards from '~~/components/home/NoticeBoards.vue'
import ControlPanel from '~~/components/home/ControlPanel.vue'
import LargeScheduleModal from '~~/components/home/LargeScheduleModal.vue'
import PasswordModal from '~~/components/home/PasswordModal.vue'
import IdentityModal from '~~/components/home/IdentityModal.vue'

const supabase = useSupabaseClient()

// UI 顯示控制狀態
const showEmergencyModal = ref(false)
const showSeatingChartLocal = ref(false)
const showHygieneLocal = ref(false)
const isHistoryVisibleOnIndex = ref(false)
const isAnnouncementVisibleOnIndex = ref(true)
const isNoticeBoardVisibleOnIndex = ref(true)
const isParentAnnouncementVisibleOnIndex = ref(true)
const showLargeSchedule = ref(false)
const isExamModeView = ref(false)

const isIpWhitelisted = ref(false)
const isIpBrownlisted = ref(false)
const currentIpStr = ref('')
const unreadMsgCount = ref(0)
const clockConfig = ref({ theme: 'classic', color: '#1e293b', size: 35, showIcon: true })
const autoRefreshSeconds = ref(60) 
let dataRefreshTimer = null

// 核心資料狀態
const announcements = ref([])
const parentAnnouncements = ref([])
const scheduleData = ref(null)
const examData = ref({ isExamModeEnabled: true, theme: 'midnight', title: '', periods: [] })
const scheduleButtonConfig = ref({ isVisible: false, visibility: 'both', teacherOnlyInBrownlist: true })

// 權限與身分狀態
const showIdentityModal = ref(false)
const currentIdentity = ref('匿名來訪者')
const expectedTeacherPwd = ref('168168168')
const globalButtonSettings = ref({})
const defaultRoleSettings = {
  anonymous: { parentBind: true, parentMsg: true, studentMsg: true, schedule: true, assignments: true, discipline: true, hygiene: true, seats: true, manageSchedule: false, exams: false, emergency: true, admin: false, showSeats: false, showHygiene: false, contactHistory: false },
  classroom: { parentBind: false, parentMsg: false, studentMsg: false, schedule: true, assignments: true, discipline: true, hygiene: true, seats: true, manageSchedule: false, exams: false, emergency: true, admin: false, showSeats: true, showHygiene: true, contactHistory: true },
  parent: { parentBind: false, parentMsg: true, studentMsg: false, schedule: true, assignments: true, discipline: true, hygiene: true, seats: true, manageSchedule: false, exams: false, emergency: true, admin: false, showSeats: false, showHygiene: false, contactHistory: true },
  student: { parentBind: false, parentMsg: false, studentMsg: true, schedule: true, assignments: true, discipline: true, hygiene: true, seats: true, manageSchedule: false, exams: false, emergency: true, admin: false, showSeats: false, showHygiene: false, contactHistory: true },
  subject_teacher: { parentBind: false, parentMsg: false, studentMsg: false, schedule: true, assignments: true, discipline: true, hygiene: true, seats: true, manageSchedule: false, exams: false, emergency: true, admin: false, showSeats: true, showHygiene: true, contactHistory: true },
  teacher: { parentBind: true, parentMsg: true, studentMsg: true, schedule: true, assignments: true, discipline: true, hygiene: true, seats: true, manageSchedule: true, exams: true, emergency: true, admin: true, showSeats: true, showHygiene: true, contactHistory: true }
}
const roleButtonSettings = ref(JSON.parse(JSON.stringify(defaultRoleSettings)))

const activeRoleCategory = computed(() => {
  const id = currentIdentity.value;
  if (id.includes('導師')) return 'teacher'; if (id.includes('任課老師')) return 'subject_teacher';
  if (id.includes('家長')) return 'parent'; if (id.includes('學生')) return 'student';
  return isIpBrownlisted.value ? 'classroom' : 'anonymous';
})

const indexButtonSettings = computed(() => {
  const roleSettings = roleButtonSettings.value[activeRoleCategory.value] || defaultRoleSettings.anonymous
  const effectiveSettings = {}
  for (const key in roleSettings) { effectiveSettings[key] = globalButtonSettings.value[key] === false ? false : roleSettings[key] }
  return effectiveSettings
})

const isContentVisible = computed(() => isIpBrownlisted.value || currentIdentity.value !== '匿名來訪者')
const availableSchools = computed(() => {
  if (!allStudentsForLogin.value || allStudentsForLogin.value.length === 0) return []
  const schools = allStudentsForLogin.value.map(s => s.graduated_school || s.elementary_school || s.elem_school || s.school || s.school_name).filter(Boolean)
  const uniqueSchools = [...new Set(schools)].sort()
  return uniqueSchools.length === 0 ? ['【資料庫尚未建立國小資料】'] : uniqueSchools
})

const checkIdentity = () => {
  currentIdentity.value = localStorage.getItem('visitor_known_identity') || '匿名來訪者'
  if (!isIpBrownlisted.value && currentIdentity.value === '匿名來訪者') showIdentityModal.value = true
}

const handleIdentityVerified = async (finalIdentity) => {
  localStorage.setItem('visitor_known_identity', finalIdentity); currentIdentity.value = finalIdentity; showIdentityModal.value = false
  await supabase.from('visitor_logs').insert([{ ip_address: currentIpStr.value || '未知IP', device_info: navigator.userAgent, role: finalIdentity, action_details: `🔑 綁定設備身分：${finalIdentity}` }])
}

const checkIpRules = async () => {
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json'); const { ip } = await ipRes.json(); currentIpStr.value = ip 
    const { data: rules } = await supabase.from('ip_rules').select('ip_range, rule_type')
    if (rules && rules.length > 0) {
      isIpWhitelisted.value = rules.filter(r => r.rule_type === '白名單').some(r => ip.startsWith(r.ip_range))
      isIpBrownlisted.value = rules.filter(r => r.rule_type === '褐名單').some(r => ip.startsWith(r.ip_range))
    }
  } catch (e) {}
}

const logVisit = async () => {
  if (sessionStorage.getItem('visit_logged')) return
  try {
    let role = localStorage.getItem('visitor_known_identity') || '匿名來訪者'
    if (sessionStorage.getItem('schedule_admin_logged_in') === 'true' || sessionStorage.getItem('exams_admin_logged_in') === 'true') role = '導師'
    await supabase.from('visitor_logs').insert([{ ip_address: currentIpStr.value || '未知IP', device_info: navigator.userAgent, role: role, action_details: '👁️ 瀏覽頁面：班級首頁' }])
    sessionStorage.setItem('visit_logged', 'true')
  } catch (e) {}
}

const logRoleVisit = async (roleName) => await supabase.from('visitor_logs').insert([{ ip_address: currentIpStr.value || '未知IP', device_info: navigator.userAgent, role: roleName, action_details: `🔑 解鎖後台：${roleName}` }]).catch(e => {})
const logAudit = async (actionType, details) => await supabase.from('assignment_audit_logs').insert({ subject_name: '首頁黑板', action_type: actionType, operator_role: currentEditorRole.value || '導師', details: details }).catch(e => {})

const privacyFilter = (txt) => {
  let result = String(txt || '')
  if (!isIpWhitelisted.value && allStudentsForLogin.value && allStudentsForLogin.value.length > 0) {
    [...allStudentsForLogin.value].sort((a, b) => (b.real_name || '').length - (a.real_name || '').length).forEach(stu => {
      if (stu.real_name && stu.hidden_name && stu.real_name.trim() !== '') result = result.split(stu.real_name).join(stu.hidden_name)
    })
  }
  return result
}

const formatNL = (txt) => privacyFilter(txt).replace(/\n/g, '<br>')
const formatDateTime = (dtStr) => dtStr ? new Date(dtStr).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : ''

const dDate = new Date(); const todayISO = `${dDate.getFullYear()}-${String(dDate.getMonth()+1).padStart(2,'0')}-${String(dDate.getDate()).padStart(2,'0')}`
const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const todayDisplay = `${dDate.getFullYear()}年${dDate.getMonth()+1}月${dDate.getDate()}日${days[dDate.getDay()]}`
const isWeekday = dDate.getDay() !== 0 && dDate.getDay() !== 6

const currentTime = ref(''); const nowTick = ref(Date.now()); let timer = null
const updateTime = () => { nowTick.value = Date.now(); currentTime.value = new Date().toLocaleTimeString('zh-TW', { hour12: false }) }

const scheduleDisplay = computed(() => {
  if (!scheduleData.value || !scheduleData.value.periods) return null
  const now = new Date(nowTick.value); const currentDayIndex = now.getDay() - 1 
  if (currentDayIndex < 0 || currentDayIndex > 4) return { current: { status: '放假中', label: '週末', subject: '週末休息', teacher: '' }, next: null }
  
  const nowMins = now.getHours() * 60 + now.getMinutes()
  let currentClass = { status: '下課中', label: '目前', subject: '休息時間', teacher: '' }; let nextClass = null
  const maskTeacherName = (name) => { if (!name) return ''; return name.length >= 3 ? name.charAt(0) + 'Ｏ' + name.charAt(name.length - 1) : (name.length === 2 ? name.charAt(0) + 'Ｏ' : 'ＯＯＯ') }
  
  for (let i = 0; i < scheduleData.value.periods.length; i++) {
    const p = scheduleData.value.periods[i]
    if (!p.startTime || !p.endTime) continue
    const startMins = p.startTime.split(':')[0] * 60 + Number(p.startTime.split(':')[1])
    const endMins = p.endTime.split(':')[0] * 60 + Number(p.endTime.split(':')[1])
    const dayData = p.days[currentDayIndex]; if (!dayData || !dayData.subject) continue
    const safeTeacher = isIpBrownlisted.value ? (dayData.teacher || '') : maskTeacherName(dayData.teacher)
    
    if (nowMins >= startMins && nowMins <= endMins) {
      currentClass = { status: '上課中', label: p.name, subject: dayData.subject, teacher: safeTeacher }
      for (let j = i + 1; j < scheduleData.value.periods.length; j++) {
        const nextDayData = scheduleData.value.periods[j].days[currentDayIndex]
        if (nextDayData && nextDayData.subject) { nextClass = { subject: nextDayData.subject, teacher: isIpBrownlisted.value ? (nextDayData.teacher || '') : maskTeacherName(nextDayData.teacher) }; break }
      }
      break
    }
    if (nowMins < startMins && !nextClass) nextClass = { subject: dayData.subject, teacher: safeTeacher } 
  }
  return { current: currentClass, next: nextClass }
})

const parentNotices = ref([]); const officerPasswords = ref({ academic: '', counseling: '', discipline: '', teacher: '168168168' })
const seatingChart = ref({ isVisible: false, isRotated: false, seats: [], settings: {} })
const hygieneData = ref({ isVisibleOnIndex: false, morning: { title: '', sweep_names: '', mop_names: '' }, lunch: { title: '' }, squad: { title: '' } })
const contactBookItems = ref([]); const isEditingContact = ref(false); const editingContactItems = ref([])
const classNoteItems = ref([]); const isEditingClassNotes = ref(false); const editingClassNoteItems = ref([])
const currentEditorRole = ref(''); const showPwdModal = ref(false); const pwdTarget = ref(''); const pwdModalTitle = ref(''); const pwdModalDesc = ref('')

const openPwdModal = (target) => {
  pwdTarget.value = target
  if (target === 'emergency') { pwdModalTitle.value = '🚨 緊急通知系統解鎖'; pwdModalDesc.value = '請輸入「導師」密碼：' } 
  else if (target === 'contact') { pwdModalTitle.value = '✏️ 編輯聯絡簿解鎖'; pwdModalDesc.value = '請輸入「學藝股長」、「輔導股長」或「導師」密碼：' } 
  else if (target === 'classNotes') { pwdModalTitle.value = '⚡ 編輯注意事項解鎖'; pwdModalDesc.value = '請輸入「學藝股長」、「輔導股長」或「導師」密碼：' }
  showPwdModal.value = true
}

const handlePwdSuccess = async ({ target, role }) => {
  showPwdModal.value = false; currentEditorRole.value = role
  if (target === 'emergency') showEmergencyModal.value = true
  else if (target === 'contact') { isEditingContact.value = true; editingContactItems.value = [...contactBookItems.value] } 
  else if (target === 'classNotes') { isEditingClassNotes.value = true; editingClassNoteItems.value = [...classNoteItems.value] }
  await logRoleVisit(role)
}

const allStudents = ref([]); const allStudentsForLogin = ref([]); const todayAttendances = ref([])
const expectedCount = computed(() => allStudents.value.length)
const presentCount = computed(() => todayAttendances.value.filter(a => a.status === '已到').length)
const leaveCount = computed(() => todayAttendances.value.filter(a => a.status === '請假').length)
const lateCount = computed(() => todayAttendances.value.filter(a => a.status && a.status.startsWith('遲到')).length)
const absentCount = computed(() => expectedCount.value - presentCount.value - leaveCount.value - lateCount.value)

const toggleAttendance = async (student) => {
  if (!isWeekday) {
    const pwd = prompt("🌴 週末預設不開放點名。\n若需強制修改，請輸入導師密碼：")
    if (pwd !== expectedTeacherPwd.value && pwd !== '168168168' && pwd !== '1681681681') { if (pwd !== null) alert("❌ 密碼錯誤！"); return }
  }
  const currentStatus = todayAttendances.value.find(a => a.student_id === student.id)?.status || '未到'
  let nextStatus = '已到'; if (currentStatus === '已到') nextStatus = '請假'; else if (currentStatus === '請假') nextStatus = '遲到'; else if (currentStatus.startsWith('遲到')) nextStatus = '未到'
  let record = todayAttendances.value.find(a => a.student_id === student.id)
  if (record) record.status = nextStatus; else todayAttendances.value.push({ student_id: student.id, record_date: todayISO, status: nextStatus })
  try {
    const { data: existing } = await supabase.from('attendances').select('id').eq('student_id', student.id).eq('record_date', todayISO).maybeSingle()
    if (existing) await supabase.from('attendances').update({ status: nextStatus }).eq('id', existing.id); else await supabase.from('attendances').insert({ student_id: student.id, record_date: todayISO, status: nextStatus })
  } catch (err) {}
}

// 💡 修正：堅不可摧的資料加載器 (Switch + Safe Chaining)，拒絕任何 Null Error
const fetchData = async () => {
  const { data: boardData } = await supabase.from('contact_books').select('contact_items').eq('record_date', todayISO).maybeSingle()
  contactBookItems.value = boardData?.contact_items || []

  const { data: sysData } = await supabase.from('system_settings').select('*').in('setting_key', [
    'board_officer_passwords', 'seating_chart_data', 'hygiene_management_data', 'contact_history_visible', 'index_button_settings', 'announcements_data', 'class_schedule_data', 'exam_schedule_data', 'parent_notices_data', 'class_notes_data', 'announcement_board_visible', 'parent_notices_board_visible', 'parent_announcements_data', 'parent_announcement_board_visible', 'schedule_button_settings', 'index_clock_size', 'index_clock_config', 'index_auto_refresh_seconds', 'role_button_settings'
  ])
  
  if (sysData) {
    sysData.forEach(s => {
      const v = s.setting_value
      if (v === null || v === undefined) return // 絕對防禦機制，遇到空值立刻跳過

      switch (s.setting_key) {
        case 'board_officer_passwords': officerPasswords.value = { ...officerPasswords.value, ...v }; break;
        case 'contact_history_visible': isHistoryVisibleOnIndex.value = v; break;
        case 'index_button_settings': globalButtonSettings.value = v; break;
        case 'role_button_settings': roleButtonSettings.value = { ...defaultRoleSettings, ...v }; break;
        case 'index_clock_config': clockConfig.value = { ...clockConfig.value, ...v }; break;
        case 'index_clock_size': 
          if (!sysData.find(x => x.setting_key === 'index_clock_config')) clockConfig.value.size = Number(v) || 35; 
          break;
        case 'announcements_data': announcements.value = (v || []).sort((a, b) => new Date(b.date) - new Date(a.date)); break;
        case 'parent_announcements_data': parentAnnouncements.value = (v || []).sort((a, b) => new Date(b.date) - new Date(a.date)); break;
        case 'announcement_board_visible': isAnnouncementVisibleOnIndex.value = v; break;
        case 'parent_announcement_board_visible': isParentAnnouncementVisibleOnIndex.value = v; break;
        case 'parent_notices_board_visible': isNoticeBoardVisibleOnIndex.value = v; break;
        case 'class_schedule_data': scheduleData.value = v; break;
        case 'schedule_button_settings': scheduleButtonConfig.value = { teacherOnlyInBrownlist: true, ...v }; break;
        case 'index_auto_refresh_seconds': autoRefreshSeconds.value = Number(v) || 60; break;
        case 'exam_schedule_data': examData.value = { ...examData.value, ...v }; break;
        case 'parent_notices_data': 
          parentNotices.value = (v || []).filter(n => (!n.startDate || n.startDate <= todayISO) && (!n.endDate || n.endDate >= todayISO)).map(n => n.content); 
          break;
        case 'class_notes_data': classNoteItems.value = v[todayISO] || []; break;
        case 'seating_chart_data': 
          seatingChart.value = { 
            isVisible: v.isVisible || false, isRotated: v.isRotated || false, 
            seats: (v.seats || []).map(seat => seat.content !== undefined ? { id: seat.id, isHidden: seat.isHidden, seatNum: String(seat.content).split('\n')[0] || '', name: String(seat.content).split('\n')[1] || '', other: String(seat.content).split('\n').slice(2).join(' ') || '' } : seat), 
            settings: v.settings || {} 
          }; break;
        case 'hygiene_management_data': hygieneData.value = { ...hygieneData.value, ...v }; break;
      }
    })
    
    // 兼容舊版設定檔防護
    if (!sysData.find(s => s.setting_key === 'role_button_settings') && globalButtonSettings.value) {
      roleButtonSettings.value.anonymous = { ...roleButtonSettings.value.anonymous, ...globalButtonSettings.value }
    }
  }

  // 以下代碼現在能 100% 被執行到，學生與點名資料不會再變成空白了
  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  if (sData) { allStudentsForLogin.value = sData; allStudents.value = sData.filter(s => !s.hide_attendance) }
  
  const { data: attData } = await supabase.from('attendances').select('*').eq('record_date', todayISO)
  if (attData) todayAttendances.value = attData

  try {
    const { data: msgData } = await supabase.from('private_messages').select('*').neq('sender_role', '導師')
    if (msgData) {
      const uParents = msgData.filter(m => m.chat_type === '家長' && (!m.is_read_by_teacher || !m.is_read_by_admin)).length
      const uStudents = msgData.filter(m => m.chat_type === '學生' && (!m.is_read_by_teacher || !m.is_read_by_admin)).length
      unreadMsgCount.value = isIpBrownlisted.value ? (uParents + uStudents) : uParents
    }
  } catch (e) {}
}

const startAutoRefresh = () => {
  if (dataRefreshTimer) clearInterval(dataRefreshTimer)
  if (autoRefreshSeconds.value > 0) dataRefreshTimer = setInterval(fetchData, autoRefreshSeconds.value * 1000)
}
watch(autoRefreshSeconds, startAutoRefresh)

const isScheduleButtonVisible = computed(() => {
  if (!scheduleButtonConfig.value.isVisible) return false
  if (scheduleButtonConfig.value.visibility === 'both') return true
  if (scheduleButtonConfig.value.visibility === 'inside' && isIpBrownlisted.value) return true
  if (scheduleButtonConfig.value.visibility === 'outside' && !isIpBrownlisted.value) return true
  return false
})
const openLargeSchedule = () => showLargeSchedule.value = true

onMounted(() => { 
  updateTime(); timer = setInterval(updateTime, 1000)
  checkIpRules().then(() => { loadTeacherPwd(); fetchData().then(() => { checkIdentity(); logVisit(); startAutoRefresh() }) }) 
})
onUnmounted(() => { if (timer) clearInterval(timer); if (dataRefreshTimer) clearInterval(dataRefreshTimer) })

const addContactItem = () => editingContactItems.value.push('')
const removeContactItem = (idx) => editingContactItems.value.splice(idx, 1)
const updateEditingContactItem = (index, value) => editingContactItems.value[index] = value
const saveContactItems = async () => {
  try {
    await supabase.from('contact_books').upsert({ record_date: todayISO, contact_items: editingContactItems.value }, { onConflict: 'record_date' })
    await logAudit('修改聯絡簿', `將今日聯絡簿更新為：${editingContactItems.value.length > 0 ? editingContactItems.value.join('、') : '清空'}`)
    alert("✅ 聯絡簿已成功更新發布！"); contactBookItems.value = [...editingContactItems.value]; isEditingContact.value = false
  } catch (error) { alert("❌ 儲存失敗") }
}

const addClassNoteItem = () => editingClassNoteItems.value.push('')
const removeClassNoteItem = (idx) => editingClassNoteItems.value.splice(idx, 1)
const updateEditingClassNoteItem = (index, value) => editingClassNoteItems.value[index] = value
const saveClassNoteItems = async () => {
  try {
    const { data: currentSettings } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'class_notes_data').maybeSingle()
    let updatedData = currentSettings?.setting_value || {}
    updatedData[todayISO] = editingClassNoteItems.value
    await supabase.from('system_settings').upsert({ setting_key: 'class_notes_data', setting_value: updatedData }, { onConflict: 'setting_key' })
    await logAudit('修改注意事項', `將今日班級注意事項更新為：${editingClassNoteItems.value.length > 0 ? editingClassNoteItems.value.join('、') : '清空'}`)
    alert("✅ 注意事項已成功更新發布！"); classNoteItems.value = [...editingClassNoteItems.value]; isEditingClassNotes.value = false
  } catch (error) { alert("❌ 儲存失敗") }
}
</script>

<style scoped>
.page-container { min-height: 100vh; background-color: #f3f4f6; padding: 20px; font-family: sans-serif; display: flex; flex-direction: column; gap: 20px; transition: 0.3s; }
.is-exam-mode { padding: 0; background: var(--ex-bg); overflow: hidden; }

.main-split { display: flex; gap: 20px; align-items: flex-start; }
.left-panel { flex: 1; display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.right-panel { flex: 1; min-width: 0; }

.weekend-prompt { text-align: center; padding: 15px; background: #fef3c7; border: 2px dashed #fde68a; border-radius: 8px; color: #d97706; font-size: 1rem; font-weight: bold; margin-top: 10px;}

@media (max-width: 1024px) { .main-split { flex-direction: column; } }
@media (max-width: 768px) { .page-container { padding: 10px; } }

:deep(.text-sm) { font-size: 0.9rem !important; line-height: 1.5; }
:deep(.text-xs) { font-size: 0.75rem !important; color: #64748b; font-weight: normal; line-height: 1.4; }
:deep(.mt-10) { margin-top: 10px; }
:deep(.mt-15) { margin-top: 15px; }
</style>
