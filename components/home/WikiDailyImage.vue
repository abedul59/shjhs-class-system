<template>
  <div class="wiki-potd-card">
    <div class="card-header">
      <h3>🌍 維基百科每日圖片</h3>
    </div>
    
    <div class="card-content" v-if="isLoading">
      <div class="loading-state">
        <span class="spinner">⏳</span> 正在連線維基百科載入圖片...
      </div>
    </div>
    
    <div class="card-content" v-else-if="!hasData">
      <div class="empty-state">❌ 無法取得今日圖片，請稍後再試。</div>
    </div>
    
    <div class="card-content" v-else>
      <!-- 💡 圖片區塊：大小維持 50% 並置中 -->
      <a :href="imageInfo.filePage" target="_blank" title="點擊前往維基百科查看原圖" class="img-link">
        <img :src="imageInfo.url" alt="維基百科每日圖片" class="wiki-image" loading="lazy" />
      </a>
      
      <div class="wiki-desc-box">
        <span class="quote-mark">❝</span>
        <p class="wiki-desc" v-html="imageInfo.description"></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const hasData = ref(false)
const imageInfo = ref({ url: '', description: '', filePage: '' })

// 備用方案：使用維基官方 REST API
const fetchFallbackWikiImage = async () => {
  try {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    
    const res = await fetch(`https://zh.wikipedia.org/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`)
    const data = await res.json()
    
    if (data && data.image) {
      let highResUrl = data.image.thumbnail?.source || ''
      if (highResUrl) highResUrl = highResUrl.replace(/\/\d+px-/, '/800px-')
      else highResUrl = data.image.image?.source

      imageInfo.value = {
        url: highResUrl,
        description: data.image.description?.text || '今日精選圖片 (暫無說明)',
        filePage: data.image.file_page || 'https://zh.wikipedia.org/'
      }
      hasData.value = true
    }
  } catch (e) {
    hasData.value = false
  }
}

// 主方案：解析中文維基百科通用模板
const fetchWikiImage = async () => {
  try {
    // 💡 直接請求 "Template:每日图片"，維基伺服器會自動幫我們轉換成當天日期
    const res = await fetch(`https://zh.wikipedia.org/w/api.php?action=parse&format=json&origin=*&page=Template:每日图片&prop=text|images`)
    
    if (!res.ok) throw new Error('Wiki API 請求失敗')
    const data = await res.json()
    
    if (data && data.parse) {
      // 1. 取得圖片真實檔名 (過濾掉常見的放大鏡圖示)
      const images = data.parse.images || []
      const filename = images.find(img => !img.includes('magnify') && !img.includes('Info') && !img.endsWith('.svg')) || images[0]
      
      if (!filename) throw new Error('找不到圖片檔名')

      // 2. 萃取並淨化中文敘述
      const tmp = document.createElement('div')
      tmp.innerHTML = data.parse.text['*']
      
      // 移除原有的放大鏡、不需要的圖片節點
      tmp.querySelectorAll('.magnify, a.image').forEach(el => el.remove())
      
      // 保留維基藍色超連結，讓點擊可以直接開新分頁閱讀
      tmp.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href')
        if (href && href.startsWith('/wiki/')) {
          a.setAttribute('href', `https://zh.wikipedia.org${href}`)
          a.setAttribute('target', '_blank')
          a.style.color = '#2563eb'
          a.style.textDecoration = 'none'
          a.style.fontWeight = 'bold'
        }
      })

      const finalDesc = tmp.innerHTML.trim() || '今日精選圖片 (暫無說明)'

      // 3. 向維基共享資源取得圖片真實 URL (限制 800px 寬度，加快載入)
      const imgRes = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&iiurlwidth=800`)
      const imgData = await imgRes.json()
      
      const pages = imgData.query.pages
      const pageId = Object.keys(pages)[0]
      const info = pages[pageId].imageinfo[0]

      if (info) {
        imageInfo.value = {
          url: info.thumburl || info.url,
          description: finalDesc,
          filePage: info.descriptionurl || 'https://zh.wikipedia.org/'
        }
        hasData.value = true
      } else {
        throw new Error('無法取得真實圖片 URL')
      }
    } else {
      throw new Error('解析模板失敗')
    }
  } catch (err) {
    console.warn('主線路抓取失敗，啟動備用線路...', err)
    await fetchFallbackWikiImage()
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchWikiImage()
})
</script>

<style scoped>
.wiki-potd-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  margin-top: 20px;
  transition: 0.3s;
}
.wiki-potd-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-color: #cbd5e1;
}

.card-header h3 {
  margin: 0 0 15px 0;
  color: #1e293b;
  font-size: 1.25rem;
  border-bottom: 2px dashed #e2e8f0;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 💡 圖片外框樣式：縮小一半 (50%) 並水平置中 */
.img-link {
  display: block;
  overflow: hidden;
  border-radius: 6px;
  margin: 0 auto 15px auto; 
  background-color: #f8fafc;
  width: 50%; 
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.wiki-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.img-link:hover .wiki-image {
  transform: scale(1.05);
}

.wiki-desc-box {
  background: #f8fafc;
  padding: 15px 20px;
  border-left: 4px solid #10b981; 
  border-radius: 0 6px 6px 0;
  position: relative;
}

.quote-mark {
  position: absolute;
  top: -5px;
  left: 5px;
  font-size: 2.5rem;
  color: #d1fae5;
  font-family: serif;
  line-height: 1;
  user-select: none;
}

.wiki-desc {
  color: #334155;
  font-size: 1.05rem;
  line-height: 1.6;
  margin: 0;
  position: relative;
  z-index: 1;
  text-align: justify;
}

/* 確保說明文字內的段落標籤不會破壞排版 */
.wiki-desc :deep(p) {
  margin: 0;
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

/* 手機版時，若 50% 太小，自動放大回 80% 以保持閱讀體驗 */
@media (max-width: 768px) {
  .img-link {
    width: 80%;
  }
}
</style>
