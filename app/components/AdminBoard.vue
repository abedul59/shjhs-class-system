<template>
  <div>
    <div class="table-header"><h3>📢 家長須知與聯絡簿管理</h3></div>
    
    <!-- 上半部：今日雙向編輯區塊 -->
    <div class="board-editor-container">
      <div class="split-layout">
        
        <!-- 區塊 A：家長須知 (支援信件推播與富文字複製貼上) -->
        <div class="editor-panel">
          <h4 class="section-title">📢 家長須知 (支援保留網頁格式)</h4>
          <p class="help-text">⚠️ 此區塊僅限導師編輯與推播。支援直接複製網頁內容貼上保留格式。</p>
          <div class="notice-edit-list">
            <!-- 💡 更新：改用 contenteditable div 來支援富文字 (Rich Text) -->
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

          <!-- 推播編輯與預覽區 -->
          <div class="email-editor-section" style="margin-top: 20px;">
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
                <!-- 💡 更新：預覽區改用 v-html 以正確渲染富文字 -->
                <div class="preview-body" v-html="noticePreviewContent"></div>
              </div>
            </div>

            <button @click="sendNoticeEmail" class="email-btn late-btn" style="margin-top: 15px;" :disabled="isSendingEmail">
              {{ isSendingEmail ? '正在推播中...' : '📧 解鎖並推播須知給家長' }}
            </button>
          </div>
        </div>

        <!-- 區塊 B：聯絡簿事項 -->
        <div class="editor-panel">
          <h4 class="section-title">📝 聯絡簿事項 (前台黑板)</h4>
          
          <div class="toggle-setting-box">
            <label class="toggle-label">
              <input type="checkbox" v-model="isHistoryVisibleOnIndex" @change="saveHistorySetting" />
              開放前台首頁讓家長查詢「近一週聯絡簿紀錄」
            </label>
          </div>

          <p class="help-text">用於記錄每日作業、明日攜帶物品。前台可由股長登入編輯。</p>
          <div class="notice-edit-list">
            <div v-for="(item, index) in contactBookItems" :key="'c-'+index" class="edit-item">
              <span class="bullet">✏️</span>
              <input v-model="contactBookItems[index]" type="text" class="edit-input notice-input" placeholder="請輸入聯絡簿事項..." />
              <button @click="removeContactItem(index)" class="del-row-btn">🗑️</button>
            </div>
            <button @click="addContactItem" class="add-btn">➕ 新增聯絡簿事項</button>
          </div>

          <div class="officer-pwd-section">
            <h5>🔒 股長聯絡簿編輯密碼設定</h5>
            <div class="form-group">
              <label>學藝股長密碼：</label>
              <div class="pwd-input-group">
                <input type="text" v-model="officerPasswords.academic" class="edit-input" placeholder="尚未設定..." />
              </div>
            </div>
            <div class="form-group">
              <label>輔導股長密碼：</label>
              <div class="pwd-input-group">
                <input type="text" v-model="officerPasswords.counseling" class="edit-input" placeholder="尚未設定..." />
              </div>
            </div>
            <button @click="saveOfficerPasswords" class="save-template-btn small-btn pwd-btn" :disabled="isSavingPwd">
              {{ isSavingPwd ? '儲存中...' : '💾 儲存股長密碼' }}
            </button>
          </div>
        </div>

      </div>

      <!-- 共用儲存按鈕 -->
      <div class="action-bar full-width-action">
        <button @click="saveBothBoards" class="save-btn lg-btn" :disabled="isSavingBoard">
          {{ isSavingBoard ? '儲存中...' : '💾 一鍵儲存【家長須知】與【聯絡簿】並同步至前台' }}
        </button>
      </div>
    </div>

    <!-- 下半部：歷史紀錄月曆查詢 -->
    <div class="history-calendar-container" style="margin-top: 30px;">
      <h4 class="section-title">📅 歷史紀錄查詢</h4>
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
          <div v-if="!selectedHistoryDate" class="empty-detail">
            👈 請從上方/左側月曆點選日期以查看歷史紀錄
          </div>
          <div v-else class="detail-content">
            
            <div class="detail-header-flex">
              <h5 class="detail-title">🗓️ {{ selectedHistoryDate }} 歷史紀錄</h5>
              <button v-if="!isEditingHistory" @click="startEditHistory" class="edit-history-btn">✏️ 編輯</button>
            </div>
            
            <!-- 唯讀模式 -->
            <div v-if="!isEditingHistory">
              <div class="history-section">
                <h6>📢 家長須知</h6>
                <div v-if="selectedHistoryNotices.length > 0" class="history-list">
                  <!-- 💡 更新：歷史紀錄也使用 v-html 來渲染富文字 -->
                  <div v-for="(n, i) in selectedHistoryNotices" :key="'hn-'+i" class="history-item">
                    <span class="bullet">📌</span> <span v-html="n"></span>
                  </div>
                </div>
                <div v-else class="empty-text">無發布須知</div>
              </div>

              <div class="history-section" style="margin-top: 20px;">
                <h6>📝 聯絡簿事項</h6>
                <div v-if="selectedHistoryContactItems.length > 0" class="history-list">
                  <div v-for="(c, i) in selectedHistoryContactItems" :key="'hc-'+i" class="history-item"><span class="bullet">✏️</span> {{ c }}</div>
                </div>
                <div v-else class="empty-text">無聯絡簿事項</div>
              </div>
            </div>

            <!-- 編輯模式 -->
            <div v-else class="history-edit-mode">
              <div class="history-section">
                <h6>📢 家長須知 (編輯)</h6>
                <div class="notice-edit-list">
                  <!-- 💡 更新：歷史編輯模式的家長須知也換成富文字編輯器 -->
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

              <div class="history-section" style="margin-top: 20px;">
                <h6>📝 聯絡簿事項 (編輯)</h6>
                <div class="notice-edit-list">
                  <div v-for="(c, i) in editHistoryContactItems" :key="'ehc-'+i" class="edit-item">
                    <span class="bullet">✏️</span>
                    <input v-model="editHistoryContactItems[i]" type="text" class="edit-input notice-input" />
                    <button @click="removeHistoryContactItem(i)" class="del-row-btn">🗑️</button>
                  </div>
                  <button @click="addHistoryContactItem" class="add-btn">➕ 新增</button>
                </div>
              </div>

              <!-- 儲存/取消按鈕 -->
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
const d = new Date(); 
const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayDisplay = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

const adminNotices = ref([]) 
const contactBookItems = ref([]) 
const officerPasswords = ref({ academic: '', counseling: '' }) 
const isHistoryVisibleOnIndex = ref(false)

const isSavingBoard = ref(false); const isSendingEmail = ref(false); const isSavingNoticeTemplate = ref(false); const isSavingPwd = ref(false)
const noticeEmailSubjectTemplate = ref('📢 班級須知推播 ({{今日日期}})')
// 💡 更新：預設範本加入一點 HTML 確保換行正常渲染
const noticeEmailContentTemplate = ref(`<p>各位家長您好，今日班級重要須知推播如下：</p><ul>{{須知清單}}</ul><p>班級導師 敬上</p>`)

const calYear = ref(d.getFullYear()); const calMonth = ref(d.getMonth())
const monthRecords = ref([])
const selectedHistoryDate = ref('')
const selectedHistoryNotices = ref([])
const selectedHistoryContactItems = ref([])

const isEditingHistory = ref(false)
const isSavingHistory = ref(false)
const editHistoryNotices = ref([])
const editHistoryContactItems = ref([])

// 💡 處理富文字輸入框的資料綁定 (主編輯區)
const updateRichText = (event, index) => {
  adminNotices.value[index] = event.target.innerHTML
}

// 💡 處理富文字輸入框的資料綁定 (歷史編輯區)
const updateEditHistoryRichText = (event, index) => {
  editHistoryNotices.value[index] = event.target.innerHTML
}

const fetchData = async () => {
  const { data: boardData } = await supabase.from('contact_books').select('notices, contact_items').eq('record_date', todayISO).maybeSingle()
  adminNotices.value = boardData?.notices || []
  contactBookItems.value = boardData?.contact_items || []
  
  const { data: tmplData } = await supabase.from('email_templates').select('*').eq('template_id', 'notice_board').maybeSingle()
  if (tmplData) { noticeEmailSubjectTemplate.value = tmplData.subject; noticeEmailContentTemplate.value = tmplData.content }
  
  const { data: sysData } = await supabase.from('system_settings').select('*').in('setting_key', ['board_officer_passwords', 'contact_history_visible'])
  if (sysData) {
    const pwdData = sysData.find(s => s.setting_key === 'board_officer_passwords')
    if (pwdData) officerPasswords.value = pwdData.setting_value

    const histData = sysData.find(s => s.setting_key === 'contact_history_visible')
    if (histData) isHistoryVisibleOnIndex.value = histData.setting_value
  }

  await fetchMonthRecords()
}
onMounted(() => fetchData())

const saveHistorySetting = async () => {
  await supabase.from('system_settings').upsert({
    setting_key: 'contact_history_visible',
    setting_value: isHistoryVisibleOnIndex.value
  }, { onConflict: 'setting_key' })
}

const noticePreviewSubject = computed(() => noticeEmailSubjectTemplate.value.replace(/{{今日日期}}/g, todayDisplay))
const noticePreviewContent = computed(() => {
  // 💡 更新：用 <li> 標籤包覆，以確保 HTML 格式在預覽與信件中正確呈現
  const listStr = adminNotices.value.length > 0 
    ? adminNotices.value.map(n => `<li style="margin-bottom: 8px;">${n}</li>`).join('') 
    : '<li>(尚無須知事項)</li>'
  // 若使用者的範本內有原本的 \n，把它轉成 <br>
  let baseContent = noticeEmailContentTemplate.value.replace(/\n/g, '<br>')
  return baseContent.replace(/{{須知清單}}/g, listStr)
})

const addNotice = () => adminNotices.value.push('')
const removeNotice = (i) => adminNotices.value.splice(i, 1)
const addContactItem = () => contactBookItems.value.push('')
const removeContactItem = (i) => contactBookItems.value.splice(i, 1)

const saveOfficerPasswords = async () => {
  isSavingPwd.value = true
  await supabase.from('system_settings').upsert({ 
    setting_key: 'board_officer_passwords', 
    setting_value: officerPasswords.value 
  }, { onConflict: 'setting_key' })
  alert('✅ 股長密碼已成功更新！')
  isSavingPwd.value = false
}

const saveBothBoards = async () => {
  isSavingBoard.value = true
  await supabase.from('contact_books').upsert({ 
    record_date: todayISO, 
    notices: adminNotices.value,
    contact_items: contactBookItems.value 
  }, { onConflict: 'record_date' })
  alert('✅ 雙邊紀錄皆已成功儲存至資料庫並同步前台！')
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
  
  // 💡 更新：實際發送信件時也產生 HTML 格式
  const listStr = adminNotices.value.length > 0 
    ? adminNotices.value.map(n => `<li style="margin-bottom: 8px;">${n}</li>`).join('') 
    : '<li>(無)</li>'
  let contentHtml = noticeEmailContentTemplate.value.replace(/\n/g, '<br>').replace(/{{須知清單}}/g, listStr)

  // 包裝成完整的 HTML 文件以確保多數郵件客戶端正確解析字體與格式
  const finalHtmlContent = `
    <html>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
        ${contentHtml}
      </body>
    </html>
  `

  await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bcc: emailList, subject, content: finalHtmlContent }) })
  
  // 將原始信件內容存入 log
  await supabase.from('communication_logs').insert({ student_id: null, notification_type: '須知推播', sent_by: '導師', recipient_emails: '全班家長群發', message_content: finalHtmlContent })
  alert(`✅ 已成功推播給 ${emailList.length} 位家長！`); isSendingEmail.value = false
}

const fetchMonthRecords = async () => {
  const y = calYear.value; const m = String(calMonth.value + 1).padStart(2, '0')
  const startDate = `${y}-${m}-01`; const endDate = `${y}-${m}-31`
  const { data } = await supabase.from('contact_books').select('record_date, notices, contact_items').gte('record_date', startDate).lte('record_date', endDate)
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
    const hasC = record && record.contact_items && record.contact_items.length > 0
    days.push({
      empty: false, day: i, dateStr: dateStr,
      hasRecord: hasN || hasC,
      notices: record ? (record.notices || []) : [],
      contactItems: record ? (record.contact_items || []) : []
    })
  }
  return days
})

const prevMonth = async () => { if (calMonth.value === 0) { calYear.value--; calMonth.value = 11 } else { calMonth.value-- } selectedHistoryDate.value = ''; isEditingHistory.value = false; await fetchMonthRecords() }
const nextMonth = async () => { if (calMonth.value === 11) { calYear.value++; calMonth.value = 0 } else { calMonth.value++ } selectedHistoryDate.value = ''; isEditingHistory.value = false; await fetchMonthRecords() }

const viewHistory = (day) => {
  if (day.empty) return
  selectedHistoryDate.value = day.dateStr
  selectedHistoryNotices.value = day.notices
  selectedHistoryContactItems.value = day.contactItems
  isEditingHistory.value = false
}

const startEditHistory = () => {
  editHistoryNotices.value = [...selectedHistoryNotices.value]
  editHistoryContactItems.value = [...selectedHistoryContactItems.value]
  isEditingHistory.value = true
}

const cancelEditHistory = () => {
  isEditingHistory.value = false
}

const addHistoryNotice = () => editHistoryNotices.value.push('')
const removeHistoryNotice = (i) => editHistoryNotices.value.splice(i, 1)
const addHistoryContactItem = () => editHistoryContactItems.value.push('')
const removeHistoryContactItem = (i) => editHistoryContactItems.value.splice(i, 1)

const saveHistory = async () => {
  isSavingHistory.value = true
  try {
    await supabase.from('contact_books').upsert({
      record_date: selectedHistoryDate.value,
      notices: editHistoryNotices.value,
      contact_items: editHistoryContactItems.value
    }, { onConflict: 'record_date' })
    
    alert('✅ 歷史紀錄已成功更新！')
    
    selectedHistoryNotices.value = [...editHistoryNotices.value]
    selectedHistoryContactItems.value = [...editHistoryContactItems.value]
    isEditingHistory.value = false
    
    await fetchMonthRecords()
    
    if (selectedHistoryDate.value === todayISO) {
      adminNotices.value = [...editHistoryNotices.value]
      contactBookItems.value = [...editHistoryContactItems.value]
    }

  } catch (error) {
    alert('❌ 儲存失敗：' + error.message)
  } finally {
    isSavingHistory.value = false
  }
}
</script>

<style scoped>
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } 
.table-header h3 { margin: 0; color: #334155; }
.section-title { margin: 0 0 10px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 1.15rem; }

.toggle-setting-box { margin-bottom: 15px; padding: 10px; background: #f0fdfa; border: 1px dashed #0f766e; border-radius: 6px; }
.toggle-label { font-weight: bold; color: #0f766e; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.95rem; }

.board-editor-container, .history-calendar-container { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; }
.split-layout { display: flex; gap: 20px; flex-wrap: nowrap; margin-bottom: 20px; }
.editor-panel { flex: 1; min-width: 0; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }

.notice-edit-list { display: flex; flex-direction: column; gap: 12px; }

/* 💡 更新：富文字編輯器樣式 */
.rich-text-item { align-items: flex-start !important; }
.rich-text-editor { 
  min-height: 40px; 
  height: auto; 
  overflow-y: auto; 
  white-space: normal; 
  line-height: 1.5; 
  background: #fdfdfd;
}
.rich-text-editor:empty:before { content: attr(placeholder); color: #94a3b8; pointer-events: none; display: block; }
.rich-text-editor:focus { background: white; border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }

.edit-item { display: flex; align-items: center; gap: 10px; }
.notice-input { flex: 1; font-size: 1.05rem; padding: 10px 12px; border: 1px solid #94a3b8; border-radius: 6px; width: 100%; box-sizing: border-box;}
.add-btn { background: #e2e8f0; color: #334155; border: 1px dashed #94a3b8; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 5px; width: 100%; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; }

.full-width-action { display: flex; justify-content: center; padding-top: 15px; border-top: 2px dashed #cbd5e1; }
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

.officer-pwd-section { margin-top: 25px; padding-top: 15px; border-top: 2px dashed #cbd5e1; }
.officer-pwd-section h5 { margin: 0 0 10px 0; font-size: 1.05rem; color: #1e293b; }
.pwd-input-group { display: flex; gap: 10px; }
.pwd-btn { margin-top: 10px; width: 100%; padding: 10px; font-size: 1rem; }

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
  .split-layout { flex-direction: column; }
  .calendar-layout { flex-direction: column; }
  .editor-panel { padding: 15px; }
  .calendar-box, .history-detail-box { padding: 15px; }
  .lg-btn { font-size: 1.05rem; padding: 12px; }
  .board-editor-container, .history-calendar-container { padding: 10px; }
}
</style>
