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
    // 💡 終極解法：使用 Fox News 官方 RSS Feed，再透過 rss2json 轉為乾淨的 JSON，無視網頁阻擋機制
    const rssUrl = 'http://feeds.foxnews.com/foxnews/latest'
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`)
    
    if (!res.ok) throw new Error('RSS API 請求失敗')
    
    const data = await res.json()
    
    if (data && data.status === 'ok' && data.items && data.items.length > 0) {
      // 尋找第一篇擁有圖片的新聞
      const item = data.items.find(i => i.thumbnail || (i.enclosure && i.enclosure.link)) || data.items[0]
      
      // 解析圖片：優先取 thumbnail，若無則取 enclosure 內的圖片，最後給予預設的 Fox News Logo 避免破圖
      let imgUrl = item.thumbnail || (item.enclosure && item.enclosure.link) || 'https://a57.foxnews.com/static.foxnews.com/foxnews.com/content/uploads/2022/02/896/500/Fox-News-Logo.jpg'
      
      newsData.value = {
        title: item.title,
        image: imgUrl,
        link: item.link
      }
      hasData.value = true
    } else {
      throw new Error('無法解析 RSS 內容')
    }
  } catch (err) {
    console.error('取得 Fox News 發生錯誤:', err)
    
    // 💡 備用方案 (Fallback)：如果 RSS 壞了，我們才用高容錯的 HTML 解析法
    try {
      const targetUrl = 'https://www.foxnews.com/'
      const htmlRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`)
      const htmlData = await htmlRes.json()
      
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlData.contents, 'text/html')
      
      // 用更廣泛的搜尋條件找尋文章，不限死單一結構
      const articles = doc.querySelectorAll('article')
      for (let article of articles) {
        const aEl = article.querySelector('.title a, h3 a, h2 a')
        const imgEl = article.querySelector('img')
        
        if (aEl && imgEl) {
          let imgUrl = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || ''
          if (imgUrl && imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
          let linkUrl = aEl.getAttribute('href') || ''
          if (linkUrl && linkUrl.startsWith('/')) linkUrl = 'https://www.foxnews.com' + linkUrl
          
          // 確保圖片是有效的網址，而不是 base64 佔位符
          if (imgUrl && imgUrl.length > 50 && !imgUrl.includes('data:image')) {
            newsData.value = { title: aEl.textContent.trim(), image: imgUrl, link: linkUrl }
            hasData.value = true
            return
          }
        }
      }
    } catch (fallbackErr) {
      console.error('備用方案也失敗:', fallbackErr)
      hasData.value = false
    }
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
