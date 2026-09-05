<template>
  <div class="control-panel">
    
    <!-- 🕒 動態時鐘顯示區塊 (支援 10 種樣式) -->
    <div class="clock-container">
      <div class="clock-wrapper" 
           :class="`theme-${actualClockConfig.theme}`" 
           :style="{ '--clk-color': actualClockConfig.color, '--clk-size': actualClockConfig.size + 'px' }">
        
        <div v-if="actualClockConfig.showIcon" class="clock-icon">🕒</div>
        
        <div class="clock-display">
          <!-- 針對復古翻頁時鐘的特殊切割渲染 -->
          <template v-if="actualClockConfig.theme === 'flip'">
            <span v-for="(char, i) in currentTime.split('')" :key="i" 
                  :class="char === ':' ? 'flip-colon' : 'flip-digit'">
              {{ char }}
            </span>
          </template>
          <!-- 其他 9 種樣式的標準渲染 -->
          <template v-else>
            {{ currentTime }}
          </template>
        </div>
        
      </div>
    </div>

    <!-- 🎯 15 顆權限控制按鈕區 -->
    <div class="buttons-grid">
      <!-- 學生/家長主要功能 -->
      <NuxtLink v-if="indexButtonSettings.parentBind" to="/parent-bind" class="nav-btn btn-yellow">👨‍👩‍👦 綁定</NuxtLink>
      
      <NuxtLink v-if="indexButtonSettings.parentMsg" to="/messages/parent" class="nav-btn btn-green">
        💬 家長私訊
        <span v-if="unreadMsgCount > 0" class="badge">{{ unreadMsgCount }}</span>
      </NuxtLink>
      
      <NuxtLink v-if="indexButtonSettings.studentMsg" to="/messages/student" class="nav-btn btn-blue">💬 學生私訊</NuxtLink>
      
      <button v-if="indexButtonSettings.schedule" @click="$emit('openLargeSchedule')" class="nav-btn btn-light-green">📅 顯示班級大課表</button>
      
      <NuxtLink v-if="indexButtonSettings.assignments" to="/assignments" class="nav-btn btn-purple">📚 作業管理</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.discipline" to="/discipline" class="nav-btn btn-dark-blue">⚖️ 秩序管理</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.hygiene" to="/hygiene" class="nav-btn btn-cyan">🧹 衛生管理</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.seats" to="/seats" class="nav-btn btn-dark-green">🪑 座位管理</NuxtLink>
      
      <!-- 老師/幹部管理功能 -->
      <NuxtLink v-if="indexButtonSettings.manageSchedule" to="/admin/schedule" class="nav-btn btn-orange">⚙️ 課表管理</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.exams" to="/admin/exams" class="nav-btn btn-crimson">📝 大考管理</NuxtLink>
      
      <button v-if="indexButtonSettings.emergency" @click="$emit('openPwd', 'emergency')" class="nav-btn btn-red">🚨 緊急通知</button>
      
      <NuxtLink v-if="indexButtonSettings.admin" to="/admin" class="nav-btn btn-grey">⚙️ 後台</NuxtLink>

      <!-- 黑板顯示切換開關 -->
      <button v-if="indexButtonSettings.showSeats" @click="$emit('update:showSeatingChartLocal', !showSeatingChartLocal)" class="nav-btn btn-indigo">👀 顯示教室座位表</button>
      <button v-if="indexButtonSettings.showHygiene" @click="$emit('update:showHygieneLocal', !showHygieneLocal)" class="nav-btn btn-sky">🧹 顯示衛生工作</button>
      
      <!-- 查詢聯絡簿 -->
      <NuxtLink v-if="indexButtonSettings.contactHistory" to="/contact-history" class="nav-btn btn-pink">📅 查詢近期聯絡簿</NuxtLink>
    </div>

    <!-- 📅 目前/下節課狀態列 -->
    <div v-if="scheduleDisplay" class="schedule-status-banner">
      <div class="status-left" :class="{'is-active': scheduleDisplay.current.status === '上課中'}">
        <span class="pulse-dot" v-if="scheduleDisplay.current.status === '上課中'"></span>
        <strong>{{ scheduleDisplay.current.label }}：</strong>
        <span class="subj-text">{{ scheduleDisplay.current.subject }}</span>
        <span class="teacher-name" v-if="scheduleDisplay.current.teacher">({{ scheduleDisplay.current.teacher }})</span>
      </div>
      <div class="status-right" v-if="scheduleDisplay.next">
        <span class="next-label">下一節：</span>
        <span class="subj-text">{{ scheduleDisplay.next.subject }}</span>
        <span class="teacher-name" v-if="scheduleDisplay.next.teacher">({{ scheduleDisplay.next.teacher }})</span>
      </div>
    </div>

    <!-- 📝 考試模式按鈕 (如果開啟) -->
    <div v-if="examData.isExamModeEnabled && isIpBrownlisted" class="exam-trigger-container">
      <button @click="$emit('enterExam')" class="enter-exam-btn">
        切換至大考看板模式 🎯
      </button>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  clockConfig: {
    type: Object,
    default: () => ({ theme: 'classic', color: '#1e293b', size: 35, showIcon: true })
  },
  clockFontSize: Number, // 為了向下兼容舊版傳遞的 prop
  currentTime: String,
  unreadMsgCount: Number,
  scheduleDisplay: Object,
  scheduleButtonConfig: Object,
  isIpBrownlisted: Boolean,
  examData: Object,
  indexButtonSettings: {
    type: Object,
    default: () => ({})
  },
  isScheduleButtonVisible: Boolean,
  seatingChart: Object,
  showSeatingChartLocal: Boolean,
  hygieneData: Object,
  showHygieneLocal: Boolean,
  isHistoryVisibleOnIndex: Boolean
})

const emit = defineEmits(['enterExam', 'openLargeSchedule', 'openPwd', 'update:showSeatingChartLocal', 'update:showHygieneLocal'])

// 💡 智慧防呆：如果上層傳了新的 clockConfig 就用，否則自動拼裝舊版的 clockFontSize
const actualClockConfig = computed(() => {
  if (props.clockConfig && Object.keys(props.clockConfig).length > 0) {
    return props.clockConfig
  }
  return { 
    theme: 'classic', 
    color: '#1e293b', 
    size: props.clockFontSize || 35, 
    showIcon: true 
  }
})
</script>

<style scoped>
.control-panel { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }

/* --- 時鐘總容器基礎設定 --- */
.clock-container { display: flex; justify-content: center; align-items: center; width: 100%; margin: 10px 0 25px 0; }
.clock-wrapper { display: inline-flex; justify-content: center; align-items: center; gap: 15px; font-size: var(--clk-size); color: var(--clk-color); font-variant-numeric: tabular-nums; transition: all 0.3s ease; }
.clock-icon { font-size: calc(var(--clk-size) * 1.1); display: flex; align-items: center; line-height: 1; }

/* 1. 經典預設 (Classic) */
.theme-classic .clock-display { font-weight: 900; }

/* 2. 液晶電子 (LCD) */
.theme-lcd { background: #111; padding: 10px 30px; border-radius: 8px; border: 4px solid #333; font-family: 'Courier New', Courier, monospace; letter-spacing: 3px; }
.theme-lcd .clock-display { text-shadow: 0 0 10px var(--clk-color), 0 0 20px var(--clk-color); font-weight: bold; }

/* 3. 復古翻頁 (Flip) */
.theme-flip .clock-display { display: flex; gap: 6px; align-items: center; }
.flip-digit { background: var(--clk-color); color: #fff; padding: 4px 12px; border-radius: 8px; box-shadow: 0 4px 0 rgba(0,0,0,0.3); position: relative; font-weight: bold; overflow: hidden; text-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1.2;}
.flip-digit::after { content: ''; position: absolute; left: 0; top: 50%; width: 100%; height: 2px; background: rgba(0,0,0,0.3); }
.flip-colon { color: var(--clk-color); font-weight: bold; display: flex; align-items: center; margin: 0 2px; animation: blink 1s infinite; margin-top: -5px;}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* 4. 科技發光 (Neon Glow) */
.theme-neon { background: #0f172a; padding: 12px 40px; border-radius: 50px; box-shadow: 0 0 20px var(--clk-color), inset 0 0 10px var(--clk-color); border: 2px solid var(--clk-color); }
.theme-neon .clock-display { text-shadow: 0 0 10px var(--clk-color), 0 0 20px #fff; font-weight: bold; }

/* 5. 極簡文青 (Minimalist) */
.theme-minimal { font-weight: 300; letter-spacing: -2px; opacity: 0.85; border-bottom: 2px solid var(--clk-color); padding-bottom: 5px; }

/* 6. 漸層流光 (Gradient) */
.theme-gradient .clock-display { background: linear-gradient(45deg, var(--clk-color), #3b82f6, #ec4899); -webkit-background-clip: text; color: transparent; font-weight: 900; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.1)); }

/* 7. 3D 立體 (3D Emboss) */
.theme-emboss { font-weight: 900; text-shadow: 1px 1px 0px #ccc, 2px 2px 0px #bbb, 3px 3px 0px #aaa, 4px 4px 0px #999, 5px 5px 10px rgba(0,0,0,0.4); }

/* 8. 賽博龐克 (Cyberpunk) */
.theme-cyber { background: #fef08a; padding: 12px 35px; border: 4px solid #000; position: relative; font-weight: 900; color: var(--clk-color); letter-spacing: 2px; clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px); }
.theme-cyber .clock-display { text-shadow: 3px 0px 0px #ef4444, -3px 0px 0px #0ea5e9; }

/* 9. 質感毛玻璃 (Glassmorphism) */
.theme-glass { background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); padding: 15px 40px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.6); box-shadow: 0 8px 32px rgba(0,0,0,0.1); font-weight: bold; }

/* 10. 黑板手寫 (Chalkboard) */
.theme-chalk { background: #1f4d36; padding: 15px 40px; border: 6px solid var(--clk-color); border-radius: 8px; box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 5px 15px rgba(0,0,0,0.3); color: #f8fafc !important; }
.theme-chalk .clock-display { font-family: 'Comic Sans MS', 'Chalkboard SE', cursive; font-style: italic; letter-spacing: 2px; text-shadow: 1px 1px 2px rgba(255,255,255,0.4); }


/* --- 按鈕網格與樣式 --- */
.buttons-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 25px; }

.nav-btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 15px; border-radius: 6px; color: white; font-weight: bold; font-size: 0.95rem; text-decoration: none; border: none; cursor: pointer; transition: 0.2s; position: relative;}
.nav-btn:hover { filter: brightness(0.9); transform: translateY(-1px); }

/* 15 顆按鈕專屬色系 (高度還原截圖) */
.btn-yellow { background-color: #d97706; }
.btn-green { background-color: #10b981; }
.btn-blue { background-color: #3b82f6; }
.btn-light-green { background-color: #84cc16; }
.btn-purple { background-color: #8b5cf6; }
.btn-dark-blue { background-color: #1e3a8a; }
.btn-cyan { background-color: #06b6d4; }
.btn-dark-green { background-color: #115e59; }
.btn-orange { background-color: #ea580c; }
.btn-crimson { background-color: #be123c; }
.btn-red { background-color: #ef4444; }
.btn-grey { background-color: #64748b; }
.btn-indigo { background-color: #6366f1; }
.btn-sky { background-color: #0ea5e9; }
.btn-pink { background-color: #ec4899; }

.badge { background: #ef4444; color: white; font-size: 0.75rem; padding: 2px 6px; border-radius: 10px; margin-left: 5px; box-shadow: 0 0 5px rgba(0,0,0,0.2); }

/* --- 狀態列與大考按鈕 --- */
.schedule-status-banner { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 20px; margin-bottom: 20px; font-size: 1.05rem; }
.status-left { display: flex; align-items: center; gap: 8px; color: #475569; }
.status-left.is-active { color: #1e40af; }
.status-right { color: #64748b; }
.pulse-dot { width: 10px; height: 10px; background: #3b82f6; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
.next-label { font-size: 0.9rem; color: #94a3b8; }
.subj-text { font-weight: bold; }
.teacher-name { font-size: 0.9rem; color: #64748b; opacity: 0.8; }

.exam-trigger-container { text-align: center; }
.enter-exam-btn { background: #1e293b; color: white; border: 2px solid #334155; padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 1.05rem;}
.enter-exam-btn:hover { background: #0f172a; border-color: #fbbf24; color: #fbbf24;}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}

@media (max-width: 768px) {
  .schedule-status-banner { flex-direction: column; gap: 10px; text-align: center; }
}
</style>
