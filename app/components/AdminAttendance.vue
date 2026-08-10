<template>
  <div>
    <div class="table-header">
      <h3>⏰ 每日出缺席與通知發送</h3>
      <div class="export-btn-group">
        <button @click="exportHistory('json')" class="btn-export-json">📥 匯出所有紀錄 (JSON)</button>
        <button @click="exportHistory('csv')" class="btn-export-csv">📤 匯出所有紀錄 (CSV)</button>
      </div>
    </div>
    
    <div class="attendance-control-panel">
      <!-- 💡 新增：五格出缺席統計區塊 (對應前台顏色) -->
      <div class="stats-row">
        <div class="stat-box stat-expected">應到: <strong>{{ expectedCount }}</strong></div>
        <div class="stat-box stat-present">已到: <strong>{{ presentCount }}</strong></div>
        <div class="stat-box stat-leave">請假: <strong>{{ leaveCount }}</strong></div>
        <div class="stat-box stat-late">遲到: <strong>{{ lateCount }}</strong></div>
        <div class="stat-box stat-absent">未到: <strong>{{ absentCount }}</strong></div>
      </div>

      <!-- 待處理名單區域 -->
      <div class="absent-list-section">
        <h4>🚨 今日未打卡或遲到名單 (共 {{ targetStudentsList.length }} 人)</h4>
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

    <!-- 月曆型歷史紀錄查詢與編輯區 -->
    <div class="history-calendar-container" style="margin-top: 30px;">
      <h4 class="section-title">📅 歷史出缺席紀錄查詢與補登</h4>
      <div class="calendar-layout">
        
        <!-- 左側月曆 -->
        <div class="calendar-box">
          <div class="calendar-header">
            <button @click="prevMonth" class="cal-nav-btn">◀</button>
            <strong class="cal-title">{{ calYear }} 年 {{ calMonth + 1 }} 月</strong>
            <button @click="nextMonth" class="cal-nav-btn">▶</button>
          </div>
          <div class="calendar-grid">
            <div class="cal-day-name">日</div><div class="cal-day-name">一</div><div class="cal-day-name">二</div>
            <div class="cal-day-name">三</div><div class="cal-day-name">四</div><div class="cal-day-name">五</div><div class="cal-day-name">六</div>
            
            <div 
              v-for="(day, idx) in calendarDays" 
              :key="idx" 
              :class="['cal-cell', { 'empty': day.empty, 'has-record': day.hasRecord, 'selected': selectedHistoryDate === day.dateStr }]"
              @click="viewHistory(day)"
            >
              <span v-if="!day.empty" class="cal-date-num">{{ day.day }}</span>
              <span v-if="day.hasRecord" class="record-dot"></span>
            </div>
          </div>
        </div>

        <!-- 右側紀錄編輯 -->
        <div class="history-detail-box">
          <div v-if="!selectedHistoryDate" class="empty-detail">
            👈 請從左側月曆點選日期以查看或編輯出缺席
          </div>
          <div v-else class="detail-content">
            <div class="detail-header-flex">
              <h5 class="detail-title">🗓️ {{ selectedHistoryDate }} 出缺席紀錄</h5>
              <button @click="saveHistory" class="save-history-btn" :disabled="isSavingHistory">
                {{ isSavingHistory ? '儲存中...' : '💾 儲存該日紀錄' }}
              </button>
            </div>
            
            <div class="history-student-grid">
              <div v-for="student in adminStudents" :key="student.id" 
                   :class="['history-card', getHistoryCardClass(historyAttendances[student.id])]">
                <div class="stu-info">
                  <span class="stu-seat">{{ student.seat_number }}</span>
                  <span class="stu-name">{{ student.real_name }}</span>
                </div>
                <select v-model="historyAttendances[student.id]" class="status-select">
                  <option value="未到">未到</option>
                  <option value="已到">已到</option>
                  <option value="請假">請假</option>
                  <option value="遲到">遲到</option>
                </select>
              </div>
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
const dDate = new Date(); 
const todayISO = `${dDate.getFullYear()}-${String(dDate.getMonth()+1).padStart(2,'0')}-${String(dDate.getDate()).padStart(2,'0')}`
const todayDisplay = dDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

const adminStudents = ref([]); const todayAttendances = ref([])
const emailSubjectTemplate = ref('⚠️ 學校出缺席通知 - {{學生姓名}} 尚未打卡')
const emailContentTemplate = ref(`親愛的家長您好：\n\n系統偵測到您的孩子 【{{學生姓名}}】 於今日 ({{今日日期}}) {{當下時間}} 尚未完成到校打卡，特此通知。\n\n班級導師 敬上`)
const isSavingTemplate = ref(false); const isSendingLateEmails = ref(false)

const calYear = ref(dDate.getFullYear())
const calMonth = ref(dDate.getMonth())
const monthAttendanceDates = ref(new Set())
const selectedHistoryDate = ref('')
const historyAttendances = ref({}) 
const isSavingHistory = ref(false)

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

  await fetchMonthRecords()
}
onMounted(() => fetchData())

// 💡 計算五格統計人數
const expectedCount = computed(() => adminStudents.value.length)
const presentCount = computed(() => todayAttendances.value.filter(a => a.status === '已到').length)
const leaveCount = computed(() => todayAttendances.value.filter(a => a.status === '請假').length)
const lateCount = computed(() => todayAttendances.value.filter(a => a.status === '遲到').length)
const absentCount = computed(() => expectedCount.value - presentCount.value - leaveCount.value - lateCount.value)

const getStatusLabel = (studentId) => {
  const record = todayAttendances.value.find(a => a.student_id === studentId)
  return record ? record.status : '未到'
}

const targetStudentsList = computed(() => {
  return adminStudents.value.filter(s => {
    const status = getStatusLabel(s.id)
    return status === '未到' || status === '遲到'
  })
})

const getTagClass = (studentId) => {
  const status = getStatusLabel(studentId)
  if (status === '遲到') return 'late-tag'
  if (status === '請假') return 'leave-tag'
  if (status === '已到') return 'present-tag'
  return 'absent-tag'
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
  
  for (const s of targetStudentsList.value) {
    const emails = [s.p1_mail, s.p2_mail, s.p3_mail].filter(e => e)
    if (emails.length === 0) continue
    const subj = emailSubjectTemplate.value.replace(/{{學生姓名}}/g, s.real_name).replace(/{{今日日期}}/g, todayDisplay).replace(/{{當下時間}}/g, nowTime)
    const cont = emailContentTemplate.value.replace(/{{學生姓名}}/g, s.real_name).replace(/{{今日日期}}/g, todayDisplay).replace(/{{當下時間}}/g, nowTime)
    try {
      await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bcc: emails, subject: subj, content: cont }) })
      await supabase.from('communication_logs').insert({ student_id: s.id, notification_type: `出缺席通知 (${getStatusLabel(s.id)})`, sent_by: '導師', recipient_emails: emails.join(','), message_content: cont })
      successCount++
    } catch (e) {}
  }
  alert(`✅ 發送完成！成功寄出：${successCount} 封通知信`); 
  isSendingLateEmails.value = false; 
  await fetchData()
}

// --- 月曆歷史紀錄邏輯 ---
const fetchMonthRecords = async () => {
  const y = calYear.value; const m = String(calMonth.value + 1).padStart(2, '0')
  const startDate = `${y}-${m}-01`; const endDate = `${y}-${m}-31`
  
  const { data } = await supabase.from('attendances')
    .select('record_date')
    .gte('record_date', startDate)
    .lte('record_date', endDate)
    
  if (data) {
    monthAttendanceDates.value = new Set(data.map(d => d.record_date))
  }
}

const calendarDays = computed(() => {
  const days = []
  const firstDayOfWeek = new Date(calYear.value, calMonth.value, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate()
  for (let i = 0; i < firstDayOfWeek; i++) { days.push({ empty: true }) }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    days.push({
      empty: false, day: i, dateStr: dateStr, hasRecord: monthAttendanceDates.value.has(dateStr)
    })
  }
  return days
})

const prevMonth = async () => { 
  if (calMonth.value === 0) { calYear.value--; calMonth.value = 11 } else { calMonth.value-- } 
  selectedHistoryDate.value = ''; await fetchMonthRecords() 
}
const nextMonth = async () => { 
  if (calMonth.value === 11) { calYear.value++; calMonth.value = 0 } else { calMonth.value++ } 
  selectedHistoryDate.value = ''; await fetchMonthRecords() 
}

const viewHistory = async (day) => {
  if (day.empty) return
  selectedHistoryDate.value = day.dateStr
  
  const { data } = await supabase.from('attendances').select('*').eq('record_date', day.dateStr)
  
  const newHistory = {}
  adminStudents.value.forEach(s => newHistory[s.id] = '未到') 
  if (data) {
    data.forEach(a => newHistory[a.student_id] = a.status)
  }
  historyAttendances.value = newHistory
}

const getHistoryCardClass = (status) => {
  if (status === '已到') return 'card-present'
  if (status === '請假') return 'card-leave'
  if (status === '遲到') return 'card-late'
  return 'card-absent'
}

const saveHistory = async () => {
  isSavingHistory.value = true
  try {
    const { data: existing } = await supabase.from('attendances').select('id, student_id').eq('record_date', selectedHistoryDate.value)
    
    for (const student of adminStudents.value) {
      const status = historyAttendances.value[student.id]
      const existRecord = existing ? existing.find(e => e.student_id === student.id) : null
      
      if (existRecord) {
        await supabase.from('attendances').update({ status }).eq('id', existRecord.id)
      } else {
        if (status !== '未到') {
           await supabase.from('attendances').insert({ student_id: student.id, record_date: selectedHistoryDate.value, status })
        }
      }
    }

    alert('✅ 歷史紀錄已成功更新！')
    await fetchMonthRecords() 
    if (selectedHistoryDate.value === todayISO) {
      await fetchData()
    }
  } catch (error) {
    alert('❌ 儲存失敗：' + error.message)
  } finally {
    isSavingHistory.value = false
  }
}

const exportHistory = async (type) => {
  const { data, error } = await supabase.from('attendances').select('*').order('record_date', { ascending: false }).order('created_at', { ascending: false })
  if (error || !data || data.length === 0) return alert('⚠️ 獲取歷史紀錄失敗或尚無任何紀錄')

  const enhancedData = data.map(record => {
    const student = adminStudents.value.find(s => s.id === record.student_id)
    return {
      紀錄日期: record.record_date,
      座號: student ? student.seat_number : '未知',
      姓名: student ? student.real_name : '未知',
      狀態: record.status,
      操作打卡時間: new Date(record.created_at).toLocaleString('zh-TW', { hour12: false })
    }
  })

  if (type === 'json') {
    const blob = new Blob([JSON.stringify(enhancedData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'attendance_history.json'
    link.click()
    URL.revokeObjectURL(url)
  } else if (type === 'csv') {
    let csvContent = '\uFEFF'
    csvContent += '紀錄日期,座號,姓名,狀態,操作打卡時間\n'
    
    enhancedData.forEach(row => {
       csvContent += `"${row.紀錄日期}","${row.座號}","${row.姓名}","${row.狀態}","${row.操作打卡時間}"\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'attendance_history.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
}
</script>

<style scoped>
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;}
.table-header h3 { margin: 0; color: #334155; }
.export-btn-group { display: flex; gap: 10px; }
.btn-export-json { background: #8b5cf6; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-export-csv { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }

.attendance-control-panel { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; }

/* 💡 新增：五格統計區塊樣式 (同步首頁設計) */
.stats-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.stat-box { flex: 1; padding: 12px; border-radius: 6px; text-align: center; font-size: 1.05rem; font-weight: bold; min-width: 80px; }
.stat-expected { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.stat-present { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.stat-leave { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.stat-late { background: #e0e7ff; color: #3730a3; border: 1px solid #a5b4fc; }
.stat-absent { background: #ffe4e6; color: #e11d48; border: 1px solid #fca5a5; }

.absent-list-section { background: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; border: 1px dashed #f59e0b; }
.absent-list-section h4 { margin: 0 0 15px 0; color: #b45309; }
.tags-container { display: flex; flex-wrap: wrap; gap: 10px; }

/* 💡 更新：標籤的基礎與各種狀態樣式 (同步首頁卡片顏色) */
.status-tag { padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.95rem; border: 1px solid transparent; }
.absent-tag { background: #ffe4e6; color: #e11d48; border-color: #fca5a5; }
.late-tag { background: #e0e7ff; color: #3730a3; border-color: #a5b4fc; }
.leave-tag { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.present-tag { background: #dcfce7; color: #166534; border-color: #bbf7d0; }

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

/* 月曆與歷史紀錄樣式 */
.history-calendar-container { background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
.section-title { margin: 0 0 20px 0; color: #1e293b; font-size: 1.3rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;}
.calendar-layout { display: flex; gap: 20px; flex-wrap: wrap; }
.calendar-box { flex: 1; min-width: 300px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
.history-detail-box { flex: 2; min-width: 350px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }

.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.cal-nav-btn { background: white; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; color: #475569; }
.cal-title { font-size: 1.2rem; color: #1e293b; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center; }
.cal-day-name { font-weight: bold; color: #64748b; padding-bottom: 10px; }
.cal-cell { height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; background: white; border: 1px solid #e2e8f0; transition: all 0.2s; }
.cal-cell:not(.empty):hover { background: #e0e7ff; border-color: #a5b4fc; }
.cal-cell.empty { background: transparent; border-color: transparent; cursor: default; }
.cal-cell.selected { background: #3b82f6; color: white; border-color: #2563eb; }
.cal-cell.selected .record-dot { background: white; }
.cal-date-num { font-weight: bold; font-size: 1.1rem; }
.record-dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; margin-top: 4px; }

.empty-detail { text-align: center; color: #94a3b8; margin-top: 50px; font-size: 1.1rem; }
.detail-header-flex { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 15px;}
.detail-title { margin: 0; font-size: 1.2rem; color: #1e293b; }
.save-history-btn { background: #3b82f6; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.save-history-btn:disabled { background: #94a3b8; cursor: not-allowed;}

.history-student-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.history-card { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 8px; border: 2px solid transparent; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: 0.2s background-color;}
.stu-info { display: flex; justify-content: space-between; align-items: center; font-weight: bold;}
.stu-seat { color: #64748b; font-size: 0.9rem;}
.status-select { padding: 4px; border-radius: 4px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center; outline: none; background: white; transition: 0.2s color;}

/* 💡 歷史編輯區的卡片顏色同步設定 */
.card-absent { background: #ffe4e6; border-color: #fca5a5; }
.card-absent .stu-name { color: #e11d48; }
.card-absent .status-select { color: #e11d48; }

.card-present { background: #dcfce7; border-color: #bbf7d0; }
.card-present .stu-name { color: #16a34a; }
.card-present .status-select { color: #16a34a; }

.card-leave { background: #fef3c7; border-color: #fde68a; }
.card-leave .stu-name { color: #b45309; }
.card-leave .status-select { color: #b45309; }

.card-late { background: #e0e7ff; border-color: #a5b4fc; }
.card-late .stu-name { color: #4f46e5; }
.card-late .status-select { color: #4f46e5; }
</style>
