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
    // 取得今日日期 (格式：YYYY/MM/DD)
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')

    // 呼叫繁體中文維基百科的官方精選內容 API
    const res = await fetch(`https://zh.wikipedia.org/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`)
    if (!res.ok) throw new Error('Wiki API 請求失敗')
    
    const data = await res.json()
    
    // 如果當天有精選圖片 (image)
    if (data && data.image) {
      // 預設縮圖解析度較低，我們透過替換 URL 字串來取得更清晰的 600px 版本
      let highResUrl = data.image.thumbnail?.source || ''
      if (highResUrl) {
        highResUrl = highResUrl.replace(/\/\d+px-/, '/600px-')
      } else {
        highResUrl = data.image.image?.source // 備用：直接抓原圖
      }

      imageInfo.value = {
        url: highResUrl,
        description: data.image.description?.text || '（今日精選圖片無提供中文說明）',
        filePage: data.image.file_page || 'https://zh.wikipedia.org/'
      }
      hasData.value = true
    }
  } catch (err) {
    console.error('取得維基百科每日圖片發生錯誤:', err)
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
  margin-top: 20px; /* 與上方聯絡簿保留間距 */
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
  max-height: 400px;
  transition: transform 0.3s ease;
}
.img-link:hover .wiki-image {
  transform: scale(1.02); /* 滑鼠游標移過去時微放大 */
}

.wiki-desc-box {
  background: #f8fafc;
  padding: 12px 15px;
  border-left: 4px solid #3b82f6;
  border-radius: 0 6px 6px 0;
  position: relative;
}

.quote-mark {
  position: absolute;
  top: -5px;
  left: 5px;
  font-size: 2.5rem;
  color: #bfdbfe;
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
