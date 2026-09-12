<template>
  <div class="yt-board-card" v-if="videoId">
    <div class="card-header">
      <h3>🎵 今日推薦英語歌曲</h3>
      <span class="status-badge" :class="isClassTime ? 'status-paused' : 'status-playing'">
        {{ isClassTime ? '⏸️ 上課暫停中' : '▶️ 下課播放中' }}
      </span>
    </div>
    
    <div class="card-content">
      <div class="video-layout-wrapper">
        <div class="video-frame-box">
          <div class="video-responsive-container" ref="wrapperEl">
            <!-- 內部將由 JS 動態注入給 YouTube 替換用的 iframe -->
          </div>
          
          <!-- 無情黑畫面疊加層 (只有上課時顯示) -->
          <transition name="fade">
            <div v-if="isClassTime" class="black-overlay">
              <div class="overlay-text">
                <div class="icon">🤫</div>
                <h4>上課中，專心聽講</h4>
                <p>歌曲已隱藏並暫停，下課鐘響將自動恢復播放</p>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  videoUrl: { type: String, default: '' },
  isMuted: { type: Boolean, default: false }, // 歌曲預設不靜音
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
  if (typeof window === 'undefined' || !window.YT || !window.YT.Player || !wrapperEl.value || !videoId.value) return

  if (player) {
    try { player.destroy() } catch(e) {}
    player = null
  }

  wrapperEl.value.innerHTML = '<div></div>'
  const targetEl = wrapperEl.value.firstElementChild

  player = new window.YT.Player(targetEl, {
    width: '100%',
    height: '100%',
    videoId: videoId.value,
    host: 'https://www.youtube-nocookie.com',
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
        console.error("YouTube 播放器發生錯誤", event.data)
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
    const originalOnReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (originalOnReady) originalOnReady()
      initPlayer()
    }
  }
}

watch(videoId, async (newVal) => {
  if (typeof window === 'undefined') return 
  
  if (newVal) {
    await nextTick() 
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
  margin-bottom: 20px;
  transition: 0.3s;
  width: 100%;
  box-sizing: border-box;
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

/* 左側欄位較窄，改為 100% 滿版填滿 */
.video-layout-wrapper {
  width: 100%;
}

.video-frame-box {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  background-color: #000;
}

.video-responsive-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  height: 0;
}

.video-responsive-container :deep(iframe) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.black-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #1e293b; 
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.overlay-text {
  text-align: center;
  color: #94a3b8;
}

.overlay-text .icon {
  font-size: 3.5rem;
  margin-bottom: 10px;
}

.overlay-text h4 {
  margin: 0 0 8px 0;
  font-size: 1.3rem;
  color: #f8fafc;
  letter-spacing: 2px;
}

.overlay-text p {
  margin: 0;
  font-size: 0.95rem;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
