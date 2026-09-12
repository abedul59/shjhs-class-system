<template>
  <!-- 狀態一：下課時，公佈欄縮小為左側懸浮按鈕 (位置偏上) -->
  <div v-if="isBoardsCollapsed" class="floating-btn-container top-pos" @click="isBoardsCollapsed = false" title="展開公佈欄">
    <div class="floating-btn">
      <span class="icon">📌</span>
      <span class="text">公<br>告<br>欄</span>
    </div>
  </div>

  <!-- 狀態二：展開時的完整公佈欄 (加入 relative-wrap 以便讓按鈕漂浮) -->
  <div v-show="!isBoardsCollapsed" class="boards-container relative-wrap">
    
    <!-- 💡 絕對定位的迷你懸浮按鈕：不佔空間，漂浮在右上角間隙 -->
    <button v-if="!isClassTime" @click="isBoardsCollapsed = true" class="btn-collapse-float">
      收起公佈欄 ➔
    </button>

    <!-- 📢 家長須知 (僅褐名單外顯示) -->
    <div v-if="isNoticeBoardVisibleOnIndex && !isIpBrownlisted" class="blackboard top-board">
      <h2 class="board-title notice-title">📢 家長須知事項</h2>
      <div class="dashed-divider"></div>
      
      <div class="board-content-wrapper" :class="{ 'is-collapsed': !isNoticeExpanded }">
        <div class="board-content">
          <div v-if="parentNotices.length === 0" class="empty-text-italic">目前無特別須知事項</div>
          <ul v-else class="item-list">
            <li v-for="(notice, index) in parentNotices" :key="'n-'+index" class="rich-notice-item">
              <span class="bullet">📌</span>
              <div class="rich-notice-wrapper">
                <div class="rich-notice-content" v-html="privacyFilter(notice.content)"></div>
                <div v-if="notice.links && notice.links.length > 0" class="notice-links-box">
                  <a v-for="(link, i) in notice.links" :key="'nlink-'+i" :href="link.url" target="_blank" class="notice-link-btn">
                    🔗 {{ privacyFilter(link.title) || '參考連結' }}
                  </a>
                </div>
              </div>
            </li>
          </ul>
        </div>
        <div v-if="!isNoticeExpanded" class="fade-mask"></div>
      </div>
      
      <div class="expand-action desktop-only" v-if="parentNotices.length > 0">
        <button @click="isNoticeExpanded = !isNoticeExpanded" class="btn-expand">
          {{ isNoticeExpanded ? '▲ 收起內容' : '▼ 展開完整須知' }}
        </button>
      </div>
    </div>

    <!-- 📌 家長公佈欄 (僅限褐名單外顯示) -->
    <div v-if="isParentAnnouncementVisibleOnIndex && parentAnnouncements.length > 0 && !isIpBrownlisted" class="corkboard announcement-board">
      <h2 class="board-title cork-title">📌 家長公佈欄</h2>
      <div class="cork-divider"></div>
      <div class="cork-cards-container">
        <div v-for="ann in parentAnnouncements" :key="'p-ann-'+ann.id" class="cork-card">
          <div class="pin">📍</div>
          <div class="cork-card-header">
            <h3 class="cork-card-title">{{ privacyFilter(ann.title) }}</h3>
            <span class="cork-card-date">{{ formatDateTime(ann.date) }}</span>
          </div>
          <div class="cork-card-content" v-html="formatNL(ann.content)"></div>
          <div v-if="ann.links && ann.links.length > 0" class="cork-card-links">
             <a v-for="(link, i) in ann.links" :key="i" :href="link.url" target="_blank" class="cork-link">
               🔗 {{ privacyFilter(link.name) }}
             </a>
          </div>
        </div>
      </div>
    </div>

    <!-- 📌 班級公佈欄 (僅限褐名單內顯示) -->
    <div v-if="isAnnouncementVisibleOnIndex && announcements.length > 0 && isIpBrownlisted" class="corkboard announcement-board">
      <div class="board-header-clickable" @click="isClassAnnExpanded = !isClassAnnExpanded">
        <h2 class="board-title cork-title">📌 班級公佈欄</h2>
        <span class="toggle-icon">{{ isClassAnnExpanded ? '▲ 點擊收起' : '▼ 點擊展開全部' }}</span>
      </div>
      
      <div v-show="isClassAnnExpanded">
        <div class="cork-divider"></div>
        <div class="cork-cards-container">
          <div v-for="ann in announcements" :key="ann.id" class="cork-card">
            <div class="pin">📍</div>
            <div class="cork-card-header">
              <h3 class="cork-card-title">{{ privacyFilter(ann.title) }}</h3>
              <span class="cork-card-date">{{ formatDateTime(ann.date) }}</span>
            </div>
            <div class="cork-card-content" v-html="formatNL(ann.content)"></div>
            <div v-if="ann.links && ann.links.length > 0" class="cork-card-links">
               <a v-for="(link, i) in ann.links" :key="i" :href="link.url" target="_blank" class="cork-link">
                 🔗 {{ privacyFilter(link.name) }}
               </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  isIpBrownlisted: Boolean,
  isNoticeBoardVisibleOnIndex: Boolean,
  parentNotices: Array,
  isParentAnnouncementVisibleOnIndex: Boolean,
  parentAnnouncements: Array,
  isAnnouncementVisibleOnIndex: Boolean,
  announcements: Array,
  privacyFilter: Function,
  formatDateTime: Function,
  formatNL: Function,
  isClassTime: { type: Boolean, default: false }
})

const isNoticeExpanded = ref(false)
const isClassAnnExpanded = ref(false)

const isBoardsCollapsed = ref(false)

watch(() => props.isClassTime, (newIsClassTime) => {
  isBoardsCollapsed.value = !newIsClassTime
}, { immediate: true })
</script>

<style scoped>
.boards-container { display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px;}

/* 💡 讓公佈欄容器相對定位，以便裡面的迷你按鈕絕對定位 */
.relative-wrap {
  position: relative;
}

/* 💡 迷你懸浮收起按鈕：浮在右上角空隙 */
.btn-collapse-float {
  position: absolute;
  top: -25px; /* 利用上方的 margin 空隙，完全不佔用排版空間 */
  right: 0;
  background-color: transparent;
  color: #64748b;
  border: 1px dashed #cbd5e1;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
  z-index: 10;
}
.btn-collapse-float:hover {
  background-color: #e2e8f0;
  color: #334155;
  border-color: #94a3b8;
}

/* 左側懸浮按鈕樣式 */
.floating-btn-container {
  position: fixed;
  left: 0;
  z-index: 100;
  cursor: pointer;
}

.top-pos {
  top: 25%;
  transform: translateY(-50%);
}

.floating-btn {
  background-color: #ea580c; 
  color: white;
  padding: 15px 8px 15px 12px;
  border-radius: 0 12px 12px 0;
  box-shadow: 2px 4px 10px rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 1.1rem;
  line-height: 1.2;
  transition: background-color 0.2s, padding-left 0.2s, transform 0.2s;
  border: 1px solid #c2410c;
  border-left: none;
}

.floating-btn:hover {
  background-color: #c2410c;
  padding-left: 18px;
}

/* -- 原本木紋公佈欄的華麗 CSS -- */
.corkboard { background-color: #d1a36a; background-image: url('data:image/svg+xml;utf8,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.12"/></svg>'); border: 10px solid #754d29; border-radius: 8px; padding: 20px 25px; box-shadow: 0 6px 12px rgba(0,0,0,0.15), inset 0 0 10px rgba(0,0,0,0.3); }
.board-header-clickable { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; padding: 5px; border-radius: 8px; transition: 0.2s;}
.board-header-clickable:hover { background: rgba(255,255,255,0.1); }
.toggle-icon { font-weight: bold; color: #78350f; font-size: 0.95rem; background: rgba(255,255,255,0.4); padding: 5px 12px; border-radius: 20px; }
.cork-title { color: #4a2b18; text-shadow: 1px 1px 0px rgba(255,255,255,0.3); font-size: 1.4rem; margin: 0; }
.cork-divider { border-bottom: 2px dashed #92400e; margin: 15px 0; opacity: 0.5; }
.cork-cards-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.cork-card { background: #fef9c3; border-radius: 2px 2px 10px 2px; padding: 15px 20px; box-shadow: 2px 4px 6px rgba(0,0,0,0.15); position: relative; }
.pin { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); font-size: 1.8rem; z-index: 2; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
.cork-card-header { border-bottom: 1px solid #fcd34d; padding-bottom: 10px; margin-bottom: 10px; }
.cork-card-title { margin: 0 0 5px 0; color: #92400e; font-size: 1.2rem; }
.cork-card-date { color: #b45309; font-size: 0.85rem; font-weight: bold; }
.cork-card-content { color: #451a03; line-height: 1.5; font-size: 1rem; margin-bottom: 15px; word-wrap: break-word;}
.cork-card-links { display: flex; flex-direction: column; gap: 8px; }

.cork-link { display: inline-flex; align-items: center; justify-content: center; background: #fbbf24; color: #92400e; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 0.95rem; border: 1px dashed #d97706; transition: 0.2s; text-align: left; word-break: break-word; white-space: normal; line-height: 1.4;}
.cork-link:hover { background: #f59e0b; color: white; }

.blackboard { background-color: #315243; border: 10px solid #754d29; border-radius: 8px; padding: 20px 25px; box-shadow: 0 6px 12px rgba(0,0,0,0.15), inset 0 0 10px rgba(0,0,0,0.3); }
.board-title { margin: 0; font-size: 1.4rem; font-weight: bold; }
.notice-title { color: #fca5a5; }
.dashed-divider { border-bottom: 2px dashed #94a3b8; margin: 15px 0; opacity: 0.6; }
.board-content-wrapper { position: relative; transition: max-height 0.3s ease; }
.board-content { color: white; min-height: 40px; }
.is-collapsed { max-height: 140px; overflow: hidden; }
.fade-mask { position: absolute; bottom: 0; left: 0; width: 100%; height: 60px; background: linear-gradient(to bottom, rgba(49, 82, 67, 0), rgba(49, 82, 67, 1)); pointer-events: none; }
.expand-action { text-align: center; margin-top: 5px; }
.btn-expand { background: transparent; border: 1px dashed #fca5a5; color: #fca5a5; padding: 6px 20px; border-radius: 20px; cursor: pointer; font-size: 0.95rem; transition: 0.2s; font-weight: bold;}
.btn-expand:hover { background: rgba(252, 165, 165, 0.15); }
.desktop-only { display: block; }
.empty-text-italic { color: #94a3b8; font-style: italic; font-size: 1.1rem; }
.item-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.rich-notice-item { display: flex; align-items: flex-start; gap: 8px; width: 100%; font-size: 1.15rem; letter-spacing: 0.5px; margin-bottom: 10px;}

.rich-notice-wrapper { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }

.rich-notice-content { word-wrap: break-word; overflow-wrap: break-word; line-height: 1.5; }
.rich-notice-content :deep(p) { margin: 0 0 5px 0; }
.rich-notice-content :deep(a) { color: #fbbf24; text-decoration: underline; word-break: break-all; }
.rich-notice-content :deep(ol), .rich-notice-content :deep(ul) { margin: 5px 0; padding-left: 20px; }

.notice-links-box { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px; width: 100%;}
.notice-link-btn { display: inline-flex; align-items: flex-start; background: #e0f2fe; color: #0369a1; padding: 8px 15px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 0.95rem; transition: 0.2s; border: 1px solid #bae6fd; word-break: break-word; white-space: normal; line-height: 1.4; max-width: 100%;}
.notice-link-btn:hover { background: #bae6fd; color: #0284c7; box-shadow: 0 2px 4px rgba(0,0,0,0.1);}

@media (max-width: 768px) {
  .corkboard, .blackboard { padding: 15px 10px; border-width: 8px; }
  .cork-cards-container { grid-template-columns: 1fr; gap: 15px; }
  .cork-card { padding: 15px; }
  .is-collapsed { max-height: none; overflow: visible; }
  .fade-mask { display: none; }
  .desktop-only { display: none; }
  
  .notice-links-box { flex-direction: column; }
  .notice-link-btn { width: 100%; box-sizing: border-box; }
}
</style>
