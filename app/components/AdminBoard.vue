<template>
  <div class="admin-board-container">
    <div class="card">
      <h2 class="section-title">📢 家長須知管理</h2>
      <p class="section-desc">在此設定的須知事項，將會自動於設定的日期區間內，顯示於前台首頁。</p>

      <!-- 新增須知表單 -->
      <div class="add-notice-box">
        <h3>📝 新增須知事項</h3>
        <textarea 
          v-model="newNotice.content" 
          rows="4" 
          placeholder="請輸入須知內容 (支援換行顯示)..." 
          class="form-control"
        ></textarea>
        
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
          <button @click="addNotice" class="btn-add" :disabled="!newNotice.content || isSaving">
            ➕ 發布須知
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
          <button @click="deleteNotice(notice.id)" class="btn-delete" :disabled="isSaving">🗑️ 刪除</button>
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
    newNotice.value.content = ''
    newNotice.value.endDate = ''
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
.add-notice-box h3 { margin-top: 0; color: #334155; font-size: 1.1rem; }

.form-control { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-family: inherit; font-size: 1rem; margin-bottom: 15px; resize: vertical; }
.form-control:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

.date-row { display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap; }
.date-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 200px; }
.date-group label { font-weight: bold; color: #475569; font-size: 0.95rem; }
.date-input { margin-bottom: 0; }
.hint { font-size: 0.8rem; color: #94a3b8; }

.btn-add { background: #10b981; color: white; border: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; font-size: 1.1rem; cursor: pointer; transition: 0.2s; height: fit-content; }
.btn-add:hover:not(:disabled) { background: #059669; }
.btn-add:disabled { background: #9ca3af; cursor: not-allowed; }

.notices-list h3 { color: #334155; font-size: 1.1rem; margin-bottom: 15px; }
.empty-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; background: #f1f5f9; border-radius: 8px; }

.notice-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: 0.2s; gap: 15px; }
.notice-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }

.notice-content { flex: 1; }
.notice-text { color: #1e293b; font-size: 1.05rem; line-height: 1.5; margin-bottom: 10px; }
.notice-dates { font-size: 0.9rem; color: #64748b; background: #f1f5f9; padding: 6px 12px; border-radius: 4px; display: inline-block; }
.highlight { font-weight: bold; color: #3b82f6; }
.expired-tag { color: #ef4444; font-weight: bold; }

.btn-delete { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; white-space: nowrap; }
.btn-delete:hover:not(:disabled) { background: #fecaca; }
.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
