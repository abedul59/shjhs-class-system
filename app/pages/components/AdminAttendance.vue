<template>
  <div>
    <div class="table-header"><h3>⏰ 每日遲到名單與通知發送</h3></div>
    <div class="attendance-control-panel">
      <div class="absent-list-section">
        <h4>目前未打卡名單 (共 {{ absentStudentsList.length }} 人)</h4>
        <div class="tags-container">
          <span v-for="s in absentStudentsList" :key="s.id" class="absent-tag">{{ s.seat_number }}號 {{ s.real_name }}</span>
          <span v-if="absentStudentsList.length === 0" class="all-present-msg">🎉 恭喜！今日全班皆已準時到校。</span>
        </div>
      </div>
      <div v-if="absentStudentsList.length > 0">
        <div class="email-editor-section">
          <div class="editor-header">
            <h4>📝 編輯信件內容</h4>
            <button @click="saveEmailTemplate" class="save-template-btn" :disabled="isSavingTemplate">{{ isSavingTemplate ? '儲存中...' : '💾 儲存範本' }}</button>
          </div>
          <p class="help-text">💡 變數：<span v-pre>{{學生姓名}}</span>, <span v-pre>{{今日日期}}</span>, <span v-pre>{{當下時間}}</span></p>
          <div class="form-group"><label>主旨：</label><input type="text" v-model="emailSubjectTemplate" class="edit-input" /></div>
          <div class="form-group"><label>內容：</label><textarea v-model="emailContentTemplate" rows="6" class="edit-input"></textarea></div>
        </div>
        <button @click="sendLateEmails" class="email-btn late-btn" :disabled="isSending">📧 密碼解鎖：確認發送</button>
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
const isSavingTemplate = ref(false); const isSending = ref(false)

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

const saveEmailTemplate = async () => {
  isSavingTemplate.value = true
  await supabase.from('email_templates').upsert({ template_id: 'late_notice', subject: emailSubjectTemplate.value, content: emailContentTemplate.value })
  alert('✅ 儲存成功！'); isSavingTemplate.value = false
}

const sendLateEmails = async () => {
  if (prompt("🔒 請輸入導師密碼：") !== '168168168') return alert('❌ 密碼錯誤')
  isSending.value = true; let successCount = 0; const nowTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
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
  alert(`✅ 發送完成！成功寄出：${successCount} 位`); isSending.value = false; await fetchData()
}
</script>

<style scoped>
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } .table-header h3 { margin: 0; color: #334155; }
.attendance-control-panel { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; }
.absent-list-section { background: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; border: 1px dashed #f59e0b; }
.tags-container { display: flex; flex-wrap: wrap; gap: 10px; } .absent-tag { background: #fee2e2; color: #dc2626; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.95rem; border: 1px solid #fca5a5; }
.all-present-msg { color: #16a34a; font-weight: bold; font-size: 1.1rem; }
.email-editor-section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
.editor-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 10px; }
.save-template-btn { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.form-group { margin-bottom: 15px; } .form-group label { display: block; font-weight: bold; margin-bottom: 5px; } .edit-input { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; }
.email-btn { width: 100%; font-size: 1.2rem; padding: 15px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; } .late-btn { background: #ef4444; color: white; }
</style>
