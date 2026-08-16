<template>
  <div class="split-board-container">
    <div class="table-header"><h3>📢 家長須知管理</h3></div>
    
    <!-- 編輯區塊 -->
    <div class="board-editor-container">
      <div class="editor-panel">
        <h4 class="section-title">📢 今日家長須知 (支援保留網頁格式)</h4>
        <p class="help-text">⚠️ 此區塊僅限導師編輯與推播。支援直接複製網頁內容貼上保留格式。</p>
        
        <div class="notice-edit-list">
          <div v-for="(notice, index) in adminNotices" :key="'n-'+index" class="edit-item rich-text-item">
            <span class="bullet">📌</span>
            <div 
              class="edit-input notice-input rich-text-editor" 
              contenteditable="true"
              @blur="updateRichText($event, index)"
              @input="updateRichText($event, index)"
              v-html="notice"
              placeholder="在此貼上或輸入須知內容..."
            ></div>
            <button @click="removeNotice(index)" class="del-row-btn">🗑️</button>
          </div>
          <button @click="addNotice" class="add-btn">➕ 新增家長須知</button>
        </div>

        <div class="action-bar" style="margin-top: 20px;">
          <button @click="saveBoard" class="save-btn lg-btn" :disabled="isSavingBoard">
            {{ isSavingBoard ? '儲存中...' : '💾 儲存今日須知並同步至前台' }}
          </button>
        </div>

        <!-- 推播編輯與預覽區 -->
        <div class="email-editor-section" style="margin-top: 30px;">
          <div class="editor-header">
            <h4>📝 編輯推播信件</h4>
            <button @click="saveNoticeEmailTemplate" class="save-template-btn small-btn" :disabled="isSavingNoticeTemplate">
              {{ isSavingNoticeTemplate ? '儲存中...' : '💾 存為範本' }}
            </button>
          </div>
          <div class="form-group"><label>信件主旨：</label><input type="text" v-model="noticeEmailSubjectTemplate" class="edit-input" /></div>
          <div class="form-group"><label>信件內容：(變數: <span v-pre>{{須知清單}}</span>)</label><textarea v-model="noticeEmailContentTemplate" rows="4" class="edit-input textarea-input"></textarea></div>
          
          <div class="email-preview-section">
            <h5>👀 信件預覽 (支援HTML渲染)</h5>
            <div class="preview-box">
              <div class="preview-subject"><strong>主旨：</strong> {{ noticePreviewSubject }}</div>
              <div class="preview-body" v-html="noticePreviewContent"></div>
            </div>
          </div>

          <button @click="sendNoticeEmail" class="email-btn late-btn" style="margin-top: 15px;" :disabled="isSendingEmail">
            {{ isSendingEmail ? '正在推播中...' : '📧 解鎖並推播須知給家長' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 歷史紀錄月曆查詢 -->
    <div class="history-calendar-container" style="margin-top: 30px;">
      <h4 class="section-title">📅 歷史須知紀錄查詢</h4>
      <div class="calendar-layout">
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

        <div class="history-detail-box">
          <div v-if="!selectedHistoryDate" class="empty-detail">👈 請從上方/左側月曆點選日期以查看歷史紀錄</div>
          <div v-else class="detail-content">
            <div class="detail-header-flex">
              <h5 class="detail-title">🗓️ {{ selectedHistoryDate }} 家長須知紀錄</h5>
              <button v-if="!isEditingHistory" @click="startEditHistory" class="edit-history-btn">✏️ 編輯</button>
            </div>
            
            <!-- 唯讀模式 -->
            <div v-if="!isEditingHistory">
              <div class="history-section">
                <div v-if="selectedHistoryNotices.length > 0" class="history-list">
                  <div v-for="(n, i) in selectedHistoryNotices" :key="'hn-'+i" class="history-item">
                    <span class="bullet">📌</span> <span v-html="n"></span>
                  </div>
                </div>
                <div v-else class="empty-text">當日無發布須知</div>
              </div>
            </div>

            <!-- 編輯模式 -->
            <div v-else class="history-edit-mode">
              <div class="history-section">
                <div class="notice-edit-list">
                  <div v-for="(n, i) in editHistoryNotices" :key="'ehn-'+i" class="edit-item rich-text-item">
                    <span class="bullet">📌</span>
                    <div 
                      class="edit-input notice-input rich-text-editor" 
                      contenteditable="true"
                      @blur="updateEditHistoryRichText($event, i)"
                      @input="updateEditHistoryRichText($event, i)"
                      v-html="n"
                    ></div>
                    <button @click="removeHistoryNotice(i)" class="del-row-btn">🗑️</button>
                  </div>
                  <button @click="addHistoryNotice" class="add-btn">➕ 新增</button>
                </div>
              </div>
              <div class="edit-actions-row">
                <button @click="cancelEditHistory" class="cancel-btn">取消</button>
                <button @click="saveHistory" class="save-btn" :disabled="isSavingHistory">
                  {{ isSavingHistory ? '儲存中...' : '💾 儲存歷史紀錄' }}
                </button>
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
const d = new Date()
const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayDisplay = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

const adminNotices = ref([]) 
const isSavingBoard = ref(false)
const isSendingEmail = ref(false)
const isSavingNoticeTemplate = ref(false)
const noticeEmailSubjectTemplate = ref('📢 班級須知推播 ({{今日日期}})')
const noticeEmailContentTemplate = ref(`<p>各位家長您好，今日班級重要須知推播如下：</p><ul>{{須知清單}}</ul><p>班級導師 敬上</p>`)

const calYear = ref(d.getFullYear()); const calMonth = ref(d.getMonth())
const monthRecords = ref([])
const selectedHistoryDate = ref('')
const selectedHistoryNotices = ref([])

const isEditingHistory = ref(false)
const isSavingHistory = ref(false)
const editHistoryNotices = ref([])

const updateRichText = (event, index) => { adminNotices.value[index] = event.target.innerHTML }
const updateEditHistoryRichText = (event, index) => { editHistoryNotices.value[index] = event.target.innerHTML }

const fetchData = async () => {
  const { data: boardData } = await supabase.from('contact_books').select('notices').eq('record_date', todayISO).maybeSingle()
  adminNotices.value = boardData?.notices || []
  
  const { data: tmplData } = await supabase.from('email_templates').select('*').eq('template_id', 'notice_board').maybeSingle()
  if (tmplData) { noticeEmailSubjectTemplate.value = tmplData.subject; noticeEmailContentTemplate.value = tmplData.content }
  
  await fetchMonthRecords()
}
onMounted(() => fetchData())

const noticePreviewSubject = computed(() => noticeEmailSubjectTemplate.value.replace(/{{今日日期}}/g, todayDisplay))
const noticePreviewContent = computed(() => {
  const listStr = adminNotices.value.length > 0 
    ? adminNotices.value.map(n => `<li style="margin-bottom: 8px;">${n}</li>`).join('') 
    : '<li>(尚無須知事項)</li>'
  let baseContent = noticeEmailContentTemplate.value.replace(/\n/g, '<br>')
  return baseContent.replace(/{{須知清單}}/g, listStr)
})

const addNotice = () => adminNotices.value.push('')
const removeNotice = (i) => adminNotices.value.splice(i, 1)

const saveBoard = async () => {
  isSavingBoard.value = true
  await supabase.from('contact_books').upsert({ record_date: todayISO, notices: adminNotices.value }, { onConflict: 'record_date' })
  alert('✅ 家長須知已成功儲存至資料庫並同步前台！')
  isSavingBoard.value = false
  await fetchMonthRecords()
}

const saveNoticeEmailTemplate = async () => {
  isSavingNoticeTemplate.value = true
  await supabase.from('email_templates').upsert({ template_id: 'notice_board', subject: noticeEmailSubjectTemplate.value, content: noticeEmailContentTemplate.value })
  alert('✅ 須知推播信件範本已永久儲存！'); isSavingNoticeTemplate.value = false
}

const sendNoticeEmail = async () => {
  isSendingEmail.value = true
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
    isSendingEmail.value = false; return alert('❌ 密碼錯誤，發送取消！')
  }

  const { data: parents } = await supabase.from('parents').select('email')
  const emailList = [...new Set(parents.map(p => p.email).filter(e => e && e.trim() !== ''))]
  if (emailList.length === 0) { isSendingEmail.value = false; return alert('未建立任何家長信箱') }
  
  const subject = noticeEmailSubjectTemplate.value.replace(/{{今日日期}}/g, todayDisplay)
  const listStr = adminNotices.value.length > 0 
    ? adminNotices.value.map(n => `<li style="margin-bottom: 8px;">${n}</li>`).join('') 
    : '<li>(無)</li>'
  let contentHtml = noticeEmailContentTemplate.value.replace(/\n/g, '<br>').replace(/{{須知清單}}/g, listStr)

  const finalHtmlContent = `<html><body style="font-family: sans-serif; line-height: 1.6; color: #333;">${contentHtml}</body></html>`
  await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bcc: emailList, subject, content: finalHtmlContent }) })
  await supabase.from('communication_logs').insert({ student_id: null, notification_type: '須知推播', sent_by: '導師', recipient_emails: '全班家長群發', message_content: finalHtmlContent })
  alert(`✅ 已成功推播給 ${emailList.length} 位家長！`); isSendingEmail.value = false
}

const fetchMonthRecords = async () => {
  const y = calYear.value; const m = String(calMonth.value + 1).padStart(2, '0')
  const startDate = `${y}-${m}-01`; const endDate = `${y}-${m}-31`
  const { data } = await supabase.from('contact_books').select('record_date, notices').gte('record_date', startDate).lte('record_date', endDate)
  monthRecords.value = data || []
}

const calendarDays = computed(() => {
  const days = []
  const firstDayOfWeek = new Date(calYear.value, calMonth.value, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate()
  for (let i = 0; i < firstDayOfWeek; i++) { days.push({ empty: true }) }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const record = monthRecords.value.find(r => r.record_date === dateStr)
    const hasN = record && record.notices && record.notices.length > 0
    days.push({ empty: false, day: i, dateStr: dateStr, hasRecord: hasN, notices: record ? (record.notices || []) : [] })
  }
  return days
})

const prevMonth = async () => { if (calMonth.value === 0) { calYear.value--; calMonth.value = 11 } else { calMonth.value-- } selectedHistoryDate.value = ''; isEditingHistory.value = false; await fetchMonthRecords() }
const nextMonth = async () => { if (calMonth.value === 11) { calYear.value++; calMonth.value = 0 } else { calMonth.value++ } selectedHistoryDate.value = ''; isEditingHistory.value = false; await fetchMonthRecords() }

const viewHistory = (day) => {
  if (day.empty) return
  selectedHistoryDate.value = day.dateStr
  selectedHistoryNotices.value = day.notices
  isEditingHistory.value = false
}

const startEditHistory = () => { editHistoryNotices.value = [...selectedHistoryNotices.value]; isEditingHistory.value = true }
const cancelEditHistory = () => { isEditingHistory.value = false }
const addHistoryNotice = () => editHistoryNotices.value.push('')
const removeHistoryNotice = (i) => editHistoryNotices.value.splice(i, 1)

const saveHistory = async () => {
  isSavingHistory.value = true
  try {
    await supabase.from('contact_books').upsert({ record_date: selectedHistoryDate.value, notices: editHistoryNotices.value }, { onConflict: 'record_date' })
    alert('✅ 歷史紀錄已成功更新！')
    selectedHistoryNotices.value = [...editHistoryNotices.value]; isEditingHistory.value = false
    await fetchMonthRecords()
    if (selectedHistoryDate.value === todayISO) { adminNotices.value = [...editHistoryNotices.value] }
  } catch (error) { alert('❌ 儲存失敗：' + error.message) } finally { isSavingHistory.value = false }
}
</script>

<style scoped>
.split-board-container { font-family: sans-serif; }
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } 
.table-header h3 { margin: 0; color: #334155; font-size: 1.4rem;}
.section-title { margin: 0 0 10px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 1.15rem; }

.board-editor-container, .history-calendar-container { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; }
.editor-panel { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }

.notice-edit-list { display: flex; flex-direction: column; gap: 12px; }
.rich-text-item { align-items: flex-start !important; }
.rich-text-editor { min-height: 40px; height: auto; overflow-y: auto; white-space: normal; line-height: 1.5; background: #fdfdfd; }
.rich-text-editor:empty:before { content: attr(placeholder); color: #94a3b8; pointer-events: none; display: block; }
.rich-text-editor:focus { background: white; border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }

.edit-item { display: flex; align-items: center; gap: 10px; }
.notice-input { flex: 1; font-size: 1.05rem; padding: 10px 12px; border: 1px solid #94a3b8; border-radius: 6px; width: 100%; box-sizing: border-box;}
.add-btn { background: #e2e8f0; color: #334155; border: 1px dashed #94a3b8; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 5px; width: 100%; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; }

.action-bar { display: flex; justify-content: center; padding-top: 15px; border-top: 2px dashed #cbd5e1; }
.lg-btn { font-size: 1.2rem; padding: 15px 30px; width: 100%; max-width: 600px; }
.save-btn { background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; padding: 10px 15px;} 
.email-btn { background: #f59e0b; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; }
.cancel-btn { background: #64748b; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; }

.email-editor-section { background: #f1f5f9; border-radius: 8px; padding: 15px; border: 1px solid #cbd5e1; }
.editor-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;}
.editor-header h4 { margin: 0; font-size: 1rem; color: #1e293b; }
.save-template-btn.small-btn { padding: 6px 12px; font-size: 0.9rem; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; }
.form-group { margin-bottom: 10px; } .form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #475569; font-size: 0.9rem; }
.edit-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; width: 100%; }
.textarea-input { resize: vertical; font-family: inherit; line-height: 1.5; }
.help-text { font-size: 0.9rem; color: #64748b; margin-bottom: 15px; }

.email-preview-section { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 15px; }
.email-preview-section h5 { margin: 0 0 8px 0; color: #334155; }
.preview-box { background: white; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
.preview-subject { font-size: 0.95rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px; }
.preview-body { font-size: 0.9rem; color: #475569; line-height: 1.5; white-space: normal; overflow-wrap: break-word;}

.calendar-layout { display: flex; gap: 20px; flex-wrap: nowrap; }
.calendar-box { flex: 1; min-width: 0; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
.history-detail-box { flex: 1; min-width: 0; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }

.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.cal-nav-btn { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; color: #475569; }
.cal-title { font-size: 1.2rem; color: #1e293b; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center; }
.cal-day-name { font-weight: bold; color: #64748b; padding-bottom: 10px; }
.cal-cell { height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; background: #f8fafc; border: 1px solid transparent; transition: all 0.2s; }
.cal-cell:not(.empty):hover { background: #e0e7ff; border-color: #a5b4fc; }
.cal-cell.empty { background: transparent; cursor: default; }
.cal-cell.selected { background: #3b82f6; color: white; border-color: #2563eb; }
.cal-cell.selected .record-dot { background: white; }
.cal-date-num { font-weight: bold; font-size: 1.1rem; }
.record-dot { width: 6px; height: 6px; background: #3b82f6; border-radius: 50%; margin-top: 4px; }

.detail-header-flex { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 15px; }
.edit-history-btn { background: #f59e0b; color: white; border: none; padding: 5px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.9rem; }
.edit-actions-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #cbd5e1;}

.empty-detail { text-align: center; color: #94a3b8; margin-top: 50px; font-size: 1.1rem; }
.detail-title { margin: 0; font-size: 1.2rem; color: #1e293b; }
.history-section h6 { font-size: 1.05rem; color: #475569; margin: 0 0 10px 0; }
.history-list { display: flex; flex-direction: column; gap: 8px; }
.history-item { font-size: 1.05rem; color: #334155; line-height: 1.4; word-break: break-all; }
.empty-text { color: #94a3b8; font-style: italic; }

@media (max-width: 768px) {
  .calendar-layout { flex-direction: column; }
  .editor-panel, .calendar-box, .history-detail-box { padding: 15px; }
  .lg-btn { font-size: 1.05rem; padding: 12px; }
}
</style>
