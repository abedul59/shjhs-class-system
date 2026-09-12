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
  // 💡 1. 加入 8 秒超時保護，避免無限轉圈圈
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const targetUrl = 'https://www.natgeomedia.com/science/'
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, { 
      signal: controller.signal 
    })
    
    clearTimeout(timeoutId)
    const data = await res.json()
    if (!data.contents) throw new Error('沒有回傳內容')
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(data.contents, 'text/html')
    
    let titleText = ''
    let linkUrl = ''
    let imgUrl = ''
    
    // 💡 2. 寬容尋找：找出任何可能是頭條標題的連結
    const aTags = doc.querySelectorAll('.art-btn-la-text a, .article-link-wrap a, article a, h4 a, h3 a')
    
    for (let a of aTags) {
      const text = a.textContent.trim()
      if (text.length > 8) { // 標題通常超過 8 個字，避免抓到「閱讀更多」
        titleText = text
        linkUrl = a.getAttribute('href')
        
        // 往上找尋容器，看看有沒有包含圖片標籤
        const parent = a.closest('.article-link-wrap, .artcle-btn-large, article, div[class*="article"]')
        if (parent) {
          const img = parent.querySelector('img')
          if (img) imgUrl = img.getAttribute('src') || img.getAttribute('data-src') || ''
        }
        break
      }
    }
    
    // 💡 3. 如果在 DOM 找不到圖片 (因為被 Vue/JS 隱藏了)，直接用正則表達式暴力掃描原始碼裡的大圖！
    if (!imgUrl || imgUrl.length < 10 || imgUrl.includes('data:image')) {
      const match = data.contents.match(/(https?:\/\/[a-zA-Z0-9.-]+\.natgeomedia\.com\/[^"']+\.(?:jpg|jpeg|png|webp))/i)
      if (match) {
        imgUrl = match[1]
      }
    }
    
    // 💡 4. 終極圖片兜底 (NatGeo Logo)，防止破圖
    if (!imgUrl || imgUrl.includes('data:image')) {
      imgUrl = 'https://www.natgeomedia.com/assets/images/logo.svg'
    }
    
    if (linkUrl && linkUrl.startsWith('/')) {
      linkUrl = 'https://www.natgeomedia.com' + linkUrl
    }
    
    if (titleText && linkUrl) {
      newsData.value = {
        title: titleText,
        image: imgUrl,
        link: linkUrl
      }
      hasData.value = true
    } else {
      throw new Error('無法從網頁中解析到頭條文章')
    }
    
  } catch (err) {
    console.warn('NatGeo 解析失敗，立刻無縫切換至備用 RSS...', err)
    
    // 💡 5. 無情備用方案：如果國家地理擋住我們了，立刻改抓「Yahoo 科技與科學新知」RSS！保證有內容可看。
    try {
      const rssUrl = 'https://tw.news.yahoo.com/rss/technology'
      const rssRes = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`)
      const rssData = await rssRes.json()
      
      if (rssData && rssData.items && rssData.items.length > 0) {
        const item = rssData.items.find(i => i.thumbnail || (i.enclosure && i.enclosure.link)) || rssData.items[0]
        let imgUrl = item.thumbnail || (item.enclosure && item.enclosure.link) || 'https://s.yimg.com/cv/apiv2/social/images/yahoo_default_logo.png'
        
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
      hasData.value = false
    }
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
  width: 100%; /* 完美貼合左側面板寬度 */
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
  background-color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
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
