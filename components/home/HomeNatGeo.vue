<template>
  <div class="natgeo-card">
    <div class="card-header">
      <div class="yellow-box"></div>
      <h3>NatGeo 知識</h3>
    </div>
    
    <div class="card-content" v-if="isLoading">
      <div class="loading-state">
        <span class="spinner">⏳</span> 正在突破連線取得最新知識...
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
  try {
    const targetUrl = 'https://www.natgeomedia.com/science/'
    
    // 💡 多重代理伺服器輪詢清單：一個被擋就瞬間換下一個
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&disableCache=${Date.now()}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
    ]
    
    let html = ''

    // 💡 輪流嘗試代理伺服器，每個最多等 4 秒
    for (const proxyUrl of proxies) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      try {
        const res = await fetch(proxyUrl, { signal: controller.signal, cache: 'no-store' })
        clearTimeout(timeoutId)
        
        if (!res.ok) continue

        if (proxyUrl.includes('allorigins')) {
          const data = await res.json()
          html = data.contents || ''
        } else {
          html = await res.text()
        }

        // 如果成功抓到大於 1000 字元的 HTML，代表成功破防，直接跳出迴圈
        if (html && html.length > 1000) break 
      } catch (err) {
        clearTimeout(timeoutId)
        console.warn(`代理伺服器連線超時或被擋，切換下一個...`)
      }
    }

    if (!html || html.length < 1000) throw new Error('所有代理伺服器皆無法取得網頁原始碼')
    
    // 💡 開始解析 HTML 尋找標題與連結
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    let titleText = ''
    let linkUrl = ''
    let imgUrl = ''
    
    // 尋找包含 /article/content- 的真實文章連結
    const aTags = Array.from(doc.querySelectorAll('a'))
    for (let a of aTags) {
      const href = a.getAttribute('href') || ''
      // 清除多餘的 HTML 標籤與空白，取得乾淨標題
      const text = a.textContent.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      
      // 確保它是文章連結，且標題夠長 (排除按鈕或選單)
      if (href.includes('/article/content-') && text.length > 6) {
        titleText = text
        linkUrl = href
        break
      }
    }

    // 💡 暴力尋找圖片：無視 Vue/JS 的隱藏，直接從網頁原始碼中硬挖 JPG/WEBP 高清大圖
    if (linkUrl) {
      // 排除 png 避免抓到網站的 icon 或 logo
      const imgRegex = /https:\/\/[a-zA-Z0-9.\-_/]+?\.(?:jpg|jpeg|webp)/gi
      const matches = html.match(imgRegex) || []
      
      // 過濾掉檔名看起來像廣告、頭像或 icon 的圖片
      const validImgs = matches.filter(u => 
        !u.toLowerCase().includes('logo') && 
        !u.toLowerCase().includes('icon') && 
        !u.toLowerCase().includes('avatar') &&
        !u.toLowerCase().includes('banner')
      )
      
      if (validImgs.length > 0) {
        imgUrl = validImgs[0] // 拿第一張最可能符合的文章配圖
      }
    }

    // 💡 最終整理與防呆處理
    if (titleText && linkUrl) {
      if (!linkUrl.startsWith('http')) {
        linkUrl = 'https://www.natgeomedia.com' + (linkUrl.startsWith('/') ? '' : '/') + linkUrl
      }
      
      // 兜底方案：如果網頁裡真的連一張圖都挖不出來，至少給個官方 Logo 避免破圖
      if (!imgUrl) {
        imgUrl = 'https://www.natgeomedia.com/assets/images/logo.svg'
      }

      newsData.value = {
        title: titleText,
        image: imgUrl,
        link: linkUrl
      }
      hasData.value = true
    } else {
      throw new Error('成功取得 HTML，但無法解析出文章標題或網址')
    }
    
  } catch (err) {
    console.error('NatGeo 抓取徹底失敗:', err)
    hasData.value = false // 承認失敗，顯示無法取得，堅決不塞其他新聞
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
