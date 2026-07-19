<template>
  <div>
    <div class="table-header"><h3>📚 班級作業總覽與科任老師管理</h3></div>
    <div class="homework-section">
      <h4>🧑‍🏫 科任老師密碼管理</h4>
      <div class="teacher-list">
        <div v-for="t in subjectTeachers" :key="t.id" class="teacher-item">
          <input v-model="t.subject_name" class="edit-input"/><input v-model="t.password" class="edit-input"/><input v-model="t.assistant_password" class="edit-input"/>
          <button @click="saveTeacher(t)" class="save-btn">💾</button><button @click="deleteTeacher(t.id)" class="del-btn">🗑️</button>
        </div>
        <div class="teacher-item"><input v-model="newT.subject" placeholder="新科目" class="edit-input"/><input v-model="newT.pwd" placeholder="密碼" class="edit-input"/><button @click="addTeacher" class="save-btn">➕</button></div>
      </div>
    </div>

    <div class="homework-section">
      <h4>📊 作業繳交通知發送</h4>
      <div class="email-editor-section">
        <div class="editor-header">
          <h4>📝 編輯信件</h4>
          <button @click="saveTmpl" class="save-btn" :disabled="isSavingTmpl">💾 儲存</button>
        </div>
        <div class="form-group"><input v-model="hwSubj" class="edit-input" /></div>
        <div class="form-group"><textarea v-model="hwCont" rows="6" class="edit-input"></textarea></div>
      </div>
      <button @click="sendMails" class="email-btn" :disabled="isSending">📧 解鎖群發作業報表</button>

      <div class="student-homework-grid" style="margin-top: 20px;">
        <div v-for="stat in stats" :key="stat.id" class="hw-card">
          <div class="hw-card-header"><strong>{{ stat.seat_number }}號 {{ stat.real_name }}</strong></div>
          <div class="hw-card-body">
            <div style="color:red">❌ 缺交: <span v-for="m in stat.missing" :key="m.id">[{{m.subject_name}}] {{m.title}} </span></div>
            <div style="color:green">✅ 已交: <span v-for="s in stat.submitted" :key="s.id">[{{s.subject_name}}] {{s.title}} </span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()
const adminStudents = ref([]); const subjectTeachers = ref([]); const allAssignments = ref([]); const allSubmissions = ref([])
const newT = ref({ subject: '', pwd: '' }); const isSending = ref(false); const isSavingTmpl = ref(false)
const hwSubj = ref('📚 作業通知 - {{學生姓名}}'); const hwCont = ref(`✅ 已交：\n{{已交清單}}\n❌ 缺交：\n{{缺交清單}}`)

const fetchData = async () => {
  const { data: tmpl } = await supabase.from('email_templates').select('*').eq('template_id', 'homework_notice').maybeSingle()
  if (tmpl) { hwSubj.value = tmpl.subject; hwCont.value = tmpl.content }
  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  const { data: pData } = await supabase.from('parents').select('*')
  if (sData) adminStudents.value = sData.map(s => { const p = pData ? pData.filter(x => x.student_id === s.id) : []; return { ...s, emails: p.map(x=>x.email).filter(x=>x) } })
  const { data: tData } = await supabase.from('subject_teachers').select('*'); if(tData) subjectTeachers.value = tData
  const { data: aData } = await supabase.from('assignments').select('*'); if(aData) allAssignments.value = aData
  const { data: subData } = await supabase.from('assignment_submissions').select('*'); if(subData) allSubmissions.value = subData
}
onMounted(() => fetchData())

const stats = computed(() => adminStudents.value.map(s => {
  const mySubIds = allSubmissions.value.filter(sub => sub.student_id === s.id).map(sub => sub.assignment_id)
  return { ...s, submitted: allAssignments.value.filter(a => mySubIds.includes(a.id)), missing: allAssignments.value.filter(a => !mySubIds.includes(a.id)) }
}))

const addTeacher = async () => {
  const { data } = await supabase.from('subject_teachers').insert({ subject_name: newT.value.subject, password: newT.value.pwd }).select().single()
  if (data) { subjectTeachers.value.push(data); newT.value = { subject: '', pwd: '' } }
}
const saveTeacher = async (t) => { await supabase.from('subject_teachers').update({ subject_name: t.subject_name, password: t.password, assistant_password: t.assistant_password }).eq('id', t.id); alert('儲存成功') }
const deleteTeacher = async (id) => { await supabase.from('subject_teachers').delete().eq('id', id); subjectTeachers.value = subjectTeachers.value.filter(t => t.id !== id) }
const saveTmpl = async () => { isSavingTmpl.value = true; await supabase.from('email_templates').upsert({ template_id: 'homework_notice', subject: hwSubj.value, content: hwCont.value }); alert('成功'); isSavingTmpl.value = false }
const sendMails = async () => {
  if (prompt("輸入密碼：") !== '168168168') return
  isSending.value = true
  for (const s of stats.value) {
    if (s.emails.length === 0) continue
    const subj = hwSubj.value.replace(/{{學生姓名}}/g, s.real_name)
    const cont = hwCont.value.replace(/{{已交清單}}/g, s.submitted.map(a=>a.title).join(', ')).replace(/{{缺交清單}}/g, s.missing.map(a=>a.title).join(', '))
    await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bcc: s.emails, subject: subj, content: cont }) })
  }
  alert('發送完成！'); isSending.value = false
}
</script>

<style scoped>
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } .table-header h3 { margin: 0; color: #334155; }
.homework-section { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.teacher-item { display: flex; gap: 10px; margin-bottom: 10px; } .edit-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; flex: 1; }
.save-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; } .del-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
.email-editor-section { background: white; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
.editor-header { display: flex; justify-content: space-between; margin-bottom: 15px; } .form-group { margin-bottom: 10px; }
.email-btn { width: 100%; padding: 15px; background: #f59e0b; color: white; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; }
.student-homework-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
.hw-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; } .hw-card-header { margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 5px; }
</style>
