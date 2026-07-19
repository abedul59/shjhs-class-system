<template>
  <div>
    <div class="table-header"><h3>💬 班級私訊管理</h3></div>
    <div class="chat-selector">
      <select v-model="activeThread">
        <option value="" disabled>請選擇對話...</option>
        <optgroup label="家長群"><option v-for="s in students" :key="'p'+s.id" :value="s.id+'_家長'">{{ s.real_name }} 家長</option></optgroup>
        <optgroup label="學生群"><option v-for="s in students" :key="'s'+s.id" :value="s.id+'_學生'">{{ s.real_name }} 學生</option></optgroup>
      </select>
    </div>
    <div v-if="activeThread">
      <div class="chat-container">
        <div v-for="m in filteredMsgs" :key="m.id" :class="['bubble', m.sender_role === '導師' ? 'teacher' : 'other']">
          <div class="info">{{ m.sender_role }} - {{ new Date(m.created_at).toLocaleString('zh-TW') }}</div>
          <div>{{ m.content }}</div>
        </div>
      </div>
      <div class="reply-box"><input v-model="reply" @keyup.enter="send" class="edit-input"/><button @click="send" class="save-btn">傳送</button></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()
const students = ref([]); const msgs = ref([]); const activeThread = ref(''); const reply = ref('')

const fetchMsgs = async () => {
  const { data: s } = await supabase.from('students').select('*').order('seat_number'); students.value = s || []
  const { data: m } = await supabase.from('private_messages').select('*').order('created_at'); msgs.value = m || []
}
onMounted(() => fetchMsgs())

const filteredMsgs = computed(() => {
  if (!activeThread.value) return []
  const [id, type] = activeThread.value.split('_')
  return msgs.value.filter(m => m.student_id === id && m.chat_type === type)
})

const send = async () => {
  if (!reply.value) return
  const [id, type] = activeThread.value.split('_')
  await supabase.from('private_messages').insert({ student_id: id, chat_type: type, sender_role: '導師', content: reply.value })
  reply.value = ''; await fetchMsgs()
}
</script>

<style scoped>
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } .table-header h3 { margin: 0; color: #334155; }
.chat-selector select { padding: 10px; width: 300px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #cbd5e1; }
.chat-container { height: 400px; overflow-y: auto; background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px 8px 0 0; display: flex; flex-direction: column; gap: 10px; }
.bubble { max-width: 60%; padding: 12px; border-radius: 12px; } .teacher { background: #dcfce7; align-self: flex-end; } .other { background: white; align-self: flex-start; border: 1px solid #e2e8f0; }
.info { font-size: 0.8rem; color: #64748b; margin-bottom: 5px; }
.reply-box { display: flex; gap: 10px; padding: 15px; background: white; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
.edit-input { flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; } .save-btn { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
</style>
