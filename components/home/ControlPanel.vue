<template>
  <div class="control-card">
    
    <!-- 🕒 升級版動態時鐘顯示區塊 (支援 30 種樣式) -->
    <div class="clock-top-bar">
      <div class="clock-wrapper" :class="`theme-${actualClockConfig.theme}`" :style="{ '--clk-color': actualClockConfig.color, '--clk-size': actualClockConfig.size + 'px' }" :data-text="currentTime">
        <div v-if="actualClockConfig.showIcon" class="clock-icon">🕒</div>
        <div class="clock-display-core">
          <template v-if="actualClockConfig.theme === 'flip'">
            <span v-for="(char, i) in currentTime.split('')" :key="i" :class="char === ':' ? 'flip-colon' : 'flip-digit'">{{ char }}</span>
          </template>
          <template v-else>{{ currentTime }}</template>
        </div>
      </div>
      
      <!-- 🚨 警報鈴鐺完美保留 -->
      <NuxtLink v-if="unreadMsgCount > 0" to="/admin" class="icon-alert-bell" title="您有未讀私訊，點擊前往後台！">
        🚨
      </NuxtLink>
    </div>
    
    <div v-if="scheduleDisplay" class="schedule-ticker">
      <div class="current-class">
        <span class="pulse-dot" v-if="scheduleDisplay.current.status === '上課中'"></span>
        <strong>{{ scheduleDisplay.current.label }}：</strong>
        <span class="subject-text">{{ scheduleDisplay.current.subject }}</span>
        <span class="teacher-text" v-if="scheduleDisplay.current.teacher && (!scheduleButtonConfig.teacherOnlyInBrownlist || isIpBrownlisted)">
          ({{ scheduleDisplay.current.teacher }})
        </span>
      </div>
      <div class="next-class" v-if="scheduleDisplay.next">
        <strong>下節課：</strong>
        <span>{{ scheduleDisplay.next.subject }}</span>
      </div>
    </div>

    <button v-if="isIpBrownlisted && examData.isExamModeEnabled && examData.periods && examData.periods.length > 0" 
            @click="emit('enterExam')" class="btn-enter-exam">
      🎓 切換至大考看板模式
    </button>

    <div class="button-group">
      <!-- 💡 完全保留您的正確路由 -->
      <NuxtLink v-if="indexButtonSettings.parentBind" to="/parent-bind" class="btn btn-orange">👨‍👩‍👧 綁定</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.parentMsg" to="/parent-message" class="btn btn-green">💬 家長私訊</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.studentMsg" to="/student-message" class="btn btn-blue">💬 學生私訊</NuxtLink>
      
      <!-- 💡 插入的請假按鈕 -->
      <NuxtLink v-if="indexButtonSettings.parentLeave" to="/leave-application" class="btn btn-teal">📝 家長代學生請假</NuxtLink>
      
      <button v-if="isScheduleButtonVisible" @click="emit('openLargeSchedule')" class="btn btn-lime">🗓️ 顯示班級大課表</button>

      <NuxtLink v-if="indexButtonSettings.assignments" to="/assignments" class="btn btn-purple">📚 作業管理</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.discipline" to="/discipline" class="btn btn-dark-blue">⚖️ 秩序管理</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.hygiene" to="/hygiene" class="btn btn-cyan">🧹 衛生管理</NuxtLink>            
      <NuxtLink v-if="indexButtonSettings.seats" to="/seats" class="btn btn-seat">🪑 座位管理</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.schedule" to="/schedule" class="btn btn-amber">⚙️ 課表管理</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.exams" to="/exams" class="btn btn-rose">📝 大考管理</NuxtLink>
      <button v-if="indexButtonSettings.emergency" @click="emit('openPwd', 'emergency')" class="btn btn-red">🚨 緊急通知</button>
      <NuxtLink v-if="indexButtonSettings.admin" to="/admin" class="btn btn-dark">⚙️ 後台</NuxtLink>
      
      <button v-if="isIpBrownlisted && seatingChart.isVisible && indexButtonSettings.seats" 
              @click="emit('update:showSeatingChartLocal', !showSeatingChartLocal)" class="btn btn-indigo">
        {{ showSeatingChartLocal ? '🙈 隱藏教室座位表' : '👀 顯示教室座位表' }}
      </button>
      
      <button v-if="isIpBrownlisted && hygieneData.isVisibleOnIndex && indexButtonSettings.hygiene" 
              @click="emit('update:showHygieneLocal', !showHygieneLocal)" class="btn btn-sky">
        {{ showHygieneLocal ? '🙈 隱藏衛生工作' : '🧹 顯示衛生工作' }}
      </button>
      
      <NuxtLink v-if="isHistoryVisibleOnIndex" to="/history" class="btn btn-pink">📅 查詢近期聯絡簿</NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  clockConfig: { type: Object, default: () => ({ theme: 'classic', color: '#1e293b', size: 35, showIcon: true }) },
  clockFontSize: Number, // 為了向下相容保留
  currentTime: String,
  unreadMsgCount: Number,
  scheduleDisplay: Object,
  scheduleButtonConfig: Object,
  isIpBrownlisted: Boolean,
  examData: Object,
  indexButtonSettings: Object,
  isScheduleButtonVisible: Boolean,
  seatingChart: Object,
  showSeatingChartLocal: Boolean,
  hygieneData: Object,
  showHygieneLocal: Boolean,
  isHistoryVisibleOnIndex: Boolean
})

const emit = defineEmits(['enterExam', 'openLargeSchedule', 'openPwd', 'update:showSeatingChartLocal', 'update:showHygieneLocal'])

const actualClockConfig = computed(() => {
  if (props.clockConfig && Object.keys(props.clockConfig).length > 0) return props.clockConfig
  return { theme: 'classic', color: '#1e293b', size: props.clockFontSize || 35, showIcon: true }
})
</script>

<style scoped>
.control-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: center; }

/* --- 升級版時鐘區塊樣式 (30 種) --- */
.clock-top-bar { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px; font-weight: bold; }
.clock-wrapper { display: inline-flex; justify-content: center; align-items: center; gap: 15px; font-size: var(--clk-size); color: var(--clk-color); font-variant-numeric: tabular-nums; transition: all 0.3s ease; }
.clock-icon { font-size: calc(var(--clk-size) * 1.1); display: flex; align-items: center; line-height: 1; }
/* 1. 經典預設 */ .theme-classic .clock-display-core { font-weight: 900; }
/* 2. 液晶電子 */ .theme-lcd { background: #111; padding: 10px 30px; border-radius: 8px; border: 4px solid #333; font-family: 'Courier New', Courier, monospace; letter-spacing: 3px; } .theme-lcd .clock-display-core { text-shadow: 0 0 10px var(--clk-color), 0 0 20px var(--clk-color); font-weight: bold; }
/* 3. 復古翻頁 */ .theme-flip .clock-display-core { display: flex; gap: 6px; align-items: center; } .flip-digit { background: var(--clk-color); color: #fff; padding: 4px 12px; border-radius: 8px; box-shadow: 0 4px 0 rgba(0,0,0,0.3); position: relative; font-weight: bold; overflow: hidden; text-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1.2;} .flip-digit::after { content: ''; position: absolute; left: 0; top: 50%; width: 100%; height: 2px; background: rgba(0,0,0,0.3); } .flip-colon { color: var(--clk-color); font-weight: bold; display: flex; align-items: center; margin: 0 2px; animation: blink 1s infinite; margin-top: -5px;}
/* 4. 科技發光 */ .theme-neon { background: #0f172a; padding: 12px 40px; border-radius: 50px; box-shadow: 0 0 20px var(--clk-color), inset 0 0 10px var(--clk-color); border: 2px solid var(--clk-color); } .theme-neon .clock-display-core { text-shadow: 0 0 10px var(--clk-color), 0 0 20px #fff; font-weight: bold; }
/* 5. 極簡文青 */ .theme-minimal { font-weight: 300; letter-spacing: -2px; opacity: 0.85; border-bottom: 2px solid var(--clk-color); padding-bottom: 5px; }
/* 6. 漸層流光 */ .theme-gradient .clock-display-core { background: linear-gradient(45deg, var(--clk-color), #3b82f6, #ec4899); -webkit-background-clip: text; color: transparent; font-weight: 900; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.1)); }
/* 7. 3D 立體 */ .theme-emboss { font-weight: 900; text-shadow: 1px 1px 0px #ccc, 2px 2px 0px #bbb, 3px 3px 0px #aaa, 4px 4px 0px #999, 5px 5px 10px rgba(0,0,0,0.4); }
/* 8. 賽博龐克 */ .theme-cyber { background: #fef08a; padding: 12px 35px; border: 4px solid #000; position: relative; font-weight: 900; color: var(--clk-color); letter-spacing: 2px; clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px); } .theme-cyber .clock-display-core { text-shadow: 3px 0px 0px #ef4444, -3px 0px 0px #0ea5e9; }
/* 9. 毛玻璃 */ .theme-glass { background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); padding: 15px 40px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.6); box-shadow: 0 8px 32px rgba(0,0,0,0.1); font-weight: bold; }
/* 10. 黑板手寫 */ .theme-chalk { background: #1f4d36; padding: 15px 40px; border: 6px solid var(--clk-color); border-radius: 8px; box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 5px 15px rgba(0,0,0,0.3); color: #f8fafc !important; } .theme-chalk .clock-display-core { font-family: 'Comic Sans MS', 'Chalkboard SE', cursive; font-style: italic; letter-spacing: 2px; text-shadow: 1px 1px 2px rgba(255,255,255,0.4); }
/* 11. 黃金奢華 */ .theme-gold { background: #111; padding: 15px 30px; border-radius: 12px; border: 2px solid #b8860b; box-shadow: 0 0 15px rgba(184, 134, 11, 0.4); } .theme-gold .clock-display-core { font-weight: bold; background: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c); -webkit-background-clip: text; color: transparent; text-shadow: 0px 2px 4px rgba(0,0,0,0.5); }
/* 12. 電子紙 */ .theme-eink { background: #f4f4f0; color: #333 !important; padding: 10px 25px; border: 1px solid #ccc; font-family: serif; letter-spacing: 1px; box-shadow: inset 0 0 10px rgba(0,0,0,0.05); } .theme-eink .clock-display-core { font-weight: bold; }
/* 13. 像素藝術 */ .theme-pixel { background: #000; padding: 10px 20px; border: 4px solid var(--clk-color); font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 2px; text-shadow: 2px 2px 0px #333; }
/* 14. 點陣看板 */ .theme-dotmatrix { background: #1a1a1a; padding: 12px 30px; border-radius: 8px; font-family: monospace; letter-spacing: 5px; } .theme-dotmatrix .clock-display-core { color: transparent; text-shadow: 0 0 2px var(--clk-color), 0 0 5px var(--clk-color); background-image: radial-gradient(var(--clk-color) 20%, transparent 20%); background-size: 4px 4px; -webkit-background-clip: text; }
/* 15. 粉彩夢幻 */ .theme-pastel { background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%); padding: 15px 35px; border-radius: 30px; color: #fff !important; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); box-shadow: 0 4px 15px rgba(166, 193, 238, 0.5); }
/* 16. 金屬雕刻 */ .theme-metal { background: #e0e5ec; padding: 15px 35px; border-radius: 10px; box-shadow: 9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255, 0.5); font-weight: 900; color: #8e9aaf !important; text-shadow: 1px 1px 1px #fff, -1px -1px 1px #a3b1c6; }
/* 17. 未來科技 */ .theme-scifi { background: rgba(0, 30, 60, 0.8); border: 1px solid #0ff; padding: 12px 30px; border-radius: 4px; box-shadow: 0 0 10px #0ff, inset 0 0 10px #0ff; font-family: monospace; font-weight: bold; letter-spacing: 3px; position: relative; overflow: hidden;} .theme-scifi::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #0ff; animation: scanline 2s linear infinite; } @keyframes scanline { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
/* 18. 復古打字機 */ .theme-typewriter { background: #fdf6e3; padding: 10px 20px; border-bottom: 2px dashed #d1d5db; font-family: 'Courier New', Courier, monospace; font-weight: bold; letter-spacing: -1px; color: #374151 !important; text-shadow: 1px 1px 0px rgba(0,0,0,0.1); }
/* 19. 血紅警告 */ .theme-alert { background: #450a0a; border: 3px solid #ef4444; padding: 12px 35px; border-radius: 8px; font-weight: 900; color: #fca5a5 !important; animation: red-flash 1s infinite alternate; text-shadow: 0 0 10px #ef4444; } @keyframes red-flash { from { box-shadow: 0 0 5px #ef4444; } to { box-shadow: 0 0 20px #ef4444; } }
/* 20. 森林木紋 */ .theme-wood { background: #78350f; padding: 15px 35px; border-radius: 5px; border: 2px solid #451a03; box-shadow: inset 0 0 15px #451a03; color: #fef3c7 !important; font-weight: bold; text-shadow: -1px -1px 0 #451a03, 1px 1px 0 #d97706; }
/* 21. 水滴果凍 */ .theme-jelly { background: rgba(var(--clk-color), 0.2); padding: 15px 35px; border-radius: 50px; font-weight: 900; backdrop-filter: blur(5px); border-top: 2px solid rgba(255,255,255,0.6); border-bottom: 2px solid rgba(0,0,0,0.1); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
/* 22. 復古街機 */ .theme-arcade { background: #000; padding: 15px 30px; border: 4px dotted var(--clk-color); font-weight: bold; text-shadow: 3px 3px 0 #fff; letter-spacing: 2px; }
/* 23. 極光漸層 */ .theme-aurora { background: linear-gradient(270deg, #00f2fe, #4facfe, #00f2fe); background-size: 200% 200%; animation: aurora-bg 3s ease infinite; padding: 15px 40px; border-radius: 12px; color: white !important; font-weight: 900; text-shadow: 0 2px 4px rgba(0,0,0,0.3); } @keyframes aurora-bg { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
/* 24. 報紙油墨 */ .theme-news { background: #e5e5e5; padding: 10px 25px; border: 1px solid #999; border-top: 4px solid #333; border-bottom: 4px solid #333; font-family: 'Times New Roman', Times, serif; font-weight: bold; color: #222 !important; letter-spacing: 1px; }
/* 25. 藍圖設計 */ .theme-blueprint { background: #1e3a8a; padding: 15px 35px; border: 1px solid #60a5fa; background-image: linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px); background-size: 10px 10px; color: #eff6ff !important; font-family: monospace; font-weight: bold; text-shadow: 1px 1px 0 #1e40af; }
/* 26. 熔岩燈 */ .theme-lava { background: #000; padding: 15px 35px; border-radius: 25px; color: #f97316 !important; font-weight: 900; text-shadow: 0 0 10px #ea580c, 0 0 20px #ef4444; border: 2px solid #ea580c; box-shadow: inset 0 0 15px #991b1b; }
/* 27. 黑客指令 */ .theme-matrix { background: #000; padding: 12px 30px; font-family: 'Courier New', Courier, monospace; font-weight: bold; color: #22c55e !important; text-shadow: 0 0 5px #16a34a; border-left: 4px solid #22c55e; }
/* 28. 冰雪結晶 */ .theme-ice { background: linear-gradient(to bottom, #e0f2fe, #bae6fd); padding: 15px 35px; border-radius: 8px; border: 1px solid #7dd3fc; color: #0369a1 !important; font-weight: 900; text-shadow: 0 1px 2px #fff; box-shadow: inset 0 0 10px rgba(255,255,255,0.8); }
/* 29. 蒸汽龐克 */ .theme-steampunk { background: #451a03; padding: 15px 35px; border-radius: 5px; border: 4px double #d97706; color: #fcd34d !important; font-weight: bold; font-family: serif; text-shadow: 1px 1px 2px #000; box-shadow: 3px 3px 5px rgba(0,0,0,0.5); }
/* 30. 故障藝術 (使用自訂屬性 data-text) */ .theme-glitch .clock-display-core { position: relative; display: inline-block; font-weight: 900; } .theme-glitch .clock-display-core::before, .theme-glitch .clock-display-core::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: transparent; overflow: hidden;} .theme-glitch .clock-display-core::before { left: 2px; text-shadow: -2px 0 #ef4444; clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%); animation: glitch-anim 2.5s infinite linear alternate-reverse; } .theme-glitch .clock-display-core::after { left: -2px; text-shadow: -2px 0 #3b82f6; clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%); animation: glitch-anim-2 3s infinite linear alternate-reverse; } @keyframes glitch-anim { 0% { transform: translate(0) } 20% { transform: translate(-2px, 1px) } 40% { transform: translate(-2px, -1px) } 60% { transform: translate(2px, 1px) } 80% { transform: translate(2px, -1px) } 100% { transform: translate(0) } } @keyframes glitch-anim-2 { 0% { transform: translate(0) } 20% { transform: translate(2px, -1px) } 40% { transform: translate(2px, 1px) } 60% { transform: translate(-2px, -1px) } 80% { transform: translate(-2px, 1px) } 100% { transform: translate(0) } }

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

.icon-alert-bell { font-size: 2.2rem; text-decoration: none; animation: shake 1.5s infinite; filter: drop-shadow(0 2px 4px rgba(239,68,68,0.5)); cursor: pointer; display: flex; align-items: center;}
@keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-15deg); } 75% { transform: rotate(15deg); } }

.schedule-ticker { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px 15px; margin-bottom: 20px; display: flex; justify-content: center; gap: 20px; align-items: center; flex-wrap: wrap; }
.subject-text { font-weight: bold; color: #047857;}
.teacher-text { font-size: 0.95rem; color: #475569; }
.next-class { color: #64748b; font-size: 1rem; border-left: 2px solid #cbd5e1; padding-left: 20px; }
.pulse-dot { width: 10px; height: 10px; background: #3b82f6; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; margin-right: 5px;}
@keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }

.button-group { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.btn { padding: 8px 12px; border-radius: 6px; font-size: 0.95rem; font-weight: bold; color: white !important; border: none; cursor: pointer; display: inline-block; text-decoration: none !important; transition: filter 0.2s;}
.btn:hover { filter: brightness(0.9); }
.btn-orange { background: #f59e0b; }
.btn-green { background: #10b981; }
.btn-blue { background: #3b82f6; }
.btn-teal { background: #14b8a6; } /* 💡 請假專用顏色 */
.btn-lime { background: #84cc16; color: #14532d; border: 1px solid #65a30d;}
.btn-dark { background: #64748b; }
.btn-purple { background: #8b5cf6; }
.btn-red { background: #ef4444; }
.btn-dark-blue { background: #1e3a8a; } 
.btn-seat { background: #0f766e; } 
.btn-cyan { background: #06b6d4; }
.btn-indigo { background: #6366f1; } 
.btn-sky { background: #0ea5e9; }
.btn-pink { background: #ec4899; } 
.btn-amber { background: #d97706; }
.btn-rose { background: #be123c; }
.badge { background: #ef4444; color: white; font-size: 0.75rem; padding: 2px 6px; border-radius: 10px; margin-left: 5px; box-shadow: 0 0 5px rgba(0,0,0,0.2); }

.btn-enter-exam { width: 100%; padding: 12px; background: #991b1b; color: white; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(153, 27, 27, 0.3); animation: subtle-pulse 2s infinite;}

@media (max-width: 768px) {
  .schedule-ticker { flex-direction: column; gap: 10px; text-align: center; }
  .next-class { border-left: none; padding-left: 0; border-top: 1px dashed #cbd5e1; padding-top: 10px; width: 100%;}
}
</style>
