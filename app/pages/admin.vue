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
          <button @click="switchTab('board')" :class="{ active: currentTab === 'board' }">📢 須知推播</button>
          <button @click="switchTab('messages')" :class="{ active: currentTab === 'messages' }">💬 私訊管理</button>
          <button @click="switchTab('students')" :class="{ active: currentTab === 'students' }">👩‍🎓 學生管理</button>
          <button @click="switchTab('audit')" :class="{ active: currentTab === 'audit' }">🕵️ 黑板稽核</button>
          <button @click="switchTab('communication')" :class="{ active: currentTab === 'communication' }">📨 系統紀錄</button>
          <NuxtLink to="/" class="back-btn">⬅️ 返回前台</NuxtLink>
        </div>
      </header>

      <main v-if="currentTab === 'board'" class="data-table">
        <div class="table-header">
          <h3>📢 家長須知管理與 Email 推播</h3>
          <p class="subtitle">今日日期：{{ todayDisplay }}</p>
        </div>
        <div class="board-editor-container">
          <div class="notice-edit-list">
            <div v-for="(notice, index) in adminNotices" :key="index" class="edit-item">
              <span class="bullet">📌</span>
              <input v-model="adminNotices[index]" type="text" class="edit-input notice-input" placeholder="請輸入須知事項..." />
              <button @click="removeAdminNotice(index)" class="del-row-btn">🗑️</button>
            </div>
            <button @click="addAdminNotice" class="add-btn">➕ 新增一筆須知</button>
          </div>
          <div class="action-bar">
            <button @click="saveAdminNotices" class="save-btn" :disabled="isSavingBoard">{{ isSavingBoard ? '儲存中...' : '💾 儲存並同步至大平板' }}</button>
            <button @click="sendNoticeEmail" class="email-btn" :disabled="isSendingEmail">{{ isSendingEmail ? '寄送中...' : '📧 密碼解鎖並推播至全班 (Bcc)' }}</button>
          </div>
        </div>
      </main>

      <main v-if="currentTab === 'messages'" class="data-table">
        <div class="table-header">
          <h3>💬 班級私訊管理</h3>
          <button @click="exportToExcel" class="export-btn">📥 匯出紀錄</button>
        </div>
        <div class="chat-selector">
          <label>切換對話頻道：</label>
          <select v-model="activeChatThread" @change="markCurrentThreadAsRead">
            <option value="" disabled selected>請選擇要查看的對話...</option>
            <optgroup label="👨‍👩‍👧 家長群"><option v-for="s in studentsList" :key="'p-'+s.id" :value="s.id+'_家長'">{{ s.seat_number }}號 {{ s.real_name }} 的家長</option></optgroup>
            <optgroup label="👩‍🎓 學生群"><option v-for="s in studentsList" :key="'s-'+s.id" :value="s.id+'_學生'">{{ s.seat_number }}號 {{ s.real_name }} (學生)</option></optgroup>
          </select>
        </div>
        <div v-if="!activeChatThread" class="empty-prompt">👈 請從上方選擇一個對話群組。</div>
        <div v-else>
          <div class="chat-container" id="adminChatContainer">
            <div v-if="filteredMessages.length === 0" class="empty">此頻道目前尚無通訊紀錄</div>
            <div v-for="msg in filteredMessages" :key="msg.id" :class="['chat-bubble', msg.sender_role === '導師' ? 'teacher-msg' : 'other-msg']">
              <div class="msg-info"><span class="sender">{{ msg.sender_role === '導師' ? '我 (導師)' : msg.sender_role }}</span><span class="time">{{ formatTime(msg.created_at) }}</span></div>
              <div class="msg-content">{{ msg.content }}</div>
            </div>
          </div>
          <div class="reply-box">
            <input v-model="replyContent" type="text" placeholder="輸入回覆..." @keyup.enter="sendReply" />
            <button @click="sendReply" class="send-reply-btn" :disabled="isSending">📤 傳送</button>
          </div>
        </div>
      </main>

      <main v-if="currentTab === 'students'" class="data-table">
        <div class="table-header">
          <h3>👩‍🎓 學生名單與家長聯絡網</h3>
          <div class="export-actions">
            <button @click="exportStudents('json')" class="export-btn json-btn">📤 匯出 JSON</button>
            <button @click="exportStudents('csv')" class="export-btn">📤 匯出 CSV</button>
          </div>
        </div>

        <div class="import-section">
          <div class="import-info">
            <h4>📁 批次匯入學生資料</h4>
            <p style="font-size: 0.85rem; margin-top: 5px;">支援 <code>.json</code> 或 <code>.csv</code>。<br>家長欄位格式：<code>p1_rel, p1_phone, p1_email</code> (支援 p1 到 p3 共 9 個欄位)</p>
          </div>
          <div class="import-controls">
            <input type="file" accept=".json, .csv" @change="handleFileUpload" ref="fileInput" />
            <button @click="processImport" class="import-btn" :disabled="!selectedFile || isImporting">🚀 執行匯入</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="student-edit-table">
            <thead>
              <tr>
                <th width="50">座號</th>
                <th width="80">姓名</th>
                <th width="100">生日/後5碼</th>
                <th width="100">學校/年/班</th>
                <th width="180">家長一 (關係/電話/信箱)</th>
                <th width="180">家長二 (關係/電話/信箱)</th>
                <th width="180">家長三 (關係/電話/信箱)</th>
                <th width="90">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in adminStudents" :key="student.id">
                <td><input type="number" v-model="student.seat_number" class="edit-input num-input"/></td>
                <td>
                  <input type="text" v-model="student.real_name" class="edit-input small-input" placeholder="姓名"/>
                  <input type="text" v-model="student.hidden_name" class="edit-input small-input" placeholder="隱藏名"/>
                  <input type="text" v-model="student.student_id" class="edit-input small-input" placeholder="學號"/>
                </td>
                <td>
                  <input type="text" v-model="student.birthday" class="edit-input small-input" placeholder="生日"/>
                  <input type="text" v-model="student.id_last_5" maxlength="5" class="edit-input small-input" placeholder="後五碼"/>
                </td>
                <td>
                  <input type="text" v-model="student.school_name" class="edit-input small-input" placeholder="學校"/>
                  <input type="number" v-model="student.enroll_year" class="edit-input small-input" placeholder="入學年"/>
                  <input type="text" v-model="student.class_name" class="edit-input small-input" placeholder="班級"/>
                </td>
                <td>
                  <input type="text" v-model="student.p1_rel" class="edit-input small-input parent-input" placeholder="關係 (例:爸爸)"/>
                  <input type="tel" v-model="student.p1_phone" class="edit-input small-input parent-input" placeholder="電話"/>
                  <input type="email" v-model="student.p1_email" class="edit-input small-input parent-input" placeholder="Email"/>
                </td>
                <td>
                  <input type="text" v-model="student.p2_rel" class="edit-input small-input parent-input" placeholder="關係"/>
                  <input type="tel" v-model="student.p2_phone" class="edit-input small-input parent-input" placeholder="電話"/>
                  <input type="email" v-model="student.p2_email" class="edit-input small-input parent-input" placeholder="Email"/>
                </td>
                <td>
                  <input type="text" v-model="student.p3_rel" class="edit-input small-input parent-input" placeholder="關係"/>
                  <input type="tel" v-model="student.p3_phone" class="edit-input small-input parent-input" placeholder="電話"/>
                  <input type="email" v-model="student.p3_email" class="edit-input small-input parent-input" placeholder="Email"/>
                </td>
                <td class="action-cell">
                  <button @click="saveStudent(student)" class="save-row-btn">💾 儲存</button>
                  <button @click="deleteStudent(student.id, student.real_name)" class="del-row-btn">🗑️</button>
                </td>
              </tr>
              <tr v-if="adminStudents.length === 0"><td colspan="8" class="empty">目前尚無學生資料，請由上方匯入</td></tr>
            </tbody>
          </table>
        </div>
      </main>

      <main v-if="currentTab === 'audit'" class="data-table">
        <h3>🕵️ 黑板編輯稽核紀錄</h3>
        <table>
          <thead><tr><th>時間</th><th>修改區塊</th><th>編輯者</th><th>IP 位址</th></tr></thead>
          <tbody>
            <tr v-for="log in boardLogs" :key="log.id">
              <td>{{ formatTime(log.edited_at) }}</td><td><span class="badge">{{ log.board_type }}</span></td>
              <td :class="log.editor_role === '導師' ? 'role-teacher' : 'role-student'">{{ log.editor_role }}</td>
              <td class="ip-text">{{ log.ip_address }}</td>
            </tr>
          </tbody>
        </table>
      </main>

      <main v-if="currentTab === 'communication'" class="data-table">
        <h3>📨 系統通知發送紀錄</h3>
        <table>
          <thead><tr><th>發送時間</th><th>收件學生</th><th>通知類型</th><th>收件信箱</th></tr></thead>
          <tbody>
            <tr v-for="log in commLogs" :key="log.id">
              <td>{{ formatTime(log.sent_at) }}</td><td>{{ getStudentName(log.student_id) }}</td>
              <td><span class="badge notice">{{ log.notification_type }}</span></td><td class="email-text">{{ log.recipient_emails }}</td>
            </tr>
          </tbody>
        </table>
      </main>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
const supabase = useSupabaseClient()

const d = new Date()
const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayDisplay = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

const isUnlocked = ref(false); const passwordInput = ref(''); const currentTab = ref('students')
const boardLogs = ref([]); const commLogs = ref([]); const allMessages = ref([])
const studentsMap = ref({}); const studentsList = ref([]); const adminStudents = ref([])

const adminNotices = ref([]); const isSavingBoard = ref(false); const isSendingEmail = ref(false)
const activeChatThread = ref(''); const replyContent = ref(''); const isSending = ref(false)
const selectedFile = ref(null); const fileInput = ref(null); const isImporting = ref(false)

const filteredMessages = computed(() => {
  if (!activeChatThread.value) return []
  const [targetId, targetType] = activeChatThread.value.split('_')
  return allMessages.value.filter(m => m.student_id === targetId && m.chat_type === targetType)
})

const verifyPassword = async () => {
  if (passwordInput.value === '168168168') { isUnlocked.value = true; await fetchAllData() } 
  else { alert('❌ 密碼錯誤！'); passwordInput.value = '' }
}

const switchTab = async (tab) => { currentTab.value = tab; await fetchAllData() }

// ==================== 抓取所有資料 ====================
const fetchAllData = async () => {
  const { data: boardData } = await supabase.from('contact_books').select('notices').eq('record_date', todayISO).single()
  adminNotices.value = boardData?.notices || []

  const { data: bLogs } = await supabase.from('board_edit_logs').select('*').order('edited_at', { ascending: false }).limit(50)
  if (bLogs) boardLogs.value = bLogs
  const { data: cLogs } = await supabase.from('communication_logs').select('*').order('sent_at', { ascending: false }).limit(50)
  if (cLogs) commLogs.value = cLogs

  // 抓取學生與家長 (支援 3位家長)
  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  const { data: pData } = await supabase.from('parents').select('*')
  if (sData) {
    studentsList.value = sData
    sData.forEach(s => { studentsMap.value[s.id] = s.real_name })
    
    adminStudents.value = sData.map(student => {
      // 找出這位學生的所有家長，最多取前 3 個
      const parents = pData ? pData.filter(p => p.student_id === student.id) : []
      return { 
        ...student, 
        p1_rel: parents[0]?.relationship || '', p1_phone: parents[0]?.phone || '', p1_email: parents[0]?.email || '',
        p2_rel: parents[1]?.relationship || '', p2_phone: parents[1]?.phone || '', p2_email: parents[1]?.email || '',
        p3_rel: parents[2]?.relationship || '', p3_phone: parents[2]?.phone || '', p3_email: parents[2]?.email || ''
      }
    })
  }

  const { data: msgLogs } = await supabase.from('private_messages').select('*').order('created_at', { ascending: true })
  if (msgLogs) { allMessages.value = msgLogs; scrollToBottom() }
}

// === 須知推播 ===
const addAdminNotice = () => adminNotices.value.push(''); const removeAdminNotice = (index) => adminNotices.value.splice(index, 1)

const saveAdminNotices = async () => {
  isSavingBoard.value = true
  adminNotices.value = adminNotices.value.filter(n => n.trim() !== '')
  const { data: currentBoard } = await supabase.from('contact_books').select('tasks').eq('record_date', todayISO).single()
  const currentTasks = currentBoard?.tasks || []

  const { error } = await supabase.from('contact_books').upsert({ record_date: todayISO, notices: adminNotices.value, tasks: currentTasks }, { onConflict: 'record_date' })
  if (!error) {
    await supabase.from('board_edit_logs').insert({ board_date: todayISO, board_type: '家長須知 (後台)', editor_role: '導師', new_content: adminNotices.value })
    alert('✅ 儲存成功！已同步至教室前台。')
  }
  isSavingBoard.value = false
}

const sendNoticeEmail = async () => {
  const pwd = window.prompt("🔒 準備寄送全班群發信，請輸入導師專屬密碼：")
  if (pwd !== '168168168') return alert('❌ 密碼錯誤！')
  if (adminNotices.value.length === 0) return alert('⚠️ 目前沒有任何須知事項可以發送！')

  isSendingEmail.value = true
  try {
    const { data: parents } = await supabase.from('parents').select('email')
    // 過濾掉沒有填 email 的家長 (因為現在可能只留了電話)
    const validParents = parents ? parents.filter(p => p.email && p.email.includes('@')) : []
    if (validParents.length === 0) throw new Error("沒有任何家長綁定有效信箱。")

    const uniqueEmails = [...new Set(validParents.map(p => p.email))]
    const noticeText = adminNotices.value.map((n, i) => `${i + 1}. ${n}`).join('\n')
    const emailContent = `親愛的家長您好：\n\n以下為今日 (${todayDisplay}) 的重要班級須知，請查閱：\n\n${noticeText}\n\n若有任何問題，歡迎登入系統私訊聯繫。\n\n班級導師 敬上`

    const response = await fetch('/api/send-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bcc: uniqueEmails, subject: `📢 班級重要須知推播 (${todayDisplay})`, content: emailContent })
    })

    if (!response.ok) throw new Error("郵件伺服器發生錯誤")

    await supabase.from('communication_logs').insert({ notification_type: '家長須知群發', sent_by: '導師', recipient_emails: `群發 (${uniqueEmails.length} 個)`, message_content: emailContent })
    alert(`✅ 推播成功！已發送至 ${uniqueEmails.length} 個信箱。`)
    await fetchAllData() 
  } catch (error) { alert(`❌ 發送失敗：${error.message}`) } finally { isSendingEmail.value = false }
}

// === 私訊回覆 ===
const markCurrentThreadAsRead = async () => {
  if (!activeChatThread.value) return
  const [targetId, targetType] = activeChatThread.value.split('_')
  await supabase.from('private_messages').update({ is_read_by_teacher: true }).eq('student_id', targetId).eq('chat_type', targetType).eq('is_read_by_teacher', false)
  scrollToBottom()
}

const sendReply = async () => {
  if (!activeChatThread.value || !replyContent.value.trim()) return
  const pwd = window.prompt("🔒 傳送請輸入密碼：")
  if (pwd !== '168168168') return alert('❌ 密碼錯誤！')

  const [targetId, targetType] = activeChatThread.value.split('_')
  isSending.value = true
  try {
    await supabase.from('private_messages').insert({ student_id: targetId, sender_role: '導師', chat_type: targetType, content: replyContent.value, is_read_by_teacher: true })
    
    // 若為家長則自動 Email 通知 (過濾掉沒信箱的)
    if (targetType === '家長') {
      const { data: parents } = await supabase.from('parents').select('email').eq('student_id', targetId)
      const validEmails = parents ? parents.map(p => p.email).filter(e => e && e.includes('@')) : []
      if (validEmails.length > 0) {
        await fetch('/api/send-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bcc: validEmails, subject: '💬 班級導師已回覆您的私訊', content: `家長您好：\n導師已回覆私訊：\n「${replyContent.value}」\n請登入系統查看。` })
        })
      }
    }
    alert('✅ 回覆成功！'); replyContent.value = ''; await fetchAllData()
  } catch (error) { alert('發生錯誤') } finally { isSending.value = false }
}

// === 學生與家長管理 ===
const handleFileUpload = (e) => { const file = e.target.files[0]; if (file) selectedFile.value = file }

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',')
    let obj = {}; headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : '' }); return obj
  })
}

const processImport = async () => {
  if (!selectedFile.value) return
  isImporting.value = true
  const reader = new FileReader()
  
  reader.onload = async (e) => {
    try {
      const text = e.target.result; let parsedData = []
      if (selectedFile.value.name.endsWith('.json')) parsedData = JSON.parse(text)
      else if (selectedFile.value.name.endsWith('.csv')) parsedData = parseCSV(text)
      
      if (!Array.isArray(parsedData)) throw new Error("資料格式錯誤。")
      
      for (const item of parsedData) {
        const { p1_rel, p1_phone, p1_email, p2_rel, p2_phone, p2_email, p3_rel, p3_phone, p3_email, ...studentData } = item
        const { data: sData, error: sErr } = await supabase.from('students').insert(studentData).select().single()
        if (sErr) throw sErr

        const pData = []
        if (p1_rel || p1_phone || p1_email) pData.push({ student_id: sData.id, relationship: p1_rel, phone: p1_phone, email: p1_email })
        if (p2_rel || p2_phone || p2_email) pData.push({ student_id: sData.id, relationship: p2_rel, phone: p2_phone, email: p2_email })
        if (p3_rel || p3_phone || p3_email) pData.push({ student_id: sData.id, relationship: p3_rel, phone: p3_phone, email: p3_email })
        
        if (pData.length > 0) await supabase.from('parents').insert(pData)
      }

      alert(`✅ 成功匯入 ${parsedData.length} 筆資料！`)
      selectedFile.value = null; fileInput.value.value = ""; await fetchAllData()
    } catch (error) { alert(`❌ 匯入失敗：\n${error.message}`) } 
    finally { isImporting.value = false }
  }
  reader.readAsText(selectedFile.value)
}

const saveStudent = async (student) => {
  try {
    // 1. 更新學生基本資料
    const { error: sErr } = await supabase.from('students').update({
      seat_number: student.seat_number, student_id: student.student_id, real_name: student.real_name,
      hidden_name: student.hidden_name, birthday: student.birthday, id_last_5: student.id_last_5,
      school_name: student.school_name, enroll_year: student.enroll_year, class_name: student.class_name
    }).eq('id', student.id)
    if (sErr) throw sErr

    // 2. 刪除舊家長並寫入新家長 (確保資料乾淨)
    await supabase.from('parents').delete().eq('student_id', student.id)
    const newParents = []
    if (student.p1_rel || student.p1_phone || student.p1_email) newParents.push({ student_id: student.id, relationship: student.p1_rel, phone: student.p1_phone, email: student.p1_email })
    if (student.p2_rel || student.p2_phone || student.p2_email) newParents.push({ student_id: student.id, relationship: student.p2_rel, phone: student.p2_phone, email: student.p2_email })
    if (student.p3_rel || student.p3_phone || student.p3_email) newParents.push({ student_id: student.id, relationship: student.p3_rel, phone: student.p3_phone, email: student.p3_email })
    
    if (newParents.length > 0) await supabase.from('parents').insert(newParents)

    alert(`✅ ${student.real_name} 資料更新成功！`)
  } catch(e) { alert(`❌ 更新失敗！`) }
}

const deleteStudent = async (id, name) => {
  if (!window.confirm(`⚠️ 確定刪除「${name}」？這將同步刪除打卡與所有關聯紀錄！`)) return
  await supabase.from('students').delete().eq('id', id); alert(`✅ 已刪除`); await fetchAllData()
}

const exportStudents = (type) => {
  const exportData = adminStudents.value.map(s => ({
    school_name: s.school_name, enroll_year: s.enroll_year, class_name: s.class_name, student_id: s.student_id, 
    seat_number: s.seat_number, real_name: s.real_name, hidden_name: s.hidden_name, birthday: s.birthday, id_last_5: s.id_last_5,
    p1_rel: s.p1_rel, p1_phone: s.p1_phone, p1_email: s.p1_email,
    p2_rel: s.p2_rel, p2_phone: s.p2_phone, p2_email: s.p2_email,
    p3_rel: s.p3_rel, p3_phone: s.p3_phone, p3_email: s.p3_email
  }))

  let content = ""; let filename = `班級名單_${new Date().getTime()}`; let mimeType = ""

  if (type === 'json') {
    content = JSON.stringify(exportData, null, 2); filename += ".json"; mimeType = "application/json"
    content = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`
  } else if (type === 'csv') {
    const headers = Object.keys(exportData[0]).join(",")
    const rows = exportData.map(obj => Object.values(obj).map(v => `"${v || ''}"`).join(","))
    content = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + rows.join("\n")
    filename += ".csv"; mimeType = "text/csv"
    content = encodeURI(content)
  }

  const link = document.createElement("a"); link.setAttribute("href", content); link.setAttribute("download", filename)
  document.body.appendChild(link); link.click(); document.body.removeChild(link)
}

const exportToExcel = () => { /* 實作略，與上一版相同 */ }
const formatTime = (isoString) => new Date(isoString).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
const getStudentName = (id) => studentsMap.value[id] || '未知'
const scrollToBottom = () => { nextTick(() => { const c = document.getElementById('adminChatContainer'); if (c) c.scrollTop = c.scrollHeight }) }
</script>

<style scoped>
/* 基礎樣式保留 */
.admin-container { min-height: 100vh; background-color: #f1f5f9; font-family: sans-serif; }
.lock-screen { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #1e293b; }
.lock-box { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 400px; }
.lock-box h2 { color: #334155; margin-bottom: 10px; }
.lock-box input { width: 100%; padding: 12px; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.2rem; text-align: center; }
.lock-box button { width: 100%; padding: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 1.1rem; cursor: pointer; font-weight: bold; }
.dashboard { max-width: 1400px; margin: 0 auto; padding: 20px; }

/* Header */
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: white; padding: 15px 25px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); flex-wrap: wrap; gap: 15px; }
.admin-header h2 { margin: 0; color: #0f172a; }
.header-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.header-buttons button { padding: 8px 15px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; background: #e2e8f0; color: #475569; }
.header-buttons button.active { background: #3b82f6; color: white; }
.back-btn { text-decoration: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; background: #ef4444; color: white; display: inline-block; }

.data-table { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.table-header h3, .data-table h3 { margin: 0; color: #334155; }
.subtitle { color: #64748b; margin: 0; font-weight: bold; }

/* 須知推播樣式 */
.board-editor-container { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; }
.notice-edit-list { display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px; }
.edit-item { display: flex; align-items: center; gap: 10px; }
.notice-input { flex: 1; font-size: 1.1rem; padding: 10px 15px; border: 1px solid #94a3b8; border-radius: 6px; background: white; }
.add-btn { background: #e2e8f0; border: 1px dashed #94a3b8; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px; }
.action-bar { display: flex; justify-content: space-between; border-top: 2px dashed #cbd5e1; padding-top: 20px; gap: 15px; flex-wrap: wrap; }
.save-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; }
.email-btn { background: #f59e0b; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; }
.save-btn:disabled, .email-btn:disabled { background: #9ca3af; cursor: not-allowed; }

/* 學生資料管理與表格垂直堆疊樣式 */
.export-actions { display: flex; gap: 10px; }
.export-btn { background-color: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.json-btn { background-color: #8b5cf6; }
.import-section { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; flex-wrap: wrap; }
.import-btn { background: #3b82f6; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }

.table-responsive { overflow-x: auto; padding-bottom: 10px; }
.student-edit-table { min-width: 1200px; width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; }
.student-edit-table th, .student-edit-table td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
.student-edit-table th { background-color: #f8fafc; color: #475569; font-weight: bold; }
.edit-input { width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; background: transparent; transition: 0.2s; font-size: 0.9rem; }
.edit-input:focus { border-color: #3b82f6; background: white; outline: none; }
.num-input { width: 50px; text-align: center; }
.small-input { margin-bottom: 5px; display: block; }
.parent-input { font-size: 0.85rem; }

.action-cell { display: flex; flex-direction: column; gap: 5px; justify-content: flex-start; }
.save-row-btn { background: #3b82f6; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }

/* 聊天室與其他 */
.chat-selector { margin-bottom: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; }
.chat-selector select { padding: 8px 12px; font-size: 1.1rem; border-radius: 6px; border: 1px solid #94a3b8; width: 300px; }
.chat-container { height: 400px; overflow-y: auto; padding: 20px; background: #f8fafc; border-radius: 8px 8px 0 0; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 15px; border-bottom: none; }
.chat-bubble { max-width: 60%; padding: 12px 16px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.other-msg { background: white; align-self: flex-start; border-left: 4px solid #f59e0b; }
.teacher-msg { background: #dcfce7; align-self: flex-end; border-right: 4px solid #10b981; }
.msg-info { font-size: 0.85rem; margin-bottom: 5px; color: #64748b; display: flex; justify-content: space-between; }
.msg-content { font-size: 1.1rem; color: #1e293b; line-height: 1.5; white-space: pre-wrap; }
.reply-box { display: flex; padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; gap: 10px; }
.reply-box input { flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
.send-reply-btn { background: #3b82f6; color: white; border: none; padding: 0 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }

table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; }
th, td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
.empty { text-align: center; color: #94a3b8; padding: 30px !important; }
.badge { background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }
</style>