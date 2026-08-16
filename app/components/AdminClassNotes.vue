<template>
  <div class="admin-panel">
    <div class="table-header">
      <h3>⚡ 班級注意事項管理</h3>
    </div>

    <div class="query-box">
      <div class="query-header">
        <label>選擇日期：</label>
        <input type="date" v-model="targetDate" @change="fetchNotes" class="form-control date-picker" />
      </div>
    </div>

    <div class="editor-section">
      <h4 class="section-title">🗓️ {{ targetDate }} 注意事項</h4>
      <p class="help-text">您可以在此新增、修改或刪除特定日期的班級注意事項。</p>

      <div v-if="isLoading" class="loading-state">⏳ 載入中...</div>
      
      <div v-else class="edit-mode">
        <div v-for="(item, index) in editItems" :key="'cn-'+index" class="edit-row">
          <span class="row-num">{{ index + 1 }}.</span>
          <input v-model="editItems[index]" type="text" placeholder="輸入事項..." class="edit-input"/>
          <button @click="removeItem(index)" class="del-row-btn">🗑️ 刪除</button>
        </div>
        
        <div class="edit-actions">
          <button @click="addItem" class="add-btn">➕ 新增事項</button>
          <button @click="saveItems" class="save-btn" :disabled="isSaving">
            {{ isSaving ? '儲存中...' : '💾 儲存變更' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const d = new Date()
const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

const targetDate = ref(todayISO)
const isLoading = ref(false)
const isSaving = ref(false)
const editItems = ref([])

// 資料我們統一存在 system_settings，格式為 { "YYYY-MM-DD": ["事項1", "事項2"] }
const fetchNotes = async () => {
  isLoading.value = true
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'class_notes_data').maybeSingle()
  
  if (data?.setting_value && data.setting_value[targetDate.value]) {
    editItems.value = [...data.setting_value[targetDate.value]]
  } else {
    editItems.value = []
  }
  isLoading.value = false
}

onMounted(() => fetchNotes())

const addItem = () => editItems.value.push('')
const removeItem = (idx) => editItems.value.splice(idx, 1)

const saveItems = async () => {
  isSaving.value = true
  try {
    const { data: currentSettings } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'class_notes_data').maybeSingle()
    
    let updatedData = currentSettings?.setting_value || {}
    updatedData[targetDate.value] = editItems.value

    await supabase.from('system_settings').upsert({
      setting_key: 'class_notes_data',
      setting_value: updatedData
    }, { onConflict: 'setting_key' })
    
    alert('✅ 該日期的注意事項已成功儲存！')
  } catch (err) {
    alert('❌ 儲存失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.admin-panel { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; font-family: sans-serif;}
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } 
.table-header h3 { margin: 0; color: #334155; font-size: 1.4rem;}

.query-box { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-bottom: 25px;}
.query-header { display: flex; align-items: center; gap: 15px; flex-wrap: wrap;}
.query-header label { font-weight: bold; color: #475569; font-size: 1.1rem;}
.date-picker { padding: 10px 15px; font-size: 1.1rem; border: 1px solid #cbd5e1; border-radius: 6px; color: #0ea5e9; font-weight: bold;}

.section-title { margin: 0 0 10px 0; color: #0ea5e9; font-size: 1.2rem; }
.help-text { color: #64748b; margin-bottom: 20px; }
.loading-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; background: #f8fafc; border-radius: 8px;}

.edit-mode { background: #f1f5f9; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;}
.edit-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.row-num { font-size: 1.1rem; color: #0ea5e9; width: 30px; font-weight: bold; }
.edit-input { flex: 1; padding: 12px; font-size: 1.05rem; border-radius: 6px; border: 1px solid #cbd5e1; }
.del-row-btn { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; white-space: nowrap;}
.del-row-btn:hover { background: #fecaca; }

.edit-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 20px; border-top: 1px dashed #cbd5e1;}
.add-btn { background: white; color: #0ea5e9; border: 2px dashed #0ea5e9; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1.05rem;}
.save-btn { background: #10b981; color: white; border: none; padding: 12px 30px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1.1rem;}

@media (max-width: 768px) {
  .edit-row { flex-wrap: wrap; }
  .edit-input { min-width: 100%; margin-bottom: 5px;}
  .del-row-btn { width: 100%; }
  .edit-actions { flex-direction: column; gap: 15px;}
  .add-btn, .save-btn { width: 100%; text-align: center; }
}
</style>
