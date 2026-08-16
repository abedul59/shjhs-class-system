<template>
  <div class="admin-contact-container">
    <div class="card">
      <h2 class="section-title">⭐ 聯絡簿歷史與管理中心</h2>
      <p class="section-desc">在此可以查詢、補登或修改過去任何一天的聯絡簿事項。</p>

      <!-- 查詢與編輯區塊 -->
      <div class="query-box">
        <div class="query-header">
          <h3>📅 選擇查詢日期</h3>
          <input type="date" v-model="selectedDate" @change="fetchContactByDate" class="form-control date-picker" />
        </div>
        
        <div class="edit-section">
          <div v-if="isLoading" class="loading-state">⏳ 載入中...</div>
          
          <div v-else>
            <h4 class="edit-title">{{ formatDisplayDate(selectedDate) }} 聯絡簿事項：</h4>
            
            <div v-if="editingItems.length === 0" class="empty-state">
              這天尚未建立任何聯絡簿事項。
            </div>

            <div class="edit-mode">
              <div v-for="(item, index) in editingItems" :key="'edit-'+index" class="edit-row">
                <span class="row-num">{{ index + 1 }}.</span>
                <input v-model="editingItems[index]" type="text" placeholder="輸入事項..." class="edit-input"/>
                <button @click="removeItem(index)" class="del-row-btn">🗑️</button>
              </div>
              
              <div class="edit-actions">
                <button @click="addItem" class="add-btn">➕ 新增事項</button>
                <button @click="saveContactItems" class="save-btn" :disabled="isSaving">
                  {{ isSaving ? '儲存中...' : '💾 儲存並發布' }}
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
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const selectedDate = ref(getTodayStr())
const editingItems = ref([])
const isLoading = ref(false)
const isSaving = ref(false)

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const dt = new Date(y, m - 1, d)
  const daysOfWeek = ['日', '一', '二', '三', '四', '五', '六']
  return `${y}年${m}月${d}日 (星期${daysOfWeek[dt.getDay()]})`
}

const fetchContactByDate = async () => {
  isLoading.value = true
  editingItems.value = []
  
  try {
    const { data, error } = await supabase
      .from('contact_books')
      .select('contact_items')
      .eq('record_date', selectedDate.value)
      .maybeSingle()
      
    if (error && error.code !== 'PGRST116') throw error
    
    if (data && data.contact_items) {
      editingItems.value = [...data.contact_items]
    }
  } catch (e) {
    console.error('Fetch error:', e)
  } finally {
    isLoading.value = false
  }
}

const addItem = () => {
  editingItems.value.push('')
}

const removeItem = (index) => {
  editingItems.value.splice(index, 1)
}

const saveContactItems = async () => {
  isSaving.value = true
  
  // 過濾掉全空白的項目
  const filteredItems = editingItems.value.filter(item => item.trim() !== '')
  
  try {
    const { error } = await supabase
      .from('contact_books')
      .upsert({ 
        record_date: selectedDate.value, 
        contact_items: filteredItems 
      }, { onConflict: 'record_date' })
      
    if (error) throw error
    
    editingItems.value = filteredItems
    alert(`✅ ${selectedDate.value} 的聯絡簿已成功儲存！`)
  } catch (error) {
    alert("❌ 儲存失敗：" + error.message)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  fetchContactByDate()
})
</script>

<style scoped>
.admin-contact-container { font-family: sans-serif; }
.card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.section-title { margin: 0 0 10px 0; color: #1e293b; }
.section-desc { color: #64748b; margin-bottom: 25px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;}

.query-box { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
.query-header { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; flex-wrap: wrap;}
.query-header h3 { margin: 0; color: #334155; }
.date-picker { width: 200px; padding: 10px; font-weight: bold; font-size: 1.1rem; color: #0f766e; }

.form-control { border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; }
.form-control:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

.edit-section { background: white; padding: 20px; border-radius: 8px; border: 1px dashed #cbd5e1; }
.edit-title { margin-top: 0; margin-bottom: 15px; color: #f59e0b; font-size: 1.2rem; }

.loading-state, .empty-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; background: #f1f5f9; border-radius: 8px; }

.edit-mode { display: flex; flex-direction: column; gap: 12px; }
.edit-row { display: flex; align-items: center; gap: 10px; }
.row-num { font-size: 1.1rem; color: #f59e0b; width: 25px; font-weight: bold; text-align: right; }
.edit-input { flex: 1; padding: 12px; font-size: 1.05rem; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc;}
.edit-input:focus { background: white; border-color: #3b82f6; outline: none; }
.del-row-btn { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 10px 15px; border-radius: 6px; cursor: pointer; transition: 0.2s;}
.del-row-btn:hover { background: #fecaca; }

.edit-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 15px; border-top: 2px dashed #e2e8f0;}
.add-btn { background: transparent; color: #3b82f6; border: 2px dashed #3b82f6; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.add-btn:hover { background: #eff6ff; }
.save-btn { background: #10b981; color: white; border: none; padding: 12px 30px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1.1rem; transition: 0.2s;}
.save-btn:hover:not(:disabled) { background: #059669; }
.save-btn:disabled { background: #9ca3af; cursor: not-allowed; }

@media (max-width: 768px) {
  .edit-row { flex-wrap: wrap; }
  .edit-input { width: calc(100% - 40px); flex: none; }
  .edit-actions { flex-direction: column; gap: 15px; align-items: stretch; }
  .add-btn, .save-btn { width: 100%; text-align: center; }
}
</style>
