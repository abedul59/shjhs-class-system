<template>
  <div class="abc-news-card">
    <div class="card-header">
      <h3>⬛ ABC News 焦點頭條</h3>
    </div>
    
    <div class="card-content" v-if="isLoading">
      <div class="loading-state">
        <span class="spinner">⏳</span> 正在連線取得 ABC 最新頭條...
      </div>
    </div>
    
    <div class="card-content" v-else-if="!hasData">
      <div class="empty-state">❌ 無法取得新聞資料，請稍後再試。</div>
    </div>
    
    <div class="card-content" v-else>
      <div class="news-layout-wrapper">
        <a :href="newsData.link" target="_blank" title="點擊前往 ABC News 閱讀完整新聞" class="news-link">
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
    const targetUrl = 'https://abcnews.go.com/'
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, { 
      signal: controller.signal 
    })
    
    clearTimeout(timeoutId)
    const data = await res.json()
    if (!data.contents) throw new Error('沒有回傳內容')
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(data.contents, 'text/html')
    
    // 尋找 ABC News 頭條結構
    const items = doc.querySelectorAll('.ContentRoll__Item, .News__Item, [data-testid="hero-heading"]')
    let found = false
    
    for (let item of items) {
      const aEl = item.querySelector('a.AnchorLink') || item.querySelector('a')
      const imgEl = item.querySelector('img') || item.querySelector('picture source')
      
      if (aEl && imgEl) {
        let imgUrl = imgEl.getAttribute('src') || imgEl.getAttribute('srcset') || ''
        if (imgUrl.includes(',')) imgUrl = imgUrl.split(',')[0].split(' ')[0] // 清理 srcset
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
        
        let linkUrl = aEl.getAttribute('href') || ''
        if (linkUrl.startsWith('/')) linkUrl = 'https://abcnews.go.com' + linkUrl
        
        const titleText = aEl.textContent.trim()
        
        if (imgUrl && linkUrl && titleText && imgUrl.length > 20 && !imgUrl.includes('data:image')) {
          newsData.value = { title: titleText, image: imgUrl, link: linkUrl }
          hasData.value = true
          found = true
          break
        }
      }
    }
    
    if (!found) throw new Error('找不到 ABC 頭條結構，啟用 RSS 備案')
    
  } catch (err) {
    console.warn('ABC HTML 解析失敗，切換至 RSS...', err.message)
    try {
      const rssUrl = 'https://abcnews.go.com/abcnews/topstories'
      const rssRes = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`)
      const rssData = await rssRes.json()
      
      if (rssData && rssData.status === 'ok' && rssData.items && rssData.items.length > 0) {
        const item = rssData.items.find(i => i.thumbnail || (i.enclosure && i.enclosure.link)) || rssData.items[0]
        let imgUrl = item.thumbnail || (item.enclosure && item.enclosure.link) || 'https://upload.wikimedia.org/wikipedia/commons/3/30/ABC_News_logo_2021.svg'
        
        newsData.value = { title: item.title, image: imgUrl, link: item.link }
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
.abc-news-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; margin-top: 20px; transition: 0.3s; }
.abc-news-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: #cbd5e1; }
.card-header { border-bottom: 2px dashed #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; }
.card-header h3 { margin: 0; color: #000000; font-size: 1.25rem; display: flex; align-items: center; gap: 8px; }
.card-content { width: 100%; }
.news-layout-wrapper { width: 66.66%; margin: 0 auto; }
.news-link { display: block; text-decoration: none; overflow: hidden; border-radius: 8px; background-color: #f8fafc; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.2s ease, box-shadow 0.2s ease; }
.news-link:hover { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.2); }
.news-image-wrapper { width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background-color: #e2e8f0; }
.news-image { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s ease; }
.news-link:hover .news-image { transform: scale(1.05); }
.news-title-box { padding: 15px 20px; background: white; border-top: 4px solid #3b82f6; /* ABC 使用藍色或黑色底線點綴 */ }
.news-title { color: #1e293b; font-size: 1.2rem; font-weight: bold; line-height: 1.5; margin: 0; text-align: justify; transition: color 0.2s; }
.news-link:hover .news-title { color: #3b82f6; }
.loading-state, .empty-state { text-align: center; padding: 30px; color: #64748b; background: #f8fafc; border-radius: 6px; font-style: italic; }
.spinner { display: inline-block; animation: spin 2s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
@media (max-width: 768px) { .news-layout-wrapper { width: 100%; } }
</style>
