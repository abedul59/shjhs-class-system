<template>
  <div>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()
const d = new Date(); const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayDisplay = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

const adminStudents = ref([]); const todayAttendances = ref([])
const emailSubjectTemplate = ref('⚠️ 學校出缺席通知 - {{學生姓名}} 尚未打卡')
const emailContentTemplate = ref(`親愛的家長您好：\n\n系統偵測到您的孩子 【{{學生姓名}}】 於今日 ({{今日日期}}) {{當下時間}} 尚未完成到校打卡，特此通知。\n\n班級導師 敬上`)
const isSavingTemplate = ref(false); const isSendingLateEmails = ref(false)

const fetchData = async () => {
  const { data: tmpl } = await supabase.from('email_templates').select('*').eq('template_id', 'late_notice').maybeSingle()
  if (tmpl) { emailSubjectTemplate.value = tmpl.subject; emailContentTemplate.value = tmpl.content }
  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  const { data: pData } = await supabase.from('parents').select('*')
  if (sData) adminStudents.value = sData.map(s => {
    const p = pData ? pData.filter(x => x.student_id === s.id) : []
    return { ...s, p1_mail: p[0]?.email, p2_mail: p[1]?.email, p3_mail: p[2]?.email }
  })
  const { data: att } = await supabase.from('attendances').select('*').eq('record_date', todayISO)
  if (att) todayAttendances.value = att
}
onMounted(() => fetchData())

const absentStudentsList = computed(() => adminStudents.value.filter(s => !todayAttendances.value.find(a => a.student_id === s.id) || todayAttendances.value.find(a => a.student_id === s.id).status === '未到'))

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

const saveEmailTemplate = async () => {
  isSavingTemplate.value = true
  await supabase.from('email_templates').upsert({ template_id: 'late_notice', subject: emailSubjectTemplate.value, content: emailContentTemplate.value })
  alert('✅ 遲到信件範本已永久儲存！'); isSavingTemplate.value = false
}

const sendLateEmails = async () => {
  if (prompt("🔒 請輸入導師密碼：") !== '168168168') return alert('❌ 密碼錯誤')
  isSendingLateEmails.value = true; let successCount = 0; const nowTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  for (const s of absentStudentsList.value) {
    const emails = [s.p1_mail, s.p2_mail, s.p3_mail].filter(e => e)
    if (emails.length === 0) continue
    const subj = emailSubjectTemplate.value.replace(/{{學生姓名}}/g, s.real_name).replace(/{{今日日期}}/g, todayDisplay).replace(/{{當下時間}}/g, nowTime)
    const cont = emailContentTemplate.value.replace(/{{學生姓名}}/g, s.real_name).replace(/{{今日日期}}/g, todayDisplay).replace(/{{當下時間}}/g, nowTime)
    try {
      await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bcc: emails, subject: subj, content: cont }) })
      await supabase.from('communication_logs').insert({ student_id: s.id, notification_type: '遲到通知', sent_by: '導師', recipient_emails: emails.join(','), message_content: cont })
      successCount++
    } catch (e) {}
  }
  alert(`✅ 發送完成！成功寄出：${successCount} 位`); isSendingLateEmails.value = false; await fetchData()
}
</script>

<style scoped>
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.table-header h3 { margin: 0; color: #334155; }
.attendance-control-panel { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; }
.absent-list-section { background: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; border: 1px dashed #f59e0b; }
.absent-list-section h4 { margin: 0 0 15px 0; color: #b45309; }
.tags-container { display: flex; flex-wrap: wrap; gap: 10px; }
.absent-tag { background: #fee2e2; color: #dc2626; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.95rem; border: 1px solid #fca5a5; }
.all-present-msg { color: #16a34a; font-weight: bold; font-size: 1.1rem; }
.email-editor-section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
.editor-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 10px; }
.editor-header h4 { margin: 0; color: #334155; }
.save-template-btn { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.var-tag { background: #e2e8f0; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold; }
.help-text { font-size: 0.95rem; color: #64748b; margin-bottom: 20px; line-height: 1.5; }
.form-group { margin-bottom: 15px; } .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #475569; }
.edit-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; width: 100%; }
.textarea-input { resize: vertical; font-family: inherit; line-height: 1.5; }
.email-preview-section { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.preview-box { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
.preview-subject { font-size: 1.1rem; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px; }
.preview-body { font-size: 1rem; color: #334155; line-height: 1.6; white-space: pre-wrap; }
.late-btn { background-color: #ef4444; width: 100%; font-size: 1.2rem; padding: 15px; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
</style>