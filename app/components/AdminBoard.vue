<template>
  <div class="admin-board-container">
    <div class="card">
      <h2 class="section-title">📢 家長須知管理</h2>
      <p class="section-desc">在此設定的須知事項，將會自動於設定的日期區間內顯示於前台首頁，並提供預覽與 Email 推播功能。</p>

      <!-- 💡 標籤切換：發布管理 vs 歷史查詢 -->
      <div class="view-tabs">
        <button :class="['tab-btn', { active: activeTab === 'manage' }]" @click="activeTab = 'manage'">
          📝 發布與管理
        </button>
        <button :class="['tab-btn', { active: activeTab === 'history' }]" @click="activeTab = 'history'">
          📅 日曆歷史查詢
        </button>
      </div>

      <!-- ================== 頁籤 1：發布與管理 ================== -->
      <div v-show="activeTab === 'manage'">
        <!-- 新增須知表單 -->
        <div class="add-notice-box">
          <h3>📝 新增須知事項</h3>
          <textarea 
            v-model="newNotice.content" 
            rows="4" 
            placeholder="請輸入須知內容 (支援換行顯示)..." 
            class="form-control"
          ></textarea>
          
          <!-- 即時預覽區塊 -->
          <div v-if="newNotice.content" class="preview-section">
            <h4>👀 內容即時預覽：</h4>
            <div class="preview-box" v-html="formatNL(newNotice.content)"></div>
          </div>
          
          <div class="date-row">
            <div class="date-group">
              <label>起始日期：</label>
              <input type="date" v-model="newNotice.startDate" class="form-control date-input" />
            </div>
            <div class="date-group">
              <label>結束日期 (選填)：</label>
              <input type="date" v-model="newNotice.endDate" class="form-control date-input" />
              <span class="hint">留空代表不自動下架</span>
            </div>
          </div>

          <!-- 發布與推播按鈕 -->
          <div class="action-row">
            <label class="push-checkbox">
              <input type="checkbox" v-model="sendEmailOnPublish" />
              📧 發布時同步開啟 Email 推播
            </label>
            <button @click="addNotice" class="btn-add" :disabled="!newNotice.content || isSaving">
              {{ isSaving ? '發布中...' : '➕ 發布須知' }}
            </button>
          </div>
        </div>

        <!-- 現有須知列表 -->
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
              <!-- 獨立的 Email 推播按鈕 -->
              <button @click="pushNoticeEmail(notice.content)" class="btn-push" title="透過 Email 推播給家長">📧 推播</button>
              <button @click="deleteNotice(notice.id)" class="btn-delete" :disabled="isSaving">🗑️ 刪除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ================== 頁籤 2：歷史日曆查詢 ================== -->
      <div v-show="activeTab === 'history'" class="history-section">
        <div class="query-box">
          <div class="query-header">
            <h3>📅 選擇查詢日期</h3>
            <input type="date" v-model="historyDate" @change="fetchHistory" class="form-control date-picker" />
          </div>
        </div>

        <div class="history-results">
          <div v-if="isHistoryLoading" class="loading-state">⏳ 紀錄搜尋中...</div>
          <div v-else>
            <h4 class="history-date-title">{{ historyDate }} 當日刊登的須知：</h4>
            
            <div v-if="historicalNotices.length === 0" class="empty-state">
              這一天沒有任何發布的家長須知。
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

const activeTab = ref('manage') // 'manage' or 'history'
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

// 💡 恢復：日曆歷史查詢邏輯 (同時查詢新制與舊制)
const fetchHistory = async () => {
  if (!historyDate.value) return
  isHistoryLoading.value = true
  historicalNotices.value = []
  
  try {
    const targetDate = historyDate.value
    let foundNotices = []

    // 1. 搜尋舊制 (儲存在 contact_books 內的 notices 陣列)
    const { data: contactData } = await supabase
      .from('contact_books')
      .select('notices')
      .eq('record_date', targetDate)
      .maybeSingle()
      
    if (contactData && contactData.notices && contactData.notices.length > 0) {
      foundNotices = [...contactData.notices]
    }

    // 2. 搜尋新制 (比對 parent_notices_data 中的日期區間)
    notices.value.forEach(n => {
      const startOk = !n.startDate || n.startDate <= targetDate
      const endOk = !n.endDate || n.endDate >= targetDate
      if (startOk && endOk) {
        // 避免重複加入
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
  await fetchHistory() // 預設載入今日歷史
})

const formatNL = (txt) => {
  return String(txt || '').replace(/\n/g, '<br>')
}

const isExpired = (endDate) => {
  if (!endDate) return false
  return endDate < getTodayStr()
}

// 處理 Email 推播邏輯
const pushNoticeEmail = async (content) => {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('parent_email')
    
    if (error) throw error
    
    const emails = students
      .map(s => s.parent_email)
      .filter(email => email && email.trim() !== '')
    
    if (emails.length === 0) {
      alert('❌ 目前沒有任何學生綁定家長信箱，無法發送。')
      return
    }
    
    const bccList = emails.join(',')
    const subject = encodeURIComponent('📢 班級重要須知通知')
    const body = encodeURIComponent(`親愛的家長您好：\n\n這是一封來自班級系統的重要須知通知：\n\n${content}\n\n導師 敬上`)
    
    window.location.href = `mailto:?bcc=${bccList}&subject=${subject}&body=${body}`
    
  } catch (err) {
    alert('❌ 準備信件時發生錯誤：' + err.message)
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
    
    // 發布後重新整理歷史視圖
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
    
    // 刪除後重新整理歷史視圖
    await fetchHistory()
  } catch (err) {
    alert('❌ 刪除失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.admin-board-container { font-family: sans-serif; }
.card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.section-title { margin: 0 0 10px 0; color: #1e293b; }
.section-desc { color: #64748b; margin-bottom: 25px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;}

/* 💡 新增：頁籤切換樣式 */
.view-tabs { display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;}
.tab-btn { background: transparent; border: none; padding: 10px 20px; font-size: 1.1rem; font-weight: bold; color: #64748b; cursor: pointer; border-radius: 8px 8px 0 0; transition: 0.2s;}
.tab-btn:hover { background: #f1f5f9; color: #3b82f6;}
.tab-btn.active { background: #eff6ff; color: #2563eb; border-bottom: 3px solid #3b82f6; }

.add-notice-box { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-bottom: 30px; }
.add-notice-box h3 { margin-top: 0; color: #334155; font-size: 1.1rem; margin-bottom: 15px;}

.form-control { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-family: inherit; font-size: 1rem; resize: vertical; }
.form-control:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

.preview-section { margin: 15px 0; padding: 15px; background: white; border: 1px dashed #cbd5e1; border-radius: 6px; }
.preview-section h4 { margin-top: 0; color: #475569; font-size: 0.95rem; margin-bottom: 10px; }
.preview-box { color: #1e293b; line-height: 1.5; font-size: 1.05rem; }

.date-row { display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap; margin-top: 15px;}
.date-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 200px; }
.date-group label { font-weight: bold; color: #475569; font-size: 0.95rem; }
.date-input { margin-bottom: 0; }
.hint { font-size: 0.8rem; color: #94a3b8; }

.action-row { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 2px dashed #e2e8f0; padding-top: 15px; flex-wrap: wrap; gap: 15px; }
.push-checkbox { font-weight: bold; color: #0f766e; display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;}
.push-checkbox input { cursor: pointer; width: 16px; height: 16px;}

.btn-add { background: #10b981; color: white; border: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; font-size: 1.1rem; cursor: pointer; transition: 0.2s; height: fit-content; }
.btn-add:hover:not(:disabled) { background: #059669; }
.btn-add:disabled { background: #9ca3af; cursor: not-allowed; }

.notices-list h3 { color: #334155; font-size: 1.1rem; margin-bottom: 15px; }
.empty-state, .loading-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; background: #f1f5f9; border-radius: 8px; }

.notice-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: 0.2s; gap: 15px; flex-wrap: wrap;}
.notice-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }

.notice-content { flex: 1; min-width: 250px;}
.notice-text { color: #1e293b; font-size: 1.05rem; line-height: 1.5; margin-bottom: 10px; }
.notice-dates { font-size: 0.9rem; color: #64748b; background: #f1f5f9; padding: 6px 12px; border-radius: 4px; display: inline-block; }
.highlight { font-weight: bold; color: #3b82f6; }
.expired-tag { color: #ef4444; font-weight: bold; }

.item-actions { display: flex; gap: 10px; flex-shrink: 0; }
.btn-push { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; white-space: nowrap;}
.btn-push:hover { background: #dbeafe; }
.btn-delete { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; white-space: nowrap; }
.btn-delete:hover:not(:disabled) { background: #fecaca; }
.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }

/* 💡 新增：歷史查詢區塊樣式 */
.history-section { animation: fadeIn 0.3s ease; }
.query-box { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-bottom: 20px; }
.query-header { display: flex; align-items: center; gap: 15px; flex-wrap: wrap;}
.query-header h3 { margin: 0; color: #334155; }
.date-picker { width: 200px; padding: 10px; font-weight: bold; font-size: 1.1rem; color: #0f766e; margin-bottom: 0;}

.history-results { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
.history-date-title { color: #f59e0b; margin-top: 0; margin-bottom: 20px; font-size: 1.2rem; border-bottom: 2px dashed #f1f5f9; padding-bottom: 10px;}
.historical-list { display: flex; flex-direction: column; gap: 15px; }
.history-item { display: flex; align-items: flex-start; gap: 10px; font-size: 1.1rem; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;}
.bullet { font-size: 1.2rem; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .action-row { flex-direction: column; align-items: stretch; }
  .btn-add { width: 100%; }
}
</style>
