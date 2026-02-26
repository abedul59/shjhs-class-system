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
          <button @click="switchTab('messages')" :class="{ active: currentTab === 'messages' }">💬 私訊管理</button>
          <button @click="switchTab('students')" :class="{ active: currentTab === 'students' }">👩‍🎓 學生管理</button>
          <button @click="switchTab('audit')" :class="{ active: currentTab === 'audit' }">🕵️ 黑板稽核</button>
          <button @click="switchTab('communication')" :class="{ active: currentTab === 'communication' }">📨 系統紀錄</button>
          <NuxtLink to="/" class="back-btn">⬅️ 返回前台</NuxtLink>
        </div>
      </header>

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
        <div v-if="!activeChatThread" class="empty-prompt">👈 請選擇對話群組。</div>
        <div v-else>
          <div class="chat-container" id="adminChatContainer">
            <div v-for="msg in filteredMessages" :key="msg.id" :class="['chat-bubble', msg.sender_role === '導師' ? 'teacher-msg' : 'other-msg']">
              <div class="msg-info"><span class="sender">{{ msg.sender_role }}</span><span class="time">{{ formatTime(msg.created_at) }}</span></div>
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
          <h3>👩‍🎓 學生名單與資料維護</h3>
          <div class="export-actions">
            <button @click="exportStudents('json')" class="export-btn json-btn">📤 匯出 JSON</button>
            <button @click="exportStudents('csv')" class="export-btn">📤 匯出 CSV</button>
          </div>
        </div>

        <div class="import-section">
          <div class="import-info">
            <h4>📁 批次匯入學生資料</h4>
            <p>支援 <code>.json</code> 或 <code>.csv</code> 格式。<br>欄位須包含：<code>school_name, enroll_year, class_name, student_id, seat_number, real_name, hidden_name, birthday, id_last_5, parent_email_1, parent_email_2</code></p>
          </div>
          <div class="import-controls">
            <input type="file" accept=".json, .csv" @change="handleFileUpload" ref="fileInput" />
            <button @click="processImport" class="import-btn" :disabled="!selectedFile || isImporting">
              {{ isImporting ? '匯入中...' : '🚀 執行匯入' }}
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="student-edit-table">
            <thead>
              <tr>
                <th width="50">座號</th>
                <th width="90">學號</th>
                <th width="90">姓名</th>
                <th width="90">隱藏名</th>
                <th width="100">生日</th>
                <th width="90">後5碼</th>
                <th width="110">學校/年/班</th>
                <th width="150">家長信箱 1</th>
                <th width="150">家長信箱 2</th>
                <th width="120">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in adminStudents" :key="student.id">
                <td><input type="number" v-model="student.seat_number" class="edit-input num-input"/></td>
                <td><input type="text" v-model="student.student_id" class="edit-input"/></td>
                <td><input type="text" v-model="student.real_name" class="edit-input"/></td>
                <td><input type="text" v-model="student.hidden_name" class="edit-input"/></td>
                <td><input type="text" v-model="student.birthday" class="edit-input" placeholder="20130101"/></td>
                <td><input type="text" v-model="student.id_last_5" maxlength="5" class="edit-input"/></td>
                <td>
                  <input type="text" v-model="student.school_name" class="edit-input small-input" title="學校"/>
                  <input type="number" v-model="student.enroll_year" class="edit-input small-input" title="入學年"/>
                  <input type="text" v-model="student.class_name" class="edit-input small-input" title="班級"/>
                </td>
                <td><input type="email" v-model="student.parent_email_1" class="edit-input email-input" placeholder="信箱1"/></td>
                <td><input type="email" v-model="student.parent_email_2" class="edit-input email-input" placeholder="信箱2"/></td>
                <td class="action-cell">
                  <button @click="saveStudent(student)" class="save-row-btn">💾 儲存</button>
                  <button @click="deleteStudent(student.id, student.real_name)" class="del-row-btn">🗑️</button>
                </td>
              </tr>
              <tr v-if="adminStudents.length === 0"><td colspan="10" class="empty">目前尚無學生資料，請由上方匯入</td></tr>
            </tbody>
          </table>
        </div>
      </main>

      <main v-if="currentTab === 'audit'" class="data-table">
        <h3>🕵️ 最近 50 筆黑板編輯紀錄</h3>
        <table>
          <thead><tr><th>時間</th><th>修改區塊</th><th>編輯者</th><th>IP 位址</th><th>裝置資訊</th></tr></thead>
          <tbody>
            <tr v-for="log in boardLogs" :key="log.id">
              <td>{{ formatTime(log.edited_at) }}</td><td><span class="badge">{{ log.board_type }}</span></td>
              <td :class="log.editor_role === '導師' ? 'role-teacher' : 'role-student'">{{ log.editor_role }}</td>
              <td class="ip-text">{{ log.ip_address }}</td><td class="device-text">{{ shortenAgent(log.user_agent) }}</td>
            </tr>
          </tbody>
        </table>
      </main>

      <main v-if="currentTab === 'communication'" class="data-table">
        <h3>📨 最近 50 筆通知發送紀錄</h3>
        <table>
          <thead><tr><th>發送時間</th><th>收件學生</th><th>通知類型</th><th>發送者</th><th>收件信箱</th></tr></thead>
          <tbody>
            <tr v-for="log in commLogs" :key="log.id">
              <td>{{ formatTime(log.sent_at) }}</td><td>{{ getStudentName(log.student_id) }}</td>
              <td><span class="badge notice">{{ log.notification_type }}</span></td><td>{{ log.sent_by }}</td><td class="email-text">{{ log.recipient_emails }}</td>
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

const isUnlocked = ref(false); const passwordInput = ref(''); const currentTab = ref('students')
const boardLogs = ref([]); const commLogs = ref([]); const allMessages = ref([])
const studentsMap = ref({}); const studentsList = ref([])

// 學生資料管理專用
const adminStudents = ref([])
const selectedFile = ref(null)
const fileInput = ref(null)
const isImporting = ref(false)

// 聊天室專用
const activeChatThread = ref(''); const replyContent = ref(''); const isSending = ref(false)

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

// ==================== 撈取所有資料 (整合家長信箱) ====================
const fetchAllData = async () => {
  const { data: bLogs } = await supabase.from('board_edit_logs').select('*').order('edited_at', { ascending: false }).limit(50)
  if (bLogs) boardLogs.value = bLogs

  const { data: cLogs } = await supabase.from('communication_logs').select('*').order('sent_at', { ascending: false }).limit(50)
  if (cLogs) commLogs.value = cLogs

  const { data: msgLogs } = await supabase.from('private_messages').select('*').order('created_at', { ascending: true })
  if (msgLogs) allMessages.value = msgLogs

  // 抓取學生與家長資料，並在前端合併顯示
  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  const { data: pData } = await supabase.from('parents').select('*')
  
  if (sData) {
    studentsList.value = sData
    sData.forEach(s => { studentsMap.value[s.id] = s.real_name })
    
    adminStudents.value = sData.map(student => {
      const parents = pData ? pData.filter(p => p.student_id === student.id) : []
      return {
        ...student,
        parent_email_1: parents[0]?.email || '',
        parent_email_2: parents[1]?.email || ''
      }
    })
  }
}

// ==================== 學生資料維護與匯入/匯出 ====================

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file && (file.name.endsWith('.json') || file.name.endsWith('.csv'))) { selectedFile.value = file } 
  else { alert("請上傳正確的 .json 或 .csv 檔案！"); selectedFile.value = null; fileInput.value.value = "" }
}

// 解析 CSV 基礎工具
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',')
    let obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : '' })
    return obj
  })
}

// 執行 JSON/CSV 匯入 (循序寫入學生與家長)
const processImport = async () => {
  if (!selectedFile.value) return
  isImporting.value = true
  const reader = new FileReader()
  
  reader.onload = async (e) => {
    try {
      const text = e.target.result
      let parsedData = []

      if (selectedFile.value.name.endsWith('.json')) parsedData = JSON.parse(text)
      else if (selectedFile.value.name.endsWith('.csv')) parsedData = parseCSV(text)
      
      if (!Array.isArray(parsedData)) throw new Error("資料格式錯誤。")
      
      for (const item of parsedData) {
        // 分離學生資料與信箱資料
        const { parent_email_1, parent_email_2, ...studentData } = item
        
        // 1. 寫入學生表，並取得生成的 UUID
        const { data: sData, error: sErr } = await supabase.from('students').insert(studentData).select().single()
        if (sErr) throw sErr

        // 2. 寫入家長表
        const pData = []
        if (parent_email_1 && parent_email_1.trim()) pData.push({ student_id: sData.id, email: parent_email_1.trim() })
        if (parent_email_2 && parent_email_2.trim()) pData.push({ student_id: sData.id, email: parent_email_2.trim() })
        
        if (pData.length > 0) {
          const { error: pErr } = await supabase.from('parents').insert(pData)
          if (pErr) throw pErr
        }
      }

      alert(`✅ 成功匯入 ${parsedData.length} 筆資料！`)
      selectedFile.value = null; fileInput.value.value = ""
      await fetchAllData()
    } catch (error) { alert(`❌ 匯入失敗：\n${error.message}`) } 
    finally { isImporting.value = false }
  }
  reader.readAsText(selectedFile.value)
}

// 單筆儲存手動修改 (包含信箱同步更新)
const saveStudent = async (student) => {
  try {
    // 1. 更新學生表
    const { error: sErr } = await supabase.from('students').update({
      seat_number: student.seat_number, student_id: student.student_id, real_name: student.real_name,
      hidden_name: student.hidden_name, birthday: student.birthday, id_last_5: student.id_last_5,
      school_name: student.school_name, enroll_year: student.enroll_year, class_name: student.class_name
    }).eq('id', student.id)
    if (sErr) throw sErr

    // 2. 更新家長表 (作法：先清空該學生的信箱，再重新寫入，最為穩妥)
    await supabase.from('parents').delete().eq('student_id', student.id)
    const newParents = []
    if (student.parent_email_1) newParents.push({ student_id: student.id, email: student.parent_email_1 })
    if (student.parent_email_2) newParents.push({ student_id: student.id, email: student.parent_email_2 })
    if (newParents.length > 0) await supabase.from('parents').insert(newParents)

    alert(`✅ ${student.real_name} 的資料已更新！`)
  } catch(e) { alert(`❌ 更新失敗！`) }
}

const deleteStudent = async (id, name) => {
  if (!window.confirm(`⚠️ 確定刪除「${name}」？這將同步刪除打卡與私訊紀錄！`)) return
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) alert('❌ 刪除失敗！')
  else { alert(`✅ 已刪除`); await fetchAllData() }
}

// 匯出 JSON/CSV
const exportStudents = (type) => {
  const exportData = adminStudents.value.map(s => ({
    school_name: s.school_name, enroll_year: s.enroll_year, class_name: s.class_name, student_id: s.student_id, 
    seat_number: s.seat_number, real_name: s.real_name, hidden_name: s.hidden_name, birthday: s.birthday, 
    id_last_5: s.id_last_5, parent_email_1: s.parent_email_1, parent_email_2: s.parent_email_2
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

// ==================== 私訊管理 ====================
// (私訊相關函數維持不變，此處省略以節省版面)
const markCurrentThreadAsRead = async () => { /* ... */ }
const sendReply = async () => { /* ... */ }
const exportToExcel = () => { /* ... */ }
const formatTime = (isoString) => new Date(isoString).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
const shortenAgent = (agent) => agent ? (agent.length > 30 ? agent.substring(0, 30) + '...' : agent) : '未知'
const getStudentName = (id) => studentsMap.value[id] || '未知'
const scrollToBottom = () => { nextTick(() => { const c = document.getElementById('adminChatContainer'); if (c) c.scrollTop = c.scrollHeight }) }
</script>

<style scoped>
/* 基礎樣式 */
.admin-container { min-height: 100vh; background-color: #f1f5f9; font-family: sans-serif; }
.lock-screen { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #1e293b; }
.lock-box { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 400px; }
.lock-box h2 { color: #334155; margin-bottom: 10px; }
.lock-box input { width: 100%; padding: 12px; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.2rem; text-align: center; }
.lock-box button { width: 100%; padding: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 1.1rem; cursor: pointer; font-weight: bold; }
.dashboard { max-width: 1300px; margin: 0 auto; padding: 20px; }
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: white; padding: 15px 25px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); flex-wrap: wrap; gap: 15px; }
.admin-header h2 { margin: 0; color: #0f172a; }
.header-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.header-buttons button { padding: 8px 15px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; background: #e2e8f0; color: #475569; }
.header-buttons button.active { background: #3b82f6; color: white; }
.back-btn { text-decoration: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; background: #ef4444; color: white; display: inline-block; }

.data-table { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.table-header h3, .data-table h3 { margin: 0; color: #334155; }
.export-actions { display: flex; gap: 10px; }
.export-btn { background-color: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.export-btn:hover { opacity: 0.8; }
.json-btn { background-color: #8b5cf6; }

table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; }
th, td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
th { background-color: #f8fafc; color: #64748b; font-weight: bold; white-space: nowrap; }
tr:hover { background-color: #f8fafc; }
.empty { text-align: center; color: #94a3b8; padding: 30px !important; }

/* 學生資料管理專屬樣式 */
.import-section { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
.import-info h4 { margin: 0 0 5px 0; color: #334155; }
.import-info p { margin: 0; color: #64748b; font-size: 0.9rem; line-height: 1.5; }
.import-info code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #0f172a; }
.import-controls { display: flex; gap: 10px; align-items: center; }
.import-btn { background: #3b82f6; color: white; font-weight: bold; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; white-space: nowrap; }
.import-btn:disabled { background: #9ca3af; cursor: not-allowed; }

.table-responsive { overflow-x: auto; padding-bottom: 10px; }
.student-edit-table { min-width: 1100px; } /* 強制寬度讓捲動條出現，避免擠壓 */
.student-edit-table input { width: 100%; box-sizing: border-box; }
.edit-input { padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; background: transparent; transition: 0.2s; font-size: 0.9rem; }
.edit-input:focus { border-color: #3b82f6; background: white; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
.num-input { width: 50px; text-align: center; }
.small-input { font-size: 0.8rem; padding: 4px; margin-bottom: 3px; display: block; }
.email-input { font-family: monospace; font-size: 0.85rem; }
.action-cell { display: flex; gap: 5px; justify-content: center; }
.save-row-btn { background: #3b82f6; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; white-space: nowrap; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; }

/* 聊天與紀錄樣式保留... (此處為節省版面精簡，請保留您原本的樣式) */
.badge { background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }
.chat-selector { margin-bottom: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; }
.chat-selector select { padding: 8px 12px; font-size: 1.1rem; border-radius: 6px; border: 1px solid #94a3b8; width: 300px; }
.chat-container { height: 400px; overflow-y: auto; padding: 20px; background: #f8fafc; border-radius: 8px 8px 0 0; border: 1px solid #e2e8f0; border-bottom: none; display: flex; flex-direction: column; gap: 15px; }
.chat-bubble { max-width: 60%; padding: 12px 16px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.other-msg { background: white; align-self: flex-start; border-left: 4px solid #f59e0b; }
.teacher-msg { background: #dcfce7; align-self: flex-end; border-right: 4px solid #10b981; }
.msg-info { font-size: 0.85rem; margin-bottom: 5px; color: #64748b; display: flex; justify-content: space-between; gap: 15px; }
.msg-content { font-size: 1.1rem; color: #1e293b; line-height: 1.5; white-space: pre-wrap; }
.reply-box { display: flex; padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; gap: 10px; }
.reply-box input { flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.1rem; }
.send-reply-btn { background: #3b82f6; color: white; border: none; padding: 0 20px; border-radius: 6px; font-weight: bold; cursor: pointer; white-space: nowrap; }
</style>