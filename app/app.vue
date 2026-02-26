<template>
  <div class="dashboard-container">
    
    <div class="left-panel">
      <div class="clock-card">
        <h2>🕒 {{ currentTime }}</h2>
      </div>

      <div class="stats-row">
        <div class="stat-box total">應到: {{ students.length }}</div>
        <div class="stat-box present">已到: {{ presentCount }}</div>
        <div class="stat-box absent">未到: {{ absentCount }}</div>
      </div>

      <div class="punch-grid">
        <button 
          v-for="student in students" 
          :key="student.id"
          :class="['punch-btn', student.status === '已到' ? 'is-present' : 'is-absent']"
          @click="toggleStatus(student)"
          :disabled="isUpdating"
        >
          <span class="seat-num">{{ student.seat_number }}</span>
          <span class="status-text">{{ student.status }}</span>
        </button>
      </div>
    </div>

    <div class="right-panel">
      <div class="chalkboard">
        <div class="board-header">
          <div>
            <h3>⭐ 今日聯絡簿</h3>
            <p class="date-text">{{ todayDisplay }}</p>
          </div>
          <button v-if="!isEditingBoard" @click="isEditingBoard = true" class="edit-btn">✏️ 編輯</button>
          <div v-else class="edit-actions">
            <button @click="addTask" class="add-btn">➕ 新增事項</button>
            <button @click="saveContactBook" class="save-btn">💾 儲存</button>
          </div>
        </div>
        
        <ul v-if="!isEditingBoard" class="task-list">
          <li v-for="(task, index) in tasks" :key="index">
            <span class="number">{{ index + 1 }}</span> {{ task }}
          </li>
          <li v-if="tasks.length === 0" style="color: #999;">目前尚無聯絡簿事項...</li>
        </ul>

        <ul v-else class="task-list editing">
          <li v-for="(task, index) in tasks" :key="'edit-'+index" class="edit-item">
            <span class="number">{{ index + 1 }}</span>
            <input v-model="tasks[index]" type="text" class="edit-input" placeholder="請輸入聯絡簿事項..." />
            <button @click="removeTask(index)" class="delete-btn">🗑️</button>
          </li>
        </ul>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
const supabase = useSupabaseClient()

// --- 基礎日期與時間 ---
const currentTime = ref('')
let timer = null
// 產生 YYYY-MM-DD 格式供資料庫使用
const d = new Date()
const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
// 產生中文日期供顯示
const todayDisplay = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

const updateClock = () => {
  currentTime.value = new Date().toLocaleTimeString('zh-TW', { hour12: false })
}

// --- 學生與打卡邏輯 ---
const students = ref([])
const isUpdating = ref(false)

const presentCount = computed(() => students.value.filter(s => s.status === '已到').length)
const absentCount = computed(() => students.value.filter(s => s.status === '未到').length)

// 讀取全班名單與今日打卡狀態
const fetchStudentsAndAttendance = async () => {
  // 1. 先抓所有學生
  const { data: studentData } = await supabase.from('students').select('*').order('seat_number')
  
  // 2. 抓今日打卡紀錄
  const { data: attendanceData } = await supabase.from('attendances').select('*').eq('record_date', todayISO)

  // 3. 把資料合併：如果今天還沒打卡紀錄，預設為「未到」
  if (studentData) {
    students.value = studentData.map(student => {
      const record = attendanceData?.find(a => a.student_id === student.id)
      return {
        ...student,
        status: record ? record.status : '未到'
      }
    })
  }
}

// 點擊切換狀態並寫入 Supabase (Upsert：有則更新，無則新增)
const toggleStatus = async (student) => {
  isUpdating.value = true
  const newStatus = student.status === '未到' ? '已到' : '未到'
  student.status = newStatus // 畫面先樂觀更新，感覺才順暢

  const { error } = await supabase.from('attendances').upsert({
    student_id: student.id,
    record_date: todayISO,
    status: newStatus
  }, { onConflict: 'student_id, record_date' }) // 依賴我們剛建的 UNIQUE 限制

  if (error) {
    alert('打卡狀態更新失敗！請檢查連線。')
    student.status = newStatus === '已到' ? '未到' : '已到' // 失敗則退回狀態
  }
  isUpdating.value = false
}

// --- 聯絡簿邏輯 ---
const tasks = ref([])
const isEditingBoard = ref(false)

// 讀取今日聯絡簿
const fetchContactBook = async () => {
  const { data } = await supabase.from('contact_books').select('tasks').eq('record_date', todayISO).single()
  if (data && data.tasks) {
    tasks.value = data.tasks
  } else {
    tasks.value = ['國習 P.30-32', '數作 Ch.3', '交午餐回條'] // 預設測試資料
  }
}

// 新增/刪除事項
const addTask = () => tasks.value.push('')
const removeTask = (index) => tasks.value.splice(index, 1)

// 儲存聯絡簿至 Supabase
const saveContactBook = async () => {
  // 過濾掉空白的輸入
  const validTasks = tasks.value.filter(t => t.trim() !== '')
  tasks.value = validTasks

  const { error } = await supabase.from('contact_books').upsert({
    record_date: todayISO,
    tasks: validTasks
  }, { onConflict: 'record_date' })

  if (error) {
    alert('聯絡簿儲存失敗！')
  } else {
    isEditingBoard.value = false // 關閉編輯模式
  }
}

// --- 初始化 ---
onMounted(() => {
  updateClock()
  timer = setInterval(updateClock, 1000)
  fetchStudentsAndAttendance()
  fetchContactBook()
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
/* (保留前一版的 CSS 基礎，並新增編輯模式的樣式) */
.dashboard-container { display: flex; gap: 20px; padding: 20px; background-color: #f5f7fa; min-height: 100vh; font-family: 'sans-serif'; }
.left-panel, .right-panel { flex: 1; display: flex; flex-direction: column; gap: 20px; }
.clock-card { background: white; border-radius: 12px; text-align: center; padding: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); font-size: 2rem; color: #2c3e50; border: 2px solid #e2e8f0; }
.stats-row { display: flex; justify-content: space-between; gap: 10px; }
.stat-box { flex: 1; text-align: center; padding: 10px; border-radius: 8px; font-weight: bold; border: 1px solid #ddd; }
.stat-box.total { background: #fff3cd; color: #856404; }
.stat-box.present { background: #d4edda; color: #155724; }
.stat-box.absent { background: #f8d7da; color: #721c24; }

.punch-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.punch-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 15px 5px; border-radius: 8px; border: none; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.punch-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.seat-num { font-size: 1.5rem; font-weight: bold; margin-bottom: 5px; }
.is-absent { background-color: #ffe4e6; color: #e11d48; border: 1px solid #fecdd3; }
.is-present { background-color: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }

.chalkboard { background-color: #2d4a3e; border: 12px solid #8b5a2b; border-radius: 16px; padding: 30px; color: #fdf6e3; box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 5px 5px 15px rgba(0,0,0,0.2); height: 100%; }
.board-header { border-bottom: 2px dashed #fdf6e3; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
.board-header h3 { color: #fbbf24; font-size: 1.8rem; margin: 0 0 5px 0; }
.date-text { font-size: 1.2rem; margin: 0; }

.task-list { list-style: none; padding: 0; font-size: 1.4rem; line-height: 2; }
.task-list li { margin-bottom: 15px; display: flex; align-items: center; }
.task-list .number { background-color: #6b8e23; color: white; border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 1rem; flex-shrink: 0; }

/* 編輯模式專屬按鈕與輸入框 */
button { font-family: inherit; }
.edit-btn, .save-btn, .add-btn { background: #fbbf24; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; color: #5f3f00; font-size: 1rem;}
.save-btn { background: #4ade80; color: #064e3b; margin-left: 10px; }
.add-btn { background: #cbd5e1; color: #1e293b; }
.edit-item { gap: 10px; }
.edit-input { flex: 1; font-size: 1.2rem; padding: 5px 10px; border-radius: 4px; border: none; background: rgba(255,255,255,0.9); }
.delete-btn { background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
</style>