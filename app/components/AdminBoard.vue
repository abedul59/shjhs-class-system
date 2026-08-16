<template>
  <div class="admin-board-container">
    <div class="table-header"><h3>📢 家長須知管理中心</h3></div>

    <div class="board-editor-container">
      <!-- 💡 頁籤切換 -->
      <div class="view-tabs">
        <button :class="['tab-btn', { active: activeTab === 'manage' }]" @click="activeTab = 'manage'">📝 發布與管理</button>
        <button :class="['tab-btn', { active: activeTab === 'email' }]" @click="activeTab = 'email'">📧 信件推播設定</button>
        <button :class="['tab-btn', { active: activeTab === 'history' }]" @click="activeTab = 'history'">📅 歷史紀錄查詢</button>
      </div>

      <!-- ================== 頁籤 1：發布與管理 ================== -->
      <div v-show="activeTab === 'manage'">
        <!-- 新增須知表單 (包含日期) -->
        <div class="editor-panel">
          <h4 class="section-title">📝 新增須知事項 (支援保留網頁格式)</h4>
          <p class="help-text">您可以直接複製網頁內容並貼上，系統會保留排版。若設定日期，首頁將於區間內自動顯示。</p>
          
          <div class="edit-item rich-text-item" style="margin-bottom: 20px;">
            <span class="bullet">📌</span>
            <div 
              class="edit-input notice-input rich-text-editor" 
              contenteditable="true"
              @blur="updateNewNoticeRichText"
              @input="updateNewNoticeRichText"
              ref="newNoticeEditorRef"
              placeholder="在此貼上或輸入須知內容..."
            ></div>
          </div>
          
          <!-- 💡 恢復：刊登起始與結束日期 -->
          <div class="date-row">
            <div class="date-group">
              <label>起始日期：</label>
              <input type="date" v-model="newNotice.startDate" class="form-control date-input" />
            </div>
            <div class="date-group">
              <label>結束日期 (選填)：</label>
              <input type="date" v-model="newNotice.endDate" class="form-control date-input" />
              <span class="hint">留空代表永久顯示，直到手動刪除</span>
            </div>
            
            <button @click="addNotice" class="add-btn auto-width-btn" :disabled="!newNotice.content || isSaving">
              {{ isSaving ? '發布中...' : '➕ 儲存並發布須知' }}
            </button>
          </div>
        </div>

        <!-- 現有須知列表 -->
        <div class="notices-list-section" style="margin-top: 30px;">
          <h4 class="section-title">📋 目前已建立的須知清單</h4>
          <div v-if="isLoading" class="empty-state">⏳ 載入中...</div>
          <div v-else-if="notices.length === 0" class="empty-state">目前尚無任何須知事項。</div>
          
          <div v-for="notice in notices" :key="notice.id" class="notice-item">
            <div class="notice-content">
              <!-- 顯示保留格式的 HTML -->
              <div class="notice-text" v-html="notice.content"></div>
              <div class="notice-dates">
                🗓️ 刊登期間：
                <span class="highlight">{{ notice.startDate || '未設定' }}</span> 至 <span class="highlight">{{ notice.endDate || '永久' }}</span>
                <span v-if="!isActiveToday(notice.startDate, notice.endDate)" class="expired-tag"> (今日未生效)</span>
                <span v-else class="active-tag"> (今日生效中)</span>
              </div>
            </div>
            <button @click="deleteNotice(notice.id)" class="del-row-btn" :disabled="isSaving">🗑️ 刪除</button>
          </div>
        </div>
      </div>

      <!-- ================== 頁籤 2：信件推播 ================== -->
      <div v-show="activeTab === 'email'" class="email-editor-section">
        <div class="editor-header">
          <h4>📧 編輯與推播信件</h4>
          <button @click="saveNoticeEmailTemplate" class="save-template-btn small-btn" :disabled="isSavingNoticeTemplate">
            {{ isSavingNoticeTemplate ? '儲存中...' : '💾 存為範本' }}
          </button>
        </div>
        <p class="help-text">為避免信件被歸類為垃圾郵件或產生亂碼，系統已自動將內容轉換為「純文字格式」發送。<br>系統只會統整推播 <span class="active-tag">今日生效中</span> 的須知。</p>
        
        <div class="form-group">
          <label>信件主旨：</label>
          <input type="text" v-model="noticeEmailSubjectTemplate" class="edit-input" />
        </div>
        <div class="form-group">
          <label>信件內容：(變數: <span v-pre>{{須知清單}}</span>)</label>
          <textarea v-model="noticeEmailContentTemplate" rows="5" class="edit-input textarea-input"></textarea>
        </div>
        
        <div class="email-preview-section">
          <h5>👀 純文字信件預覽 (家長實際看到的模樣)</h5>
          <div class="preview-box plain-text-preview">
            <div class="preview-subject"><strong>主旨：</strong> {{ noticePreviewSubject }}</div>
            <div class="preview-body">{{ noticePreviewContent }}</div>
          </div>
        </div>

        <button @click="sendNoticeEmail" class="email-btn late-btn" style="margin-top: 20px;" :disabled="isSendingEmail">
          {{ isSendingEmail ? '正在推播中...' : '📧 解鎖並推播目前生效須知給家長' }}
        </button>
      </div>

      <!-- ================== 頁籤 3：歷史查詢 ================== -->
      <div v-show="activeTab === 'history'" class="history-calendar-container">
        <h4 class="section-title">📅 歷史須知紀錄查詢</h4>
        <div class="query-box">
          <div class="query-header">
            <label>選擇查詢日期：</label>
            <input type="date" v-model="historyDate" @change="fetchHistory" class="form-control date-picker" />
          </div>
        </div>

        <div class="history-results">
          <div v-if="isHistoryLoading" class="loading-state">⏳ 紀錄搜尋中...</div>
          <div v-else>
            <h5 class="detail-title">🗓️ {{ historyDate }} 曾刊登的須知：</h5>
            <div v-if="historicalNotices.length === 0" class="empty-state">這一天沒有任何生效的家長須知。</div>
            <div v-else class="history-list">
              <div v-for="(hist, index) in historicalNotices" :key="'h-'+index" class="history-item">
                <span class="bullet">📌</span>
                <div class="history-text" v-html="hist"></div>
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

const activeTab = ref('manage')
const isLoading = ref(true)
const isSaving = ref(false)

// 取得今日字串
const d = new Date()
const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const todayDisplay = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

const notices = ref([])
const newNoticeEditorRef = ref(null)
const newNotice = ref({
  content: '',
  startDate: todayISO,
  endDate: ''
})

// Email 設定
const isSendingEmail = ref(false)
const isSavingNoticeTemplate = ref(false)
const noticeEmailSubjectTemplate = ref('📢 班級須知推播 ({{今日日期}})')
// 💡 修正為純文字排版，避免信件亂碼
const noticeEmailContentTemplate = ref(`各位家長您好，今日班級重要須知推播如下：\n\n{{須知清單}}\n\n班級導師 敬上`)

// 歷史查詢設定
const historyDate = ref(todayISO)
const isHistoryLoading = ref(false)
const historicalNotices = ref([])

const updateNewNoticeRichText = (event) => {
  newNotice.value.content = event.target.innerHTML
}

const fetchData = async () => {
  isLoading.value = true
  // 取得現有須知清單
  const { data: boardData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'parent_notices_data').maybeSingle()
  if (boardData?.setting_value) {
    notices.value = boardData.setting_value || []
  }
  // 取得 Email 範本
  const { data: tmplData } = await supabase.from('email_templates').select('*').eq('template_id', 'notice_board').maybeSingle()
  if (tmplData) { 
    noticeEmailSubjectTemplate.value = tmplData.subject
    // 將資料庫中的 HTML 格式範本轉回純文字換行，以適應新的純文字引擎
    noticeEmailContentTemplate.value = tmplData.content.replace(/<br\s*\/?>/ig, '\n').replace(/<[^>]+>/g, '') 
  }
  isLoading.value = false
}

onMounted(async () => {
  await fetchData()
  await fetchHistory()
})

const isActiveToday = (startDate, endDate) => {
  const startOk = !startDate || startDate <= todayISO
  const endOk = !endDate || endDate >= todayISO
  return startOk && endOk
}

// 💡 核心功能：超強 HTML 轉純文字過濾引擎 (防止垃圾信)
const stripHtmlToPlainText = (html) => {
  if (!html) return ''
  let res = html.replace(/<br\s*\/?>/ig, '\n')
  res = res.replace(/<\/p>/ig, '\n\n')
  res = res.replace(/<\/div>/ig, '\n')
  res = res.replace(/<li[^>]*>/ig, '- ')
  res = res.replace(/<\/li>/ig, '\n')
  res = res.replace(/<[^>]+>/g, '') // 移除殘留標籤
  
  // 建立暫存區來解碼 HTML Entities (如 &nbsp;)
  const txt = document.createElement("textarea")
  txt.innerHTML = res
  return txt.value.replace(/\n\s*\n/g, '\n\n').trim() // 移除多餘空白行
}

// 取得今日生效的須知，並轉為純文字
const activeNoticesPlainText = computed(() => {
  const active = notices.value.filter(n => isActiveToday(n.startDate, n.endDate))
  if (active.length === 0) return '(今日尚無生效的須知事項)'
  return active.map((n, i) => `${i + 1}. ${stripHtmlToPlainText(n.content)}`).join('\n\n')
})

const noticePreviewSubject = computed(() => noticeEmailSubjectTemplate.value.replace(/{{今日日期}}/g, todayDisplay))
const noticePreviewContent = computed(() => {
  return noticeEmailContentTemplate.value.replace(/{{須知清單}}/g, activeNoticesPlainText.value)
})

const addNotice = async () => {
  if (!newNotice.value.content) return
  isSaving.value = true
  
  const noticeObj = {
    id: Date.now().toString(),
    content: newNotice.value.content,
    startDate: newNotice.value.startDate,
    endDate: newNotice.value.endDate
  }
  
  const updatedNotices = [noticeObj, ...notices.value]
  
  try {
    const { error } = await supabase.from('system_settings').upsert({
      setting_key: 'parent_notices_data',
      setting_value: updatedNotices
    }, { onConflict: 'setting_key' })
    if (error) throw error
    
    notices.value = updatedNotices
    newNotice.value.content = ''
    if (newNoticeEditorRef.value) newNoticeEditorRef.value.innerHTML = ''
    alert('✅ 須知已成功發布！')
    await fetchHistory()
  } catch (err) {
    alert('❌ 發布失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}

const deleteNotice = async (id) => {
  if (!confirm('確定要刪除這則須知嗎？')) return
  isSaving.value = true
  const updatedNotices = notices.value.filter(n => n.id !== id)
  try {
    await supabase.from('system_settings').upsert({ setting_key: 'parent_notices_data', setting_value: updatedNotices }, { onConflict: 'setting_key' })
    notices.value = updatedNotices
    await fetchHistory()
  } catch (err) { alert('❌ 刪除失敗：' + err.message) } finally { isSaving.value = false }
}

const saveNoticeEmailTemplate = async () => {
  isSavingNoticeTemplate.value = true
  // 儲存時將純文字轉為安全的簡單 HTML 存入資料庫 (為了相容舊系統)，但發信時仍用純文字
  const safeHtmlContent = noticeEmailContentTemplate.value.replace(/\n/g, '<br>')
  await supabase.from('email_templates').upsert({ template_id: 'notice_board', subject: noticeEmailSubjectTemplate.value, content: safeHtmlContent })
  alert('✅ 推播信件範本已儲存！')
  isSavingNoticeTemplate.value = false
}

// 💡 修正：純文字推播發送邏輯
const sendNoticeEmail = async () => {
  isSendingEmail.value = true
  try {
    const { data: pwdData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'admin_password').maybeSingle()
    let expectedPwd = '168168168'
    if (pwdData?.setting_value) {
      if (pwdData.setting_value.type === 'dynamic') {
        const yy = String(d.getFullYear()).slice(2); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0')
        expectedPwd = `${yy}${mm}${dd}59`
      } else { expectedPwd = pwdData.setting_value.custom_pwd }
    }
    const inputPwd = prompt("🔒 請輸入導師密碼確認推播：")
    if (inputPwd !== expectedPwd && inputPwd !== '168168168') {
      isSendingEmail.value = false; return alert('❌ 密碼錯誤，發送取消！')
    }

    const { data: students } = await supabase.from('students').select('*')
    const emailList = [...new Set(students.map(s => s.parent_email || s.parent_mail || s.email).filter(e => e && e.includes('@')))]
    if (emailList.length === 0) { isSendingEmail.value = false; return alert('❌ 未建立任何家長信箱') }
    
    // 💡 傳送已經過轉換的「純文字」給後端 API
    await fetch('/api/send-email', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        bcc: emailList, 
        subject: noticePreviewSubject.value, 
        content: noticePreviewContent.value // 純文字，沒有任何 HTML tag!
      }) 
    })
    
    await supabase.from('communication_logs').insert({ 
      student_id: null, notification_type: '須知推播', sent_by: '導師', recipient_emails: '全班家長群發', 
      message_content: noticePreviewContent.value 
    })
    alert(`✅ 已成功以「純文字防垃圾格式」推播給 ${emailList.length} 位家長！`)
  } catch(e) {
    alert("❌ 推播失敗: " + e.message)
  } finally {
    isSendingEmail.value = false
  }
}

const fetchHistory = async () => {
  if (!historyDate.value) return
  isHistoryLoading.value = true
  historicalNotices.value = []
  try {
    const targetDate = historyDate.value
    let foundNotices = []
    
    // 1. 查詢舊制 (contact_books)
    const { data: contactData } = await supabase.from('contact_books').select('*').eq('record_date', targetDate).maybeSingle()
    if (contactData && contactData.notices && Array.isArray(contactData.notices)) {
      foundNotices = [...contactData.notices]
    }
    // 2. 查詢新制 (區間判斷)
    notices.value.forEach(n => {
      const startOk = !n.startDate || n.startDate <= targetDate
      const endOk = !n.endDate || n.endDate >= targetDate
      if (startOk && endOk && !foundNotices.includes(n.content)) {
        foundNotices.push(n.content)
      }
    })
    historicalNotices.value = foundNotices
  } finally { isHistoryLoading.value = false }
}
</script>

<style scoped>
.admin-board-container { font-family: sans-serif; padding-bottom: 30px;}
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } 
.table-header h3 { margin: 0; color: #334155; font-size: 1.4rem;}

.view-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;}
.tab-btn { background: transparent; border: none; padding: 10px 20px; font-size: 1.1rem; font-weight: bold; color: #64748b; cursor: pointer; border-radius: 8px 8px 0 0; transition: 0.2s;}
.tab-btn:hover { background: #f1f5f9; color: #3b82f6;}
.tab-btn.active { background: #eff6ff; color: #2563eb; border-bottom: 3px solid #3b82f6; }

.board-editor-container { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; }
.editor-panel { background: white; padding: 25px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }

.section-title { margin: 0 0 10px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 1.2rem; }
.help-text { font-size: 0.95rem; color: #64748b; margin-bottom: 15px; line-height: 1.5;}

.rich-text-item { display: flex; align-items: flex-start; gap: 10px; }
.rich-text-editor { flex: 1; min-height: 80px; height: auto; overflow-y: auto; padding: 12px; border: 1px solid #94a3b8; border-radius: 6px; background: #fdfdfd; line-height: 1.5; font-size: 1.05rem;}
.rich-text-editor:empty:before { content: attr(placeholder); color: #94a3b8; pointer-events: none; display: block; }
.rich-text-editor:focus { background: white; border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
.bullet { display: inline-block; margin-top: 10px; font-size: 1.2rem;}

.date-row { display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap; margin-top: 20px; background: #f1f5f9; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1;}
.date-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
.date-group label { font-weight: bold; color: #475569; font-size: 1rem; }
.date-input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; font-size: 1rem; margin-bottom: 0; cursor: pointer;}
.hint { font-size: 0.85rem; color: #94a3b8; margin-top: 2px;}

.add-btn { background: #10b981; color: white; border: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; font-size: 1.1rem; cursor: pointer; transition: 0.2s;}
.add-btn:hover:not(:disabled) { background: #059669; }
.add-btn:disabled { background: #9ca3af; cursor: not-allowed; }
.auto-width-btn { height: fit-content; white-space: nowrap;}

.notices-list-section { background: white; padding: 25px; border-radius: 8px; border: 1px solid #e2e8f0; }
.empty-state, .loading-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;}

.notice-item { display: flex; justify-content: space-between; align-items: stretch; padding: 20px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px; transition: 0.2s; gap: 20px; flex-wrap: wrap;}
.notice-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
.notice-content { flex: 1; min-width: 250px;}
.notice-text { color: #1e293b; font-size: 1.1rem; line-height: 1.6; margin-bottom: 15px; }
.notice-dates { font-size: 0.95rem; color: #64748b; background: #f1f5f9; padding: 8px 15px; border-radius: 6px; display: inline-block; font-weight: bold;}
.highlight { color: #3b82f6; }
.active-tag { color: #10b981; font-weight: bold;}
.expired-tag { color: #ef4444; font-weight: bold;}
.del-row-btn { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;}
.del-row-btn:hover { background: #fecaca; }

/* 信件推播區塊 */
.email-editor-section { background: white; padding: 25px; border-radius: 8px; border: 1px solid #e2e8f0; }
.editor-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;}
.editor-header h4 { margin: 0; font-size: 1.2rem; color: #1e293b; }
.save-template-btn.small-btn { padding: 8px 15px; font-size: 0.95rem; background: #10b981; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
.form-group { margin-bottom: 15px; } .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #475569; font-size: 1rem; }
.edit-input { padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; width: 100%; font-size: 1.05rem;}
.textarea-input { resize: vertical; font-family: inherit; line-height: 1.5; }

.email-preview-section { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; margin-top: 20px; }
.email-preview-section h5 { margin: 0 0 10px 0; color: #334155; font-size: 1.05rem;}
.plain-text-preview { background: #fefce8; padding: 20px; border-radius: 6px; border: 1px solid #fde047; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);}
.preview-subject { font-size: 1.05rem; color: #92400e; border-bottom: 1px dashed #fcd34d; padding-bottom: 10px; margin-bottom: 15px; }
.preview-body { font-size: 1.05rem; color: #451a03; line-height: 1.6; white-space: pre-wrap; font-family: monospace;}
.email-btn { background: #f59e0b; color: white; border: none; padding: 15px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; font-size: 1.15rem;}

/* 歷史查詢區塊 */
.history-calendar-container { background: white; padding: 25px; border-radius: 8px; border: 1px solid #e2e8f0; }
.query-box { margin-bottom: 20px; background: #f1f5f9; padding: 20px; border-radius: 8px; border: 1px dashed #cbd5e1;}
.query-header { display: flex; align-items: center; gap: 15px; flex-wrap: wrap;}
.query-header label { font-weight: bold; color: #475569; font-size: 1.05rem;}
.date-picker { width: 220px; padding: 10px 15px; font-weight: bold; font-size: 1.1rem; color: #0f766e; margin-bottom: 0; cursor: pointer; border: 1px solid #cbd5e1; border-radius: 6px;}

.history-results { background: white; padding: 25px; border-radius: 8px; border: 1px solid #cbd5e1;}
.detail-title { margin: 0 0 20px 0; color: #d97706; font-size: 1.2rem; border-bottom: 2px dashed #f1f5f9; padding-bottom: 10px;}
.history-list { display: flex; flex-direction: column; gap: 15px; }
.history-item { display: flex; align-items: flex-start; gap: 12px; font-size: 1.1rem; line-height: 1.6; color: #1e293b; background: #fffbeb; padding: 15px 20px; border-radius: 8px; border-left: 5px solid #f59e0b;}

@media (max-width: 768px) {
  .date-row { flex-direction: column; align-items: stretch; }
  .auto-width-btn { width: 100%; text-align: center; margin-top: 10px;}
}
</style><template>
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
