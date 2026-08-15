<template>
  <div class="admin-announcements">
    <div class="table-header">
      <h3>📌 班級公佈欄管理</h3>
      <div class="export-btn-group">
        <button @click="addAnnouncement" class="btn-add">➕ 新增公告</button>
        <button @click="saveAnnouncements" class="btn-save" :disabled="isSaving">
          {{ isSaving ? '⏳ 儲存中...' : '💾 儲存並發布至首頁' }}
        </button>
      </div>
    </div>

    <div class="announcements-container">
      <div v-if="announcements.length === 0" class="empty-state">
        目前尚無公告，請點擊上方按鈕新增。
      </div>

      <div v-for="(ann, index) in announcements" :key="ann.id" class="ann-card">
        <div class="ann-header-bar">
          <span class="ann-index">📌 公告 #{{ index + 1 }}</span>
          <button @click="removeAnnouncement(index)" class="btn-delete">🗑️ 刪除此公告</button>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-2">
            <label>公告標題：</label>
            <input v-model="ann.title" type="text" class="form-control" placeholder="例：段考時程表公布" />
          </div>
          <div class="form-group flex-1">
            <label>發布日期與時間：</label>
            <input v-model="ann.date" type="datetime-local" class="form-control" />
          </div>
        </div>

        <div class="form-group">
          <label>公告內容：</label>
          <textarea v-model="ann.content" rows="4" class="form-control" placeholder="請輸入詳細公告內容..."></textarea>
        </div>

        <div class="links-section">
          <div class="links-header">
            <label>🔗 附加網址：</label>
            <button @click="addLink(ann)" class="btn-add-link">➕ 新增網址</button>
          </div>
          <div v-if="ann.links.length === 0" class="empty-link-msg">無附加網址</div>
          <div v-for="(link, lIndex) in ann.links" :key="lIndex" class="link-row">
            <input v-model="link.name" type="text" placeholder="顯示名稱 (例：查看課表)" class="form-control" />
            <input v-model="link.url" type="text" placeholder="網址 (例：https://...)" class="form-control" />
            <button @click="removeLink(ann, lIndex)" class="btn-del-link">❌</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const announcements = ref([])
const isSaving = ref(false)

onMounted(async () => {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'announcements_data').maybeSingle()
  if (data?.setting_value) {
    announcements.value = data.setting_value
  }
})

const addAnnouncement = () => {
  const now = new Date()
  // 處理台灣時區格式放入 datetime-local
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  announcements.value.unshift({
    id: Date.now(),
    title: '',
    content: '',
    date: now.toISOString().slice(0,16),
    links: []
  })
}

const removeAnnouncement = (index) => {
  if (confirm('確定要刪除這則公告嗎？')) {
    announcements.value.splice(index, 1)
  }
}

const addLink = (ann) => {
  if (!ann.links) ann.links = []
  ann.links.push({ name: '', url: '' })
}

const removeLink = (ann, lIndex) => {
  ann.links.splice(lIndex, 1)
}

const saveAnnouncements = async () => {
  isSaving.value = true
  try {
    const { error } = await supabase.from('system_settings').upsert({
      setting_key: 'announcements_data',
      setting_value: announcements.value
    }, { onConflict: 'setting_key' })
    if (error) throw error
    alert('✅ 公告已成功儲存並發布至首頁！')
  } catch (err) {
    alert('❌ 儲存失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;}
.table-header h3 { margin: 0; color: #334155; }
.export-btn-group { display: flex; gap: 10px; }
.btn-add { background: #3b82f6; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-save { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }

.empty-state { text-align: center; padding: 40px; background: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1; color: #64748b; font-weight: bold; }

.announcements-container { display: flex; flex-direction: column; gap: 20px; }
.ann-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
.ann-header-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px; }
.ann-index { font-weight: bold; color: #0891b2; font-size: 1.1rem; }
.btn-delete { background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }

.form-row { display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap; }
.flex-2 { flex: 2; min-width: 250px; }
.flex-1 { flex: 1; min-width: 150px; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #475569; }
.form-control { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-family: inherit; }
textarea.form-control { resize: vertical; }

.links-section { background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px dashed #cbd5e1; }
.links-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.links-header label { font-weight: bold; color: #475569; margin: 0; }
.btn-add-link { background: #f59e0b; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: bold;}
.empty-link-msg { color: #94a3b8; font-size: 0.9rem; font-style: italic; }

.link-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; }
.btn-del-link { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
</style>
