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
      <!-- 💡 圖片區塊：大小已縮減為一半並置中 -->
      <a :href="imageInfo.filePage" target="_blank" title="點擊前往維基百科查看原圖" class="img-link">
        <img :src="imageInfo.url" :alt="imageInfo.description" class="wiki-image" loading="lazy" />
      </a>
      
      <div class="wiki-desc-box">
        <span class="quote-mark">❝</span>
        <p class="wiki-desc">{{ imageInfo.description }}</p>
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
    // 取得今日日期 (格式：YYYY-MM-DD)
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

    // 💡 第一步：取得今日圖片的真實「檔名」
    const imgNameRes = await fetch(`https://commons.wikimedia.org/w/api.php?action=parse&format=json&origin=*&page=Template:Potd/${dateStr}&prop=images`)
    const imgNameData = await imgNameRes.json()
    
    if (!imgNameData.parse || !imgNameData.parse.images || imgNameData.parse.images.length === 0) {
      throw new Error('找不到今日圖片檔名')
    }
    const filename = imgNameData.parse.images[0]

    // 💡 第二步：精準抓取「繁體中文」的翻譯說明文字
    // 依序嘗試 zh-Hant (繁體), zh-tw (台灣繁體), zh (中文通用)，確保一定抓得到中文！
    let cleanDesc = ''
    const langs = ['zh-Hant', 'zh-tw', 'zh']
    
    for (const lang of langs) {
      const textRes = await fetch(`https://commons.wikimedia.org/w/api.php?action=parse&format=json&origin=*&page=Template:Potd/${dateStr}_(${lang})&prop=text`)
      const textData = await textRes.json()
      
      if (textData.parse && textData.parse.text) {
        // 解析 HTML 並萃取出純文字
        const tmp = document.createElement('div')
        tmp.innerHTML = textData.parse.text['*']
        cleanDesc = tmp.textContent || tmp.innerText || ''
        cleanDesc = cleanDesc.trim()
        break // 成功找到中文就停止搜尋
      }
    }

    if (!cleanDesc) {
      cleanDesc = '今日精選圖片 (維基百科目前尚未提供中文翻譯)'
    }

    // 💡 第三步：使用檔名取得圖片真實網址 (限制寬度 600px 以提升網頁載入速度)
    const imgUrlReq = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&titles=File:${filename}&prop=imageinfo&iiprop=url&iiurlwidth=600`
    const imgRes = await fetch(imgUrlReq)
    const imgData = await imgRes.json()
    
    const pages = imgData.query.pages
    const pageId = Object.keys(pages)[0]
    const info = pages[pageId].imageinfo[0]

    if (info) {
      imageInfo.value = {
        url: info.thumburl || info.url,
        description: cleanDesc,
        filePage: info.descriptionurl
      }
      hasData.value = true
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

/* 💡 圖片外框樣式：縮小一半 (50%) 並置中 */
.img-link {
  display: block;
  overflow: hidden;
  border-radius: 6px;
  margin: 0 auto 15px auto; /* 左右 auto 讓圖片水平置中 */
  background-color: #f8fafc;
  width: 50%; /* 縮減為原本的一半大小 */
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.wiki-image {
  width: 100%; /* 填滿外框的 50% */
  height: auto;
  display: block;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.img-link:hover .wiki-image {
  transform: scale(1.05); /* 滑鼠游標移過去時微放大 */
}

.wiki-desc-box {
  background: #f8fafc;
  padding: 15px 20px;
  border-left: 4px solid #10b981; /* 維基主題搭配翠綠色邊框 */
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
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
  position: relative;
  z-index: 1;
  text-align: justify;
  font-weight: bold;
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
