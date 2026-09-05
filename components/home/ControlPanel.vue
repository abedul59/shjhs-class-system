<template>
  <div class="control-card">
    
    <div class="clock-display" :style="{ fontSize: clockFontSize + 'px' }">
      🕒 {{ currentTime }}
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
      <NuxtLink v-if="indexButtonSettings.parentBind" to="/parent-bind" class="btn btn-orange">👨‍👩‍👧 綁定</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.parentMsg" to="/parent-message" class="btn btn-green">💬 家長私訊</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.studentMsg" to="/student-message" class="btn btn-blue">💬 學生私訊</NuxtLink>
      
      <button v-if="isScheduleButtonVisible" @click="emit('openLargeSchedule')" class="btn btn-lime">🗓️ 顯示班級大課表</button>

      <NuxtLink v-if="indexButtonSettings.assignments" to="/assignments" class="btn btn-purple">📚 作業管理</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.discipline" to="/discipline" class="btn btn-dark-blue">⚖️ 秩序管理</NuxtLink>
      <NuxtLink v-if="indexButtonSettings.hygiene" to="/hygiene" class="btn btn-cyan">🧹 衛生管理</NuxtLink>            
      <NuxtLink v-if="indexButtonSettings.seats" to="/seats" class="btn btn-teal">🪑 座位管理</NuxtLink>
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
const props = defineProps({
  clockFontSize: Number,
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
</script>

<style scoped>
.control-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: center; }

.clock-display { display: flex; align-items: center; justify-content: center; gap: 15px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }
.icon-alert-bell { font-size: 2.2rem; text-decoration: none; animation: shake 1.5s infinite; filter: drop-shadow(0 2px 4px rgba(239,68,68,0.5)); cursor: pointer; }
@keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-15deg); } 75% { transform: rotate(15deg); } }

.schedule-ticker { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px 15px; margin-bottom: 20px; display: flex; justify-content: center; gap: 20px; align-items: center; flex-wrap: wrap; }
.subject-text { font-weight: bold; color: #047857;}
.teacher-text { font-size: 0.95rem; color: #475569; }
.next-class { color: #64748b; font-size: 1rem; border-left: 2px solid #cbd5e1; padding-left: 20px; }

.button-group { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.btn { padding: 8px 12px; border-radius: 6px; font-size: 0.95rem; font-weight: bold; color: white; border: none; cursor: pointer; display: inline-block; text-decoration: none;}
.btn-orange { background: #f59e0b; }
.btn-green { background: #10b981; }
.btn-blue { background: #3b82f6; }
.btn-lime { background: #84cc16; color: #14532d; border: 1px solid #65a30d;}
.btn-dark { background: #64748b; }
.btn-purple { background: #8b5cf6; }
.btn-red { background: #ef4444; }
.btn-dark-blue { background: #1e3a8a; } 
.btn-teal { background: #0f766e; } 
.btn-cyan { background: #06b6d4; }
.btn-indigo { background: #6366f1; } 
.btn-sky { background: #0ea5e9; }
.btn-pink { background: #ec4899; } 
.btn-amber { background: #d97706; }
.btn-rose { background: #be123c; }

.btn-enter-exam { width: 100%; padding: 12px; background: #991b1b; color: white; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(153, 27, 27, 0.3); animation: subtle-pulse 2s infinite;}

@media (max-width: 768px) {
  .schedule-ticker { flex-direction: column; gap: 10px; text-align: center; }
  .next-class { border-left: none; padding-left: 0; border-top: 1px dashed #cbd5e1; padding-top: 10px; width: 100%;}
}
</style>
