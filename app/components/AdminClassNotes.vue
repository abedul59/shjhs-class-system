<template>
  <div class="admin-panel">
    <div class="table-header">
      <h3>⚡ 班級注意事項管理中心</h3>
    </div>

    <!-- 💡 日期查詢區塊 -->
    <div class="query-box">
      <div class="query-header">
        <label>📅 選擇管理日期：</label>
        <input type="date" v-model="targetDate" @change="fetchNotes" class="form-control date-picker" />
      </div>
    </div>

    <!-- 💡 編輯與管理區塊 -->
    <div class="editor-section">
      <div class="section-header">
        <h4 class="section-title">📝 {{ targetDate }} 注意事項編輯</h4>
        <div class="io-actions">
          <button @click="exportJSON" class="io-btn export-btn">📤 匯出備份</button>
          <label class="io-btn import-btn">
            📥 匯入備份
            <input type="file" accept=".json" style="display:none" @change="importJSON" />
          </label>
        </div>
      </div>
      
      <p class="help-text">您可以在此處新增、修改或刪除特定日期的班級注意事項。修改後點擊儲存，前台會立即同步更新。</p>

      <div v-if="isLoading" class="loading-state">⏳ 載入資料中，請稍候...</div>
      
      <div v-else class="edit-mode">
        <div v-if="editItems.length === 0" class="empty-state">
          這天目前沒有任何注意事項喔！
        </div>

        <div v-for="(item, index) in editItems" :key="'cn-'+index" class="edit-row">
          <span class="row-num">{{ index + 1 }}.</span>
          <input v-model="editItems[index]" type="text" placeholder="輸入班級注意事項..." class="edit-input"/>
          <button @click="removeItem(index)" class="del-row-btn">🗑️ 刪除</button>
        </div>
        
        <div class="edit-actions">
          <button @click="addItem" class="add-btn">➕ 新增一筆事項</button>
          <div class="right-actions">
            <button v-if="editItems.length > 0" @click="clearAll" class="clear-btn">🧹 清空本日</button>
            <button @click="saveItems" class="save-btn" :disabled="isSaving">
              {{ isSaving ? '儲存中...' : '💾 儲存並發布' }}
            </button>
          </div>
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
const allNotesData = ref({}) // 存放所有日期的歷史紀錄

const fetchNotes = async () => {
  isLoading.value = true
  try {
    const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'class_notes_data').maybeSingle()
    
    allNotesData.value = data?.setting_value || {}
    
    // 如果該日期有資料，就載入到編輯陣列中
    if (allNotesData.value[targetDate.value]) {
      editItems.value = [...allNotesData.value[targetDate.value]]
    } else {
      editItems.value = []
    }
  } catch (err) {
    console.error("讀取失敗:", err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchNotes())

const addItem = () => editItems.value.push('')
const removeItem = (idx) => editItems.value.splice(idx, 1)

const clearAll = () => { 
  if(confirm('確定要清空這天的所有注意事項嗎？')) {
    editItems.value = [] 
  }
}

const saveItems = async () => {
  isSaving.value = true
  try {
    // 💡 儲存前自動過濾掉完全空白的欄位
    const cleanedItems = editItems.value.filter(item => String(item).trim() !== '')
    
    allNotesData.value[targetDate.value] = cleanedItems

    await supabase.from('system_settings').upsert({
      setting_key: 'class_notes_data',
      setting_value: allNotesData.value
    }, { onConflict: 'setting_key' })
    
    editItems.value = [...cleanedItems] // 更新畫面上的陣列
    alert('✅ 該日期的注意事項已成功儲存發布！')
  } catch (err) {
    alert('❌ 儲存失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}

// 💡 JSON 備份匯出功能
const exportJSON = () => {
  const dataStr = JSON.stringify(allNotesData.value, null, 2)
  const blob = new Blob([dataStr], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `class_notes_backup_${todayISO}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 💡 JSON 備份匯入功能
const importJSON = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const imported = JSON.parse(e.target.result)
      if (typeof imported !== 'object' || Array.isArray(imported)) {
        throw new Error("無效的資料格式，必須是日期鍵值的 JSON 物件")
      }
      
      if (confirm('是否要【完全覆蓋】現有所有的注意事項歷史紀錄？\n(按「確定」將覆蓋現有資料庫，請謹慎操作)')) {
        await supabase.from('system_settings').upsert({ 
          setting_key: 'class_notes_data', 
          setting_value: imported 
        }, { onConflict: 'setting_key' })
        
        allNotesData.value = imported
        if (imported[targetDate.value]) {
            editItems.value = [...imported[targetDate.value]]
        } else {
            editItems.value = []
        }
        alert('✅ 匯入成功！系統已同步。')
      }
    } catch(err) { 
      alert('❌ 匯入失敗：' + err.message) 
    }
    event.target.value = '' // 清除選取的檔案，方便重複點擊
  }
  reader.readAsText(file)
}
</script>

<style scoped>
.admin-panel { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; font-family: sans-serif;}
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } 
.table-header h3 { margin: 0; color: #334155; font-size: 1.4rem;}

/* 日期查詢區塊 */
.query-box { background: #f0f9ff; padding: 20px; border-radius: 8px; border: 1px dashed #7dd3fc; margin-bottom: 25px;}
.query-header { display: flex; align-items: center; gap: 15px; flex-wrap: wrap;}
.query-header label { font-weight: bold; color: #0284c7; font-size: 1.1rem;}
.date-picker { padding: 10px 15px; font-size: 1.1rem; border: 1px solid #7dd3fc; border-radius: 6px; color: #0284c7; font-weight: bold; cursor: pointer;}
.date-picker:focus { outline: none; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.3); }

/* 編輯區塊表頭與匯出入按鈕 */
.section-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 10px;}
.section-title { margin: 0; color: #0ea5e9; font-size: 1.3rem; font-weight: bold;}
.help-text { color: #64748b; margin-bottom: 20px; font-size: 0.95rem; line-height: 1.5;}

.io-actions { display: flex; gap: 10px; }
.io-btn { padding: 8px 15px; border-radius: 6px; font-weight: bold; font-size: 0.95rem; cursor: pointer; border: none; transition: 0.2s;}
.export-btn { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc;}
.export-btn:hover { background: #bae6fd; }
.import-btn { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; display: inline-block; }
.import-btn:hover { background: #e2e8f0; }

.loading-state, .empty-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;}

/* 編輯列表區 */
.edit-mode { background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0;}
.edit-row { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
.row-num { font-size: 1.1rem; color: #0ea5e9; width: 30px; font-weight: bold; flex-shrink: 0;}
.edit-input { flex: 1; padding: 12px 15px; font-size: 1.05rem; border-radius: 6px; border: 1px solid #cbd5e1; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);}
.edit-input:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2); }

.del-row-btn { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; white-space: nowrap; transition: 0.2s;}
.del-row-btn:hover { background: #fecaca; }

/* 底部操作按鈕 */
.edit-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 25px; padding-top: 20px; border-top: 1px dashed #cbd5e1;}
.add-btn { background: white; color: #0ea5e9; border: 2px dashed #0ea5e9; padding: 12px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1.05rem; transition: 0.2s;}
.add-btn:hover { background: #f0f9ff; }

.right-actions { display: flex; gap: 10px; }
.clear-btn { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1.05rem; transition: 0.2s;}
.clear-btn:hover { background: #e2e8f0; }

.save-btn { background: #0ea5e9; color: white; border: none; padding: 12px 30px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1.1rem; transition: 0.2s;}
.save-btn:hover:not(:disabled) { background: #0284c7; }
.save-btn:disabled { background: #7dd3fc; cursor: not-allowed; }

/* =======================================
   💡 手機端 RWD 排版 
   ======================================= */
@media (max-width: 768px) {
  .admin-panel { padding: 15px; }
  .section-header { flex-direction: column; align-items: flex-start; }
  .io-actions { width: 100%; display: flex; gap: 10px; }
  .io-btn { flex: 1; text-align: center; padding: 10px; }
  
  .query-header { flex-direction: column; align-items: stretch; gap: 10px; }
  .date-picker { width: 100%; box-sizing: border-box; }
  
  .edit-mode { padding: 15px; }
  .edit-row { flex-wrap: wrap; gap: 8px; margin-bottom: 20px; background: white; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;}
  .edit-input { min-width: 0; width: calc(100% - 40px); margin-bottom: 5px;}
  .del-row-btn { width: 100%; padding: 12px;}
  
  .edit-actions { flex-direction: column; gap: 15px; align-items: stretch;}
  .add-btn { width: 100%; }
  .right-actions { display: flex; flex-direction: column; gap: 10px; width: 100%; }
  .clear-btn, .save-btn { width: 100%; text-align: center; }
}
</style>
