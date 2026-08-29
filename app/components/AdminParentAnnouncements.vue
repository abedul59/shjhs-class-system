<template>
  <div class="admin-panel">
    <div class="table-header">
      <h3>📌 家長公佈欄管理</h3>
    </div>

    <!-- 💡 首頁顯示開關 -->
    <div class="visibility-control-card">
      <div class="control-info">
        <h4>首頁顯示狀態</h4>
        <p>控制是否要在前台首頁顯示「家長公佈欄」區塊 (僅限褐名單外可見)。</p>
      </div>
      <div class="toggle-wrapper">
        <label class="switch">
          <input type="checkbox" v-model="isVisibleOnIndex" @change="toggleVisibility">
          <span class="slider round"></span>
        </label>
        <span class="status-text" :class="{ 'is-active': isVisibleOnIndex }">
          {{ isVisibleOnIndex ? '👀 顯示中' : '🙈 已隱藏' }}
        </span>
        <span v-if="isSavingVis" class="saving-text">儲存中...</span>
      </div>
    </div>

    <div class="editor-section">
      <div class="section-header">
        <h4 class="section-title">
          {{ editingAnnId ? '✏️ 編輯家長公告' : '📝 新增家長公告' }}
        </h4>
        <div class="io-actions">
          <button @click="exportJSON" class="io-btn export-btn">📤 匯出備份</button>
          <label class="io-btn import-btn">
            📥 匯入備份
            <input type="file" accept=".json" style="display:none" @change="importJSON" />
          </label>
        </div>
      </div>

      <div class="add-box">
        <input v-model="newAnn.title" placeholder="公告標題 (必填)" class="form-input" />
        <textarea v-model="newAnn.content" rows="4" placeholder="公告內容 (支援換行顯示)" class="form-input"></textarea>
        
        <div class="links-section">
          <h5>🔗 附加連結 (選填)</h5>
          <div v-for="(link, idx) in newAnn.links" :key="'nl-'+idx" class="link-row">
            <input v-model="link.name" placeholder="連結名稱 (例：校務系統)" class="form-input link-input" />
            <input v-model="link.url" placeholder="網址 (https://...)" class="form-input link-input" />
            <button @click="removeNewLink(idx)" class="del-btn small-btn">✖</button>
          </div>
          <button @click="addNewLink" class="add-link-btn">➕ 增加連結</button>
        </div>

        <div class="form-actions">
          <button v-if="editingAnnId" @click="cancelEdit" class="cancel-edit-btn">取消編輯</button>
          <button @click="saveAnnouncement" class="save-btn add-main-btn" :disabled="!newAnn.title || isSaving">
            {{ isSaving ? '處理中...' : (editingAnnId ? '💾 儲存修改' : '➕ 發布新公告') }}
          </button>
        </div>
      </div>

      <div class="list-header-row">
        <h4 class="section-title" style="margin: 0; border: none;">📋 現有家長公告清單</h4>
        
        <!-- 💡 批次操作區塊 -->
        <div class="batch-actions" v-if="announcements.length > 0">
          <label class="select-all-label">
            <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="large-checkbox"> 
            {{ isAllSelected ? '取消全選' : '全選' }}
          </label>
          <button v-if="selectedAnns.length > 0" @click="batchDelete" class="del-btn batch-del-btn">
            🗑️ 刪除選取的 {{ selectedAnns.length }} 則
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">⏳ 載入中...</div>
      <div v-else-if="announcements.length === 0" class="empty-state">目前尚無任何家長公告。</div>
      
      <div class="announcement-list" v-else>
        <div v-for="ann in announcements" :key="ann.id" class="ann-card" :class="{ 'is-editing': editingAnnId === ann.id }">
          <div class="ann-header">
            <div class="ann-header-left">
              <!-- 💡 個別選取 Checkbox -->
              <input type="checkbox" :value="ann.id" v-model="selectedAnns" class="large-checkbox item-checkbox">
              <h3 class="ann-title">{{ ann.title }}</h3>
            </div>
            <span class="ann-date">{{ formatDateTime(ann.date) }}</span>
          </div>
          <div class="ann-content" v-html="formatNL(ann.content)"></div>
          <div class="ann-links" v-if="ann.links && ann.links.length > 0">
            <a v-for="(link, i) in ann.links" :key="'l-'+i" :href="link.url" target="_blank" class="ann-link-item">🔗 {{ link.name }}</a>
          </div>
          <div class="ann-actions">
            <button @click="editAnnouncement(ann)" class="edit-btn">✏️ 編輯</button>
            <button @click="deleteAnnouncement(ann.id)" class="del-btn">🗑️ 刪除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()

const announcements = ref([])
const isVisibleOnIndex = ref(true)
const isLoading = ref(true)
const isSaving = ref(false)
const isSavingVis = ref(false)

const newAnn = ref({ title: '', content: '', links: [] })
const editingAnnId = ref(null)
const selectedAnns = ref([])

const formatNL = (txt) => String(txt || '').replace(/\n/g, '<br>')
const formatDateTime = (dtStr) => {
  if (!dtStr) return ''
  return new Date(dtStr).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

const fetchData = async () => {
  isLoading.value = true
  const { data: sysData } = await supabase.from('system_settings').select('*').in('setting_key', ['parent_announcements_data', 'parent_announcement_board_visible'])
  
  if (sysData) {
    const annData = sysData.find(s => s.setting_key === 'parent_announcements_data')
    if (annData && annData.setting_value) {
      announcements.value = (annData.setting_value || []).sort((a, b) => new Date(b.date) - new Date(a.date))
    }
    
    const visData = sysData.find(s => s.setting_key === 'parent_announcement_board_visible')
    if (visData !== undefined && visData.setting_value !== null) {
      isVisibleOnIndex.value = visData.setting_value
    }
  }
  isLoading.value = false
}

onMounted(() => fetchData())

// 切換顯示開關
const toggleVisibility = async () => {
  isSavingVis.value = true
  await supabase.from('system_settings').upsert({
    setting_key: 'parent_announcement_board_visible',
    setting_value: isVisibleOnIndex.value
  }, { onConflict: 'setting_key' })
  isSavingVis.value = false
}

const addNewLink = () => newAnn.value.links.push({ name: '', url: '' })
const removeNewLink = (idx) => newAnn.value.links.splice(idx, 1)

// 💡 編輯相關邏輯
const editAnnouncement = (ann) => {
  editingAnnId.value = ann.id
  newAnn.value = {
    title: ann.title,
    content: ann.content,
    links: ann.links ? JSON.parse(JSON.stringify(ann.links)) : []
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const cancelEdit = () => {
  editingAnnId.value = null
  newAnn.value = { title: '', content: '', links: [] }
}

const saveAnnouncement = async () => {
  if (!newAnn.value.title) return
  isSaving.value = true
  
  let updatedList = [...announcements.value]
  
  const cleanedLinks = newAnn.value.links.filter(l => l.name && l.url)

  if (editingAnnId.value) {
    // 儲存修改
    const index = updatedList.findIndex(a => a.id === editingAnnId.value)
    if (index !== -1) {
      updatedList[index] = {
        ...updatedList[index],
        title: newAnn.value.title,
        content: newAnn.value.content,
        links: cleanedLinks
      }
    }
  } else {
    // 新增發布
    const newItem = {
      id: Date.now().toString(),
      title: newAnn.value.title,
      content: newAnn.value.content,
      date: new Date().toISOString(),
      links: cleanedLinks
    }
    updatedList = [newItem, ...updatedList]
  }
  
  try {
    await supabase.from('system_settings').upsert({ setting_key: 'parent_announcements_data', setting_value: updatedList }, { onConflict: 'setting_key' })
    announcements.value = updatedList
    cancelEdit() // 清空表單並退出編輯模式
    alert(editingAnnId.value ? '✅ 家長公告修改成功！' : '✅ 家長公告發布成功！')
  } catch (err) { 
    alert('❌ 儲存失敗：' + err.message) 
  } finally { 
    isSaving.value = false 
  }
}

// 💡 單筆與批次刪除邏輯
const deleteAnnouncement = async (id) => {
  if (!confirm('確定要刪除這則家長公告嗎？')) return
  isSaving.value = true
  const updatedList = announcements.value.filter(a => a.id !== id)
  try {
    await supabase.from('system_settings').upsert({ setting_key: 'parent_announcements_data', setting_value: updatedList }, { onConflict: 'setting_key' })
    announcements.value = updatedList
    if (editingAnnId.value === id) cancelEdit()
    // 若被刪除的在已選取名單中，順便移除
    selectedAnns.value = selectedAnns.value.filter(selectedId => selectedId !== id)
  } catch (err) { alert('❌ 刪除失敗：' + err.message) } finally { isSaving.value = false }
}

const batchDelete = async () => {
  if (!confirm(`確定要刪除選取的 ${selectedAnns.value.length} 則家長公告嗎？(刪除後無法復原)`)) return
  isSaving.value = true
  const updatedList = announcements.value.filter(a => !selectedAnns.value.includes(a.id))
  try {
    await supabase.from('system_settings').upsert({ setting_key: 'parent_announcements_data', setting_value: updatedList }, { onConflict: 'setting_key' })
    announcements.value = updatedList
    
    // 如果編輯中的公告被刪了，就取消編輯
    if (selectedAnns.value.includes(editingAnnId.value)) {
      cancelEdit()
    }
    
    selectedAnns.value = [] // 清空選取狀態
    alert('✅ 批次刪除成功！')
  } catch (err) { 
    alert('❌ 刪除失敗：' + err.message) 
  } finally { 
    isSaving.value = false 
  }
}

// 💡 全選 / 取消全選邏輯
const isAllSelected = computed(() => {
  return announcements.value.length > 0 && selectedAnns.value.length === announcements.value.length
})

const toggleSelectAll = (e) => {
  if (e.target.checked) {
    selectedAnns.value = announcements.value.map(a => a.id)
  } else {
    selectedAnns.value = []
  }
}

const exportJSON = () => {
  const dataStr = JSON.stringify(announcements.value, null, 2)
  const blob = new Blob([dataStr], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `parent_announcements_backup.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importJSON = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const imported = JSON.parse(e.target.result)
      if (!Array.isArray(imported)) throw new Error("無效的資料格式")
      if (confirm('是否完全覆蓋現有家長公告清單？')) {
        await supabase.from('system_settings').upsert({ setting_key: 'parent_announcements_data', setting_value: imported }, { onConflict: 'setting_key' })
        announcements.value = imported
        alert('✅ 匯入成功！')
      }
    } catch(err) { alert('❌ 匯入失敗：' + err.message) }
    event.target.value = '' 
  }
  reader.readAsText(file)
}
</script>

<style scoped>
.admin-panel { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; font-family: sans-serif;}
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } 
.table-header h3 { margin: 0; color: #334155; font-size: 1.4rem;}

/* 開關控制卡片 */
.visibility-control-card { display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; padding: 20px 25px; border-radius: 8px; border: 1px dashed #86efac; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;}
.control-info h4 { margin: 0 0 5px 0; color: #166534; font-size: 1.15rem;}
.control-info p { margin: 0; color: #15803d; font-size: 0.95rem;}
.toggle-wrapper { display: flex; align-items: center; gap: 12px; }
.status-text { font-weight: bold; color: #94a3b8; font-size: 1.1rem; }
.status-text.is-active { color: #10b981; }
.saving-text { color: #f59e0b; font-size: 0.9rem; font-weight: bold; animation: pulse 1s infinite;}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

/* 切換開關 CSS */
.switch { position: relative; display: inline-block; width: 50px; height: 28px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px;}
.slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%;}
input:checked + .slider { background-color: #10b981; }
input:checked + .slider:before { transform: translateX(22px); }

.section-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 15px;}
.section-title { margin: 0; color: #1e293b; font-size: 1.25rem; font-weight: bold; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;}
.io-actions { display: flex; gap: 10px; }
.io-btn { padding: 8px 15px; border-radius: 6px; font-weight: bold; font-size: 0.95rem; cursor: pointer; border: none; transition: 0.2s;}
.export-btn { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc;}
.import-btn { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; display: inline-block; }

.add-box { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px;}
.form-input { width: 100%; padding: 12px; font-size: 1rem; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 15px; box-sizing: border-box; font-family: inherit;}
.form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);}
textarea.form-input { resize: vertical; }

.links-section { background: white; padding: 15px; border-radius: 6px; border: 1px dashed #cbd5e1; margin-bottom: 20px;}
.links-section h5 { margin: 0 0 10px 0; color: #475569; font-size: 1rem;}
.link-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: center;}
.link-input { margin-bottom: 0; }
.del-btn { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.del-btn:hover { background: #fecaca; }
.small-btn { padding: 8px 12px; }
.add-link-btn { background: transparent; color: #3b82f6; border: 1px dashed #3b82f6; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold;}

.form-actions { display: flex; gap: 10px; }
.cancel-edit-btn { flex: 1; background: #e2e8f0; color: #475569; border: none; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 1.1rem; cursor: pointer;}
.save-btn { flex: 2; background: #10b981; color: white; border: none; padding: 12px 25px; border-radius: 6px; font-weight: bold; font-size: 1.1rem; cursor: pointer; transition: 0.2s;}
.save-btn:disabled { background: #9ca3af; cursor: not-allowed;}
.add-main-btn { width: 100%; }

.list-header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-top: 30px; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
.batch-actions { display: flex; align-items: center; gap: 15px; }
.select-all-label { display: flex; align-items: center; gap: 5px; font-weight: bold; color: #475569; cursor: pointer;}
.large-checkbox { transform: scale(1.2); cursor: pointer; }
.batch-del-btn { padding: 6px 12px; font-size: 0.9rem;}

.loading-state, .empty-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; background: #f8fafc; border-radius: 8px;}

.announcement-list { display: flex; flex-direction: column; gap: 15px;}
.ann-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: 0.2s border-color;}
.ann-card.is-editing { border: 2px solid #3b82f6; background-color: #f0f9ff; }
.ann-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; flex-wrap: wrap; gap: 10px;}
.ann-header-left { display: flex; align-items: center; gap: 10px;}
.item-checkbox { margin: 0; }
.ann-title { margin: 0; color: #1e293b; font-size: 1.2rem;}
.ann-date { color: #64748b; font-size: 0.9rem;}
.ann-content { color: #334155; line-height: 1.6; margin-bottom: 15px;}
.ann-links { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;}
.ann-link-item { background: #f1f5f9; color: #2563eb; padding: 5px 12px; border-radius: 20px; text-decoration: none; font-size: 0.9rem; font-weight: bold;}
.ann-actions { display: flex; justify-content: flex-end; gap: 10px;}
.edit-btn { background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.edit-btn:hover { background: #bae6fd; }

@media (max-width: 768px) {
  .admin-panel { padding: 15px; }
  .visibility-control-card { flex-direction: column; align-items: flex-start;}
  .link-row { flex-direction: column; align-items: stretch; background: #f8fafc; padding: 10px; border-radius: 6px;}
  .io-actions { width: 100%; display: flex; gap: 10px; }
  .io-btn { flex: 1; text-align: center; padding: 10px; }
  .del-btn, .edit-btn { width: 100%; }
  .ann-actions { flex-direction: column; }
  .form-actions { flex-direction: column; }
}
</style>
