<template>
  <div class="admin-panel">
    <div class="table-header">
      <h3>📖 好文分享管理中心</h3>
      <button v-if="!isEditing" @click="createNew" class="save-btn add-btn">
        ➕ 新增一篇好文
      </button>
      <button v-else @click="isEditing = false" class="cancel-btn">
        ◀ 返回列表
      </button>
    </div>

    <p class="help-text" v-if="!isEditing">
      在這裡您可以暫存多篇優質文章，並勾選「顯示於首頁」來決定當下要給家長看哪一篇。<br>
      💡 此版塊僅會對「褐色名單外的訪客（家長）」顯示。
    </p>

    <!-- 列表模式 -->
    <div v-if="!isEditing" class="article-list">
      <div v-if="articles.length === 0" class="empty-state">
        目前沒有任何文章，點擊右上角新增一篇吧！
      </div>
      
      <div v-for="article in articles" :key="article.id" class="article-card" :class="{ 'is-active': article.is_published }">
        <div class="card-left">
          <label class="radio-label" title="設定為首頁顯示">
            <input type="radio" name="active_article" :checked="article.is_published" @change="setPublished(article.id)" class="large-radio" />
            <span class="status-text">{{ article.is_published ? '🌟 首頁顯示中' : '未顯示' }}</span>
          </label>
          <div class="article-info">
            <h4 class="article-title">{{ article.title }}</h4>
            <span class="article-date">更新於：{{ new Date(article.updated_at).toLocaleString('zh-TW', { hour12: false }) }}</span>
          </div>
        </div>
        <div class="card-right">
          <button @click="editArticle(article)" class="action-btn edit-btn">✏️ 編輯</button>
          <button @click="deleteArticle(article.id)" class="action-btn del-btn">🗑️ 刪除</button>
        </div>
      </div>
    </div>

    <!-- 編輯模式 -->
    <div v-else class="editor-section">
      <div class="input-group">
        <label>文章標題：</label>
        <input type="text" v-model="currentArticle.title" placeholder="請輸入文章標題..." class="edit-input title-input" />
      </div>
      
      <div class="input-group">
        <label>文章內容：(請直接從網頁複製文字或圖片，並在此處貼上)</label>
        <!-- 💡 支援直接貼上圖文的富文本編輯區 -->
        <div 
          ref="editorRef" 
          class="rich-text-editor" 
          contenteditable="true" 
          placeholder="在此貼上文章內容..."
        ></div>
      </div>

      <div class="editor-actions">
        <button @click="saveArticle" class="save-btn" :disabled="isSaving">
          {{ isSaving ? '儲存中...' : '💾 儲存文章' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
const supabase = useSupabaseClient()

const articles = ref([])
const isEditing = ref(false)
const isSaving = ref(false)
const editorRef = ref(null)

const currentArticle = ref({ id: '', title: '', content: '', is_published: false })

const fetchArticles = async () => {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'good_articles_data').maybeSingle()
  if (data && data.setting_value) {
    articles.value = data.setting_value
  }
}

onMounted(() => fetchArticles())

const saveToDb = async () => {
  isSaving.value = true
  const { error } = await supabase.from('system_settings').upsert({ setting_key: 'good_articles_data', setting_value: articles.value }, { onConflict: 'setting_key' })
  if (error) alert('❌ 儲存失敗')
  isSaving.value = false
}

const createNew = () => {
  currentArticle.value = { id: 'art_' + Date.now(), title: '', content: '', is_published: false }
  isEditing.value = true
  nextTick(() => { if (editorRef.value) editorRef.value.innerHTML = '' })
}

const editArticle = (article) => {
  currentArticle.value = { ...article }
  isEditing.value = true
  nextTick(() => { if (editorRef.value) editorRef.value.innerHTML = article.content })
}

const saveArticle = async () => {
  if (!currentArticle.value.title.trim()) return alert('請填寫標題！')
  
  // 從可編輯的 div 抓取 HTML 內容
  currentArticle.value.content = editorRef.value.innerHTML
  currentArticle.value.updated_at = new Date().toISOString()

  const existingIdx = articles.value.findIndex(a => a.id === currentArticle.value.id)
  if (existingIdx >= 0) {
    articles.value[existingIdx] = currentArticle.value
  } else {
    articles.value.unshift(currentArticle.value)
  }
  
  await saveToDb()
  alert('✅ 文章儲存成功！')
  isEditing.value = false
}

const deleteArticle = async (id) => {
  if (!confirm('確定要刪除這篇文章嗎？')) return
  articles.value = articles.value.filter(a => a.id !== id)
  await saveToDb()
}

const setPublished = async (id) => {
  articles.value.forEach(a => {
    a.is_published = (a.id === id)
  })
  await saveToDb()
}
</script>

<style scoped>
.admin-panel { background: white; border-radius: 8px; padding: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;}
.table-header h3 { margin: 0; color: #1e293b; font-size: 1.4rem; }
.help-text { font-size: 0.95rem; color: #64748b; margin-bottom: 20px; line-height: 1.5; }

.save-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s;}
.save-btn:hover:not(:disabled) { background: #059669; }
.add-btn { background: #3b82f6; }
.add-btn:hover { background: #2563eb; }
.cancel-btn { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.cancel-btn:hover { background: #e2e8f0; }

.empty-state { text-align: center; padding: 40px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; color: #94a3b8; font-size: 1.1rem; }

.article-list { display: flex; flex-direction: column; gap: 15px; }
.article-card { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px 20px; border-radius: 8px; transition: 0.2s; flex-wrap: wrap; gap: 15px;}
.article-card:hover { border-color: #94a3b8; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.article-card.is-active { border-color: #f59e0b; background: #fffbeb; box-shadow: 0 0 0 1px #f59e0b; }

.card-left { display: flex; align-items: center; gap: 15px; }
.radio-label { display: flex; flex-direction: column; align-items: center; cursor: pointer; gap: 5px; width: 90px;}
.large-radio { transform: scale(1.5); cursor: pointer; accent-color: #f59e0b;}
.status-text { font-size: 0.8rem; font-weight: bold; color: #94a3b8; }
.is-active .status-text { color: #d97706; }

.article-info { display: flex; flex-direction: column; gap: 5px; }
.article-title { margin: 0; color: #1e293b; font-size: 1.2rem; }
.article-date { font-size: 0.85rem; color: #64748b; }

.card-right { display: flex; gap: 10px; }
.action-btn { background: white; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.95rem; }
.edit-btn:hover { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
.del-btn:hover { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }

/* 編輯區樣式 */
.editor-section { display: flex; flex-direction: column; gap: 20px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-weight: bold; color: #475569; }
.edit-input { padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.1rem; }
.edit-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }

/* 富文本編輯區 */
.rich-text-editor {
  min-height: 400px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 15px;
  font-size: 1.05rem;
  line-height: 1.6;
  overflow-y: auto;
  max-height: 800px;
}
.rich-text-editor:empty:before { content: attr(placeholder); color: #94a3b8; pointer-events: none; display: block; }
.rich-text-editor:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
/* 確保貼上的圖片在編輯器內不會破版 */
.rich-text-editor :deep(img) { max-width: 100%; height: auto; border-radius: 8px; }

.editor-actions { display: flex; justify-content: flex-end; margin-top: 10px; }

@media (max-width: 768px) {
  .article-card { flex-direction: column; align-items: stretch; }
  .card-left { flex-direction: row; align-items: flex-start;}
  .card-right { display: flex; width: 100%; }
  .action-btn { flex: 1; padding: 10px; }
}
</style>
