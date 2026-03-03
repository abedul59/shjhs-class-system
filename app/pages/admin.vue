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
          <button @click="switchTab('board')" :class="{ active: currentTab === 'board' }">📢 須知推播</button>
          <button @click="switchTab('messages')" :class="{ active: currentTab === 'messages' }">💬 私訊管理</button>
          <button @click="switchTab('students')" :class="{ active: currentTab === 'students' }">👩‍🎓 學生管理</button>
          <button @click="switchTab('audit')" :class="{ active: currentTab === 'audit' }">🕵️ 黑板稽核</button>
          <button @click="switchTab('communication')" :class="{ active: currentTab === 'communication' }">📨 系統紀錄</button>
          <NuxtLink to="/" class="back-btn">⬅️ 返回前台</NuxtLink>
        </div>
      </header>

      <main v-if="currentTab === 'attendance'" class="data-table">
        <div class="table-header">
          <h3>⏰ 每日遲到名單與通知發送</h3>
          <p class="subtitle">今日日期：{{ todayDisplay }}</p>
        </div>

        <div class="attendance-control-panel">
          <div class="absent-list-section">
            <h4>目前未打卡名單 (共 {{ absentStudentsList.length }} 人)</h4>
            <div class="tags-container">
              <span v-for="student in absentStudentsList" :key="student.id" class="absent-tag">
                {{ student.seat_number }}號 {{ student.real_name }}
              </span>
              <span v-if="absentStudentsList.length === 0" class="all-present-msg">🎉 太棒了！今日全班皆已準時到校。</span>
            </div>
          </div>

          <div class="action-bar">
            <button @click="sendLateEmails" class="email-btn late-btn" :disabled="isSendingLateEmails || absentStudentsList.length === 0">
              {{ isSendingLateEmails ? '正在逐一發送 Email 中，請稍候...' : '📧 密碼解鎖：確認名單並立即發送遲到通知' }}
            </button>
          </div>
        </div>
      </main>

      <main v-if="currentTab === 'board'" class="data-table">
        <div class="table-header"><h3>📢 家長須知管理與 Email 推播</h3><p class="subtitle">今日日期：{{ todayDisplay }}</p></div>
        <div class="board-editor-container">
          <div class="notice-edit-list">
            <div v-for="(notice, index) in adminNotices" :key="index" class="edit-item">
              <span class="bullet">📌</span><input v-model="adminNotices[index]" type="text" class="edit-input notice-input" placeholder="請輸入須知事項..." /><button @click="removeAdminNotice(index)" class="del-row-btn">🗑️</button>
            </div>
            <button @click="addAdminNotice" class="add-btn">➕ 新增一筆須知</button>
          </div>
          <div class="action-bar">
            <button @click="saveAdminNotices" class="save-btn" :disabled="isSavingBoard">{{ isSavingBoard ? '儲存中...' : '💾 儲存並同步' }}</button>
            <button @click="sendNoticeEmail" class="email-btn" :disabled="isSendingEmail">{{ isSendingEmail ? '寄送中...' : '📧 密碼解鎖並推播 (Bcc)' }}</button>
          </div>
        </div>
      </main>

      <main v-if="currentTab === 'messages'" class="data-table">
        <div class="table-header"><h3>💬 班級私訊管理</h3><button @click="exportToExcel" class="export-btn">📥 匯出紀錄</button></div>
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
              <div class="msg-info"><span class="sender">{{ msg.sender_role }}</span><span class="time">{{ formatTime(msg.created_at) }}</span></div><div class="msg-content">{{ msg.content }}</div>
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
            <button @click="exportStudents('json')" class="export-btn json-btn">📥 匯出 JSON</button>
            <button @click="exportStudents('csv')" class="export-btn">📤 匯出 CSV</button>
          </div>
        </div>
        <div class="import-section">
          <div class="import-controls">
            <input type="file" accept=".json, .csv" @change="handleFileUpload" ref="fileInput" />
            <button @click="processImport" class="import-btn" :disabled="!selectedFile || isImporting">🚀 執行匯入</button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="student-edit-table">
            <thead>
              <tr>
                <th width="50">座號</th><th width="80">姓名</th><th width="80">隱藏名</th><th width="90">生日</th><th width="60">後5碼</th>
                <th width="90">稱謂1</th><th width="110">電話1</th><th width="160">信箱1</th>
                <th width="90">稱謂2</th><th width="110">電話2</th><th width="160">信箱2</th>
                <th width="90">稱謂3</th><th width="110">電話3</th><th width="160">信箱3</th>
                <th width="80">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in adminStudents" :key="student.id">
                <td><input type="number" v-model="student.seat_number" class="edit-input num-input"/></td>
                <td><input type="text" v-model="student.real_name" class="edit-input"/></td>
                <td><input type="text" v-model="student.hidden_name" class="edit-input"/></td>
                <td><input type="text" v-model="student.birthday" class="edit-input" placeholder="YYYYMMDD"/></td>
                <td><input type="text" v-model="student.id_last_5" maxlength="5" class="edit-input"/></td>
                <td><input type="text" v-model="student.p1_rel" class="edit-input small-input" placeholder="關係"/></td>
                <td><input type="tel" v-model="student.p1_tel" class="edit-input small-input" placeholder="電話"/></td>
                <td><input type="email" v-model="student.p1_mail" class="edit-input email-input" placeholder="信箱"/></td>
                <td><input type="text" v-model="student.p2_rel" class="edit-input small-input" placeholder="關係"/></td>
                <td><input type="tel" v-model="student.p2_tel" class="edit-input small-input" placeholder="電話"/></td>
                <td><input type="email" v-model="student.p2_mail" class="edit-input email-input" placeholder="信箱"/></td>
                <td><input type="text" v-model="student.p3_rel" class="edit-input small-input" placeholder="關係"/></td>
                <td><input type="tel" v-model="student.p3_tel" class="edit-input small-input" placeholder="電話"/></td>
                <td><input type="email" v-model="student.p3_mail" class="edit-input email-input" placeholder="信箱"/></td>
                <td class="action-cell">
                  <button @click="saveStudent(student)" class="save-row-btn">💾</button>
                  <button @click="deleteStudent(student.id, student.real_name)" class="del-row-btn">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      <main v-if="currentTab === 'audit'" class="data-table">
        <h3>🕵️ 黑板編輯稽核紀錄</h3>
        <table>
          <thead><tr><th>時間</th><th>修改區塊</th><th>編輯者</th><th>IP 位址</th></tr></thead>
          <tbody><tr v-for="log in boardLogs" :key="log.id"><td>{{ formatTime(log.edited_at) }}</td><td><span class="badge">{{ log.board_type }}</span></td><td :class="log.editor_role === '導師' ? 'role-teacher' : 'role-student'">{{ log.editor_role }}</td><td class="ip-text">{{ log.ip_address }}</td></tr></tbody>
        </table>
      </main>

      <main v-if="currentTab === 'communication'" class="data-table">
        <h3>📨 系統通知發送紀錄</h3>
        <table>
          <thead><tr><th>發送時間</th><th>收件學生</th><th>通知類型</th><th>收件信箱</th></tr></thead>
          <tbody><tr v-for="log in commLogs" :key="log.id"><td>{{ formatTime(log.sent_at) }}</td><td>{{ getStudentName(log.student_id) }}</td><td><span class="badge notice">{{ log.notification_type }}</span></td><td class="email-text">{{ log.recipient_emails }}</td></tr></tbody>
        </table>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
const supabase = useSupabaseClient()

const d = new Date(); const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayDisplay = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

const isUnlocked = ref(false); const passwordInput = ref(''); const currentTab = ref('attendance')
const boardLogs = ref([]); const commLogs = ref([]); const allMessages = ref([])
const studentsMap = ref({}); const studentsList = ref([]); const adminStudents = ref([])

// 手動遲到發信專用狀態
const todayAttendances = ref([])
const isSendingLateEmails = ref(false)

const absentStudentsList = computed(() => {
  return adminStudents.value.filter(student => {
    const record = todayAttendances.value.find(a => a.student_id === student.id)
    return !record || record.status === '未到'
  })
})

const adminNotices = ref([]); const isSavingBoard = ref(false); const isSendingEmail = ref(false)
const activeChatThread = ref(''); const replyContent = ref(''); const isSending = ref(false)
const selectedFile = ref(null); const fileInput = ref(null); const isImporting = ref(false)

const filteredMessages = computed(() => {
  if (!activeChatThread.value) return []
  const [targetId, targetType] = activeChatThread.value.split('_')
  return allMessages.value.filter(m => m.student_id === targetId && m.chat_type === targetType)
})

const verifyPassword = async () => {
  if (passwordInput.value === '168168168') { isUnlocked.value = true; await fetchAllData() } else { alert('❌ 密碼錯誤！'); passwordInput.value = '' }
}
const switchTab = async (tab) => { currentTab.value = tab; await fetchAllData() }

const fetchAllData = async () => {
  const { data: attData } = await supabase.from('attendances').select('*').eq('record_date', todayISO)
  if (attData) todayAttendances.value = attData

  const { data: boardData } = await supabase.from('contact_books').select('notices').eq('record_date', todayISO).single()
  adminNotices.value = boardData?.notices || []

  const { data: bLogs } = await supabase.from('board_edit_logs').select('*').order('edited_at', { ascending: false }).limit(50)
  if (bLogs) boardLogs.value = bLogs
  const { data: cLogs } = await supabase.from('communication_logs').select('*').order('sent_at', { ascending: false }).limit(50)
  if (cLogs) commLogs.value = cLogs

  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  const { data: pData } = await supabase.from('parents').select('*')
  
  if (sData) {
    studentsList.value = sData
    sData.forEach(s => { studentsMap.value[s.id] = s.real_name })
    
    adminStudents.value = sData.map(student => {
      const parents = pData ? pData.filter(p => p.student_id === student.id) : []
      return {
        ...student,
        p1_rel: parents[0]?.relationship || '', p1_tel: parents[0]?.phone || '', p1_mail: parents[0]?.email || '',
        p2_rel: parents[1]?.relationship || '', p2_tel: parents[1]?.phone || '', p2_mail: parents[1]?.email || '',
        p3_rel: parents[2]?.relationship || '', p3_tel: parents[2]?.phone || '', p3_mail: parents[2]?.email || ''
      }
    })
  }
  const { data: msgLogs } = await supabase.from('private_messages').select('*').order('created_at', { ascending: true })
  if (msgLogs) { allMessages.value = msgLogs; scrollToBottom() }
}

// ==================== 導師手動一鍵發送遲到信 (抓取按鈕送出時間) ====================
const sendLateEmails = async () => {
  const pwd = window.prompt("🔒 準備寄發缺席通知，請輸入導師密碼：")
  if (pwd !== '168168168') return alert('❌ 密碼錯誤，發送取消！')

  isSendingLateEmails.value = true
  let successCount = 0
  let failCount = 0

  // 💡 取得當下按下按鈕的時間 (格式 HH:MM，例如 08:15)
  const nowTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })

  for (const student of absentStudentsList.value) {
    const parentEmails = [student.p1_mail, student.p2_mail, student.p3_mail].filter(e => e && e.trim() !== '')
    if (parentEmails.length === 0) continue

    // 💡 信件內容的時間動態寫入 nowTime
    const emailContent = `親愛的家長您好：\n\n系統偵測到您的孩子 【${student.real_name}】 於今日 (${todayDisplay}) ${nowTime} 尚未完成到校打卡，特此通知。\n\n若孩子已請假，請忽略此信件；若孩子已出門，請您留意其通勤安全，並可透過班級系統私訊與導師聯繫。\n\n班級導師 敬上\n(此為系統自動發送，請勿直接回信)`

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bcc: parentEmails,
          subject: `⚠️ 學校出缺席通知 - ${student.real_name} 尚未打卡`,
          content: emailContent
        })
      })

      if (!res.ok) throw new Error('API 寄信失敗')

      await supabase.from('communication_logs').insert({
        student_id: student.id,
        notification_type: '遲到通知 (導師手動)',
        sent_by: '導師',
        recipient_emails: parentEmails.join(', '),
        message_content: emailContent
      })
      
      successCount++
    } catch (e) {
      console.error(`寄送給 ${student.real_name} 失敗`, e)
      failCount++
    }
  }

  alert(`✅ 發送作業完成！\n成功寄出：${successCount} 位學生的通知。\n失敗：${failCount} 筆。`)
  isSendingLateEmails.value = false
  await fetchAllData()
}

// 其他保留功能
const addAdminNotice = () => adminNotices.value.push(''); const removeAdminNotice = (i) => adminNotices.value.splice(i, 1)
const saveAdminNotices = async () => { /* 略 */ }
const sendNoticeEmail = async () => { /* 略 */ }
const markCurrentThreadAsRead = async () => { /* 略 */ }
const sendReply = async () => { /* 略 */ }
const saveStudent = async (student) => { /* 略 */ }
const deleteStudent = async (id, name) => { /* 略 */ }
const exportStudents = (type) => { /* 略 */ }
const exportToExcel = () => { /* 略 */ }
const handleFileUpload = (e) => { const file = e.target.files[0]; if (file) selectedFile.value = file }
const processImport = async () => { /* 略 */ }

const formatTime = (isoString) => new Date(isoString).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
const getStudentName = (id) => studentsMap.value[id] || '未知'
const scrollToBottom = () => { nextTick(() => { const c = document.getElementById('adminChatContainer'); if (c) c.scrollTop = c.scrollHeight }) }
</script>

<style scoped>
/* ================= 完整 CSS 樣式 ================= */
.admin-container { min-height: 100vh; background-color: #f1f5f9; font-family: sans-serif; }
.lock-screen { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #1e293b; }
.lock-box { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 400px; }
.lock-box h2 { color: #334155; margin-bottom: 10px; }
.lock-box input { width: 100%; padding: 12px; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.2rem; text-align: center; }
.lock-box button { width: 100%; padding: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 1.1rem; cursor: pointer; font-weight: bold; }
.dashboard { max-width: 1400px; margin: 0 auto; padding: 20px; }

/* Header & Table Common */
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

/* ================= 遲到手動管理專屬樣式 ================= */
.attendance-control-panel { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; }
.absent-list-section { background: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; border: 1px dashed #f59e0b; }
.absent-list-section h4 { margin: 0 0 15px 0; color: #b45309; }
.tags-container { display: flex; flex-wrap: wrap; gap: 10px; }
.absent-tag { background: #fee2e2; color: #dc2626; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.95rem; border: 1px solid #fca5a5; }
.all-present-msg { color: #16a34a; font-weight: bold; font-size: 1.1rem; }
.action-bar { display: flex; gap: 15px; }
.late-btn { background-color: #ef4444; width: 100%; font-size: 1.2rem; padding: 15px; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.late-btn:hover:not(:disabled) { background-color: #dc2626; }
.late-btn:disabled { background-color: #fca5a5; cursor: not-allowed; }

/* 須知推播專屬樣式 */
.board-editor-container { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; }
.notice-edit-list { display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px; }
.edit-item { display: flex; align-items: center; gap: 10px; }
.notice-input { flex: 1; font-size: 1.1rem; padding: 10px 15px; border: 1px solid #94a3b8; border-radius: 6px; background: white; }
.add-btn { background: #e2e8f0; color: #334155; border: 1px dashed #94a3b8; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; margin-top: 10px; }
.save-btn, .email-btn { color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; }
.save-btn { background: #3b82f6; } .email-btn { background: #f59e0b; }
.save-btn:disabled, .email-btn:disabled { background: #9ca3af; cursor: not-allowed; }

/* 聊天室專屬樣式 */
.chat-selector { margin-bottom: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; }
.chat-selector select { padding: 8px 12px; font-size: 1.1rem; border-radius: 6px; border: 1px solid #94a3b8; width: 300px; }
.empty-prompt { text-align: center; padding: 50px; color: #64748b; font-size: 1.2rem; background: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1; }
.chat-container { height: 400px; overflow-y: auto; padding: 20px; background: #f8fafc; border-radius: 8px 8px 0 0; border: 1px solid #e2e8f0; border-bottom: none; display: flex; flex-direction: column; gap: 15px; }
.chat-bubble { max-width: 60%; padding: 12px 16px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.other-msg { background: white; align-self: flex-start; border-left: 4px solid #f59e0b; }
.teacher-msg { background: #dcfce7; align-self: flex-end; border-right: 4px solid #10b981; }
.msg-info { font-size: 0.85rem; margin-bottom: 5px; color: #64748b; display: flex; justify-content: space-between; gap: 15px; }
.msg-content { font-size: 1.1rem; color: #1e293b; line-height: 1.5; white-space: pre-wrap; }
.reply-box { display: flex; padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; gap: 10px; }
.reply-box input { flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.1rem; }
.send-reply-btn { background: #3b82f6; color: white; border: none; padding: 0 20px; border-radius: 6px; font-weight: bold; cursor: pointer; white-space: nowrap; }

/* 學生管理與表格通用樣式 */
.export-actions { display: flex; gap: 10px; }
.export-btn { background-color: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.json-btn { background-color: #8b5cf6; }
.import-section { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; }
.import-controls { display: flex; gap: 10px; align-items: center; }
.import-btn { background: #3b82f6; color: white; font-weight: bold; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.table-responsive { overflow-x: auto; padding-bottom: 15px; }
.student-edit-table { min-width: 1600px; border-collapse: separate; border-spacing: 0; }
.student-edit-table th, .student-edit-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.student-edit-table th { background-color: #f8fafc; color: #64748b; font-weight: bold; position: sticky; top: 0; z-index: 10; }
.edit-input { padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; box-sizing: border-box; font-size: 0.9rem; }
.num-input { width: 50px; text-align: center; }
.email-input { font-family: monospace; font-size: 0.8rem; }
.action-cell { display: flex; gap: 5px; justify-content: center; }
.save-row-btn { background: #3b82f6; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; }

/* 稽核紀錄標籤 */
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; }
th, td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
th { background-color: #f8fafc; color: #64748b; font-weight: bold; white-space: nowrap; }
.empty { text-align: center; color: #94a3b8; padding: 30px !important; }
.badge { background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }
.badge.notice { background: #fef3c7; color: #b45309; }
.role-teacher { color: #dc2626; font-weight: bold; }
.role-student { color: #059669; font-weight: bold; }
.email-text { font-size: 0.9rem; color: #64748b; }
</style>