<template>
  <div class="admin-board-container">
    <div class="card">
      <h2 class="section-title">📢 家長須知管理中心</h2>
      <p class="section-desc">您可以在此發布有時效性的家長須知，系統會根據日期自動上下架。同時支援歷史紀錄查詢與 Email 同步推播功能。</p>

      <!-- ================= 區塊 1：新增與預覽 ================= -->
      <div class="add-notice-box">
        <h3>📝 新增須知事項</h3>
        
        <textarea 
          v-model="newNotice.content" 
          rows="4" 
          placeholder="請輸入須知內容 (支援換行顯示)..." 
          class="form-control notice-textarea"
        ></textarea>
        
        <!-- 💡 恢復並強化的即時擬真預覽區塊 -->
        <div v-if="newNotice.content" class="live-preview-wrapper">
          <h4 class="preview-title">👀 首頁顯示即時預覽：</h4>
          <div class="blackboard-preview">
            <ul class="item-list">
              <li class="rich-notice-item">
                <span class="bullet">📌</span>
                <div class="rich-notice-content" v-html="formatNL(newNotice.content)"></div>
              </li>
            </ul>
          </div>
        </div>
        
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
        </div>

        <div class="action-row">
          <label class="push-checkbox">
            <input type="checkbox" v-model="sendEmailOnPublish" />
            📧 發布時同步開啟 Email 推播給家長
          </label>
          <button @click="addNotice" class="btn-add" :disabled="!newNotice.content || isSaving">
            {{ isSaving ? '發布中...' : '➕ 確認發布須知' }}
          </button>
        </div>
      </div>

      <!-- ================= 區塊 2：已建立的須知清單 ================= -->
      <div class="notices-list">
        <h3>📋 目前已建立的須知清單</h3>
        <div v-if="isLoading" class="empty-state">⏳ 載入中...</div>
        <div v-else-if="notices.length === 0" class="empty-state">目前尚無任何須知事項。</div>
        
        <div v-for="notice in notices" :key="notice.id" class="notice-item">
          <div class="notice-content">
            <div class="notice-text" v-html="formatNL(notice.content)"></div>
            <div class="notice-dates">
              🗓️ 刊登期間：
              <span class="highlight">{{ notice.startDate || '未設定' }}</span> 
              至 
              <span class="highlight">{{ notice.endDate || '未設定 (手動下架)' }}</span>
              <span v-if="isExpired(notice.endDate)" class="expired-tag"> (已過期)</span>
            </div>
          </div>
          <div class="item-actions">
            <!-- Email 獨立推播按鈕 -->
            <button @click="pushNoticeEmail(notice.content)" class="btn-push" title="開啟郵件軟體推播給家長">📧 推播</button>
            <button @click="deleteNotice(notice.id)" class="btn-delete" :disabled="isSaving">🗑️ 刪除</button>
          </div>
        </div>
      </div>

      <!-- ================= 區塊 3：日曆歷史查詢 ================= -->
      <div class="history-section">
        <h3>📅 歷史紀錄查詢</h3>
        <p class="hint-text">選擇日期，查詢過去曾在聯絡簿或須知系統發布過的事項。</p>
        
        <div class="query-box">
          <div class="query-header">
            <label>選擇查詢日期：</label>
            <input type="date" v-model="historyDate" @change="fetchHistory" class="form-control date-picker" />
          </div>
        </div>

        <div class="history-results">
          <div v-if="isHistoryLoading" class="loading-state">⏳ 紀錄搜尋中...</div>
          <div v-else>
            <h4 class="history-date-title">{{ historyDate }} 當日刊登的須知：</h4>
            <div v-if="historicalNotices.length === 0" class="empty-state">
              這一天沒有任何發布的家長須知紀錄。
            </div>
            <div v-else class="historical-list">
              <div v-for="(hist, index) in historicalNotices" :key="'h-'+index" class="history-item">
                <span class="bullet">📌</span>
                <div class="history-text" v-html="formatNL(hist)"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const notices = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const sendEmailOnPublish = ref(false)

// 歷史查詢變數
const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const historyDate = ref(getTodayStr())
const isHistoryLoading = ref(false)
const historicalNotices = ref([])

const newNotice = ref({
  content: '',
  startDate: getTodayStr(),
  endDate: ''
})

const fetchNotices = async () => {
  isLoading.value = true
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'parent_notices_data').maybeSingle()
  if (data?.setting_value) {
    notices.value = data.setting_value || []
  }
  isLoading.value = false
}

// 💡 修正並防呆：歷史查詢功能
const fetchHistory = async () => {
  if (!historyDate.value) return
  isHistoryLoading.value = true
  historicalNotices.value = []
  
  try {
    const targetDate = historyDate.value
    let foundNotices = []

    // 1. 安全搜尋舊制 (從 contact_books 取得，使用 select('*') 避免 notices 欄位不存在報錯)
    const { data: contactData } = await supabase
      .from('contact_books')
      .select('*')
      .eq('record_date', targetDate)
      .maybeSingle()
      
    if (contactData && contactData.notices && Array.isArray(contactData.notices)) {
      foundNotices = [...contactData.notices]
    }

    // 2. 搜尋新制 (比對目前 notices 陣列中的日期區間)
    notices.value.forEach(n => {
      const startOk = !n.startDate || n.startDate <= targetDate
      const endOk = !n.endDate || n.endDate >= targetDate
      if (startOk && endOk) {
        if (!foundNotices.includes(n.content)) {
          foundNotices.push(n.content)
        }
      }
    })

    historicalNotices.value = foundNotices
  } catch (e) {
    console.error('查詢歷史紀錄失敗:', e)
  } finally {
    isHistoryLoading.value = false
  }
}

onMounted(async () => {
  await fetchNotices()
  await fetchHistory()
})

const formatNL = (txt) => {
  return String(txt || '').replace(/\n/g, '<br>')
}

const isExpired = (endDate) => {
  if (!endDate) return false
  return endDate < getTodayStr()
}

// 💡 徹底修復：Email 推播防呆處理
const pushNoticeEmail = async (content) => {
  const subject = encodeURIComponent('📢 班級重要須知通知')
  const body = encodeURIComponent(`親愛的家長您好：\n\n這是一封來自班級系統的重要須知通知：\n\n${content}\n\n導師 敬上`)
  let bccList = ''

  try {
    // 透過 select('*') 抓取所有欄位，防止因指定錯誤的 column 名稱而導致資料庫報錯
    const { data: students, error } = await supabase.from('students').select('*')
    
    if (!error && students && students.length > 0) {
      // 智慧比對多種可能存在的 Email 欄位名稱
      const emails = students
        .map(s => s.parent_email || s.parent_mail || s.email || s.guardian_email || s.guardian_mail || s.contact_email)
        .filter(email => email && email.includes('@'))
      
      if (emails.length > 0) {
        bccList = emails.join(',')
      }
    }
  } catch (err) {
    console.warn('自動抓取信箱失敗，已自動降級為空白收件人。', err)
  }

  // 無論如何都必定幫老師開啟郵件軟體 (如果沒有信箱，只會空著收件人)
  window.location.href = `mailto:?bcc=${bccList}&subject=${subject}&body=${body}`
  
  if (!bccList) {
    alert('⚠️ 系統已開啟信件軟體，但因學生資料庫中未能讀取到信箱欄位，您可能需要手動貼上收件人群組。')
  }
}

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
    
    if (sendEmailOnPublish.value) {
      await pushNoticeEmail(newNotice.value.content)
    }

    newNotice.value.content = ''
    newNotice.value.endDate = ''
    sendEmailOnPublish.value = false
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
    const { error } = await supabase.from('system_settings').upsert({
      setting_key: 'parent_notices_data',
      setting_value: updatedNotices
    }, { onConflict: 'setting_key' })
    
    if (error) throw error
    notices.value = updatedNotices
    
    await fetchHistory()
  } catch (err) {
    alert('❌ 刪除失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.admin-board-container { font-family: sans-serif; padding-bottom: 20px;}
.card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.section-title { margin: 0 0 10px 0; color: #1e293b; font-size: 1.5rem;}
.section-desc { color: #64748b; margin-bottom: 25px; line-height: 1.5; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;}

/* 表單與預覽區塊 */
.add-notice-box { background: #f8fafc; padding: 25px; border-radius: 10px; border: 1px dashed #cbd5e1; margin-bottom: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);}
.add-notice-box h3 { margin-top: 0; color: #334155; font-size: 1.2rem; margin-bottom: 15px;}

.form-control { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-family: inherit; font-size: 1.05rem; }
.form-control:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
.notice-textarea { resize: vertical; min-height: 100px; }

/* 💡 擬真黑板預覽樣式 */
.live-preview-wrapper { margin: 20px 0; animation: fadeIn 0.3s ease; }
.preview-title { margin: 0 0 10px 0; color: #475569; font-size: 1rem; }
.blackboard-preview { background-color: #315243; border: 8px solid #754d29; border-radius: 6px; padding: 15px 20px; box-shadow: inset 0 0 10px rgba(0,0,0,0.3); color: white; min-height: 50px; }
.item-list { list-style: none; padding: 0; margin: 0; }
.rich-notice-item { display: flex; align-items: flex-start; gap: 8px; font-size: 1.1rem; line-height: 1.5; }
.bullet { display: inline-block; transform: translateY(2px); }
.rich-notice-content { flex: 1; word-wrap: break-word; overflow-wrap: break-word; }
.rich-notice-content :deep(p) { margin: 0 0 5px 0; }
.rich-notice-content :deep(a) { color: #fbbf24; text-decoration: underline; }

.date-row { display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap; margin-top: 20px;}
.date-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 220px; }
.date-group label { font-weight: bold; color: #475569; font-size: 1rem; }
.date-input { margin-bottom: 0; cursor: pointer;}
.hint { font-size: 0.85rem; color: #94a3b8; margin-top: 2px;}

.action-row { display: flex; justify-content: space-between; align-items: center; margin-top: 25px; border-top: 2px dashed #e2e8f0; padding-top: 20px; flex-wrap: wrap; gap: 15px; }
.push-checkbox { font-weight: bold; color: #0f766e; display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; font-size: 1.05rem;}
.push-checkbox input { cursor: pointer; width: 18px; height: 18px; accent-color: #0f766e;}

.btn-add { background: #10b981; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; font-size: 1.1rem; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);}
.btn-add:hover:not(:disabled) { background: #059669; transform: translateY(-1px);}
.btn-add:disabled { background: #9ca3af; box-shadow: none; cursor: not-allowed; }

/* 列表區塊 */
.notices-list { margin-bottom: 50px; }
.notices-list h3 { color: #334155; font-size: 1.2rem; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;}
.empty-state, .loading-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;}

.notice-item { display: flex; justify-content: space-between; align-items: stretch; padding: 20px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 15px; transition: 0.2s; gap: 20px; flex-wrap: wrap;}
.notice-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

.notice-content { flex: 1; min-width: 250px;}
.notice-text { color: #1e293b; font-size: 1.1rem; line-height: 1.6; margin-bottom: 15px; }
.notice-dates { font-size: 0.95rem; color: #64748b; background: #f1f5f9; padding: 8px 15px; border-radius: 6px; display: inline-block; font-weight: bold;}
.highlight { color: #3b82f6; }
.expired-tag { color: #ef4444; }

.item-actions { display: flex; gap: 10px; flex-shrink: 0; align-items: flex-start;}
.btn-push { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 1rem;}
.btn-push:hover { background: #dbeafe; }
.btn-delete { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 1rem;}
.btn-delete:hover:not(:disabled) { background: #fecaca; }
.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }

/* 歷史查詢區塊 */
.history-section { background: #f8fafc; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0;}
.history-section h3 { margin-top: 0; color: #334155; font-size: 1.2rem; margin-bottom: 5px;}
.hint-text { color: #64748b; margin-bottom: 20px; font-size: 0.95rem;}

.query-box { margin-bottom: 20px; }
.query-header { display: flex; align-items: center; gap: 15px; flex-wrap: wrap;}
.query-header label { font-weight: bold; color: #475569; font-size: 1.05rem;}
.date-picker { width: 220px; padding: 10px 15px; font-weight: bold; font-size: 1.1rem; color: #0f766e; margin-bottom: 0; cursor: pointer;}

.history-results { background: white; padding: 25px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);}
.history-date-title { color: #d97706; margin-top: 0; margin-bottom: 20px; font-size: 1.2rem; border-bottom: 2px dashed #f1f5f9; padding-bottom: 10px;}
.historical-list { display: flex; flex-direction: column; gap: 15px; }
.history-item { display: flex; align-items: flex-start; gap: 12px; font-size: 1.1rem; line-height: 1.6; color: #1e293b; background: #fffbeb; padding: 15px 20px; border-radius: 8px; border-left: 5px solid #f59e0b;}

@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .action-row { flex-direction: column; align-items: stretch; }
  .btn-add { width: 100%; text-align: center; }
  .item-actions { width: 100%; flex-direction: row; }
  .item-actions button { flex: 1; }
}
</style>
