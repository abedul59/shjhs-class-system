<template>
  <div>
    <div class="table-header"><h3>🕵️ 系統稽核中心</h3></div>

    <div class="audit-container">
      <!-- 左側：月曆與過濾器 -->
      <div class="calendar-sidebar">
        <button @click="loadLatest" class="mode-btn" :class="{'active': viewMode === 'latest'}">
          🕒 顯示最新 50 筆紀錄
        </button>
        
        <div class="calendar-wrapper">
          <div class="calendar-header">
            <button @click="prevMonth" class="cal-nav-btn">◀</button>
            <strong class="cal-title">{{ calYear }} 年 {{ calMonth + 1 }} 月</strong>
            <button @click="nextMonth" class="cal-nav-btn">▶</button>
          </div>
          <div class="calendar-grid">
            <div class="cal-day-name">日</div><div class="cal-day-name">一</div><div class="cal-day-name">二</div>
            <div class="cal-day-name">三</div><div class="cal-day-name">四</div><div class="cal-day-name">五</div><div class="cal-day-name">六</div>
            
            <div 
              v-for="(day, idx) in calendarDays" 
              :key="idx" 
              :class="['cal-cell', { 'empty': day.empty, 'has-record': day.hasRecord, 'selected': viewMode === 'date' && selectedDate === day.dateStr }]"
              @click="viewDateLogs(day)"
            >
              <span v-if="!day.empty" class="cal-date-num">{{ day.day }}</span>
              <span v-if="day.hasRecord" class="record-dot"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：紀錄列表 -->
      <div class="logs-content">
        <div class="section-header">
          <h4 class="logs-title">
            {{ viewMode === 'latest' ? '📝 最新 50 筆綜合操作紀錄' : `🗓️ ${selectedDate} 系統操作紀錄` }}
          </h4>
          <p class="help-text">
            💡 紀錄包含導師、科任老師、小老師、股長等角色的操作軌跡與實際修改內容。
          </p>
        </div>
        
        <div v-if="isLoading" class="loading-text">⏳ 讀取紀錄中...</div>
        <div v-else-if="aLogs.length === 0" class="empty-state">
          {{ viewMode === 'latest' ? '目前系統尚無任何操作紀錄。' : '✔️ 當日系統沒有任何操作紀錄。' }}
        </div>
        <div v-else class="table-responsive">
          <table class="t">
            <tr class="h">
              <th width="180">時間</th>
              <th width="120">操作區塊</th>
              <th width="100">身分</th>
              <th width="120">動作</th>
              <th>詳細內容</th>
            </tr>
            <tr v-for="l in aLogs" :key="l.id" class="r">
              <td>{{ new Date(l.created_at).toLocaleString('zh-TW', { hour12: false }) }}</td>
              <td>
                <span :class="['tag', l.subject_name === '首頁黑板' ? 'tag-board' : 'tag-subject']">
                  {{ l.subject_name }}
                </span>
              </td>
              <td><strong>{{ l.operator_role }}</strong></td>
              <td :class="getActionColor(l.action_type)">{{ l.action_type }}</td>
              <td class="details-cell">{{ l.details || '-' }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'; 
const supabase = useSupabaseClient()

const aLogs = ref([])
const isLoading = ref(false)

// 💡 視圖狀態管理 ('latest' 或 'date')
const viewMode = ref('latest') 
const selectedDate = ref('')

// 💡 月曆相關狀態
const d = new Date()
const calYear = ref(d.getFullYear())
const calMonth = ref(d.getMonth())
const monthLogDates = ref([]) // 記錄當月有哪些日期有紀錄

onMounted(() => {
  loadLatest()
  fetchMonthLogDates()
})

// 載入最新 50 筆
const loadLatest = async () => {
  viewMode.value = 'latest'
  selectedDate.value = ''
  isLoading.value = true
  const { data } = await supabase.from('assignment_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  aLogs.value = data || []
  isLoading.value = false
}

// 取得當月「有紀錄」的日期清單，用於在月曆上打藍點
const fetchMonthLogDates = async () => {
  const y = calYear.value; 
  const m = String(calMonth.value + 1).padStart(2, '0')
  const lastDay = new Date(y, calMonth.value + 1, 0).getDate()
  
  // 加上 +08:00 確保轉換為台灣時間進行搜尋
  const startDate = `${y}-${m}-01T00:00:00+08:00` 
  const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}T23:59:59.999+08:00`
  
  const { data } = await supabase.from('assignment_audit_logs')
    .select('created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    
  if (data && data.length > 0) {
    const dates = data.map(log => {
      const dt = new Date(log.created_at) // 自動轉換為當地(台灣)時區物件
      return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
    })
    // 透過 Set 過濾掉重複的日期
    monthLogDates.value = [...new Set(dates)] 
  } else {
    monthLogDates.value = []
  }
}

// 動態計算月曆的每一天與排版
const calendarDays = computed(() => {
  const days = []
  const firstDayOfWeek = new Date(calYear.value, calMonth.value, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate()
  
  for (let i = 0; i < firstDayOfWeek; i++) { days.push({ empty: true }) }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const hasRecord = monthLogDates.value.includes(dateStr)
    days.push({ empty: false, day: i, dateStr, hasRecord })
  }
  return days
})

const prevMonth = async () => {
  if (calMonth.value === 0) { calYear.value--; calMonth.value = 11 } else { calMonth.value-- }
  await fetchMonthLogDates()
}
const nextMonth = async () => {
  if (calMonth.value === 11) { calYear.value++; calMonth.value = 0 } else { calMonth.value++ }
  await fetchMonthLogDates()
}

// 點擊月曆特定日期
const viewDateLogs = async (day) => {
  if (day.empty) return
  viewMode.value = 'date'
  selectedDate.value = day.dateStr
  isLoading.value = true
  
  // 加上 +08:00 確保抓取整整一天的台灣時間範圍
  const startDate = `${day.dateStr}T00:00:00+08:00`
  const endDate = `${day.dateStr}T23:59:59.999+08:00`
  
  const { data } = await supabase.from('assignment_audit_logs')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })
    
  aLogs.value = data || []
  isLoading.value = false
}

// 依據不同動作自動上色
const getActionColor = (action) => {
  if (!action) return ''
  if (action.includes('刪除') || action.includes('缺交')) return 'text-danger'
  if (action.includes('新增') || action.includes('已交')) return 'text-success'
  if (action.includes('修改') || action.includes('編輯')) return 'text-warning'
  return 'text-primary'
}
</script>

<style scoped>
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.audit-container { display: flex; gap: 25px; align-items: flex-start; }

/* 💡 月曆側邊欄樣式 */
.calendar-sidebar { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 15px; }
.mode-btn { background: white; border: 2px solid #cbd5e1; color: #475569; padding: 12px; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: 0.2s; text-align: center; }
.mode-btn:hover { background: #f1f5f9; }
.mode-btn.active { background: #3b82f6; border-color: #2563eb; color: white; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2); }

.calendar-wrapper { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.cal-nav-btn { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; color: #475569; }
.cal-title { font-size: 1.1rem; color: #1e293b; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center; }
.cal-day-name { font-weight: bold; color: #64748b; padding-bottom: 10px; font-size: 0.9rem; }
.cal-cell { height: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; background: #f8fafc; border: 1px solid transparent; transition: all 0.2s; position: relative;}
.cal-cell:not(.empty):hover { background: #e0e7ff; border-color: #a5b4fc; }
.cal-cell.empty { background: transparent; cursor: default; }
.cal-cell.selected { background: #3b82f6; color: white; border-color: #2563eb; }
.cal-cell.selected .record-dot { background: white; }
.cal-date-num { font-weight: bold; font-size: 1rem; }
.record-dot { width: 6px; height: 6px; background: #3b82f6; border-radius: 50%; margin-top: 2px; }

/* 💡 右側紀錄列表樣式 */
.logs-content { flex: 1; min-width: 0; background: white; padding: 20px 25px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.section-header { margin-bottom: 20px; border-bottom: 2px dashed #f1f5f9; padding-bottom: 15px; }
.logs-title { margin: 0; color: #1e293b; font-size: 1.25rem; }
.help-text { color: #64748b; font-size: 0.9rem; margin: 5px 0 0 0; }

.empty-state { text-align: center; padding: 50px; color: #94a3b8; font-size: 1.1rem; font-style: italic; background: #f8fafc; border-radius: 8px; border: 2px dashed #e2e8f0; }
.loading-text { text-align: center; padding: 30px; font-weight: bold; color: #3b82f6; font-size: 1.1rem;}
.table-responsive { overflow-x: auto; }

.t { width: 100%; text-align: left; border-collapse: collapse; font-size: 0.95rem; min-width: 700px;}
.h th { padding: 12px; background: #f1f5f9; color: #334155; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
.r td { padding: 12px; border-bottom: 1px dashed #e2e8f0; vertical-align: middle; line-height: 1.5; }
.r:hover td { background: #f8fafc; }

.details-cell { color: #475569; word-break: break-all; }
.tag { padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; }
.tag-board { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
.tag-subject { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }

.text-danger { color: #dc2626; font-weight: bold; }
.text-success { color: #16a34a; font-weight: bold; }
.text-warning { color: #d97706; font-weight: bold; }
.text-primary { color: #2563eb; font-weight: bold; }

@media (max-width: 900px) {
  .audit-container { flex-direction: column; }
  .calendar-sidebar { width: 100%; }
}
</style>
