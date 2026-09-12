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
    let targetTitle = ''
    
    // 取得今天、昨天或前天的典範條目名稱
    const getPageName = (date) => `Wikipedia:典范条目/${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    
    for (let i = 0; i < 3; i++) {
      const d = new Date(Date.now() - i * 86400000)
      const url = `https://zh.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(getPageName(d))}&format=json&origin=*`
      
      try {
        const res = await fetch(url)
        const data = await res.json()
        if (data.parse && data.parse.text) {
          const doc = new DOMParser().parseFromString(data.parse.text['*'], 'text/html')
          const titleLink = doc.querySelector('b a') || doc.querySelector('strong a')
          if (titleLink) {
            targetTitle = titleLink.getAttribute('title') || titleLink.textContent
            break 
          }
        }
      } catch (e) {}
    }

    if (!targetTitle) {
      const fallbacks = ['地球', '太陽系', '銀河系', '詹姆斯·韦伯空间望远镜', '阿波罗11号', '列奥纳多·达·芬奇', '文藝復興']
      targetTitle = fallbacks[Math.floor(Math.random() * fallbacks.length)]
    }

    // 使用 REST API 取得精準摘要與圖檔
    const summaryUrl = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(targetTitle)}`
    const summaryRes = await fetch(summaryUrl)
    const summaryData = await summaryRes.json()
    
    if (summaryData && summaryData.title) {
      let imgUrl = summaryData.thumbnail?.source || summaryData.originalimage?.source || ''
      
      if (!imgUrl) {
        imgUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/640px-Wikipedia-logo-v2.svg.png'
      }

      let summaryText = summaryData.extract || '點擊閱讀完整維基百科精選條目。'
      if (summaryText.length > 110) summaryText = summaryText.substring(0, 110) + '...'

      articleData.value = {
        title: summaryData.title,
        image: imgUrl,
        link: summaryData.content_urls?.desktop?.page || `https://zh.wikipedia.org/wiki/${encodeURIComponent(targetTitle)}`,
        summary: summaryText
      }
      hasData.value = true
    } else {
      throw new Error('無法從 REST API 取得文章摘要')
    }
    
  } catch (err) {
    console.error('維基百科抓取徹底失敗:', err)
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

/* 💡 圖片外層框：加入淡灰色背景，當作相框 */
.article-image-wrapper {
  width: 100%;
  height: 220px; /* 稍微加高一點，讓完整圖片有呼吸空間 */
  overflow: hidden;
  background-color: #f1f5f9; /* 💡 淡灰色畫框底色 */
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px; /* 留白 */
  box-sizing: border-box;
}

/* 💡 圖片本體：改為 contain 完整顯示 */
.article-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* 💡 關鍵修改：不裁切，保留完整圖片 */
  display: block;
  transition: transform 0.4s ease;
}
.article-link:hover .article-image {
  transform: scale(1.03); /* 放大特效稍微收斂一點，確保不跑版 */
}

.article-info {
  padding: 15px 20px;
}

.article-title {
  color: #0369a1; 
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
