<template>
  <!-- 只有當今天有設定有效的 YouTube 網址時，才顯示這個區塊 -->
  <div class="yt-board-card" v-if="videoId">
    <div class="card-header">
      <h3>📺 今日推薦影片</h3>
      <span class="status-badge" :class="isClassTime ? 'status-paused' : 'status-playing'">
        {{ isClassTime ? '⏸️ 上課暫停中' : '▶️ 下課播放中' }}
      </span>
    </div>
    
    <div class="card-content">
      <!-- 💡 將版面縮小至 2/3 並置中對齊 -->
      <div class="video-layout-wrapper">
        <div class="video-responsive-container">
          <!-- 💡 這裡將會由 YouTube Iframe API 動態注入播放器 -->
          <div ref="ytPlayerEl"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  videoUrl: { type: String, default: '' },
  isMuted: { type: Boolean, default: true },
  isClassTime: { type: Boolean, default: false } // 上課時間為 true
})

// 自動解析 11 碼 Video ID
const videoId = computed(() => {
  if (!props.videoUrl) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = props.videoUrl.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
})

// === 💡 YouTube IFrame API 核心邏輯 ===
const ytPlayerEl = ref(null)
let player = null

const initPlayer = () => {
  // 防呆：確保 API 與 DOM 元素都已準備好
  if (!window.YT || !window.YT.Player || !ytPlayerEl.value || !videoId.value) return

  // 銷毀舊的播放器（如果有的話）
  if (player) {
    player.destroy()
  }

  // 建立由 API 控制的新播放器
  player = new window.YT.Player(ytPlayerEl.value, {
    videoId: videoId.value,
    playerVars: {
      autoplay: props.isClassTime ? 0 : 1, // 如果正在上課，就不要自動播放
      controls: 1, // 保留控制列讓使用者可以手動全螢幕
      rel: 0,
      loop: 1,
      playlist: videoId.value,
      mute: props.isMuted ? 1 : 0
    },
    events: {
      onReady: (event) => {
        // 確保靜音狀態與後台同步
        if (props.isMuted) event.target.mute()
        else event.target.unMute()

        // 如果現在是下課，且 API 允許，強制執行播放
        if (!props.isClassTime) {
          event.target.playVideo()
        } else {
          event.target.pauseVideo()
        }
      }
    }
  })
}

const loadYoutubeApi = () => {
  if (!window.YT) {
    const tag = document.createElement('script')
    tag.src = "https://www.youtube.com/iframe_api"
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    
    // API 載入完成後會自動呼叫此全域函式
    window.onYouTubeIframeAPIReady = () => {
      initPlayer()
    }
  } else {
    // 如果之前已經載入過 API，直接初始化
    initPlayer()
  }
}

// 元件掛載時啟動
onMounted(() => {
  if (videoId.value) {
    loadYoutubeApi()
  }
})

// 監聽網址變化 (換天時更新影片)
watch(videoId, (newVal) => {
  if (newVal) initPlayer()
})

// 💡 核心功能：監聽上/下課狀態，程式化自動播放或暫停
watch(() => props.isClassTime, (isClass) => {
  if (!player || !player.pauseVideo) return
  if (isClass) {
    player.pauseVideo()
  } else {
    player.playVideo()
  }
})

// 監聽後台傳來的靜音設定
watch(() => props.isMuted, (muted) => {
  if (!player || !player.mute) return
  if (muted) {
    player.mute()
  } else {
    player.unMute()
  }
})

// 離開網頁時銷毀播放器，釋放記憶體
onBeforeUnmount(() => {
  if (player && typeof player.destroy === 'function') {
    player.destroy()
  }
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px dashed #e2e8f0;
  padding-bottom: 10px;
  margin-bottom: 15px;
}
.card-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  font-size: 0.9rem;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 20px;
}
.status-paused { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
.status-playing { background: #ecfdf5; color: #10b981; border: 1px solid #a7f3d0; }

.card-content {
  width: 100%;
}

/* 💡 將版面縮小至 2/3 (66.66%) 並置中 */
.video-layout-wrapper {
  width: 66.66%;
  margin: 0 auto;
}

/* 確保 YouTube 影片能維持 16:9 比例 */
.video-responsive-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 比例公式 */
  height: 0;
  overflow: hidden;
  border-radius: 8px;
  background-color: #000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

/* 將 API 注入的 iframe 拉滿 16:9 的外框 */
.video-responsive-container :deep(iframe) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 手機版時恢復 100% 寬度，避免過小無法觀看 */
@media (max-width: 768px) {
  .video-layout-wrapper {
    width: 100%;
  }
}
</style>
