<template>
  <div class="control-card">
    
    <!-- 🕒 升級版動態時鐘顯示區塊 (支援 10 種樣式，相容舊版) -->
    <div class="clock-top-bar">
      <div class="clock-wrapper" :class="`theme-${actualClockConfig.theme}`" :style="{ '--clk-color': actualClockConfig.color, '--clk-size': actualClockConfig.size + 'px' }">
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

/* --- 升級版時鐘區塊樣式 --- */
.clock-top-bar { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px; font-weight: bold; }
.clock-wrapper { display: inline-flex; justify-content: center; align-items: center; gap: 15px; font-size: var(--clk-size); color: var(--clk-color); font-variant-numeric: tabular-nums; transition: all 0.3s ease; }
.clock-icon { font-size: calc(var(--clk-size) * 1.1); display: flex; align-items: center; line-height: 1; }
.theme-classic .clock-display-core { font-weight: 900; }
.theme-lcd { background: #111; padding: 10px 30px; border-radius: 8px; border: 4px solid #333; font-family: 'Courier New', Courier, monospace; letter-spacing: 3px; }
.theme-lcd .clock-display-core { text-shadow: 0 0 10px var(--clk-color), 0 0 20px var(--clk-color); font-weight: bold; }
.theme-flip .clock-display-core { display: flex; gap: 6px; align-items: center; }
.flip-digit { background: var(--clk-color); color: #fff; padding: 4px 12px; border-radius: 8px; box-shadow: 0 4px 0 rgba(0,0,0,0.3); position: relative; font-weight: bold; overflow: hidden; text-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1.2;}
.flip-digit::after { content: ''; position: absolute; left: 0; top: 50%; width: 100%; height: 2px; background: rgba(0,0,0,0.3); }
.flip-colon { color: var(--clk-color); font-weight: bold; display: flex; align-items: center; margin: 0 2px; animation: blink 1s infinite; margin-top: -5px;}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.theme-neon { background: #0f172a; padding: 12px 40px; border-radius: 50px; box-shadow: 0 0 20px var(--clk-color), inset 0 0 10px var(--clk-color); border: 2px solid var(--clk-color); }
.theme-neon .clock-display-core { text-shadow: 0 0 10px var(--clk-color), 0 0 20px #fff; font-weight: bold; }
.theme-minimal { font-weight: 300; letter-spacing: -2px; opacity: 0.85; border-bottom: 2px solid var(--clk-color); padding-bottom: 5px; }
.theme-gradient .clock-display-core { background: linear-gradient(45deg, var(--clk-color), #3b82f6, #ec4899); -webkit-background-clip: text; color: transparent; font-weight: 900; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.1)); }
.theme-emboss { font-weight: 900; text-shadow: 1px 1px 0px #ccc, 2px 2px 0px #bbb, 3px 3px 0px #aaa, 4px 4px 0px #999, 5px 5px 10px rgba(0,0,0,0.4); }
.theme-cyber { background: #fef08a; padding: 12px 35px; border: 4px solid #000; position: relative; font-weight: 900; color: var(--clk-color); letter-spacing: 2px; clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px); }
.theme-cyber .clock-display-core { text-shadow: 3px 0px 0px #ef4444, -3px 0px 0px #0ea5e9; }
.theme-glass { background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); padding: 15px 40px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.6); box-shadow: 0 8px 32px rgba(0,0,0,0.1); font-weight: bold; }
.theme-chalk { background: #1f4d36; padding: 15px 40px; border: 6px solid var(--clk-color); border-radius: 8px; box-shadow: inset 0 0 20px rgba(0,0,0,0.6), 0 5px 15px rgba(0,0,0,0.3); color: #f8fafc !important; }
.theme-chalk .clock-display-core { font-family: 'Comic Sans MS', 'Chalkboard SE', cursive; font-style: italic; letter-spacing: 2px; text-shadow: 1px 1px 2px rgba(255,255,255,0.4); }

.icon-alert-bell { font-size: 2.2rem; text-decoration: none; animation: shake 1.5s infinite; filter: drop-shadow(0 2px 4px rgba(239,68,68,0.5)); cursor: pointer; }
@keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-15deg); } 75% { transform: rotate(15deg); } }

.schedule-ticker { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px 15px; margin-bottom: 20px; display: flex; justify-content: center; gap: 20px; align-items: center; flex-wrap: wrap; }
.subject-text { font-weight: bold; color: #047857;}
.teacher-text { font-size: 0.95rem; color: #475569; }
.next-class { color: #64748b; font-size: 1rem; border-left: 2px solid #cbd5e1; padding-left: 20px; }
.pulse-dot { width: 10px; height: 10px; background: #3b82f6; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; margin-right: 5px;}
@keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }

.button-group { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.btn { padding: 8px 12px; border-radius: 6px; font-size: 0.95rem; font-weight: bold; color: white; border: none; cursor: pointer; display: inline-block; text-decoration: none; transition: 0.2s;}
.btn:hover { filter: brightness(0.9); }
.btn-orange { background: #f59e0b; }
.btn-green { background: #10b981; }
.btn-blue { background: #3b82f6; }
.btn-teal { background: #14b8a6; } /* 💡 請假按鈕 */
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
