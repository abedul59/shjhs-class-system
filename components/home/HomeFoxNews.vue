<template>
  <div class="fox-news-card">
    <div class="card-header">
      <h3>🦊 Fox News 焦點頭條</h3>
    </div>
    
    <div class="card-content" v-if="isLoading">
      <div class="loading-state">
        <span class="spinner">⏳</span> 正在連線取得最新國際頭條...
      </div>
    </div>
    
    <div class="card-content" v-else-if="!hasData">
      <div class="empty-state">❌ 無法取得新聞資料，請稍後再試。</div>
    </div>
    
    <div class="card-content" v-else>
      <!-- 💡 維持 2/3 寬度的外層容器 -->
      <div class="news-layout-wrapper">
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const hasData = ref(false)
const newsData = ref({ title: '', image: '', link: '' })

const fetchNews = async () => {
  // 💡 設定 8 秒強制超時控制器，防止無限轉圈圈
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const targetUrl = 'https://www.foxnews.com/'
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, { 
      signal: controller.signal 
    })
    
    clearTimeout(timeoutId) // 成功連線就解除倒數計時
    const data = await res.json()
    
    if (!data.contents) throw new Error('沒有回傳內容')
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(data.contents, 'text/html')
    
    const articles = doc.querySelectorAll('article')
    let found = false
    
    for (let article of articles) {
      // 定位最大頭條的標題與圖片
      const titleLink = article.querySelector('.info-header .title a') || article.querySelector('h2.title a') || article.querySelector('h3.title a')
      const imgEl = article.querySelector('picture img') || article.querySelector('img')
      
      if (titleLink && imgEl) {
        let imgUrl = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || ''
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
        
        let linkUrl = titleLink.getAttribute('href') || ''
        if (linkUrl.startsWith('/')) linkUrl = 'https://www.foxnews.com' + linkUrl
        
        const titleText = titleLink.textContent.trim()
        
        if (imgUrl && linkUrl && titleText && !imgUrl.includes('data:image') && imgUrl.length > 20) {
          newsData.value = {
            title: titleText,
            image: imgUrl,
            link: linkUrl
          }
          hasData.value = true
          found = true
          break
        }
      }
    }
    
    // 如果 HTML 結構變了導致找不到，主動拋出錯誤進入備用方案
    if (!found) throw new Error('找不到頭條結構，準備啟用 RSS 備案')
    
  } catch (err) {
    console.warn('首頁解析失敗或超時，自動切換至 RSS 備用方案...', err.message)
    
    // 💡 備用方案：直接抓取官方 RSS，保證一定有新聞可以顯示
    try {
      const rssUrl = 'http://feeds.foxnews.com/foxnews/latest'
      const rssRes = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`)
      const rssData = await rssRes.json()
      
      if (rssData && rssData.status === 'ok' && rssData.items && rssData.items.length > 0) {
        const item = rssData.items.find(i => i.thumbnail || (i.enclosure && i.enclosure.link)) || rssData.items[0]
        let imgUrl = item.thumbnail || (item.enclosure && item.enclosure.link) || 'https://a57.foxnews.com/static.foxnews.com/foxnews.com/content/uploads/2022/02/896/500/Fox-News-Logo.jpg'
        
        newsData.value = {
          title: item.title,
          image: imgUrl,
          link: item.link
        }
        hasData.value = true
      } else {
        hasData.value = false
      }
    } catch (fallbackErr) {
      console.error('所有抓取方式皆失敗', fallbackErr)
      hasData.value = false
    }
  } finally {
    // 確保無論成功或失敗，轉圈圈一定會停下來
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

.card-header {
  border-bottom: 2px dashed #e2e8f0;
  padding-bottom: 10px;
  margin-bottom: 15px;
}
.card-header h3 {
  margin: 0;
  color: #003366; /* Fox News 經典深藍 */
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-content {
  width: 100%;
}

/* 💡 將版面縮小至 2/3 (66.66%) 並置中 */
.news-layout-wrapper {
  width: 66.66%;
  margin: 0 auto;
}

.news-link {
  display: block;
  text-decoration: none;
  overflow: hidden;
  border-radius: 8px;
  background-color: #f8fafc;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.news-link:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
}

.news-image-wrapper {
  width: 100%;
  aspect-ratio: 16 / 9; /* 保持新聞圖片完美的 16:9 比例 */
  overflow: hidden;
  background-color: #e2e8f0;
}

.news-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
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
  font-size: 1.2rem;
  font-weight: bold;
  line-height: 1.5;
  margin: 0;
  text-align: justify;
  transition: color 0.2s;
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

@media (max-width: 768px) {
  .news-layout-wrapper {
    width: 100%;
  }
}
</style>
