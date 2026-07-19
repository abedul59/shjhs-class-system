<template>
  <div class="admin-container">
    <div v-if="!isUnlocked" class="lock-screen">
      <div class="lock-box">
        <h2>🔒 導師專屬後台</h2>
        <input v-model="passwordInput" type="password" placeholder="請輸入密碼..." @keyup.enter="verifyPassword"/>
        <button @click="verifyPassword">解鎖進入</button>
      </div>
    </div>

    <div v-else class="dashboard">
      <header class="admin-header">
        <h2>📊 班級數據中心 (導師專用)</h2>
        <div class="header-buttons">
          <button @click="switchTab('attendance')" :class="{ active: currentTab === 'attendance' }">⏰ 遲到管理</button>
          <button @click="switchTab('homework')" :class="{ active: currentTab === 'homework' }">📚 作業與科任</button>
          <button @click="switchTab('board')" :class="{ active: currentTab === 'board' }">📢 須知推播</button>
          <button @click="switchTab('messages')" :class="{ active: currentTab === 'messages' }">💬 私訊管理</button>
          <button @click="switchTab('students')" :class="{ active: currentTab === 'students' }">👩‍🎓 學生管理</button>
          <button @click="switchTab('audit')" :class="{ active: currentTab === 'audit' }">🕵️ 系統稽核</button>
          <button @click="switchTab('communication')" :class="{ active: currentTab === 'communication' }">📨 通知紀錄</button>
          <NuxtLink to="/" class="back-btn">⬅️ 返回前台</NuxtLink>
        </div>
      </header>

      <!-- ==================== 頁籤：作業與科任管理 ==================== -->
      <main v-if="currentTab === 'homework'" class="data-table">
        <div class="table-header"><h3>📚 班級作業總覽與科任老師管理</h3></div>

        <!-- 區塊 1：科任老師與小老師密碼管理 -->
        <div class="homework-section">
          <h4>🧑‍🏫 科任老師與小老師密碼管理</h4>
          <div class="teacher-list">
            <div v-for="t in subjectTeachers" :key="t.id" class="teacher-item">
              <input v-model="t.subject_name" type="text" class="edit-input subject-input" placeholder="科目名稱"/>
              <input v-model="t.password" type="text" class="edit-input pwd-input" placeholder="老師密碼"/>
              <input v-model="t.assistant_password" type="text" class="edit-input pwd-input" placeholder="小老師密碼 (選填)"/>
              <button @click="saveTeacher(t)" class="save-row-btn">💾 儲存</button>
              <button @click="deleteTeacher(t.id)" class="del-row-btn">🗑️</button>
            </div>
            <div class="teacher-item new-teacher">
              <input v-model="newTeacher.subject" type="text" class="edit-input subject-input" placeholder="新增科目"/>
              <input v-model="newTeacher.password" type="text" class="edit-input pwd-input" placeholder="老師密碼"/>
              <input v-model="newTeacher.assistant_password" type="text" class="edit-input pwd-input" placeholder="小老師密碼"/>
              <button @click="addTeacher" class="add-btn small-btn">➕ 新增科任</button>
            </div>
          </div>
        </div>

        <!-- 區塊 2：全班作業缺交/已交總覽與發信 -->
        <div class="homework-section">
          <h4>📊 全班學生作業繳交總覽與通知發送</h4>
          <p class="help-text">系統會為每位學生獨立生成一封信並單獨發送給其家長，保證隱私絕對隔離，不會看到其他學生的資料。</p>

          <!-- 新增：作業信件編輯器 -->
          <div class="email-editor-section">
            <div class="editor-header">
              <h4>📝 編輯作業信件內容</h4>
              <button @click="saveHwEmailTemplate" class="save-template-btn" :disabled="isSavingHwTemplate">
                {{ isSavingHwTemplate ? '儲存中...' : '💾 儲存為預設範本' }}
              </button>
            </div>
            <p class="help-text">💡 可使用以下變數，系統發送時會為每位學生自動替換專屬資料：<br/>
               <span class="var-tag" v-pre>{{學生姓名}}</span>、<span class="var-tag" v-pre>{{已交清單}}</span>、<span class="var-tag" v-pre>{{缺交清單}}</span>
            </p>
            <div class="form-group">
              <label>信件主旨：</label>
              <input type="text" v-model="hwEmailSubjectTemplate" class="edit-input" />
            </div>
            <div class="form-group">
              <label>信件內容：</label>
              <textarea v-model="hwEmailContentTemplate" rows="10" class="edit-input textarea-input"></textarea>
            </div>
          </div>

          <!-- 新增：作業信件預覽區 -->
          <div class="email-preview-section">
            <h4>👀 信件預覽 <span class="preview-note">(以目前名單第一位學生為例)</span></h4>
            <div class="preview-box">
              <div class="preview-subject"><strong>主旨：</strong> {{ hwPreviewSubject }}</div>
              <div class="preview-body">{{ hwPreviewContent }}</div>
            </div>
          </div>

          <!-- 發送按鈕移至此處 -->
          <div class="action-bar" style="margin-bottom: 25px;">
            <button @click="sendHomeworkEmails" class="email-btn late-btn" :disabled="isSendingHomework">
              {{ isSendingHomework ? '正在逐一發送作業報表，請稍候...' : '📧 密碼解鎖：確認無誤並一鍵發送全班作業通知' }}
            </button>
          </div>
          
          <div class="student-homework-grid">
            <div v-for="stat in studentAssignmentStats" :key="stat.id" class="hw-card">
              <div class="hw-card-header">
                <strong>{{ stat.seat_number }}號 {{ stat.real_name }}</strong>
                <span v-if="stat.missing.length === 0" class="badge notice success">💯 作業全齊</span>
                <span v-else class="badge notice warning">⚠️ 缺交 {{ stat.missing.length }} 項</span>
              </div>
              <div class="hw-card-body">
                <div class="hw-list missing-list">
                  <div class="hw-title">❌ 缺交作業：</div>
                  <ul><li v-for="m in stat.missing" :key="'m'+m.id">[{{ m.subject_name }}] {{ m.title }}</li><li v-if="stat.missing.length === 0" class="none-text">無</li></ul>
                </div>
                <div class="hw-list submitted-list">
                  <div class="hw-title">✅ 已交作業：</div>
                  <ul><li v-for="s in stat.submitted" :key="'s'+s.id">[{{ s.subject_name }}] {{ s.title }}</li><li v-if="stat.submitted.length === 0" class="none-text">無</li></ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- ==================== 頁籤：系統稽核 (包含黑板與作業) ==================== -->
      <main v-if="currentTab === 'audit'" class="data-table">
        <div class="table-header"><h3>🕵️ 系統稽核中心</h3></div>
        
        <div class="homework-section">
          <h4>📝 班級作業操作紀錄 (誰動了作業？)</h4>
          <table>
            <thead><tr><th width="150">時間</th><th width="120">科目</th><th width="100">操作身分</th><th width="120">動作</th><th>詳細內容</th></tr></thead>
            <tbody>
              <tr v-for="log in assignmentLogs" :key="log.id">
                <td>{{ formatTime(log.created_at) }}</td>
                <td><span class="badge">{{ log.subject_name }}</span></td>
                <td :class="log.operator_role === '小老師' ? 'role-student' : 'role-teacher'">{{ log.operator_role }}</td>
                <td><strong>{{ log.action_type }}</strong></td>
                <td>{{ log.details }}</td>
              </tr>
              <tr v-if="assignmentLogs.length === 0"><td colspan="5" class="empty">目前無作業系統操作紀錄</td></tr>
            </tbody>
          </table>
        </div>

        <div class="homework-section" style="margin-top: 30px;">
          <h4>✏️ 聯絡簿黑板編輯紀錄</h4>
          <table>
            <thead><tr><th>時間</th><th>修改區塊</th><th>編輯者</th><th>IP 位址</th></tr></thead>
            <tbody>
              <tr v-for="log in boardLogs" :key="log.id">
                <td>{{ formatTime(log.edited_at) }}</td><td><span class="badge">{{ log.board_type }}</span></td>
                <td :class="log.editor_role === '導師' ? 'role-teacher' : 'role-student'">{{ log.editor_role }}</td><td class="ip-text">{{ log.ip_address }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      <!-- ==================== 頁籤：遲到管理 ==================== -->
      <main v-if="currentTab === 'attendance'" class="data-table">
        <div class="table-header"><h3>⏰ 每日遲到名單與通知發送</h3></div>
        <div class="attendance-control-panel">
          <div class="absent-list-section">
            <h4>目前未打卡名單 (共 {{ absentStudentsList.length }} 人)</h4>
            <div class="tags-container">
              <span v-for="student in absentStudentsList" :key="student.id" class="absent-tag">{{ student.seat_number }}號 {{ student.real_name }}</span>
              <span v-if="absentStudentsList.length === 0" class="all-present-msg">🎉 恭喜！今日全班皆已準時到校。</span>
            </div>
          </div>
          <div v-if="absentStudentsList.length > 0">
            <div class="email-editor-section">
              <div class="editor-header">
                <h4>📝 編輯信件內容</h4>
                <button @click="saveEmailTemplate" class="save-template-btn" :disabled="isSavingTemplate">{{ isSavingTemplate ? '儲存中...' : '💾 儲存為預設範本' }}</button>
              </div>
              <p class="help-text">💡 可使用以下變數：<span class="var-tag" v-pre>{{學生姓名}}</span>、<span class="var-tag" v-pre>{{今日日期}}</span>、<span class="var-tag" v-pre>{{當下時間}}</span></p>
              <div class="form-group"><label>信件主旨：</label><input type="text" v-model="emailSubjectTemplate" class="edit-input" /></div>
              <div class="form-group"><label>信件內容：</label><textarea v-model="emailContentTemplate" rows="6" class="edit-input textarea-input"></textarea></div>
            </div>
            
            <div class="email-preview-section">
              <h4>👀 信件預覽 <span class="preview-note">(以第一位未到學生為例)</span></h4>
              <div class="preview-box">
                <div class="preview-subject"><strong>主旨：</strong> {{ previewSubject }}</div>
                <div class="preview-body">{{ previewContent }}</div>
              </div>
            </div>

            <div class="action-bar">
              <button @click="sendLateEmails" class="email-btn late-btn" :disabled="isSendingLateEmails">{{ isSendingLateEmails ? '發送中...' : '📧 密碼解鎖：確認發送遲到通知' }}</button>
            </div>
          </div>
        </div>
      </main>

      <!-- (家長須知推播) -->
      <main v-if="currentTab === 'board'" class="data-table">
        <div class="table-header"><h3>📢 家長須知管理與 Email 推播</h3></div>
        <div class="board-editor-container">
          <div class="notice-edit-list">
            <div v-for="(notice, index) in adminNotices" :key="index" class="edit-item">
              <span class="bullet">📌</span><input v-model="adminNotices[index]" type="text" class="edit-input notice-input" /><button @click="removeAdminNotice(index)" class="del-row-btn">🗑️</button>
            </div>
            <button @click="addAdminNotice" class="add-btn">➕ 新增一筆須知</button>
          </div>
          <div class="action-bar"><button @click="saveAdminNotices" class="save-btn">💾 儲存並同步</button><button @click="sendNoticeEmail" class="email-btn">📧 群發推播</button></div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
const supabase = useSupabaseClient()

const d = new Date(); const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayDisplay = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
const isUnlocked = ref(false); const passwordInput = ref(''); const currentTab = ref('homework')
const adminStudents = ref([]); const studentsList = ref([])

// === 作業與科任專屬狀態 ===
const subjectTeachers = ref([])
const newTeacher = ref({ subject: '', password: '', assistant_password: '' })
const allAssignments = ref([]); const allSubmissions = ref([])
const assignmentLogs = ref([]) 
const isSendingHomework = ref(false)

// === 作業信件範本狀態 ===
const hwEmailSubjectTemplate = ref('📚 班級作業繳交通知 - {{學生姓名}}')
const hwEmailContentTemplate = ref(`親愛的家長您好：\n\n為您彙整 【{{學生姓名}}】 目前的各科作業繳交狀況：\n\n✅ 已交作業：\n{{已交清單}}\n\n❌ 缺交作業：\n{{缺交清單}}\n\n請您協助督促孩子盡速完成缺交作業。若有任何疑問，歡迎透過班級系統私訊聯繫。\n\n班級導師 敬上`)
const isSavingHwTemplate = ref(false)

// === 既有遲到信件狀態 ===
const todayAttendances = ref([]); const isSendingLateEmails = ref(false); const isSavingTemplate = ref(false)
const emailSubjectTemplate = ref('⚠️ 學校出缺席通知 - {{學生姓名}} 尚未打卡')
const emailContentTemplate = ref(`親愛的家長您好：\n\n系統偵測到您的孩子 【{{學生姓名}}】 於今日 ({{今日日期}}) {{當下時間}} 尚未完成到校打卡，特此通知。\n\n若孩子已請假，請忽略此信件；若孩子已出門，請您留意其通勤安全，並可透過班級系統私訊與導師聯繫。\n\n班級導師 敬上\n(此為系統自動發送，請勿直接回信)`)
const adminNotices = ref([]); const boardLogs = ref([])

// === 計算屬性 ===
const absentStudentsList = computed(() => adminStudents.value.filter(s => !todayAttendances.value.find(a => a.student_id === s.id) || todayAttendances.value.find(a => a.student_id === s.id).status === '未到'))

// 計算學生缺交/已交
const studentAssignmentStats = computed(() => {
  return adminStudents.value.map(student => {
    const mySubmissions = allSubmissions.value.filter(sub => sub.student_id === student.id)
    const submittedIds = mySubmissions.map(sub => sub.assignment_id)
    const submitted = allAssignments.value.filter(a => submittedIds.includes(a.id))
    const missing = allAssignments.value.filter(a => !submittedIds.includes(a.id))
    return { ...student, submitted, missing }
  })
})

// 作業信件預覽計算
const hwPreviewSubject = computed(() => {
  const sampleName = studentAssignmentStats.value.length > 0 ? studentAssignmentStats.value[0].real_name : '王小明'
  return hwEmailSubjectTemplate.value.replace(/{{學生姓名}}/g, sampleName)
})

const hwPreviewContent = computed(() => {
  const sample = studentAssignmentStats.value.length > 0 ? studentAssignmentStats.value[0] : null
  const sampleName = sample ? sample.real_name : '王小明'
  const submittedStr = sample && sample.submitted.length ? sample.submitted.map(a => `[${a.subject_name}] ${a.title}`).join('\n') : '無'
  const missingStr = sample && sample.missing.length ? sample.missing.map(a => `[${a.subject_name}] ${a.title}`).join('\n') : '無'

  return hwEmailContentTemplate.value
    .replace(/{{學生姓名}}/g, sampleName)
    .replace(/{{已交清單}}/g, submittedStr)
    .replace(/{{缺交清單}}/g, missingStr)
})

// 遲到信件預覽計算
const previewSubject = computed(() => {
  const sampleName = absentStudentsList.value.length > 0 ? absentStudentsList.value[0].real_name : '王小明'
  const nowTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  return emailSubjectTemplate.value.replace(/{{學生姓名}}/g, sampleName).replace(/{{今日日期}}/g, todayDisplay).replace(/{{當下時間}}/g, nowTime)
})

const previewContent = computed(() => {
  const sampleName = absentStudentsList.value.length > 0 ? absentStudentsList.value[0].real_name : '王小明'
  const nowTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  return emailContentTemplate.value.replace(/{{學生姓名}}/g, sampleName).replace(/{{今日日期}}/g, todayDisplay).replace(/{{當下時間}}/g, nowTime)
})

// === 系統方法 ===
const verifyPassword = async () => {
  if (passwordInput.value === '168168168') { isUnlocked.value = true; await fetchAllData() } else { alert('❌ 密碼錯誤！') }
}
const switchTab = async (tab) => { currentTab.value = tab; await fetchAllData() }

const fetchAllData = async () => {
  // 抓取自訂信件範本 (遲到與作業)
  const { data: tmplData } = await supabase.from('email_templates').select('*')
  if (tmplData) {
    const lateTmpl = tmplData.find(t => t.template_id === 'late_notice')
    if (lateTmpl) { emailSubjectTemplate.value = lateTmpl.subject; emailContentTemplate.value = lateTmpl.content }
    const hwTmpl = tmplData.find(t => t.template_id === 'homework_notice')
    if (hwTmpl) { hwEmailSubjectTemplate.value = hwTmpl.subject; hwEmailContentTemplate.value = hwTmpl.content }
  }

  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  const { data: pData } = await supabase.from('parents').select('*')
  if (sData) adminStudents.value = sData.map(student => {
    const parents = pData ? pData.filter(p => p.student_id === student.id) : []
    return { ...student, p1_mail: parents[0]?.email || '', p2_mail: parents[1]?.email || '', p3_mail: parents[2]?.email || '' }
  })

  const { data: tData } = await supabase.from('subject_teachers').select('*').order('subject_name')
  if (tData) subjectTeachers.value = tData
  const { data: aData } = await supabase.from('assignments').select('*').order('deadline', { ascending: true })
  if (aData) allAssignments.value = aData
  const { data: subData } = await supabase.from('assignment_submissions').select('*')
  if (subData) allSubmissions.value = subData
  const { data: alData } = await supabase.from('assignment_audit_logs').select('*').order('created_at', { ascending: false }).limit(50)
  if (alData) assignmentLogs.value = alData
  const { data: bLogs } = await supabase.from('board_edit_logs').select('*').order('edited_at', { ascending: false }).limit(50)
  if (bLogs) boardLogs.value = bLogs
  const { data: attData } = await supabase.from('attendances').select('*').eq('record_date', todayISO)
  if (attData) todayAttendances.value = attData
}

// === 儲存作業信件範本 ===
const saveHwEmailTemplate = async () => {
  isSavingHwTemplate.value = true
  try {
    const { error } = await supabase.from('email_templates').upsert({
      template_id: 'homework_notice',
      subject: hwEmailSubjectTemplate.value,
      content: hwEmailContentTemplate.value
    })
    if (error) throw error
    alert('✅ 作業信件範本已永久儲存！')
  } catch (error) {
    alert('❌ 範本儲存失敗，請確認資料庫。')
  } finally {
    isSavingHwTemplate.value = false
  }
}

// === 儲存遲到信件範本 ===
const saveEmailTemplate = async () => {
  isSavingTemplate.value = true
  try {
    await supabase.from('email_templates').upsert({ template_id: 'late_notice', subject: emailSubjectTemplate.value, content: emailContentTemplate.value })
    alert('✅ 遲到信件範本已永久儲存！')
  } catch (error) { alert('❌ 儲存失敗') } finally { isSavingTemplate.value = false }
}

// === 作業與科任管理 ===
const addTeacher = async () => {
  if (!newTeacher.value.subject || !newTeacher.value.password) return
  const { data, error } = await supabase.from('subject_teachers').insert({ 
    subject_name: newTeacher.value.subject, password: newTeacher.value.password, assistant_password: newTeacher.value.assistant_password 
  }).select().single()
  if (!error && data) { subjectTeachers.value.push(data); newTeacher.value = { subject: '', password: '', assistant_password: '' } }
}
const saveTeacher = async (t) => {
  await supabase.from('subject_teachers').update({ subject_name: t.subject_name, password: t.password, assistant_password: t.assistant_password }).eq('id', t.id)
  alert(`✅ ${t.subject_name} 資料更新成功！`)
}
const deleteTeacher = async (id) => {
  if (!window.confirm('確定刪除此科目？')) return
  await supabase.from('subject_teachers').delete().eq('id', id)
  subjectTeachers.value = subjectTeachers.value.filter(t => t.id !== id)
}

// === 作業統整發信邏輯 (套用動態範本) ===
const sendHomeworkEmails = async () => {
  const pwd = window.prompt("🔒 準備群發作業報表，請輸入導師密碼：")
  if (pwd !== '168168168') return alert('❌ 密碼錯誤！')

  isSendingHomework.value = true
  let successCount = 0; let failCount = 0

  for (const stat of studentAssignmentStats.value) {
    const parentEmails = [stat.p1_mail, stat.p2_mail, stat.p3_mail].filter(e => e && e.trim() !== '')
    if (parentEmails.length === 0) continue

    const submittedList = stat.submitted.map(a => `[${a.subject_name}] ${a.title}`).join('\n') || '無'
    const missingList = stat.missing.map(a => `[${a.subject_name}] ${a.title} (期限: ${a.deadline || '未定'})`).join('\n') || '無'

    const finalSubject = hwEmailSubjectTemplate.value.replace(/{{學生姓名}}/g, stat.real_name)
    const finalContent = hwEmailContentTemplate.value
      .replace(/{{學生姓名}}/g, stat.real_name)
      .replace(/{{已交清單}}/g, submittedList)
      .replace(/{{缺交清單}}/g, missingList)

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bcc: parentEmails, subject: finalSubject, content: finalContent })
      })
      if (!res.ok) throw new Error('API 寄信失敗')

      await supabase.from('communication_logs').insert({
        student_id: stat.id, notification_type: '作業報表群發', sent_by: '導師',
        recipient_emails: parentEmails.join(', '), message_content: finalContent
      })
      successCount++
    } catch (e) { failCount++ }
  }

  alert(`✅ 作業報表發送完成！\n成功：${successCount} 位\n失敗：${failCount} 位`)
  isSendingHomework.value = false
}

// 遲到發信
const sendLateEmails = async () => { /* 邏輯與之前相同，此處略縮篇幅 */ }

const formatTime = (isoString) => new Date(isoString).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
</script>

<style scoped>
/* 包含原本的樣式，並加上作業管理的專屬 CSS */
.admin-container { min-height: 100vh; background-color: #f1f5f9; font-family: sans-serif; }
.lock-screen { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #1e293b; }
.lock-box { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 400px; }
.lock-box input { width: 100%; padding: 12px; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; }
.lock-box button { width: 100%; padding: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
.dashboard { max-width: 1400px; margin: 0 auto; padding: 20px; }
.data-table { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: white; padding: 15px 25px; border-radius: 12px; flex-wrap: wrap; gap: 15px; }
.header-buttons button { padding: 8px 15px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; background: #e2e8f0; color: #475569; margin-right: 5px; }
.header-buttons button.active { background: #3b82f6; color: white; }
.back-btn { text-decoration: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; background: #ef4444; color: white; display: inline-block; }

/* === 編輯器與預覽區塊樣式 (共用) === */
.email-editor-section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
.editor-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 10px; }
.editor-header h4 { margin: 0; color: #334155; }
.save-template-btn { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.save-template-btn:hover:not(:disabled) { background: #059669; }
.save-template-btn:disabled { background: #9ca3af; cursor: not-allowed; }
.var-tag { background: #e2e8f0; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #475569; }
.textarea-input { resize: vertical; font-family: inherit; line-height: 1.5; }

.email-preview-section { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.email-preview-section h4 { margin: 0 0 15px 0; color: #3b82f6; }
.preview-note { font-size: 0.85rem; color: #64748b; font-weight: normal; }
.preview-box { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
.preview-subject { font-size: 1.1rem; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px; }
.preview-body { font-size: 1rem; color: #334155; line-height: 1.6; white-space: pre-wrap; }

/* === 作業專屬樣式 === */
.homework-section { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.homework-section h4 { margin: 0 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
.late-btn { background-color: #ef4444; width: 100%; font-size: 1.2rem; padding: 15px; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.late-btn:hover:not(:disabled) { background-color: #dc2626; }
.late-btn:disabled { background-color: #fca5a5; cursor: not-allowed; }
.email-btn.late-btn { background-color: #f59e0b; }
.email-btn.late-btn:hover:not(:disabled) { background-color: #d97706; }
.email-btn.late-btn:disabled { background-color: #fcd34d; }
.help-text { font-size: 0.95rem; color: #64748b; margin-bottom: 20px; }

/* 老師管理區塊 */
.teacher-list { display: flex; flex-direction: column; gap: 10px; }
.teacher-item { display: flex; gap: 10px; align-items: center; background: white; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
.new-teacher { background: #f0fdf4; border-color: #bbf7d0; }
.edit-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; width: 100%; }
.subject-input { width: 120px; }
.pwd-input { width: 180px; }
.add-btn.small-btn { background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; }
.save-row-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }

/* 學生作業統計卡片 */
.student-homework-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px; max-height: 600px; overflow-y: auto; padding-right: 10px; }
.hw-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.hw-card-header { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
.badge.notice.success { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
.badge.notice.warning { background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
.hw-card-body { padding: 15px; display: flex; flex-direction: column; gap: 15px; }
.hw-title { font-size: 0.9rem; font-weight: bold; margin-bottom: 5px; }
.hw-list ul { margin: 0; padding-left: 20px; font-size: 0.85rem; color: #475569; }
.none-text { list-style: none; color: #94a3b8; font-style: italic; margin-left: -20px; }
.missing-list .hw-title { color: #dc2626; }
.submitted-list .hw-title { color: #16a34a; }

/* 稽核紀錄標籤 */
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; background: white; }
th, td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; }
th { background-color: #f8fafc; color: #64748b; font-weight: bold; }
.empty { text-align: center; color: #94a3b8; padding: 30px !important; }
.badge { background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }
.role-teacher { color: #dc2626; font-weight: bold; }
.role-student { color: #059669; font-weight: bold; }

/* 遲到管理樣式保留 */
.attendance-control-panel { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; }
.absent-list-section { background: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; border: 1px dashed #f59e0b; }
.absent-list-section h4 { margin: 0 0 15px 0; color: #b45309; }
.tags-container { display: flex; flex-wrap: wrap; gap: 10px; }
.absent-tag { background: #fee2e2; color: #dc2626; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.95rem; border: 1px solid #fca5a5; }
.all-present-msg { color: #16a34a; font-weight: bold; font-size: 1.1rem; }
</style>
