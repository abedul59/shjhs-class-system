<template>
  <div class="yt-board-card" v-if="videoId">
    <div class="card-header">
      <h3>📺 今日推薦影片</h3>
      <span class="status-badge" :class="isClassTime ? 'status-paused' : 'status-playing'">
        {{ isClassTime ? '⏸️ 上課暫停中' : '▶️ 下課播放中' }}
      </span>
    </div>
    
    <div class="card-content">
      <div class="video-layout-wrapper">
        <!-- 💡 加入 wrapperEl 作為隔離層，保護內部的 iframe 不被 Vue 意外覆蓋 -->
        <div class="video-responsive-container" ref="wrapperEl">
          <!-- 內部將由 JS 動態注入給 YouTube 替換用的 div -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  videoUrl: { type: String, default: '' },
  isMuted: { type: Boolean, default: true },
  isClassTime: { type: Boolean, default: false }
})

const videoId = computed(() => {
  if (!props.videoUrl) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = props.videoUrl.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
})

const wrapperEl = ref(null)
let player = null

const initPlayer = () => {
  // 💡 防呆：確保環境為瀏覽器，且 YT API、DOM 元素都已備妥
  if (typeof window === 'undefined' || !window.YT || !window.YT.Player || !wrapperEl.value || !videoId.value) return

  // 如果原本已經有播放器，先安全銷毀
  if (player) {
    try { player.destroy() } catch(e) {}
    player = null
  }

  // 💡 動態建立一個乾淨的 div 讓 YouTube 替換，這樣就不會跟 Vue 的 Virtual DOM 打架
  wrapperEl.value.innerHTML = '<div></div>'
  const targetEl = wrapperEl.value.firstElementChild

  player = new window.YT.Player(targetEl, {
    width: '100%',
    height: '100%',
    videoId: videoId.value,
    host: 'https://www.youtube-nocookie.com', // 💡 改用無 Cookie 網域，防電腦版隱私阻擋器
    playerVars: {
      autoplay: props.isClassTime ? 0 : 1,
      controls: 1,
      rel: 0,
      loop: 1,
      playlist: videoId.value,
      mute: props.isMuted ? 1 : 0,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      playsinline: 1
    },
    events: {
      onReady: (event) => {
        if (props.isMuted) event.target.mute()
        else event.target.unMute()

        if (!props.isClassTime) {
          event.target.playVideo()
        } else {
          event.target.pauseVideo()
        }
      },
      onError: (event) => {
        console.error("YouTube 播放器發生錯誤，代碼:", event.data)
      }
    }
  })
}

const loadYoutubeApi = () => {
  if (typeof window === 'undefined') return

  if (!window.YT) {
    const tag = document.createElement('script')
    tag.src = "https://www.youtube.com/iframe_api"
    const firstScriptTag = document.getElementsByTagName('script')[0]
    
    if (firstScriptTag) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    } else {
      document.head.appendChild(tag)
    }
    
    window.onYouTubeIframeAPIReady = () => {
      initPlayer()
    }
  } else if (window.YT && window.YT.Player) {
    initPlayer()
  } else {
    // 應對網路慢導致 YT 物件存在但 Player 還沒載入完的情況
    const originalOnReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (originalOnReady) originalOnReady()
      initPlayer()
    }
  }
}

// 💡 最關鍵的修正：利用 nextTick 等待 DOM 確實畫好後才執行
watch(videoId, async (newVal) => {
  if (typeof window === 'undefined') return // 確保只在客戶端執行
  
  if (newVal) {
    await nextTick() // 等待 v-if="videoId" 的 HTML 真正長出來
    loadYoutubeApi()
  } else {
    if (player) {
      try { player.destroy() } catch(e) {}
      player = null
    }
  }
}, { immediate: true })

watch(() => props.isClassTime, (isClass) => {
  if (!player || typeof player.pauseVideo !== 'function') return
  if (isClass) {
    player.pauseVideo()
  } else {
    player.playVideo()
  }
})

watch(() => props.isMuted, (muted) => {
  if (!player || typeof player.mute !== 'function') return
  if (muted) {
    player.mute()
  } else {
    player.unMute()
  }
})

onBeforeUnmount(() => {
  if (player && typeof player.destroy === 'function') {
    try { player.destroy() } catch(e) {}
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

.video-layout-wrapper {
  width: 66.66%;
  margin: 0 auto;
}

.video-responsive-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
  border-radius: 8px;
  background-color: #000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.video-responsive-container :deep(iframe) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

@media (max-width: 768px) {
  .video-layout-wrapper {
    width: 100%;
  }
}
</style>
