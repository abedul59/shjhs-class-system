<template>
  <div class="clock-top-bar">
    <!-- 💡 這裡改用 --user-size 接收設定值，讓 CSS 有空間進行 RWD 縮放計算 -->
    <div class="clock-wrapper" :class="`theme-${actualClockConfig.theme}`" :style="{ '--clk-color': actualClockConfig.color, '--user-size': actualClockConfig.size + 'px' }" :data-text="currentTime">
      <div v-if="actualClockConfig.showIcon" class="clock-icon">🕒</div>
      <div class="clock-display-core">
        <template v-if="actualClockConfig.theme === 'flip'">
          <span v-for="(char, i) in currentTime.split('')" :key="i" :class="char === ':' ? 'flip-colon' : 'flip-digit'">{{ char }}</span>
        </template>
        <template v-else>{{ currentTime }}</template>
      </div>
    </div>
    
    <NuxtLink v-if="unreadMsgCount > 0" to="/admin" class="icon-alert-bell" title="您有未讀私訊，點擊前往後台！">
      🚨
    </NuxtLink>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  clockConfig: { type: Object, default: () => ({ theme: 'classic', color: '#1e293b', size: 35, showIcon: true }) },
  clockFontSize: Number,
  currentTime: String,
  unreadMsgCount: Number
})

const actualClockConfig = computed(() => {
  if (props.clockConfig && Object.keys(props.clockConfig).length > 0) return props.clockConfig
  return { theme: 'classic', color: '#1e293b', size: props.clockFontSize || 35, showIcon: true }
})
</script>

<style scoped>
.clock-top-bar { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px; font-weight: bold; flex-wrap: wrap; }

/* 💡 基礎響應式框架：加入 max-width 與 box-sizing 避免撐破螢幕 */
.clock-wrapper { 
  --clk-size: var(--user-size); 
  font-size: var(--clk-size); 
  display: inline-flex; justify-content: center; align-items: center; 
  gap: 15px; color: var(--clk-color); font-variant-numeric: tabular-nums; 
  transition: all 0.3s ease; 
  max-width: 100%; box-sizing: border-box; white-space: nowrap; overflow: hidden;
}
.clock-icon { font-size: calc(var(--clk-size) * 1.1); display: flex; align-items: center; line-height: 1; }

/* --- 30 種時鐘樣式 --- */
/* 1. 經典預設 */ .theme-classic .clock-display-core { font-weight: 900; }
/* 2. 液晶電子 */ .theme-lcd { background: #111; padding: 10px 30px; border-radius: 8px; border: 4px solid #333; font-family: 'Courier New', Courier, monospace; letter-spacing: 3px; } .theme-lcd .clock-display-core { text-shadow: 0 0 10px var(--clk-color), 0 0 20px var(--clk-color); font-weight: bold; }
/* 3. 復古翻頁 */ .theme-flip .clock-display-core { display: flex; gap: 6px; align-items: center; } .flip-digit { background: var(--clk-color); color: #fff; padding: 4px 12px; border-radius: 8px; box-shadow: 0 4px 0 rgba(0,0,0,0.3); position: relative; font-weight: bold; overflow: hidden; text-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1.2;} .flip-digit::after { content: ''; position: absolute; left: 0; top: 50%; width: 100%; height: 2px; background: rgba(0,0,0,0.3); } .flip-colon { color: var(--clk-color); font-weight: bold; display: flex; align-items: center; margin: 0 2px; animation: blink 1s infinite; margin-top: -5px;}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
/* 4. 科技發光 */ .theme-neon { background: #0f172a; padding: 12px 40px; border-radius: 50px; box-shadow: 0 0 20px var(--clk-color), inset 0 0 10px var(--clk-color); border: 2px solid var(--clk-color); } .theme-neon .clock-display-core { text-shadow: 0 0 10px var(--clk-color), 0 0 20px #fff; font-weight: bold; }
/* 5. 極簡文青 */ .theme-minimal { font-weight: 300; letter-spacing: -2px; opacity: 0.85; border-bottom: 2px solid var(--clk-color); padding-bottom: 5px; }
/* 6. 漸層流光 */ .theme-gradient .clock-display-core { background: linear-gradient(45deg, var(--clk-color), #3b82f6, #ec4899); -webkit-background-clip: text; color: transparent; font-weight: 900; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.1)); }
/* 7. 3D 立體 */ .theme-emboss { font-weight: 900; text-shadow: 1px 1px 0px #ccc, 2px 2px 0px #bbb, 3px 3px 0px #aaa, 4px 4px 0px #999, 5px 5px 10px rgba(0,0,0,0.4); }
/* 8. 賽博龐克 */ .theme-cyber { background: #fef08a; padding: 12px 35px; border: 4px solid #000; position: relative; font-weight: 900; color: var(--clk-color); letter-spacing: 2px; clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px); } .theme-cyber .clock-display-core { text-shadow: 3px 0px 0px #ef4444, -3px 0px 0px #0ea5e9; }
/* 9. 毛玻璃 */ .theme-glass { background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); padding: 15px 40px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.6); box-shadow: 0 8px 32px rgba(0,0,0,0.1); font-weight: bold; }
/* 10. 黑板手寫*/ .theme-chalk { background: #1f4d36; padding: 15px 40px; border: 6px solid var(--clk-color); border-radius: 8px; box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 5px 15px rgba(0,0,0,0.3); color: #f8fafc !important; } .theme-chalk .clock-display-core { font-family: 'Comic Sans MS', 'Chalkboard SE', cursive; font-style: italic; letter-spacing: 2px; text-shadow: 1px 1px 2px rgba(255,255,255,0.4); }
/* 11. 黃金奢華*/ .theme-gold { background: #111; padding: 15px 30px; border-radius: 12px; border: 2px solid #b8860b; box-shadow: 0 0 15px rgba(184, 134, 11, 0.4); } .theme-gold .clock-display-core { font-weight: bold; background: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c); -webkit-background-clip: text; color: transparent; text-shadow: 0px 2px 4px rgba(0,0,0,0.5); }
/* 12. 電子紙 */ .theme-eink { background: #f4f4f0; color: #333 !important; padding: 10px 25px; border: 1px solid #ccc; font-family: serif; letter-spacing: 1px; box-shadow: inset 0 0 10px rgba(0,0,0,0.05); } .theme-eink .clock-display-core { font-weight: bold; }
/* 13. 像素藝術*/ .theme-pixel { background: #000; padding: 10px 20px; border: 4px solid var(--clk-color); font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 2px; text-shadow: 2px 2px 0px #333; }
/* 14. 點陣看板*/ .theme-dotmatrix { background: #1a1a1a; padding: 12px 30px; border-radius: 8px; font-family: monospace; letter-spacing: 5px; } .theme-dotmatrix .clock-display-core { color: transparent; text-shadow: 0 0 2px var(--clk-color), 0 0 5px var(--clk-color); background-image: radial-gradient(var(--clk-color) 20%, transparent 20%); background-size: 4px 4px; -webkit-background-clip: text; }
/* 15. 粉彩夢幻*/ .theme-pastel { background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%); padding: 15px 35px; border-radius: 30px; color: #fff !important; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); box-shadow: 0 4px 15px rgba(166, 193, 238, 0.5); }
/* 16. 金屬雕刻*/ .theme-metal { background: #e0e5ec; padding: 15px 35px; border-radius: 10px; box-shadow: 9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255, 0.5); font-weight: 900; color: #8e9aaf !important; text-shadow: 1px 1px 1px #fff, -1px -1px 1px #a3b1c6; }
/* 17. 未來科技*/ .theme-scifi { background: rgba(0, 30, 60, 0.8); border: 1px solid #0ff; padding: 12px 30px; border-radius: 4px; box-shadow: 0 0 10px #0ff, inset 0 0 10px #0ff; font-family: monospace; font-weight: bold; letter-spacing: 3px; position: relative;} .theme-scifi::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #0ff; animation: scanline 2s linear infinite; } @keyframes scanline { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
/* 18. 復古打字*/ .theme-typewriter { background: #fdf6e3; padding: 10px 20px; border-bottom: 2px dashed #d1d5db; font-family: 'Courier New', Courier, monospace; font-weight: bold; letter-spacing: -1px; color: #374151 !important; text-shadow: 1px 1px 0px rgba(0,0,0,0.1); }
/* 19. 血紅警告*/ .theme-alert { background: #450a0a; border: 3px solid #ef4444; padding: 12px 35px; border-radius: 8px; font-weight: 900; color: #fca5a5 !important; animation: red-flash 1s infinite alternate; text-shadow: 0 0 10px #ef4444; } @keyframes red-flash { from { box-shadow: 0 0 5px #ef4444; } to { box-shadow: 0 0 20px #ef4444; } }
/* 20. 森林木紋*/ .theme-wood { background: #78350f; padding: 15px 35px; border-radius: 5px; border: 2px solid #451a03; box-shadow: inset 0 0 15px #451a03; color: #fef3c7 !important; font-weight: bold; text-shadow: -1px -1px 0 #451a03, 1px 1px 0 #d97706; }
/* 21. 水滴果凍*/ .theme-jelly { background: rgba(var(--clk-color), 0.2); padding: 15px 35px; border-radius: 50px; font-weight: 900; backdrop-filter: blur(5px); border-top: 2px solid rgba(255,255,255,0.6); border-bottom: 2px solid rgba(0,0,0,0.1); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
/* 22. 復古街機*/ .theme-arcade { background: #000; padding: 15px 30px; border: 4px dotted var(--clk-color); font-weight: bold; text-shadow: 3px 3px 0 #fff; letter-spacing: 2px; }
/* 23. 極光漸層*/ .theme-aurora { background: linear-gradient(270deg, #00f2fe, #4facfe, #00f2fe); background-size: 200% 200%; animation: aurora-bg 3s ease infinite; padding: 15px 40px; border-radius: 12px; color: white !important; font-weight: 900; text-shadow: 0 2px 4px rgba(0,0,0,0.3); } @keyframes aurora-bg { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
/* 24. 報紙油墨*/ .theme-news { background: #e5e5e5; padding: 10px 25px; border: 1px solid #999; border-top: 4px solid #333; border-bottom: 4px solid #333; font-family: 'Times New Roman', Times, serif; font-weight: bold; color: #222 !important; letter-spacing: 1px; }
/* 25. 藍圖設計*/ .theme-blueprint { background: #1e3a8a; padding: 15px 35px; border: 1px solid #60a5fa; background-image: linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px); background-size: 10px 10px; color: #eff6ff !important; font-family: monospace; font-weight: bold; text-shadow: 1px 1px 0 #1e40af; }
/* 26. 熔岩燈  */ .theme-lava { background: #000; padding: 15px 35px; border-radius: 25px; color: #f97316 !important; font-weight: 900; text-shadow: 0 0 10px #ea580c, 0 0 20px #ef4444; border: 2px solid #ea580c; box-shadow: inset 0 0 15px #991b1b; }
/* 27. 黑客指令*/ .theme-matrix { background: #000; padding: 12px 30px; font-family: 'Courier New', Courier, monospace; font-weight: bold; color: #22c55e !important; text-shadow: 0 0 5px #16a34a; border-left: 4px solid #22c55e; }
/* 28. 冰雪結晶*/ .theme-ice { background: linear-gradient(to bottom, #e0f2fe, #bae6fd); padding: 15px 35px; border-radius: 8px; border: 1px solid #7dd3fc; color: #0369a1 !important; font-weight: 900; text-shadow: 0 1px 2px #fff; box-shadow: inset 0 0 10px rgba(255,255,255,0.8); }
/* 29. 蒸汽龐克*/ .theme-steampunk { background: #451a03; padding: 15px 35px; border-radius: 5px; border: 4px double #d97706; color: #fcd34d !important; font-weight: bold; font-family: serif; text-shadow: 1px 1px 2px #000; box-shadow: 3px 3px 5px rgba(0,0,0,0.5); }
/* 30. 故障藝術*/ .theme-glitch .clock-display-core { position: relative; display: inline-block; font-weight: 900; } .theme-glitch .clock-display-core::before, .theme-glitch .clock-display-core::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: transparent; overflow: hidden;} .theme-glitch .clock-display-core::before { left: 2px; text-shadow: -2px 0 #ef4444; clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%); animation: glitch-anim 2.5s infinite linear alternate-reverse; } .theme-glitch .clock-display-core::after { left: -2px; text-shadow: -2px 0 #3b82f6; clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%); animation: glitch-anim-2 3s infinite linear alternate-reverse; } @keyframes glitch-anim { 0% { transform: translate(0) } 20% { transform: translate(-2px, 1px) } 40% { transform: translate(-2px, -1px) } 60% { transform: translate(2px, 1px) } 80% { transform: translate(2px, -1px) } 100% { transform: translate(0) } } @keyframes glitch-anim-2 { 0% { transform: translate(0) } 20% { transform: translate(2px, -1px) } 40% { transform: translate(2px, 1px) } 60% { transform: translate(-2px, -1px) } 80% { transform: translate(-2px, 1px) } 100% { transform: translate(0) } }

.icon-alert-bell { font-size: 2.2rem; text-decoration: none; animation: shake 1.5s infinite; filter: drop-shadow(0 2px 4px rgba(239,68,68,0.5)); cursor: pointer; display: flex; align-items: center;}
@keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-15deg); } 75% { transform: rotate(15deg); } }

/* ========================================================================================= */
/* 💡 RWD 響應式：限制手機版最大字體並大幅縮減 Padding，絕對不撐破螢幕！ */
/* ========================================================================================= */
@media (max-width: 768px) {
  .clock-wrapper {
    /* 強制文字大小不超過螢幕的 9vw，同時確保最大字體維持設定值 */
    --clk-size: min(var(--user-size), 9vw);
    padding-left: 20px !important;
    padding-right: 20px !important;
    gap: 8px;
    border-width: 2px !important;
  }
  .clock-display-core { letter-spacing: 1px !important; }
  .theme-flip .clock-display-core { gap: 4px; }
  .flip-digit { padding: 4px 8px !important; border-radius: 6px !important; }
  .theme-cyber { padding: 10px 20px !important; }
}

@media (max-width: 480px) {
  .clock-wrapper {
    /* 更小螢幕時文字為 12vw，並極限縮小 padding */
    --clk-size: min(var(--user-size), 12vw);
    padding: 12px 15px !important;
    gap: 5px;
    border-width: 1px !important;
  }
  .clock-display-core { letter-spacing: 0px !important; }
  .theme-flip .clock-display-core { gap: 2px; }
  .flip-digit { padding: 3px 5px !important; border-radius: 4px !important; }
  
  /* 針對佔版面寬度的特殊樣式做極限收斂 */
  .theme-arcade { letter-spacing: 0px !important; text-shadow: 2px 2px 0 #fff !important; }
  .theme-matrix { letter-spacing: -1px !important; }
  .theme-cyber { clip-path: none !important; /* 手機取消多邊形裁切確保空間 */ }
  .theme-news { padding: 8px 12px !important; border-top-width: 2px !important; border-bottom-width: 2px !important;}
  .theme-steampunk { border-width: 2px !important; }
  .theme-glitch .clock-display-core::before { text-shadow: -1px 0 #ef4444 !important; }
  .theme-glitch .clock-display-core::after { text-shadow: -1px 0 #3b82f6 !important; }
  
  .icon-alert-bell { font-size: 1.8rem; }
}
</style>
