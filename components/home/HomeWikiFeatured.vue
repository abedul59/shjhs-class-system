<template>
  <div class="wiki-featured-card">
    <div class="card-header">
      <div class="wiki-icon">W</div>
      <h3>維基百科 典範條目</h3>
    </div>
    
    <div class="card-content" v-if="isLoading">
      <div class="loading-state">
        <span class="spinner">⏳</span> 正在取得精選知識...
      </div>
    </div>
    
    <div class="card-content" v-else-if="!hasData">
      <div class="empty-state">❌ 無法取得資料，請稍後再試。</div>
    </div>
    
    <div class="card-content" v-else>
      <a :href="articleData.link" target="_blank" title="點擊閱讀維基百科完整條目" class="article-link">
        
        <!-- 💡 如果有官方配圖就顯示 -->
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
    // 取得日期的維基專屬格式 (例如: 2026年9月12日)
    const getPageName = (date) => {
      const yyyy = date.getFullYear()
      const m = date.getMonth() + 1
      const dd = date.getDate()
      return `Wikipedia:典范条目/${yyyy}年${m}月${dd}日`
    }
    
    let pageName = getPageName(new Date())
    let url = `https://zh.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageName)}&format=json&origin=*`
    
    let res = await fetch(url)
    let data = await res.json()
    
    // 如果今天維基百科還沒更新條目，自動退回去抓「昨天」的
    if (data.error) {
      const yesterday = new Date(Date.now() - 86400000)
      pageName = getPageName(yesterday)
      url = `https://zh.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageName)}&format=json&origin=*`
      res = await fetch(url)
      data = await res.json()
    }

    if (data.parse && data.parse.text) {
      const html = data.parse.text['*']
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      
      // 💡 步驟 1：從模板中找出主角條目的名稱 (粗體的超連結)
      const titleLink = doc.querySelector('b a') || doc.querySelector('strong a')
      let targetTitle = titleLink ? (titleLink.getAttribute('title') || titleLink.textContent) : ''
      
      if (targetTitle) {
        // 💡 步驟 2：拿著標題去 Query API 請求「頁面圖片 (pageimages)」與「純文字摘要 (extracts)」
        const queryUrl = `https://zh.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&titles=${encodeURIComponent(targetTitle)}&exintro=1&explaintext=1&pithumbsize=640&format=json&origin=*`
        const queryRes = await fetch(queryUrl)
        const queryData = await queryRes.json()
        const pages = queryData.query.pages
        const pageId = Object.keys(pages)[0]
        const pageInfo = pages[pageId]
        
        if (pageInfo) {
          let summaryText = pageInfo.extract || ''
          // 擷取前 120 字作為簡介
          if (summaryText.length > 120) summaryText = summaryText.substring(0, 120) + '...'
          
          articleData.value = {
            title: pageInfo.title,
            // 透過 pageimages 取得官方指定的縮圖，如果沒有圖則維持空字串 (會自動隱藏圖片區塊)
            image: pageInfo.thumbnail ? pageInfo.thumbnail.source : '',
            link: `https://zh.wikipedia.org/wiki/${encodeURIComponent(pageInfo.title)}`,
            summary: summaryText || '點擊閱讀完整維基百科精選條目。'
          }
          hasData.value = true
          return // 成功取得並結束程式
        }
      }
    }
    
    throw new Error('當日典範條目解析失敗')
    
  } catch (err) {
    console.warn('典範條目抓取失敗，啟動保底的科普精選備用方案...', err)
    
    // 💡 100% 絕對不會失敗的備用方案：隨機抓取我們定義好的精選條目
    try {
      const fallbackArticles = ['相對論', '量子力學', '黑洞', '人工智慧', '列奥纳多·达·芬奇', '阿波罗11号', '瑪麗·居禮', '艾薩克·牛頓', '查尔斯·达尔文', '地球', '太陽系', '工業革命']
      const randomTitle = fallbackArticles[Math.floor(Math.random() * fallbackArticles.length)]
      const fallbackUrl = `https://zh.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&titles=${encodeURIComponent(randomTitle)}&exintro=1&explaintext=1&pithumbsize=640&format=json&origin=*`
      
      const fbRes = await fetch(fallbackUrl)
      const fbData = await fbRes.json()
      const pages = fbData.query.pages
      const pageId = Object.keys(pages)[0]
      const page = pages[pageId]
      
      if (page && page.title) {
        articleData.value = {
          title: page.title,
          image: page.thumbnail ? page.thumbnail.source : '',
          link: `https://zh.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
          summary: page.extract ? page.extract.substring(0, 120) + '...' : '維基百科精選條目。'
        }
        hasData.value = true
      } else {
        hasData.value = false
      }
    } catch (fbErr) {
      hasData.value = false
    }
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
  height: 180px; /* 控制高度讓圖片不會佔用太多空間 */
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
  transition: color 0.2s;
}
.article-link:hover .article-title {
  color: #0284c7;
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
