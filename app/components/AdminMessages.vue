<template>
  <div>
    <div class="table-header"><h3>💬 班級私訊管理</h3><button @click="exportToExcel" class="export-btn">📥 匯出紀錄</button></div>
    <div class="chat-selector">
      <label>切換對話頻道：</label>
      <select v-model="activeChatThread" @change="markCurrentThreadAsRead">
        <option value="" disabled selected>請選擇要查看的對話...</option>
        <optgroup label="👨‍👩‍👧 家長群"><option v-for="s in students" :key="'p-'+s.id" :value="s.id+'_家長'">{{ s.seat_number }}號 {{ s.real_name }} 的家長</option></optgroup>
        <optgroup label="👩‍🎓 學生群"><option v-for="s in students" :key="'s-'+s.id" :value="s.id+'_學生'">{{ s.seat_number }}號 {{ s.real_name }} (學生)</option></optgroup>
      </select>
    </div>
    <div v-if="!activeChatThread" class="empty-prompt">👈 請從上方選擇一個對話群組。</div>
    <div v-else>
      <div class="chat-container" id="adminChatContainer">
        <div v-if="filteredMessages.length === 0" class="empty">此頻道目前尚無通訊紀錄</div>
        <div v-for="msg in filteredMessages" :key="msg.id" :class="['chat-bubble', msg.sender_role === '導師' ? 'teacher-msg' : 'other-msg']">
          <div class="msg-info"><span class="sender">{{ msg.sender_role }}</span><span class="time">{{ new Date(msg.created_at).toLocaleString('zh-TW') }}</span></div>
          <div class="msg-content">{{ msg.content }}</div>
        </div>
      </div>
      <div class="reply-box">
        <input v-model="replyContent" type="text" placeholder="輸入回覆..." @keyup.enter="sendReply" />
        <button @click="sendReply" class="send-reply-btn" :disabled="isSending">📤 傳送</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
const supabase = useSupabaseClient()
const students = ref([]); const allMessages = ref([]); const activeChatThread = ref(''); const replyContent = ref(''); const isSending = ref(false)

const fetchData = async () => {
  const { data: s } = await supabase.from('students').select('*').order('seat_number'); students.value = s || []
  const { data: m } = await supabase.from('private_messages').select('*').order('created_at'); allMessages.value = m || []
}
onMounted(() => fetchData())

const filteredMessages = computed(() => {
  if (!activeChatThread.value) return []
  const [targetId, targetType] = activeChatThread.value.split('_')
  return allMessages.value.filter(m => m.student_id === targetId && m.chat_type === targetType)
})

const sendReply = async () => {
  if (!replyContent.value || !activeChatThread.value) return
  isSending.value = true; const [targetId, targetType] = activeChatThread.value.split('_')
  await supabase.from('private_messages').insert({ student_id: targetId, chat_type: targetType, sender_role: '導師', content: replyContent.value })
  replyContent.value = ''; await fetchData(); scrollToBottom()
  isSending.value = false
}
const markCurrentThreadAsRead = () => scrollToBottom()
const exportToExcel = () => alert('📊 私訊匯出準備中...')
const scrollToBottom = () => nextTick(() => { const c = document.getElementById('adminChatContainer'); if (c) c.scrollTop = c.scrollHeight })
</script>

<style scoped>
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.table-header h3 { margin: 0; color: #334155; }
.export-btn { background-color: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.chat-selector { margin-bottom: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; }
.chat-selector select { padding: 8px 12px; font-size: 1.1rem; border-radius: 6px; width: 300px; }
.empty-prompt { text-align: center; padding: 50px; color: #64748b; font-size: 1.2rem; background: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1; }
.chat-container { height: 400px; overflow-y: auto; padding: 20px; background: #f8fafc; border-radius: 8px 8px 0 0; border: 1px solid #e2e8f0; border-bottom: none; display: flex; flex-direction: column; gap: 15px; }
.chat-bubble { max-width: 60%; padding: 12px 16px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.other-msg { background: white; align-self: flex-start; border-left: 4px solid #f59e0b; }
.teacher-msg { background: #dcfce7; align-self: flex-end; border-right: 4px solid #10b981; }
.msg-info { font-size: 0.85rem; margin-bottom: 5px; color: #64748b; display: flex; justify-content: space-between; gap: 15px; }
.msg-content { font-size: 1.1rem; color: #1e293b; line-height: 1.5; white-space: pre-wrap; }
.reply-box { display: flex; padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; gap: 10px; }
.reply-box input { flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.1rem; }
.send-reply-btn { background: #3b82f6; color: white; border: none; padding: 0 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.empty { text-align: center; color: #94a3b8; padding: 30px !important; }
</style>