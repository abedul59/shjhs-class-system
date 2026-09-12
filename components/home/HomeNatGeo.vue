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
  // 💡 8 秒強制超時保護
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const targetUrl = 'https://www.natgeomedia.com/science/'
    let html = ''
    
    // 💡 雙重代理防護：先嘗試 allorigins，如果失敗或被擋，立刻切換 codetabs
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&disableCache=${Date.now()}`, { signal: controller.signal })
      const data = await res.json()
      html = data.contents || ''
    } catch (e) {
      console.warn('主要代理失敗，切換備用代理...')
    }

    if (!html || html.length < 500) {
      const res2 = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, { signal: controller.signal })
      html = await res2.text()
    }

    clearTimeout(timeoutId)
    if (!html || html.length < 500) throw new Error('網頁內容回傳空白或被阻擋')
    
    let titleText = ''
    let linkUrl = ''
    let imgUrl = ''
    
    // 💡 暴力破解 1：用 Regex 直接在原始碼中挖出文章連結與標題
    // 尋找類似 href="/science/article/content-19384.html" 的特徵
    const linkRegex = /href=["']([^"']*\/article\/content-\d+\.html)["'][^>]*>(.*?)<\/a>/i
    const linkMatch = html.match(linkRegex)
    
    if (linkMatch) {
      linkUrl = linkMatch[1]
      // 清除可能包覆在標題外的 HTML 標籤 (例如 <span>)
      titleText = linkMatch[2].replace(/<[^>]*>?/gm, '').trim()
    }

    // 💡 暴力破解 2：無視前端隱藏，直接在原始碼裡找第一張 JPG 或 WEBP 圖片網址
    // NatGeo 的真實照片多半是 jpg 或 webp 格式
    const imgRegex = /(https?:\/\/[^"'\s<>]+\.(?:jpg|jpeg|webp))/i
    const imgMatch = html.match(imgRegex)
    
    if (imgMatch) {
      // 處理 JSON 格式中可能出現的脫逸斜線 (例如 https:\/\/...)
      imgUrl = imgMatch[1].replace(/\\\//g, '/')
    }

    // 💡 最終整理與防呆
    if (linkUrl && titleText && titleText.length > 3) {
      
      // 確保網址是完整的絕對路徑
      if (!linkUrl.startsWith('http')) {
        linkUrl = 'https://www.natgeomedia.com' + (linkUrl.startsWith('/') ? '' : '/') + linkUrl
      }
      
      // 如果真的沒有圖，提供 NatGeo 官方 Logo 避免破圖
      if (!imgUrl || imgUrl.includes('data:image')) {
        imgUrl = 'https://www.natgeomedia.com/assets/images/logo.svg'
      }

      newsData.value = {
        title: titleText,
        image: imgUrl,
        link: linkUrl
      }
      hasData.value = true
    } else {
      throw new Error('無法從網頁深層原始碼中挖出文章結構')
    }
    
  } catch (err) {
    console.error('NatGeo 抓取徹底失敗:', err)
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
