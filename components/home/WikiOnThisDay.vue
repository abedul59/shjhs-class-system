<template>
  <div class="wiki-otd-card">
    <div class="card-header">
      <h3>🏛️ 維基百科歷史上的今天</h3>
    </div>
    
    <div class="card-content" v-if="isLoading">
      <div class="loading-state">
        <span class="spinner">⏳</span> 正在翻閱歷史檔案...
      </div>
    </div>
    
    <div class="card-content" v-else-if="!hasData">
      <div class="empty-state">❌ 無法取得歷史資料，請稍後再試。</div>
    </div>
    
    <!-- 💡 將抓取並淨化後的 HTML 直接渲染於此 -->
    <div class="card-content otd-content" v-else v-html="otdHtml"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const hasData = ref(false)
const otdHtml = ref('')

const fetchWikiOtd = async () => {
  try {
    // 呼叫中文維基百科首頁 API
    const res = await fetch(`https://zh.wikipedia.org/w/api.php?action=parse&format=json&origin=*&page=Wikipedia:首页&prop=text`)
    if (!res.ok) throw new Error('Wiki API 請求失敗')
    
    const data = await res.json()
    if (!data.parse || !data.parse.text) throw new Error('無法取得首頁 HTML')

    // 建立虛擬 DOM
    const tmp = document.createElement('div')
    tmp.innerHTML = data.parse.text['*']

    // 💡 根據您的截圖，精準定位「歷史上的今天」內部區塊
    const otdBlock = tmp.querySelector('#column-otd')
    if (!otdBlock) throw new Error('找不到歷史上的今天區塊')

    // 1. 處理所有超連結 (轉為絕對路徑，開新分頁，並套用美觀的藍色)
    otdBlock.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href')
      if (href && href.startsWith('/wiki/')) {
        a.setAttribute('href', `https://zh.wikipedia.org${href}`)
        a.setAttribute('target', '_blank')
        a.style.color = '#2563eb'
        a.style.textDecoration = 'none'
        
        // 如果是年份 (長度通常很短，或者是 dt 裡面的 a)，加粗顯示
        if (a.closest('dt')) {
          a.style.fontWeight = 'bold'
        }
      }
    })

    // 2. 處理圖片 (補全 https:，確保破圖率降到最低)
    otdBlock.querySelectorAll('img').forEach(img => {
      let src = img.getAttribute('src') || ''
      if (src.startsWith('//')) img.setAttribute('src', 'https:' + src)
      
      let srcset = img.getAttribute('srcset') || ''
      if (srcset) img.setAttribute('srcset', srcset.replace(/\/\//g, 'https://'))
    })

    otdHtml.value = otdBlock.innerHTML
    hasData.value = true

  } catch (err) {
    console.error('取得維基百科歷史上的今天發生錯誤:', err)
    hasData.value = false
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchWikiOtd()
})
</script>

<style scoped>
.wiki-otd-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  margin-top: 20px;
  transition: 0.3s;
}
.wiki-otd-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-color: #cbd5e1;
}

.card-header h3 {
  margin: 0 0 15px 0;
  color: #1e293b;
  font-size: 1.25rem;
  border-bottom: 2px dashed #e2e8f0;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* =======================================================
   💡 針對維基百科原生 DOM 的專屬排版 CSS (:deep)
   ======================================================= */
.otd-content {
  font-size: 0.95rem;
  color: #334155;
  text-align: justify;
}

/* 日期標題 (第一行段落) */
.otd-content :deep(p:first-child) {
  font-size: 1.1rem;
  font-weight: bold;
  color: #0f766e; /* 典雅的深青色 */
  margin-bottom: 15px;
  background: #f0fdf4;
  padding: 10px 15px;
  border-left: 4px solid #10b981;
  border-radius: 4px;
}

/* 右側浮動圖片 */
.otd-content :deep(figure),
.otd-content :deep(.thumb) {
  float: right;
  margin: 0 0 15px 15px;
  max-width: 140px; /* 限制寬度，避免手機版跑版 */
}
.otd-content :deep(figure img),
.otd-content :deep(.thumb img) {
  width: 100%;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

/* 歷史事件列表的排版 (利用左浮動製作左右對齊效果) */
.otd-content :deep(dl) {
  margin: 0;
  padding: 0;
}
.otd-content :deep(dl)::after {
  content: "";
  display: table;
  clear: both;
}

/* 年份 (左側) */
.otd-content :deep(dt) {
  float: left;
  clear: left;
  width: 55px; /* 年份保留的寬度 */
  font-weight: bold;
  color: #2563eb;
  padding-top: 2px;
}

/* 事件內容 (右側) */
.otd-content :deep(dd) {
  margin-left: 60px; /* 避開年份的寬度 */
  margin-bottom: 15px;
  line-height: 1.7;
}

/* 滑鼠滑過超連結的特效 */
.otd-content :deep(a:hover) {
  text-decoration: underline !important;
  color: #1d4ed8 !important;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 30px;
  color: #64748b;
  background: #f8fafc;
  border-radius: 6px;
  font-style: italic;
}

.spinner {
  display: inline-block;
  animation: spin 2s linear infinite;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

/* 手機版適應 */
@media (max-width: 768px) {
  .otd-content :deep(dt) {
    float: none;
    display: block;
    width: auto;
    margin-bottom: 5px;
  }
  .otd-content :deep(dd) {
    margin-left: 0;
    margin-bottom: 20px;
    border-bottom: 1px dashed #e2e8f0;
    padding-bottom: 10px;
  }
}
</style>
