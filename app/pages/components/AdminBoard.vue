<template>
  <div>
    <div class="table-header"><h3>📢 家長須知管理與 Email 推播</h3></div>
    <div class="board-editor-container">
      <div class="notice-edit-list">
        <div v-for="(notice, index) in adminNotices" :key="index" class="edit-item">
          <span class="bullet">📌</span><input v-model="adminNotices[index]" class="edit-input" /><button @click="adminNotices.splice(index, 1)" class="del-btn">🗑️</button>
        </div>
        <button @click="adminNotices.push('')" class="add-btn">➕ 新增一筆須知</button>
      </div>

      <div class="email-editor-section" style="margin-top: 30px;">
        <div class="editor-header">
          <h4>📝 編輯推播信件內容</h4>
          <button @click="saveTmpl" class="save-btn" :disabled="isSavingTmpl">💾 儲存範本</button>
        </div>
        <div class="form-group"><label>主旨：</label><input v-model="subj" class="edit-input" /></div>
        <div class="form-group"><label>內容：(支援變數: {{須知清單}})</label><textarea v-model="cont" rows="6" class="edit-input"></textarea></div>
      </div>

      <div class="action-bar" style="margin-top: 20px; display: flex; gap: 10px;">
        <button @click="saveBoard" class="save-btn lg" :disabled="isSavingBoard">💾 儲存並同步至前台</button>
        <button @click="sendBoard" class="email-btn lg" :disabled="isSending">📧 密碼解鎖推播</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()
const d = new Date(); const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const adminNotices = ref([]); const subj = ref('📢 班級須知推播'); const cont = ref(`各位家長您好：\n\n{{須知清單}}\n\n班級導師 敬上`)
const isSavingBoard = ref(false); const isSavingTmpl = ref(false); const isSending = ref(false)

const fetchData = async () => {
  const { data: board } = await supabase.from('contact_books').select('notices').eq('record_date', todayISO).maybeSingle()
  adminNotices.value = board?.notices || []
  const { data: tmpl } = await supabase.from('email_templates').select('*').eq('template_id', 'notice_board').maybeSingle()
  if (tmpl) { subj.value = tmpl.subject; cont.value = tmpl.content }
}
onMounted(() => fetchData())

const saveTmpl = async () => { isSavingTmpl.value = true; await supabase.from('email_templates').upsert({ template_id: 'notice_board', subject: subj.value, content: cont.value }); alert('範本儲存成功'); isSavingTmpl.value = false }
const saveBoard = async () => {
  isSavingBoard.value = true
  await supabase.from('contact_books').upsert({ record_date: todayISO, notices: adminNotices.value }, { onConflict: 'record_date' })
  alert('✅ 須知儲存成功！'); isSavingBoard.value = false
}
const sendBoard = async () => {
  if (prompt("輸入密碼：") !== '168168168') return
  isSending.value = true
  const { data: parents } = await supabase.from('parents').select('email')
  const emails = [...new Set(parents.map(p => p.email).filter(e => e))]
  if (emails.length === 0) return alert('無家長信箱')
  const finalCont = cont.value.replace(/{{須知清單}}/g, adminNotices.value.map(n=>'📌 '+n).join('\n'))
  await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bcc: emails, subject: subj.value, content: finalCont }) })
  await supabase.from('communication_logs').insert({ notification_type: '須知推播', sent_by: '導師', recipient_emails: '全班群發', message_content: finalCont })
  alert('✅ 推播成功！'); isSending.value = false
}
</script>

<style scoped>
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } .table-header h3 { margin: 0; color: #334155; }
.board-editor-container { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; }
.edit-item { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; } .edit-input { flex: 1; padding: 10px; border: 1px solid #94a3b8; border-radius: 6px; width: 100%; box-sizing: border-box; }
.del-btn { background: #ef4444; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; } .add-btn { background: #e2e8f0; border: 1px dashed #94a3b8; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.email-editor-section { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; } .editor-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
.save-btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; } .email-btn { background: #f59e0b; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.lg { font-size: 1.1rem; padding: 12px 24px; } .form-group { margin-bottom: 15px; }
</style>
