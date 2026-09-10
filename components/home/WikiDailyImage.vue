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
      <a :href="imageInfo.filePage" target="_blank" title="點擊前往維基百科查看原圖" class="img-link">
        <img :src="imageInfo.url" :alt="imageInfo.description" class="wiki-image" loading="lazy" />
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

const fetchWikiImage = async () => {
  try {
    const d = new Date()
    const yyyy = d.getFullYear()
    const m = d.getMonth() + 1 // 中文模板習慣用單數不補零
    const dd = d.getDate()     // 中文模板習慣用單數不補零
    
    // 💡 鎖定中文維基百科專屬的每日圖片模板 (例如：Template:每日圖片/2026年9月10日)
    const templateName = `Template:每日圖片/${yyyy}年${m}月${dd}日`

    // 直接向「中文維基百科」要這個模板的解析結果
    const res = await fetch(`https://zh.wikipedia.org/w/api.php?action=parse&format=json&origin=*&page=${encodeURIComponent(templateName)}&prop=text|images`)
    
    if (!res.ok) throw new Error('Wiki API 請求失敗')
    const data = await res.json()
    
    if (data && data.parse) {
      // 1. 取得圖片檔名
      const images = data.parse.images || []
      const filename = images.length > 0 ? images[0] : null
      
      // 2. 取得中文維基志工辛苦翻譯的敘述
      let rawHtml = data.parse.text['*'] || ''
      
      // 透過一個虛擬 DOM 來過濾掉我們不需要的表格結構，只留下純文字敘述
      const tmp = document.createElement('div')
      tmp.innerHTML = rawHtml
      
      // 中文模板通常會包含一個查看圖片的放大鏡圖示，我們把它移除，只留文字
      const links = tmp.querySelectorAll('a')
      links.forEach(link => {
        if (link.textContent.includes('檢視') || link.innerHTML.includes('magnify-clip')) {
          link.remove()
        } else {
          // 保留維基百科原本的藍色超連結，讓學生可以點擊學習
          const href = link.getAttribute('href')
          if (href && href.startsWith('/wiki/')) {
            link.setAttribute('href', `https://zh.wikipedia.org${href}`)
            link.setAttribute('target', '_blank')
            link.style.color = '#2563eb'
            link.style.textDecoration = 'none'
            link.style.fontWeight = 'bold'
          }
        }
      })

      let finalDesc = tmp.innerHTML.trim() || '今日精選圖片 (暫無說明)'

      // 3. 取得圖片的真實網址
      let imgUrl = ''
      let filePageUrl = 'https://zh.wikipedia.org/'
      
      if (filename) {
        const imgRes = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&iiurlwidth=800`)
        const imgData = await imgRes.json()
        const pages = imgData.query.pages
        const pageId = Object.keys(pages)[0]
        const info = pages[pageId].imageinfo[0]
        if (info) {
          imgUrl = info.thumburl || info.url
          filePageUrl = info.descriptionurl
        }
      }

      imageInfo.value = {
        url: imgUrl,
        description: finalDesc,
        filePage: filePageUrl
      }
      hasData.value = true
    } else {
      throw new Error('今日尚無中文模板資料')
    }
  } catch (err) {
    console.error('取得維基百科每日圖片發生錯誤:', err)
    hasData.value = false
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

.img-link {
  display: block;
  overflow: hidden;
  border-radius: 6px;
  margin: 0 auto 15px auto; 
  background-color: #f8fafc;
  width: 50%; /* 💡 維持圖片為一半大小 */
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

@media (max-width: 768px) {
  .img-link {
    width: 80%;
  }
}
</style>
