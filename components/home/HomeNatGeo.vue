<template>
  <div class="natgeo-card">
    <div class="card-header">
      <div class="yellow-box"></div>
      <h3>NatGeo 知識</h3>
    </div>
    
    <div class="card-content" v-if="isLoading">
      <div class="loading-state">
        <span class="spinner">⏳</span> 正在連線取得 NatGeo 最新知識...
      </div>
    </div>
    
    <div class="card-content" v-else-if="!hasData">
      <div class="empty-state">❌ 無法取得國家地理文章，請稍後再試。</div>
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
  // 💡 8 秒強制超時，避免網路卡死無限轉圈圈
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const targetUrl = 'https://www.natgeomedia.com/science/'
    
    // 💡 改用 /raw 端點直接獲取純 HTML，避免 JSON 轉換過程遺失屬性
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, { 
      signal: controller.signal,
      cache: 'no-store' // 強制不使用快取，確保抓到最新
    })
    
    clearTimeout(timeoutId)
    const html = await res.text()
    
    if (!html || html.length < 100) throw new Error('網頁內容回傳空白')
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    let titleText = ''
    let linkUrl = ''
    let imgUrl = ''
    
    // 💡 策略一：根據您的截圖，精準狙擊第一篇大頭條的結構
    const heroWrap = doc.querySelector('.article-link-wrap, .artcle-btn-large')
    if (heroWrap) {
      const aTitle = heroWrap.querySelector('.art-btn-text h4 a') || heroWrap.querySelector('.art-btn-text a') || heroWrap.querySelector('h4 a')
      if (aTitle) {
        titleText = aTitle.textContent.trim()
        linkUrl = aTitle.getAttribute('href')
      }
      
      const aImg = heroWrap.querySelector('.art-btn-la-content img') || heroWrap.querySelector('img')
      if (aImg) {
        imgUrl = aImg.getAttribute('src') || aImg.getAttribute('data-src') || ''
      }
    }
    
    // 💡 策略二：如果精準狙擊失敗，改用寬容模式掃描所有連結
    if (!titleText || !imgUrl) {
      const allLinks = doc.querySelectorAll('a')
      for (let a of allLinks) {
        const text = a.textContent.trim()
        // 尋找看起來像文章標題的長字串 (排除選單或按鈕)
        if (text.length > 10 && a.getAttribute('href') && a.getAttribute('href').includes('/article/')) {
          titleText = text
          linkUrl = a.getAttribute('href')
          
          // 往上層找容器，看看有沒有圖片
          const parent = a.closest('div, section, article')
          if (parent) {
            const img = parent.querySelector('img')
            if (img) imgUrl = img.getAttribute('src') || img.getAttribute('data-src') || ''
          }
          break
        }
      }
    }
    
    // 💡 策略三：如果 DOM 裡的圖片標籤被 Vue 或 LazyLoad 隱藏了，直接去 HTML 源碼暴力挖出高清大圖的網址！
    if (!imgUrl || imgUrl.length < 10 || imgUrl.includes('data:image')) {
      // 搜尋任何結尾是 jpg/png/webp 且包含 natgeomedia 的圖片網址
      const match = html.match(/(https?:\/\/[^"'\s]+\.natgeomedia\.com\/[^"'\s]+\.(?:jpg|jpeg|png|webp))/i)
      if (match) {
        imgUrl = match[1]
      }
    }
    
    // 💡 最終整理與防呆
    if (imgUrl && linkUrl && titleText) {
      // 確保網址是絕對路徑
      if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
      if (linkUrl.startsWith('/')) linkUrl = 'https://www.natgeomedia.com' + linkUrl
      
      // 防止真的沒圖時破圖，給予官方預設 Logo
      if (imgUrl.includes('data:image')) {
        imgUrl = 'https://www.natgeomedia.com/assets/images/logo.svg'
      }

      newsData.value = {
        title: titleText,
        image: imgUrl,
        link: linkUrl
      }
      hasData.value = true
    } else {
      throw new Error('解析不到國家地理雜誌的文章標題或連結')
    }
    
  } catch (err) {
    console.error('NatGeo 抓取失敗:', err)
    hasData.value = false // 失敗就是失敗，誠實顯示空狀態，絕不跳轉其他新聞
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

/* 國家地理經典黃框 */
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
  background-color: #000000;
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
  border-top: 4px solid #ffcc00;
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
