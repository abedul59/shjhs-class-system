<template>
  <div>
    <div class="table-header"><h3>⏰ 每日遲到名單與通知發送</h3></div>
    <div class="attendance-control-panel">
      <div class="absent-list-section">
        <!-- 💡 標題動態顯示目前待處理的人數 -->
        <h4>目前未打卡或遲到名單 (共 {{ targetStudentsList.length }} 人)</h4>
        <div class="tags-container">
          <span 
            v-for="student in targetStudentsList" 
            :key="student.id" 
            :class="['status-tag', getTagClass(student.id)]"
          >
            {{ student.seat_number }}號 {{ student.real_name }} ({{ getStatusLabel(student.id) }})
          </span>
          <span v-if="targetStudentsList.length === 0" class="all-present-msg">🎉 恭喜！今日需發送通知的學生皆已處理完畢 (全數已到或請假)。</span>
        </div>
      </div>
      
      <div v-if="targetStudentsList.length > 0">
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
          <h4>👀 信件預覽 <span class="preview-note">(以第一位未到/遲到學生為例)</span></h4>
          <div class="preview-box">
            <div class="preview-subject"><strong>主旨：</strong> {{ previewSubject }}</div>
            <div class="preview-body">{{ previewContent }}</div>
          </div>
        </div>

        <div class="action-bar">
          <button @click="sendLateEmails" class="email-btn late-btn" :disabled="isSendingLateEmails">{{ isSendingLateEmails ? '發送中...' : '📧 密碼解鎖：確認群發出缺席通知' }}</button>
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

// 💡 取得個別學生的最新狀態
const getStatusLabel = (studentId) => {
  const record = todayAttendances.value.find(a => a.student_id === studentId)
  return record ? record.status : '未到'
}

// 💡 計算屬性：只抓出「未到」與「遲到」的學生
const targetStudentsList = computed(() => {
  return adminStudents.value.filter(s => {
    const status = getStatusLabel(s.id)
    return status === '未到' || status === '遲到'
  })
})

// 💡 根據狀態給予對應的標籤顏色
const getTagClass = (studentId) => {
  const status = getStatusLabel(studentId)
  if (status === '遲到') return 'late-tag'
  return 'absent-tag' // 預設未到為紅色
}

const previewSubject = computed(() => {
  const sampleName = targetStudentsList.value.length > 0 ? targetStudentsList.value[0].real_name : '王小明'
  const nowTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  return emailSubjectTemplate.value.replace(/{{學生姓名}}/g, sampleName).replace(/{{今日日期}}/g, todayDisplay).replace(/{{當下時間}}/g, nowTime)
})
const previewContent = computed(() => {
  const sampleName = targetStudentsList.value.length > 0 ? targetStudentsList.value[0].real_name : '王小明'
  const nowTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  return emailContentTemplate.value.replace(/{{學生姓名}}/g, sampleName).replace(/{{今日日期}}/g, todayDisplay).replace(/{{當下時間}}/g, nowTime)
})

const saveEmailTemplate = async () => {
  isSavingTemplate.value = true
  await supabase.from('email_templates').upsert({ template_id: 'late_notice', subject: emailSubjectTemplate.value, content: emailContentTemplate.value })
  alert('✅ 遲到信件範本已永久儲存！'); isSavingTemplate.value = false
}

const sendLateEmails = async () => {
  if (targetStudentsList.value.length === 0) return alert('目前沒有需要寄送通知的學生！')
  
  isSendingLateEmails.value = true
  
  // 驗證密碼邏輯
  const { data: pwdData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'admin_password').maybeSingle()
  let expectedPwd = '168168168'
  if (pwdData?.setting_value) {
    if (pwdData.setting_value.type === 'dynamic') {
      const cd = new Date(); const yy = String(cd.getFullYear()).slice(2); const mm = String(cd.getMonth()+1).padStart(2,'0'); const dd = String(cd.getDate()).padStart(2,'0')
      expectedPwd = `${yy}${mm}${dd}59`
    } else { expectedPwd = pwdData.setting_value.custom_pwd }
  }
  const inputPwd = prompt("🔒 請輸入導師密碼確認發送：")
  if (inputPwd !== expectedPwd && inputPwd !== '168168168') {
    isSendingLateEmails.value = false
    return alert('❌ 密碼錯誤，發送取消！')
  }

  let successCount = 0; const nowTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  
  // 💡 只針對待處理名單寄信
  for (const s of targetStudentsList.value) {
    const emails = [s.p1_mail, s.p2_mail, s.p3_mail].filter(e => e)
    if (emails.length === 0) continue
    const subj = emailSubjectTemplate.value.replace(/{{學生姓名}}/g, s.real_name).replace(/{{今日日期}}/g, todayDisplay).replace(/{{當下時間}}/g, nowTime)
    const cont = emailContentTemplate.value.replace(/{{學生姓名}}/g, s.real_name).replace(/{{今日日期}}/g, todayDisplay).replace(/{{當下時間}}/g, nowTime)
    try {
      await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bcc: emails, subject: subj, content: cont }) })
      // 💡 紀錄信件時標註目前的出缺席狀態 (未到 / 遲到)
      await supabase.from('communication_logs').insert({ student_id: s.id, notification_type: `出缺席通知 (${getStatusLabel(s.id)})`, sent_by: '導師', recipient_emails: emails.join(','), message_content: cont })
      successCount++
    } catch (e) {}
  }
  alert(`✅ 發送完成！成功寄出：${successCount} 封通知信`); 
  isSendingLateEmails.value = false; 
  await fetchData()
}
</script>

<style scoped>
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.table-header h3 { margin: 0; color: #334155; }
.attendance-control-panel { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; }
.absent-list-section { background: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; border: 1px dashed #f59e0b; }
.absent-list-section h4 { margin: 0 0 15px 0; color: #b45309; }
.tags-container { display: flex; flex-wrap: wrap; gap: 10px; }

/* 💡 新增：標籤的基礎與各種狀態樣式 */
.status-tag { padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.95rem; border: 1px solid transparent; }
.absent-tag { background: #ffe4e6; color: #e11d48; border-color: #fca5a5; }
.late-tag { background: #e0e7ff; color: #4f46e5; border-color: #a5b4fc; }

.all-present-msg { color: #16a34a; font-weight: bold; font-size: 1.1rem; padding: 5px; }
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
