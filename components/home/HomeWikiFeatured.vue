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
        
        <!-- 💡 圖片區塊 (現在保證 100% 會有圖片可以顯示) -->
        <div class="article-image-wrapper">
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
    
    // 💡 步驟 1：取得今天、昨天或前天的典範條目名稱 (容錯機制，最多往前找 3 天)
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
            break // 成功找到標題就立刻跳出迴圈
          }
        }
      } catch (e) {
        // 忽略單次錯誤，繼續嘗試前一天的
      }
    }

    // 如果還是找不到，啟用保底的「絕對高畫質」科學/人文條目庫
    if (!targetTitle) {
      const fallbacks = ['地球', '太陽系', '銀河系', '詹姆斯·韦伯空间望远镜', '阿波罗11号', '列奥纳多·达·芬奇', '文藝復興']
      targetTitle = fallbacks[Math.floor(Math.random() * fallbacks.length)]
    }

    // 💡 步驟 2：使用維基百科最新的 REST API (專為網頁卡片預覽設計，取圖最精準)
    const summaryUrl = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(targetTitle)}`
    const summaryRes = await fetch(summaryUrl)
    const summaryData = await summaryRes.json()
    
    if (summaryData && summaryData.title) {
      // 優先取得高畫質縮圖，若無則取原始大圖
      let imgUrl = summaryData.thumbnail?.source || summaryData.originalimage?.source || ''
      
      // 💡 終極防破圖機制：如果這篇文章真的完全沒有圖片，我們給他一張高質感的維基地球 Logo
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
  height: 200px; /* 統一高度，確保版面整齊 */
  overflow: hidden;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.article-image {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 讓圖片完美填滿，不會變形 */
  display: block;
  transition: transform 0.4s ease;
}
.article-link:hover .article-image {
  transform: scale(1.05); /* 滑鼠游標移過去的放大特效 */
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
