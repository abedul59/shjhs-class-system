<template>
  <div>
    <div class="table-header"><h3>📢 家長須知管理與 Email 推播</h3></div>
    
    <!-- 上半部：今日須知編輯與推播 -->
    <div class="board-editor-container">
      <h4 class="section-title">✏️ 今日聯絡簿編輯 ({{ todayDisplay }})</h4>
      <div class="notice-edit-list">
        <div v-for="(notice, index) in adminNotices" :key="index" class="edit-item">
          <span class="bullet">📌</span>
          <input v-model="adminNotices[index]" type="text" class="edit-input notice-input" placeholder="請輸入須知事項..." />
          <button @click="removeAdminNotice(index)" class="del-row-btn">🗑️</button>
        </div>
        <button @click="addAdminNotice" class="add-btn">➕ 新增一筆須知</button>
      </div>

      <div class="email-editor-section" style="margin-top: 30px;">
        <div class="editor-header">
          <h4>📝 編輯推播信件內容</h4>
          <button @click="saveNoticeEmailTemplate" class="save-template-btn" :disabled="isSavingNoticeTemplate">
            {{ isSavingNoticeTemplate ? '儲存中...' : '💾 儲存為預設範本' }}
          </button>
        </div>
        <p class="help-text">💡 可使用以下變數：<span class="var-tag" v-pre>{{今日日期}}</span>、<span class="var-tag" v-pre>{{須知清單}}</span></p>
        <div class="form-group"><label>信件主旨：</label><input type="text" v-model="noticeEmailSubjectTemplate" class="edit-input" /></div>
        <div class="form-group"><label>信件內容：</label><textarea v-model="noticeEmailContentTemplate" rows="8" class="edit-input textarea-input"></textarea></div>
      </div>

      <div class="email-preview-section">
        <h4>👀 信件預覽</h4>
        <div class="preview-box">
          <div class="preview-subject"><strong>主旨：</strong> {{ noticePreviewSubject }}</div>
          <div class="preview-body">{{ noticePreviewContent }}</div>
        </div>
      </div>

      <div class="action-bar">
        <button @click="saveAdminNotices" class="save-btn" :disabled="isSavingBoard">
          {{ isSavingBoard ? '儲存中...' : '💾 儲存須知清單並同步至前台' }}
        </button>
        <button @click="sendNoticeEmail" class="email-btn late-btn" :disabled="isSendingEmail">
          {{ isSendingEmail ? '正在推播中...' : '📧 密碼解鎖並推播給全體家長' }}
        </button>
      </div>
    </div>

    <!-- 下半部：歷史紀錄月曆查詢 -->
    <div class="history-calendar-container" style="margin-top: 30px;">
      <h4 class="section-title">📅 歷史聯絡簿查詢</h4>
      <div class="calendar-layout">
        
        <!-- 左側：月曆介面 -->
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

        <!-- 右側：選定日期的紀錄詳情 -->
        <div class="history-detail-box">
          <div v-if="!selectedHistoryDate" class="empty-detail">
            👈 請從左側月曆點選日期以查看歷史紀錄
          </div>
          <div v-else>
            <h5 class="detail-title">🗓️ {{ selectedHistoryDate }} 聯絡簿紀錄</h5>
            <div v-if="selectedHistoryNotices.length > 0" class="history-list">
              <div v-for="(n, i) in selectedHistoryNotices" :key="i" class="history-item">
                <span class="bullet">📌</span> {{ n }}
              </div>
            </div>
            <div v-else class="empty-detail" style="margin-top: 30px;">
              此日無發布任何聯絡簿事項。
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
const d = new Date(); 
const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayDisplay = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

// --- 今日發布狀態 ---
const adminNotices = ref([]); const isSavingBoard = ref(false); const isSendingEmail = ref(false); const isSavingNoticeTemplate = ref(false)
const noticeEmailSubjectTemplate = ref('📢 班級須知推播 ({{今日日期}})')
const noticeEmailContentTemplate = ref(`各位家長您好，今日班級須知推播如下：\n\n{{須知清單}}\n\n班級導師 敬上`)

// --- 歷史月曆狀態 ---
const calYear = ref(d.getFullYear())
const calMonth = ref(d.getMonth()) // 0-11
const monthRecords = ref([])
const selectedHistoryDate = ref('')
const selectedHistoryNotices = ref([])

const fetchData = async () => {
  // 1. 抓取今日資料與信件範本
  const { data: boardData } = await supabase.from('contact_books').select('notices').eq('record_date', todayISO).maybeSingle()
  adminNotices.value = boardData?.notices || []
  const { data: tmplData } = await supabase.from('email_templates').select('*').eq('template_id', 'notice_board').maybeSingle()
  if (tmplData) { noticeEmailSubjectTemplate.value = tmplData.subject; noticeEmailContentTemplate.value = tmplData.content }
  
  // 2. 抓取本月的歷史紀錄
  await fetchMonthRecords()
}
onMounted(() => fetchData())

// --- 月曆邏輯 ---
const fetchMonthRecords = async () => {
  const y = calYear.value; const m = String(calMonth.value + 1).padStart(2, '0')
  const startDate = `${y}-${m}-01`; const endDate = `${y}-${m}-31`
  
  const { data } = await supabase.from('contact_books')
    .select('record_date, notices')
    .gte('record_date', startDate)
    .lte('record_date', endDate)
  
  monthRecords.value = data || []
}

const calendarDays = computed(() => {
  const days = []
  const firstDayOfWeek = new Date(calYear.value, calMonth.value, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate()

  // 補齊前面的空白天數
  for (let i = 0; i < firstDayOfWeek; i++) { days.push({ empty: true }) }
  
  // 填入當月日期
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const record = monthRecords.value.find(r => r.record_date === dateStr)
    days.push({
      empty: false,
      day: i,
      dateStr: dateStr,
      hasRecord: !!record && record.notices.length > 0,
      notices: record ? record.notices : []
    })
  }
  return days
})

const prevMonth = async () => {
  if (calMonth.value === 0) { calYear.value--; calMonth.value = 11 } 
  else { calMonth.value-- }
  selectedHistoryDate.value = '' // 切換月份時清空右側詳情
  await fetchMonthRecords()
}
const nextMonth = async () => {
  if (calMonth.value === 11) { calYear.value++; calMonth.value = 0 } 
  else { calMonth.value++ }
  selectedHistoryDate.value = ''
  await fetchMonthRecords()
}

const viewHistory = (day) => {
  if (day.empty) return
  selectedHistoryDate.value = day.dateStr
  selectedHistoryNotices.value = day.notices
}


// --- 預覽與發布邏輯 ---
const noticePreviewSubject = computed(() => noticeEmailSubjectTemplate.value.replace(/{{今日日期}}/g, todayDisplay))
const noticePreviewContent = computed(() => {
  const listStr = adminNotices.value.length > 0 ? adminNotices.value.map(n => '📌 ' + n).join('\n') : '📌 (尚無須知事項)'
  return noticeEmailContentTemplate.value.replace(/{{須知清單}}/g, listStr)
})

const addAdminNotice = () => adminNotices.value.push('')
const removeAdminNotice = (i) => adminNotices.value.splice(i, 1)

const saveNoticeEmailTemplate = async () => {
  isSavingNoticeTemplate.value = true
  await supabase.from('email_templates').upsert({ template_id: 'notice_board', subject: noticeEmailSubjectTemplate.value, content: noticeEmailContentTemplate.value })
  alert('✅ 須知推播信件範本已永久儲存！'); isSavingNoticeTemplate.value = false
}

const saveAdminNotices = async () => {
  isSavingBoard.value = true
  await supabase.from('contact_books').upsert({ record_date: todayISO, notices: adminNotices.value }, { onConflict: 'record_date' })
  alert('✅ 須知已成功儲存至資料庫並同步前台！')
  isSavingBoard.value = false
  await fetchMonthRecords() // 儲存後立即更新月曆狀態
}

const sendNoticeEmail = async () => {
  isSendingEmail.value = true
  
  // 驗證動態密碼邏輯
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
    isSendingEmail.value = false
    return alert('❌ 密碼錯誤，發送取消！')
  }

  const { data: parents } = await supabase.from('parents').select('email')
  const emailList = [...new Set(parents.map(p => p.email).filter(e => e && e.trim() !== ''))]
  if (emailList.length === 0) { isSendingEmail.value = false; return alert('未建立任何家長信箱') }
  
  const subject = noticeEmailSubjectTemplate.value.replace(/{{今日日期}}/g, todayDisplay)
  const listStr = adminNotices.value.length > 0 ? adminNotices.value.map(n => '📌 ' + n).join('\n') : '📌 (無)'
  const content = noticeEmailContentTemplate.value.replace(/{{須知清單}}/g, listStr)

  await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bcc: emailList, subject, content }) })
  await supabase.from('communication_logs').insert({ student_id: null, notification_type: '須知推播', sent_by: '導師', recipient_emails: '全班家長群發', message_content: content })
  alert(`✅ 已成功套用範本並推播給 ${emailList.length} 位家長！`); isSendingEmail.value = false
}
</script>

<style scoped>
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } 
.table-header h3 { margin: 0; color: #334155; }
.section-title { margin: 0 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }

/* 編輯區共用樣式 */
.board-editor-container, .history-calendar-container { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; }
.notice-edit-list { display: flex; flex-direction: column; gap: 15px; }
.edit-item { display: flex; align-items: center; gap: 10px; }
.notice-input { flex: 1; font-size: 1.1rem; padding: 10px 15px; border: 1px solid #94a3b8; border-radius: 6px; }
.add-btn { background: #e2e8f0; color: #334155; border: 1px dashed #94a3b8; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
.save-btn, .email-btn { color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; }
.save-btn { background: #3b82f6; } .email-btn { background: #f59e0b; }
.action-bar { display: flex; gap: 15px; margin-top: 20px; }

.email-editor-section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
.editor-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 10px; }
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

/* 📅 月曆佈局與樣式 */
.calendar-layout { display: flex; gap: 20px; flex-wrap: wrap; }
.calendar-box { flex: 1; min-width: 300px; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
.history-detail-box { flex: 1; min-width: 300px; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }

.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.cal-nav-btn { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; color: #475569; }
.cal-nav-btn:hover { background: #e2e8f0; }
.cal-title { font-size: 1.2rem; color: #1e293b; }

.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center; }
.cal-day-name { font-weight: bold; color: #64748b; padding-bottom: 10px; }
.cal-cell { 
  height: 50px; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  border-radius: 6px; 
  cursor: pointer; 
  background: #f8fafc;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.cal-cell:not(.empty):hover { background: #e0e7ff; border-color: #a5b4fc; }
.cal-cell.empty { background: transparent; cursor: default; }
.cal-cell.selected { background: #3b82f6; color: white; border-color: #2563eb; }
.cal-cell.selected .record-dot { background: white; }

.cal-date-num { font-weight: bold; font-size: 1.1rem; }
.record-dot { width: 6px; height: 6px; background: #3b82f6; border-radius: 50%; margin-top: 4px; }

/* 歷史詳情樣式 */
.empty-detail { text-align: center; color: #94a3b8; margin-top: 50px; font-size: 1.1rem; }
.detail-title { margin: 0 0 15px 0; font-size: 1.2rem; color: #1e293b; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; }
.history-list { display: flex; flex-direction: column; gap: 12px; }
.history-item { font-size: 1.1rem; color: #334155; line-height: 1.5; }
.history-item .bullet { margin-right: 8px; }
</style>
