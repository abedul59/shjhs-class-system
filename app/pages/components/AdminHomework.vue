<template>
  <div class="data-table">
    <div class="table-header"><h3>📚 班級作業總覽與科任老師管理</h3></div>

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

    <div class="homework-section">
      <h4>📊 全班學生作業繳交總覽與通知發送</h4>
      <p class="help-text">系統會為每位學生獨立生成一封信並單獨發送給其家長，保證隱私絕對隔離。</p>

      <div class="email-editor-section">
        <div class="editor-header">
          <h4>📝 編輯作業信件內容</h4>
          <button @click="saveHwEmailTemplate" class="save-template-btn" :disabled="isSavingHwTemplate">{{ isSavingHwTemplate ? '儲存中...' : '💾 儲存為預設範本' }}</button>
        </div>
        <p class="help-text">💡 可使用以下變數：<span class="var-tag" v-pre>{{學生姓名}}</span>、<span class="var-tag" v-pre>{{已交清單}}</span>、<span class="var-tag" v-pre>{{缺交清單}}</span></p>
        <div class="form-group"><label>信件主旨：</label><input type="text" v-model="hwEmailSubjectTemplate" class="edit-input" /></div>
        <div class="form-group"><label>信件內容：</label><textarea v-model="hwEmailContentTemplate" rows="8" class="edit-input textarea-input"></textarea></div>
      </div>

      <div class="email-preview-section">
        <h4>👀 信件預覽 <span class="preview-note">(以目前名單第一位學生為例)</span></h4>
        <div class="preview-box">
          <div class="preview-subject"><strong>主旨：</strong> {{ hwPreviewSubject }}</div>
          <div class="preview-body">{{ hwPreviewContent }}</div>
        </div>
      </div>

      <div class="action-bar" style="margin-bottom: 25px;">
        <button @click="sendHomeworkEmails" class="email-btn late-btn" :disabled="isSendingHomework">{{ isSendingHomework ? '正在逐一發送作業報表...' : '📧 密碼解鎖：確認無誤並一鍵發送全班作業通知' }}</button>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()

const adminStudents = ref([]); const subjectTeachers = ref([])
const newTeacher = ref({ subject: '', password: '', assistant_password: '' })
const allAssignments = ref([]); const allSubmissions = ref([])
const isSendingHomework = ref(false); const isSavingHwTemplate = ref(false)

const hwEmailSubjectTemplate = ref('📚 班級作業繳交通知 - {{學生姓名}}')
const hwEmailContentTemplate = ref(`親愛的家長您好：\n\n為您彙整 【{{學生姓名}}】 目前的作業繳交狀況：\n\n✅ 已交作業：\n{{已交清單}}\n\n❌ 缺交作業：\n{{缺交清單}}\n\n班級導師 敬上`)

const fetchData = async () => {
  const { data: tmplData } = await supabase.from('email_templates').select('*').eq('template_id', 'homework_notice').single()
  if (tmplData) { hwEmailSubjectTemplate.value = tmplData.subject; hwEmailContentTemplate.value = tmplData.content }

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
}

onMounted(() => { fetchData() })

const studentAssignmentStats = computed(() => {
  return adminStudents.value.map(student => {
    const mySubmissions = allSubmissions.value.filter(sub => sub.student_id === student.id)
    const submittedIds = mySubmissions.map(sub => sub.assignment_id)
    const submitted = allAssignments.value.filter(a => submittedIds.includes(a.id))
    const missing = allAssignments.value.filter(a => !submittedIds.includes(a.id))
    return { ...student, submitted, missing }
  })
})

const hwPreviewSubject = computed(() => {
  const sampleName = studentAssignmentStats.value.length > 0 ? studentAssignmentStats.value[0].real_name : '王小明'
  return hwEmailSubjectTemplate.value.replace(/{{學生姓名}}/g, sampleName)
})
const hwPreviewContent = computed(() => {
  const sample = studentAssignmentStats.value.length > 0 ? studentAssignmentStats.value[0] : null
  const sampleName = sample ? sample.real_name : '王小明'
  const submittedStr = sample && sample.submitted.length ? sample.submitted.map(a => `[${a.subject_name}] ${a.title}`).join('\n') : '無'
  const missingStr = sample && sample.missing.length ? sample.missing.map(a => `[${a.subject_name}] ${a.title}`).join('\n') : '無'
  return hwEmailContentTemplate.value.replace(/{{學生姓名}}/g, sampleName).replace(/{{已交清單}}/g, submittedStr).replace(/{{缺交清單}}/g, missingStr)
})

const saveHwEmailTemplate = async () => {
  isSavingHwTemplate.value = true
  try {
    await supabase.from('email_templates').upsert({ template_id: 'homework_notice', subject: hwEmailSubjectTemplate.value, content: hwEmailContentTemplate.value })
    alert('✅ 作業信件範本已永久儲存！')
  } catch (error) { alert('❌ 儲存失敗。') } finally { isSavingHwTemplate.value = false }
}

const addTeacher = async () => {
  if (!newTeacher.value.subject || !newTeacher.value.password) return
  const { data, error } = await supabase.from('subject_teachers').insert({ subject_name: newTeacher.value.subject, password: newTeacher.value.password, assistant_password: newTeacher.value.assistant_password }).select().single()
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

const sendHomeworkEmails = async () => {
  const pwd = window.prompt("🔒 準備群發作業報表，請輸入導師密碼：")
  if (pwd !== '168168168') return alert('❌ 密碼錯誤！')
  isSendingHomework.value = true; let successCount = 0; let failCount = 0

  for (const stat of studentAssignmentStats.value) {
    const parentEmails = [stat.p1_mail, stat.p2_mail, stat.p3_mail].filter(e => e && e.trim() !== '')
    if (parentEmails.length === 0) continue
    const submittedList = stat.submitted.map(a => `[${a.subject_name}] ${a.title}`).join('\n') || '無'
    const missingList = stat.missing.map(a => `[${a.subject_name}] ${a.title} (期限: ${a.deadline || '未定'})`).join('\n') || '無'
    const finalSubject = hwEmailSubjectTemplate.value.replace(/{{學生姓名}}/g, stat.real_name)
    const finalContent = hwEmailContentTemplate.value.replace(/{{學生姓名}}/g, stat.real_name).replace(/{{已交清單}}/g, submittedList).replace(/{{缺交清單}}/g, missingList)

    try {
      const res = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bcc: parentEmails, subject: finalSubject, content: finalContent }) })
      if (!res.ok) throw new Error('API 寄信失敗')
      await supabase.from('communication_logs').insert({ student_id: stat.id, notification_type: '作業報表群發', sent_by: '導師', recipient_emails: parentEmails.join(', '), message_content: finalContent })
      successCount++
    } catch (e) { failCount++ }
  }
  alert(`✅ 發送完成！\n成功：${successCount} 位\n失敗：${failCount} 位`); isSendingHomework.value = false; await fetchData()
}
</script>

<style scoped>
.data-table { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.table-header h3 { margin: 0; color: #334155; }
.homework-section { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.homework-section h4 { margin: 0 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
.teacher-list { display: flex; flex-direction: column; gap: 10px; }
.teacher-item { display: flex; gap: 10px; align-items: center; background: white; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
.new-teacher { background: #f0fdf4; border-color: #bbf7d0; }
.edit-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; width: 100%; }
.subject-input { width: 120px; } .pwd-input { width: 180px; }
.add-btn.small-btn { background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; }
.save-row-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
.email-editor-section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
.editor-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 10px; }
.editor-header h4 { margin: 0; color: #334155; }
.save-template-btn { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.var-tag { background: #e2e8f0; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold; }
.form-group { margin-bottom: 15px; } .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #475569; }
.textarea-input { resize: vertical; font-family: inherit; line-height: 1.5; }
.email-preview-section { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.preview-box { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
.preview-subject { font-size: 1.1rem; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px; }
.preview-body { font-size: 1rem; color: #334155; line-height: 1.6; white-space: pre-wrap; }
.late-btn { background-color: #f59e0b; width: 100%; font-size: 1.2rem; padding: 15px; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.late-btn:hover:not(:disabled) { background-color: #d97706; }
.student-homework-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px; max-height: 600px; overflow-y: auto; padding-right: 10px; }
.hw-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.hw-card-header { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
.badge { padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
.success { background: #dcfce7; color: #166534; } .warning { background: #fee2e2; color: #991b1b; }
.hw-card-body { padding: 15px; display: flex; flex-direction: column; gap: 15px; }
.hw-title { font-size: 0.9rem; font-weight: bold; margin-bottom: 5px; }
.hw-list ul { margin: 0; padding-left: 20px; font-size: 0.85rem; color: #475569; }
.none-text { list-style: none; color: #94a3b8; font-style: italic; margin-left: -20px; }
.missing-list .hw-title { color: #dc2626; } .submitted-list .hw-title { color: #16a34a; }
.help-text { font-size: 0.95rem; color: #64748b; margin-bottom: 20px; line-height: 1.5; }
</style>
