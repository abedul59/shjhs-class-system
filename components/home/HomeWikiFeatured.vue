<template>
  <div class="wiki-featured-card">
    <div class="card-header">
      <div class="wiki-icon">W</div>
      <h3>維基百科 典範條目</h3>
    </div>
    
    <div class="card-content" v-if="isLoading">
      <div class="loading-state">
        <span class="spinner">⏳</span> 正在取得今日典範條目...
      </div>
    </div>
    
    <div class="card-content" v-else-if="!hasData">
      <div class="empty-state">❌ 無法取得資料，請稍後再試。</div>
    </div>
    
    <div class="card-content" v-else>
      <a :href="articleData.link" target="_blank" title="點擊閱讀維基百科完整條目" class="article-link">
        
        <!-- 如果有配圖就顯示 -->
        <div class="article-image-wrapper" v-if="articleData.image">
          <img :src="articleData.image" :alt="articleData.title" class="article-image" loading="lazy" />
        </div>
        
        <div class="article-info">
          <h4 class="article-title">{{ articleData.title }}</h4>
          <p class="article-summary">{{ articleData.summary }}</p>
          <div class="read-more">閱讀全文 ➔</div>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const hasData = ref(false)
const articleData = ref({ title: '', image: '', link: '', summary: '' })

const fetchFeaturedArticle = async () => {
  try {
    // 💡 使用維基百科官方穩定開放 API，抓取首頁的「典範條目」模板內容
    const url = 'https://zh.wikipedia.org/w/api.php?action=parse&page=Template:Feature_article&format=json&origin=*'
    const res = await fetch(url)
    const data = await res.json()
    
    const html = data?.parse?.text?.['*']
    if (!html) throw new Error('無法取得維基百科內容')
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    // 1. 抓取標題與連結 (典範條目通常會把主角用粗體加連結)
    const titleLink = doc.querySelector('b a') || doc.querySelector('strong a') || doc.querySelector('a')
    let titleText = titleLink ? (titleLink.getAttribute('title') || titleLink.textContent) : '今日典範條目'
    let linkUrl = titleLink ? titleLink.getAttribute('href') : ''
    if (linkUrl.startsWith('/')) linkUrl = 'https://zh.wikipedia.org' + linkUrl
    
    // 2. 抓取配圖 (如果有的話)
    let imgUrl = ''
    const imgEl = doc.querySelector('img')
    if (imgEl) {
      imgUrl = imgEl.getAttribute('src') || ''
      if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
      // 維基百科預設給的縮圖太小，我們透過取代 URL 取得更高清的 640px 版本
      imgUrl = imgUrl.replace(/\/\d+px-/, '/640px-')
    }
    
    // 3. 抓取簡介摘要
    // 移除 HTML 裡的 div 容器(通常包裝圖片) 以免抓到雜訊
    const cleanDoc = doc.body.cloneNode(true)
    cleanDoc.querySelectorAll('div, style').forEach(el => el.remove())
    
    let summaryText = cleanDoc.textContent.replace(/\s+/g, ' ').trim()
    // 擷取前 120 個字，讓版面保持精緻
    if (summaryText.length > 120) {
      summaryText = summaryText.substring(0, 120) + '...'
    }
    // 移除可能殘留的 "（了解更多...）" 之類的字眼
    summaryText = summaryText.replace(/（\d+字）$|（\s*）$/, '')
    
    articleData.value = {
      title: titleText,
      image: imgUrl,
      link: linkUrl,
      summary: summaryText
    }
    hasData.value = true
    
  } catch (err) {
    console.error('維基百科典範條目載入失敗:', err)
    hasData.value = false
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchFeaturedArticle())
</script>

<style scoped>
.wiki-featured-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  width: 100%;
  box-sizing: border-box;
  transition: 0.3s;
}
.wiki-featured-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-color: #cbd5e1;
}

.card-header {
  border-bottom: 2px dashed #e2e8f0;
  padding-bottom: 10px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 維基百科經典標誌風格 */
.wiki-icon {
  font-family: 'Times New Roman', Times, serif;
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  background: #f1f5f9;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
}

.card-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
}

.card-content {
  width: 100%;
}

.article-link {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  overflow: hidden;
  border-radius: 8px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.article-link:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.1);
  border-color: #cbd5e1;
}

.article-image-wrapper {
  width: 100%;
  height: 180px;
  overflow: hidden;
  background-color: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}

.article-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}
.article-link:hover .article-image {
  transform: scale(1.05);
}

.article-info {
  padding: 15px 20px;
}

.article-title {
  color: #0369a1; /* 維基連結藍色 */
  font-size: 1.25rem;
  font-weight: bold;
  margin: 0 0 8px 0;
}
.article-link:hover .article-title {
  text-decoration: underline;
}

.article-summary {
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 12px 0;
  text-align: justify;
}

.read-more {
  font-size: 0.9rem;
  font-weight: bold;
  color: #3b82f6;
  text-align: right;
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
</style>
