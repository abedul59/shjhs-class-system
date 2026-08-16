<template>
  <div class="admin-board-container">
    <div class="card">
      <h2 class="section-title">📢 家長須知管理</h2>
      <p class="section-desc">在此設定的須知事項，將會自動於設定的日期區間內顯示於前台首頁，並提供預覽與 Email 推播功能。</p>

      <!-- 新增須知表單 -->
      <div class="add-notice-box">
        <h3>📝 新增須知事項</h3>
        <textarea 
          v-model="newNotice.content" 
          rows="4" 
          placeholder="請輸入須知內容 (支援換行顯示)..." 
          class="form-control"
        ></textarea>
        
        <!-- 💡 恢復：即時預覽區塊 -->
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

        <!-- 💡 恢復：發布與推播按鈕 -->
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
            <!-- 💡 恢復：獨立的 Email 推播按鈕 -->
            <button @click="pushNoticeEmail(notice.content)" class="btn-push" title="透過 Email 推播給家長">📧 推播</button>
            <button @click="deleteNotice(notice.id)" class="btn-delete" :disabled="isSaving">🗑️ 刪除</button>
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

// 推播選項
const sendEmailOnPublish = ref(false)

// 取得今日字串 YYYY-MM-DD
const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

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

onMounted(() => {
  fetchNotices()
})

const formatNL = (txt) => {
  return String(txt || '').replace(/\n/g, '<br>')
}

const isExpired = (endDate) => {
  if (!endDate) return false
  return endDate < getTodayStr()
}

// 💡 恢復：處理 Email 推播邏輯
const pushNoticeEmail = async (content) => {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('parent_email')
    
    if (error) throw error
    
    // 過濾出有綁定信箱的資料
    const emails = students
      .map(s => s.parent_email)
      .filter(email => email && email.trim() !== '')
    
    if (emails.length === 0) {
      alert('❌ 目前沒有任何學生綁定家長信箱，無法發送。')
      return
    }
    
    // 組合 Bcc 名單與信件內容
    const bccList = emails.join(',')
    const subject = encodeURIComponent('📢 班級重要須知通知')
    const body = encodeURIComponent(`親愛的家長您好：\n\n這是一封來自班級系統的重要須知通知：\n\n${content}\n\n導師 敬上`)
    
    // 呼叫使用者的預設郵件軟體發信
    window.location.href = `mailto:?bcc=${bccList}&subject=${subject}&body=${body}`
    
  } catch (err) {
    alert('❌ 準備信件時發生錯誤：' + err.message)
  }
}

const addNotice = async () => {
  if (!newNotice.value.content) return
  isSaving.value = true
  
  const noticeObj = {
    id: Date.now().toString(), // 產生唯一ID
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
    
    // 若勾選同步推播，則觸發信件
    if (sendEmailOnPublish.value) {
      await pushNoticeEmail(newNotice.value.content)
    }

    // 清空表單
    newNotice.value.content = ''
    newNotice.value.endDate = ''
    sendEmailOnPublish.value = false
    alert('✅ 須知已成功發布！')
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

.add-notice-box { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-bottom: 30px; }
.add-notice-box h3 { margin-top: 0; color: #334155; font-size: 1.1rem; margin-bottom: 15px;}

.form-control { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-family: inherit; font-size: 1rem; resize: vertical; }
.form-control:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

/* 💡 恢復：預覽區塊樣式 */
.preview-section { margin: 15px 0; padding: 15px; background: white; border: 1px dashed #cbd5e1; border-radius: 6px; }
.preview-section h4 { margin-top: 0; color: #475569; font-size: 0.95rem; margin-bottom: 10px; }
.preview-box { color: #1e293b; line-height: 1.5; font-size: 1.05rem; }

.date-row { display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap; margin-top: 15px;}
.date-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 200px; }
.date-group label { font-weight: bold; color: #475569; font-size: 0.95rem; }
.date-input { margin-bottom: 0; }
.hint { font-size: 0.8rem; color: #94a3b8; }

/* 💡 恢復：操作列與推播 Checkbox 樣式 */
.action-row { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 2px dashed #e2e8f0; padding-top: 15px; flex-wrap: wrap; gap: 15px; }
.push-checkbox { font-weight: bold; color: #0f766e; display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;}
.push-checkbox input { cursor: pointer; width: 16px; height: 16px;}

.btn-add { background: #10b981; color: white; border: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; font-size: 1.1rem; cursor: pointer; transition: 0.2s; height: fit-content; }
.btn-add:hover:not(:disabled) { background: #059669; }
.btn-add:disabled { background: #9ca3af; cursor: not-allowed; }

.notices-list h3 { color: #334155; font-size: 1.1rem; margin-bottom: 15px; }
.empty-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; background: #f1f5f9; border-radius: 8px; }

.notice-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: 0.2s; gap: 15px; flex-wrap: wrap;}
.notice-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }

.notice-content { flex: 1; min-width: 250px;}
.notice-text { color: #1e293b; font-size: 1.05rem; line-height: 1.5; margin-bottom: 10px; }
.notice-dates { font-size: 0.9rem; color: #64748b; background: #f1f5f9; padding: 6px 12px; border-radius: 4px; display: inline-block; }
.highlight { font-weight: bold; color: #3b82f6; }
.expired-tag { color: #ef4444; font-weight: bold; }

/* 💡 恢復：列表按鈕樣式 */
.item-actions { display: flex; gap: 10px; flex-shrink: 0; }
.btn-push { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; white-space: nowrap;}
.btn-push:hover { background: #dbeafe; }
.btn-delete { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; white-space: nowrap; }
.btn-delete:hover:not(:disabled) { background: #fecaca; }
.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .action-row { flex-direction: column; align-items: stretch; }
  .btn-add { width: 100%; }
}
</style>
