<template>
  <div class="natgeo-card">
    <div class="card-header">
      <div class="yellow-box"></div>
      <h3>NatGeo 知識</h3>
    </div>
    
    <div class="card-content" v-if="isLoading">
      <div class="loading-state">
        <span class="spinner">⏳</span> 正在連線取得最新科學新知...
      </div>
    </div>
    
    <div class="card-content" v-else-if="!hasData">
      <div class="empty-state">❌ 無法取得資料，請稍後再試。</div>
    </div>
    
    <div class="card-content" v-else>
      <div class="news-layout-wrapper">
        <a :href="newsData.link" target="_blank" title="點擊閱讀完整文章" class="news-link">
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
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    // 鎖定國家地理科學分類頁面
    const targetUrl = 'https://www.natgeomedia.com/science/'
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, { 
      signal: controller.signal 
    })
    
    clearTimeout(timeoutId)
    const data = await res.json()
    if (!data.contents) throw new Error('沒有回傳內容')
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(data.contents, 'text/html')
    
    // 根據您提供的截圖，鎖定具有 class="article-link-wrap" 的第一個主區塊
    const firstArticle = doc.querySelector('.article-link-wrap') || doc.querySelector('article')
    
    if (firstArticle) {
      // 尋找圖片 (可能在 data-src 作為 lazy load)
      const imgEl = firstArticle.querySelector('img')
      // 尋找標題連結 (依照截圖結構，標題藏在 h4 的 a 標籤內)
      const titleLink = firstArticle.querySelector('h4 a') || firstArticle.querySelector('h3 a') || firstArticle.querySelector('a')
      
      if (imgEl && titleLink) {
        let imgUrl = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || ''
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
        
        let linkUrl = titleLink.getAttribute('href') || ''
        if (linkUrl.startsWith('/')) linkUrl = 'https://www.natgeomedia.com' + linkUrl
        
        const titleText = titleLink.textContent.trim()
        
        if (imgUrl && linkUrl && titleText) {
          newsData.value = {
            title: titleText,
            image: imgUrl,
            link: linkUrl
          }
          hasData.value = true
        } else {
          throw new Error('資訊不齊全')
        }
      } else {
        throw new Error('找不到完整的圖片或標題標籤')
      }
    } else {
      throw new Error('找不到主要的文章區塊')
    }
  } catch (err) {
    console.error('取得 NatGeo 發生錯誤:', err)
    hasData.value = false
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchNews())
</script>

<style scoped>
.natgeo-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  /* 💡 不需要設寬度，它會自動填滿父層 left-panel 的空間 */
  width: 100%;
  box-sizing: border-box;
  transition: 0.3s;
}
.natgeo-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-color: #cbd5e1;
}

.card-header {
  border-bottom: 2px dashed #e2e8f0;
  padding-bottom: 10px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}
/* 國家地理雜誌標誌性的黃色方塊 */
.yellow-box {
  width: 16px;
  height: 24px;
  border: 4px solid #ffcc00;
  box-sizing: border-box;
}
.card-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
}

.card-content {
  width: 100%;
}

/* 為了配合左側欄位寬度，這裡填滿 100%，並使用滿版設計 */
.news-layout-wrapper {
  width: 100%;
}

.news-link {
  display: block;
  text-decoration: none;
  overflow: hidden;
  border-radius: 8px;
  background-color: #000000; /* NatGeo 多半有黑色底色質感 */
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.news-link:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
}

.news-image-wrapper {
  width: 100%;
  aspect-ratio: 16 / 9;
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
  background: #000000;
  border-top: 4px solid #ffcc00; /* NatGeo 經典黃色底線 */
}

.news-title {
  color: #ffffff;
  font-size: 1.15rem;
  font-weight: bold;
  line-height: 1.5;
  margin: 0;
  text-align: justify;
  transition: color 0.2s;
}
.news-link:hover .news-title {
  color: #ffcc00;
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
