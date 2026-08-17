<template>
  <div class="admin-messages-panel">
    
    <div class="table-header">
      <h3>💬 班級私訊管理</h3>
      <div class="header-actions">
        <button @click="exportData('json')" class="btn-outline">📤 匯出 JSON</button>
        <button @click="exportData('csv')" class="btn-outline">📤 匯出 CSV</button>
        <label class="btn-outline" style="cursor: pointer;">
          📥 匯入紀錄
          <input type="file" accept=".json,.csv" style="display:none" @change="importData" />
        </label>
      </div>
    </div>

    <div class="chat-selector">
      <label>切換對話頻道：</label>
      <select v-model="activeChatThread" @change="markCurrentThreadAsRead">
        <option value="" disabled selected>請選擇要查看的對話...</option>
        
        <optgroup label="👨‍👩‍👧 家長群">
          <option v-for="s in students" :key="'p-'+s.id" :value="s.id+'_家長'">
            {{ s.seat_number }}號 {{ s.real_name }} 的家長 {{ getMsgBadge(s.id, '家長') }}
          </option>
        </optgroup>
        
        <optgroup label="👩‍🎓 學生群">
          <option v-for="s in students" :key="'s-'+s.id" :value="s.id+'_學生'">
            {{ s.seat_number }}號 {{ s.real_name }} (學生) {{ getMsgBadge(s.id, '學生') }}
          </option>
        </optgroup>
      </select>
    </div>

    <div v-if="!activeChatThread" class="empty-prompt">
      👈 請從上方選擇一個對話群組來查看與回覆訊息。
    </div>
    
    <div v-else class="chat-window">
      <div class="chat-container" id="adminChatContainer">
        <div v-if="filteredMessages.length === 0" class="empty">此頻道目前尚無通訊紀錄</div>
        
        <div v-for="msg in filteredMessages" :key="msg.id" 
             class="chat-row" :class="{'row-right': msg.sender_role === '導師', 'row-left': msg.sender_role !== '導師'}">
             
          <div class="chat-bubble" :class="getBubbleClass(msg.sender_role, msg.chat_type)">
            
            <div class="msg-info">
              <span class="sender">{{ msg.sender_role }}</span>
              <span class="time">{{ formatTime(msg.created_at) }}</span>
            </div>

            <div v-if="editingMsgId === msg.id" class="edit-box">
              <textarea v-model="editContentTemp" class="edit-textarea" rows="3"></textarea>
              <div class="edit-actions">
                <button @click="cancelEdit" class="cancel-btn">取消</button>
                <button @click="saveEdit(msg.id)" class="save-btn">💾 儲存</button>
              </div>
            </div>

            <div v-else>
              <div class="msg-content">{{ msg.content }}</div>
              
              <div v-if="msg.sender_role === '導師'" class="teacher-actions">
                <button @click="startEdit(msg)" class="action-icon" title="編輯這則訊息">✏️</button>
                <button @click="deleteMsg(msg.id)" class="action-icon" title="刪除這則訊息">🗑️</button>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <div class="reply-box">
        <input v-model="replyContent" type="text" placeholder="輸入您的回覆..." @keyup.enter="sendReply" />
        <button @click="sendReply" class="send-reply-btn" :disabled="isSending">📤 傳送</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
const supabase = useSupabaseClient()

const students = ref([])
const allMessages = ref([])
const activeChatThread = ref('')
const replyContent = ref('')
const isSending = ref(false)

// 編輯留言狀態
const editingMsgId = ref(null)
const editContentTemp = ref('')

const fetchData = async () => {
  const { data: s } = await supabase.from('students').select('*').order('seat_number')
  students.value = s || []
  
  const { data: m } = await supabase.from('private_messages').select('*').order('created_at')
  allMessages.value = m || []
}

onMounted(() => fetchData())

const filteredMessages = computed(() => {
  if (!activeChatThread.value) return []
  const [targetId, targetType] = activeChatThread.value.split('_')
  return allMessages.value.filter(m => m.student_id === targetId && m.chat_type === targetType)
})

// 💡 取得每個頻道的未讀/訊息數量標示，讓導師能注意到新訊息
const getMsgBadge = (studentId, type) => {
  const msgs = allMessages.value.filter(m => m.student_id === studentId && m.chat_type === type)
  if (msgs.length === 0) return ''
  
  // 檢查是否有未讀訊息 (這裡假設最後一則是家長或學生發的，就標示為新訊息，或者直接標示總數)
  const lastMsg = msgs[msgs.length - 1]
  if (lastMsg.sender_role !== '導師' && !lastMsg.is_read_by_admin) {
    return '🔴 (有新訊息)'
  }
  return `(共 ${msgs.length} 則)`
}

// 💡 美化：根據發送者與身份給予不同的背景色
const getBubbleClass = (role, type) => {
  if (role === '導師') return 'teacher-msg' // 導師：綠色
  if (type === '家長') return 'parent-msg'   // 家長：黃色
  return 'student-msg'                        // 學生：水藍色
}

// 💡 時間格式化
const formatTime = (isoString) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const sendReply = async () => {
  if (!replyContent.value || !activeChatThread.value) return
  isSending.value = true
  const [targetId, targetType] = activeChatThread.value.split('_')
  
  await supabase.from('private_messages').insert({ 
    student_id: targetId, 
    chat_type: targetType, 
    sender_role: '導師', 
    content: replyContent.value 
  })
  
  replyContent.value = ''
  await fetchData()
  scrollToBottom()
  isSending.value = false
}

// 💡 編輯功能
const startEdit = (msg) => {
  editingMsgId.value = msg.id
  editContentTemp.value = msg.content
}

const cancelEdit = () => {
  editingMsgId.value = null
  editContentTemp.value = ''
}

const saveEdit = async (id) => {
  if (!editContentTemp.value.trim()) return alert("留言不能為空！")
  
  await supabase.from('private_messages').update({ content: editContentTemp.value }).eq('id', id)
  
  cancelEdit()
  await fetchData()
}

// 💡 刪除功能
const deleteMsg = async (id) => {
  if (confirm("確定要刪除這則訊息嗎？(刪除後無法復原)")) {
    await supabase.from('private_messages').delete().eq('id', id)
    await fetchData()
  }
}

const markCurrentThreadAsRead = async () => {
  if (!activeChatThread.value) return
  const [targetId, targetType] = activeChatThread.value.split('_')
  
  // 將該頻道內尚未已讀的家長/學生訊息標記為已讀 (若資料庫有這個欄位)
  try {
    await supabase.from('private_messages')
      .update({ is_read_by_admin: true })
      .eq('student_id', targetId)
      .eq('chat_type', targetType)
      .neq('sender_role', '導師')
      .eq('is_read_by_admin', false)
  } catch(e) {} // 忽略如果欄位不存在的錯誤
  
  await fetchData()
  scrollToBottom()
}

const scrollToBottom = () => {
  nextTick(() => { 
    const c = document.getElementById('adminChatContainer'); 
    if (c) c.scrollTop = c.scrollHeight 
  })
}

// ==========================================
// 💡 JSON & CSV 匯出/匯入功能 (完整還原)
// ==========================================
const exportData = (format) => {
  if (allMessages.value.length === 0) return alert('目前沒有任何訊息可以匯出！')
  
  let content = ''
  let mime = ''
  let filename = ''

  if (format === 'json') {
    content = JSON.stringify(allMessages.value, null, 2)
    mime = 'application/json'
    filename = 'private_messages_backup.json'
  } else if (format === 'csv') {
    const headers = ['id', 'student_id', 'chat_type', 'sender_role', 'content', 'created_at']
    const rows = allMessages.value.map(m => headers.map(h => `"${String(m[h] || '').replace(/"/g, '""')}"`).join(','))
    content = "\uFEFF" + headers.join(',') + '\n' + rows.join('\n') // 加入 BOM 防止 Excel 中文亂碼
    mime = 'text/csv;charset=utf-8;'
    filename = 'private_messages_backup.csv'
  }

  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const importData = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  
  reader.onload = async (event) => {
    const text = event.target.result
    let importedData = []
    
    try {
      if (file.name.endsWith('.json')) {
        importedData = JSON.parse(text)
        if (!Array.isArray(importedData)) throw new Error("JSON 格式必須為陣列")
      } 
      else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter(l => l.trim())
        const headers = lines[0].split(',')
        
        for (let i = 1; i < lines.length; i++) {
          const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g
          let match; const values = []
          while ((match = regex.exec(lines[i])) !== null) {
            if (match.index === regex.lastIndex) regex.lastIndex++
            values.push(match[1] ? match[1].replace(/""/g, '"') : match[2])
          }
          if (values.length < headers.length) continue
          
          let obj = {}
          headers.forEach((h, idx) => { obj[h.replace(/["\r]/g, '')] = values[idx] })
          importedData.push(obj)
        }
      }
      
      if (importedData.length > 0 && confirm(`準備匯入 ${importedData.length} 筆訊息，建議先匯出備份，確定繼續嗎？`)) {
        // 因為訊息較多，使用 upsert 避免 ID 衝突
        await supabase.from('private_messages').upsert(importedData)
        await fetchData()
        alert('✅ 匯入成功！')
      }
    } catch(err) {
      alert('❌ 匯入失敗：檔案格式不正確或資料庫拒絕。' + err.message)
    }
    e.target.value = '' // 清除選擇
  }
  reader.readAsText(file)
}
</script>

<style scoped>
.admin-messages-panel { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; font-family: sans-serif; }

.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;}
.table-header h3 { margin: 0; color: #334155; font-size: 1.4rem; }

.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-outline { background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 0.95rem; }
.btn-outline:hover { background: #e2e8f0; color: #1e293b; }

.chat-selector { margin-bottom: 15px; background: #f0f9ff; padding: 15px 20px; border-radius: 8px; border: 1px dashed #7dd3fc; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;}
.chat-selector label { font-weight: bold; color: #0284c7; font-size: 1.1rem; }
.chat-selector select { padding: 10px 15px; font-size: 1.1rem; border-radius: 6px; width: 350px; border: 1px solid #7dd3fc; color: #0369a1; font-weight: bold; cursor: pointer; }
.chat-selector select:focus { outline: none; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2); }

.empty-prompt { text-align: center; padding: 60px; color: #94a3b8; font-size: 1.2rem; background: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1; margin-top: 20px; font-style: italic;}

.chat-window { margin-top: 20px; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #f1f5f9; }

/* 💡 美化後的對話視窗 */
.chat-container { height: 500px; overflow-y: auto; padding: 25px; display: flex; flex-direction: column; gap: 20px; background-color: #f1f5f9; }
.empty { text-align: center; color: #94a3b8; padding: 30px !important; font-style: italic;}

/* 每一行的佈局 (靠左或靠右) */
.chat-row { display: flex; width: 100%; }
.row-left { justify-content: flex-start; }
.row-right { justify-content: flex-end; }

/* 💡 對話氣泡樣式 */
.chat-bubble { max-width: 65%; padding: 15px; border-radius: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); position: relative; }
.msg-info { font-size: 0.85rem; margin-bottom: 8px; color: #64748b; display: flex; justify-content: space-between; gap: 20px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 5px; }
.sender { font-weight: bold; }
.time { opacity: 0.8; }
.msg-content { font-size: 1.1rem; color: #1e293b; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }

/* 💡 各角色的專屬背景色 */
.teacher-msg { background: #dcfce7; border-bottom-right-radius: 4px; border: 1px solid #bbf7d0; } /* 綠色 */
.parent-msg { background: #fef3c7; border-bottom-left-radius: 4px; border: 1px solid #fde68a; } /* 黃色 */
.student-msg { background: #e0e7ff; border-bottom-left-radius: 4px; border: 1px solid #c7d2fe; } /* 水藍色 */

/* 老師專屬的編輯/刪除按鈕區塊 */
.teacher-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px; opacity: 0.6; transition: opacity 0.2s; }
.chat-bubble:hover .teacher-actions { opacity: 1; }
.action-icon { background: rgba(255,255,255,0.5); border: none; cursor: pointer; border-radius: 4px; padding: 4px 6px; font-size: 0.9rem; transition: background 0.2s;}
.action-icon:hover { background: rgba(255,255,255,1); }

/* 編輯輸入框樣式 */
.edit-box { margin-top: 5px; }
.edit-textarea { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 6px; border: 1px dashed #10b981; font-family: inherit; font-size: 1.05rem; resize: vertical; margin-bottom: 8px;}
.edit-actions { display: flex; justify-content: flex-end; gap: 10px; }
.cancel-btn { background: white; color: #64748b; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;}
.save-btn { background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: bold;}

/* 底部發送區 */
.reply-box { display: flex; padding: 15px; background: white; border-top: 1px solid #cbd5e1; gap: 15px; align-items: stretch; }
.reply-box input { flex: 1; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1.1rem; transition: 0.2s;}
.reply-box input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
.send-reply-btn { background: #3b82f6; color: white; border: none; padding: 0 25px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1rem; transition: 0.2s; white-space: nowrap;}
.send-reply-btn:hover:not(:disabled) { background: #2563eb; }
.send-reply-btn:disabled { background: #94a3b8; cursor: not-allowed; }

@media (max-width: 768px) {
  .admin-messages-panel { padding: 15px; }
  .chat-selector select { width: 100%; }
  .chat-bubble { max-width: 85%; }
  .reply-box { flex-direction: column; }
  .send-reply-btn { padding: 15px; }
}
</style>
