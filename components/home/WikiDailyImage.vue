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
      <!-- 點擊圖片可直接連往維基共享資源的原始頁面 -->
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

    // 💡 修正：改呼叫維基共享資源最底層的 Action API
    // 透過 generator 抓取今日模板的圖片，並要求回傳繁體中文 (zh-tw) 的 metadata，與 800px 寬度的縮圖 (加快網頁載入速度)
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=images&titles=Template:Potd/${dateStr}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&iiextmetadatalanguage=zh-tw`
    
    const res = await fetch(apiUrl)
    if (!res.ok) throw new Error('Wiki API 請求失敗')
    
    const data = await res.json()
    
    if (data && data.query && data.query.pages) {
      const pages = data.query.pages
      const pageId = Object.keys(pages)[0]
      const info = pages[pageId].imageinfo[0]
      
      if (info) {
        // 抓取說明文字並過濾掉 HTML 標籤 (維基 API 傳回的通常帶有 <a> 等標籤)
        let rawDesc = info.extmetadata?.ImageDescription?.value || '今日精選圖片 (無提供中文說明)'
        const tmp = document.createElement('div')
        tmp.innerHTML = rawDesc
        const cleanDesc = tmp.textContent || tmp.innerText || ''

        imageInfo.value = {
          url: info.thumburl || info.url, // 優先使用 API 產生的縮圖，避免原圖好幾 MB 拖慢網頁
          description: cleanDesc.trim(),
          filePage: info.descriptionurl
        }
        hasData.value = true
      }
    } else {
      hasData.value = false
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
  margin-bottom: 15px;
  background-color: #f8fafc;
}

.wiki-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  max-height: 350px;
  transition: transform 0.3s ease;
}
.img-link:hover .wiki-image {
  transform: scale(1.03); /* 滑鼠游標移過去時微放大 */
}

.wiki-desc-box {
  background: #f8fafc;
  padding: 12px 15px;
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
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0;
  position: relative;
  z-index: 1;
  text-align: justify;
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
