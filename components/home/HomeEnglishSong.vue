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
          
          <div class="video-responsive-container">
            <!-- 💡 終極解法：改用原生 iframe，完全避開 API 衝突 -->
            <iframe
              ref="ytIframe"
              :src="iframeSrc"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
          
          <!-- 無情黑畫面疊加層 (只有上課時顯示) -->
          <transition name="fade">
            <div v-if="isClassTime" class="black-overlay">
              <div class="overlay-text">
                <div class="icon">🤫</div>
                <h4>上課中，專心聽講</h4>
                <p>歌曲已暫停，下課鐘響將自動恢復</p>
              </div>
            </div>
          </transition>
          
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  videoUrl: { type: String, default: '' },
  isMuted: { type: Boolean, default: false },
  isClassTime: { type: Boolean, default: false }
})

const ytIframe = ref(null)

// 💡 解析網址，抓出 11 碼的影片 ID
const videoId = computed(() => {
  if (!props.videoUrl) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = props.videoUrl.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
})

// 💡 動態產生 YouTube 網址，加上 enablejsapi=1 允許我們從外部控制暫停/播放
const iframeSrc = computed(() => {
  if (!videoId.value) return ''
  const autoplay = props.isClassTime ? 0 : 1
  const mute = props.isMuted ? 1 : 0
  return `https://www.youtube-nocookie.com/embed/${videoId.value}?enablejsapi=1&autoplay=${autoplay}&mute=${mute}&loop=1&playlist=${videoId.value}&rel=0&controls=1`
})

// 💡 透過瀏覽器原生的 postMessage 遙控 YouTube 影片
const sendCommand = (func) => {
  if (ytIframe.value && ytIframe.value.contentWindow) {
    ytIframe.value.contentWindow.postMessage(JSON.stringify({
      event: 'command',
      func: func,
      args: []
    }), '*')
  }
}

// 監聽上下課狀態
watch(() => props.isClassTime, (isClass) => {
  if (isClass) {
    sendCommand('pauseVideo')
  } else {
    sendCommand('playVideo')
  }
})

// 監聽靜音狀態 (若未來需要擴充)
watch(() => props.isMuted, (muted) => {
  if (muted) {
    sendCommand('mute')
  } else {
    sendCommand('unMute')
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
  padding-bottom: 56.25%; /* 完美的 16:9 比例 */
  height: 0;
}

/* 確保 iframe 乖乖填滿容器 */
.video-responsive-container iframe {
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
