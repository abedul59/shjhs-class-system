<template>
  <div class="wiki-potd-card">
    <div class="card-header">
      <h3>🌍 維基百科每日圖片</h3>
    </div>
    
    <div class="card-content" v-if="isLoading">
      <div class="loading-state">
        <span class="spinner">⏳</span> 正在連線維基百科首頁抓取資料...
      </div>
    </div>
    
    <div class="card-content" v-else-if="!hasData">
      <div class="empty-state">❌ 無法取得今日圖片，請稍後再試。</div>
    </div>
    
    <div class="card-content" v-else>
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

const fetchWikiImage = async () => {
  try {
    // 💡 終極解法：直接向 API 請求「中文維基百科首頁 (Wikipedia:首页)」的完整解析 HTML
    const res = await fetch(`https://zh.wikipedia.org/w/api.php?action=parse&format=json&origin=*&page=Wikipedia:首页&prop=text`)
    if (!res.ok) throw new Error('Wiki API 請求失敗')
    
    const data = await res.json()
    if (!data.parse || !data.parse.text) throw new Error('無法取得首頁 HTML')

    // 建立一個虛擬 DOM 來解析首頁 HTML
    const tmp = document.createElement('div')
    tmp.innerHTML = data.parse.text['*']

    // 根據您提供的截圖，精準定位「每日圖片」區塊
    const featurePicBlock = tmp.querySelector('#mp-2012-column-featurepic-block')
    if (!featurePicBlock) throw new Error('找不到首頁中的每日圖片區塊')

    // 1. 抓取圖片真實網址 (從 <img> 標籤)
    const imgEl = featurePicBlock.querySelector('img')
    if (!imgEl) throw new Error('找不到圖片標籤')
    
    // 將縮圖網址 (例如 400px) 替換為更清晰的 800px 版本
    let imgUrl = imgEl.getAttribute('src') || ''
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
    imgUrl = imgUrl.replace(/\/\d+px-/, '/800px-')

    // 2. 抓取圖片說明的原始頁面連結 (點擊圖片可以去維基看大圖)
    const linkEl = featurePicBlock.querySelector('a.image, .gallerybox a')
    let filePageUrl = 'https://zh.wikipedia.org/'
    if (linkEl) {
      const href = linkEl.getAttribute('href')
      if (href) filePageUrl = `https://zh.wikipedia.org${href}`
    }

    // 3. 抓取中文敘述 (精準定位 gallerytext)
    const descBox = featurePicBlock.querySelector('.gallerytext')
    let finalDesc = '今日精選圖片 (暫無說明)'
    
    if (descBox) {
      // 保留維基百科原本的藍色超連結，讓學生可以點開學習
      descBox.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href')
        if (href && href.startsWith('/wiki/')) {
          a.setAttribute('href', `https://zh.wikipedia.org${href}`)
          a.setAttribute('target', '_blank')
          a.style.color = '#2563eb'
          a.style.textDecoration = 'none'
          a.style.fontWeight = 'bold'
        }
      })
      finalDesc = descBox.innerHTML.trim()
    }

    imageInfo.value = {
      url: imgUrl,
      description: finalDesc,
      filePage: filePageUrl
    }
    hasData.value = true

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
  transform: scale(1.03); 
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
