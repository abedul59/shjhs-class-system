<template>
  <div class="fox-news-card">
    <div class="card-header">
      <h3>🦊 Fox News 焦點頭條</h3>
    </div>
    
    <div class="card-content" v-if="isLoading">
      <div class="loading-state">
        <span class="spinner">⏳</span> 正在連線取得最新國際新聞...
      </div>
    </div>
    
    <div class="card-content" v-else-if="!hasData">
      <div class="empty-state">❌ 無法取得新聞資料，請稍後再試。</div>
    </div>
    
    <div class="card-content" v-else>
      <a :href="newsData.link" target="_blank" title="點擊前往 Fox News 閱讀完整新聞" class="news-link">
        <div class="news-image-wrapper">
          <img :src="newsData.image" :alt="newsData.title" class="news-image" loading="lazy" />
        </div>
        <div class="news-title-box">
          <p class="news-title">{{ newsData.title }}</p>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const hasData = ref(false)
const newsData = ref({ title: '', image: '', link: '' })

const fetchNews = async () => {
  try {
    // 💡 使用 allorigins 代理伺服器繞過 CORS 限制取得 Fox News 網頁原始碼
    const targetUrl = 'https://www.foxnews.com/'
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`)
    if (!res.ok) throw new Error('API 請求失敗')
    
    const html = await res.text()
    
    // 建立虛擬 DOM 來解析 HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    // 💡 根據您的截圖結構，尋找第一個包含圖片的 article 區塊
    const firstArticle = doc.querySelector('article')
    
    if (firstArticle) {
      // 1. 取得圖片
      const imgEl = firstArticle.querySelector('img')
      // 2. 取得標題與連結
      const aEl = firstArticle.querySelector('.info-header .title a') || firstArticle.querySelector('a')
      
      if (imgEl && aEl) {
        let imgUrl = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || ''
        if (imgUrl && imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
        
        let linkUrl = aEl.getAttribute('href') || ''
        if (linkUrl && linkUrl.startsWith('/')) linkUrl = 'https://www.foxnews.com' + linkUrl
        
        newsData.value = {
          title: aEl.textContent.trim() || imgEl.getAttribute('alt') || '最新焦點新聞',
          image: imgUrl,
          link: linkUrl
        }
        hasData.value = true
      } else {
        throw new Error('找不到指定的 DOM 結構')
      }
    } else {
      throw new Error('找不到新聞文章區塊')
    }
  } catch (err) {
    console.error('取得 Fox News 發生錯誤:', err)
    hasData.value = false
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchNews()
})
</script>

<style scoped>
.fox-news-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  margin-top: 20px;
  transition: 0.3s;
}
.fox-news-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-color: #cbd5e1;
}

.card-header h3 {
  margin: 0 0 15px 0;
  color: #003366; /* Fox News 經典深藍 */
  font-size: 1.25rem;
  border-bottom: 2px dashed #e2e8f0;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.news-link {
  display: block;
  text-decoration: none;
  overflow: hidden;
  border-radius: 6px;
  background-color: #f8fafc;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.news-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}

.news-image-wrapper {
  width: 100%;
  aspect-ratio: 16 / 9; /* 保持新聞圖片比例 */
  overflow: hidden;
  background-color: #e2e8f0;
}

.news-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}
.news-link:hover .news-image {
  transform: scale(1.05);
}

.news-title-box {
  padding: 15px 20px;
  background: white;
  border-top: 4px solid #cc0000; /* Fox News 經典紅 */
}

.news-title {
  color: #1e293b;
  font-size: 1.15rem;
  font-weight: bold;
  line-height: 1.5;
  margin: 0;
  text-align: justify;
}
.news-link:hover .news-title {
  color: #003366;
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
