<template>
  <!-- 只有當今天有設定有效的 YouTube 網址時，才顯示這個區塊 -->
  <div class="yt-board-card" v-if="videoId">
    <div class="card-header">
      <h3>📺 今日推薦影片</h3>
    </div>
    
    <div class="card-content">
      <div class="video-responsive-container">
        <!-- 💡 核心參數設定：autoplay=1(自動播放), mute=1(強制無聲), loop=1(循環播放), playlist=ID(循環必備) -->
        <iframe 
          :src="`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0`" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  videoUrl: { type: String, default: '' }
})

// 自動解析老師貼上的各種 YouTube 網址格式，精準提取 11 碼的 Video ID
const videoId = computed(() => {
  if (!props.videoUrl) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = props.videoUrl.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
})
</script>

<style scoped>
.yt-board-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  margin-top: 20px;
  transition: 0.3s;
}
.yt-board-card:hover {
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

.card-content {
  width: 100%;
}

/* 確保 YouTube 影片能響應式縮放，維持 16:9 比例 */
.video-responsive-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 比例 */
  height: 0;
  overflow: hidden;
  border-radius: 8px;
  background-color: #000; /* 載入前的黑底 */
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.video-responsive-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
