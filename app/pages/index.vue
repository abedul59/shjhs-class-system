<template>
  <div class="page-container">
    
    <!-- ================= 頂部：家長須知事項 (大黑板) ================= -->
    <div class="blackboard top-board">
      <h2 class="board-title notice-title">📢 家長須知事項</h2>
      <div class="dashed-divider"></div>
      
      <div class="board-content">
        <div v-if="parentNotices.length === 0" class="empty-text-italic">
          目前無特別須知事項
        </div>
        <ul v-else class="item-list">
          <li v-for="(notice, index) in parentNotices" :key="'n-'+index">
            <span class="bullet">📌</span> {{ notice }}
          </li>
        </ul>
      </div>
    </div>

    <!-- ================= 下半部：雙欄佈局 ================= -->
    <div class="main-split">
      
      <!-- ================= 左側：控制面板與出缺席狀態 ================= -->
      <div class="left-panel">
        
        <!-- 1. 時鐘與功能按鈕區 -->
        <div class="control-card">
          <div class="clock-display">
            🕒 {{ currentTime }}
          </div>
          
          <div class="button-group">
            <NuxtLink to="/parent-bind" class="btn btn-orange">👨‍👩‍👧 綁定</NuxtLink>
            <NuxtLink to="/parent-message" class="btn btn-green">💬 家長私訊</NuxtLink>
            <NuxtLink to="/student-message" class="btn btn-blue">💬 學生私訊</NuxtLink>
            <NuxtLink to="/admin" class="btn btn-dark">⚙️ 後台</NuxtLink>
            <NuxtLink to="/homework" class="btn btn-purple">📚 作業繳交登記系統</NuxtLink>
            <button class="btn btn-red">🚨 緊急通知</button>
          </div>
        </div>

        <!-- 2. 出缺席統計區 (應到、已到、未到) -->
        <div class="stats-row">
          <div class="stat-box stat-expected">
            應到: <strong>{{ expectedCount }}</strong>
          </div>
          <div class="stat-box stat-present">
            已到: <strong>{{ presentCount }}</strong>
          </div>
          <div class="stat-box stat-absent">
            未到: <strong>{{ absentCount }}</strong>
          </div>
        </div>

        <!-- 3. 未到學生卡片區 -->
        <div class="student-grid">
          <div v-for="student in absentStudentsList" :key="student.id" class="student-card absent-card">
            <div class="student-seat">{{ student.seat_number }}</div>
            <div class="student-name">{{ student.real_name }}</div>
            <div class="student-status">未到</div>
          </div>
        </div>
        
      </div>

      <!-- ================= 右側：今日聯絡簿 (小黑板 + 編輯功能) ================= -->
      <div class="right-panel">
        <div class="blackboard contact-board">
          
          <!-- 黑板標頭與按鈕 -->
          <div class="board-header">
            <div>
              <h2 class="board-title contact-title">⭐ 今日聯絡簿</h2>
              <p class="board-date">{{ todayDisplay }}</p>
            </div>
            
            <button v-if="!isEditingContact" @click="unlockContactEdit" class="edit-btn">
              ✏️ 編輯
            </button>
          </div>
          
          <div class="dashed-divider"></div>
          
          <!-- 黑板內容 -->
          <div class="board-content">
            <!-- 檢視模式 -->
            <div v-if="!isEditingContact">
              <div v-if="contactBookItems.length === 0" class="empty-text-italic">
                目前尚無聯絡簿事項...
              </div>
              <ul v-else class="item-list contact-list">
                <li v-for="(item, index) in contactBookItems" :key="'c-'+index">
                  {{ index + 1 }}. {{ item }}
                </li>
              </ul>
            </div>

            <!-- 編輯模式 (密碼解鎖後顯示) -->
            <div v-else class="edit-mode">
              <div v-for="(item, index) in editingContactItems" :key="'edit-'+index" class="edit-row">
                <span class="row-num">{{ index + 1 }}.</span>
                <input v-model="editingContactItems[index]" type="text" placeholder="輸入事項..." class="edit-input"/>
                <button @click="removeContactItem(index)" class="del-btn">🗑️</button>
              </div>
              <div class="edit-actions">
                <button @click="addContactItem" class="add-btn">➕ 新增事項</button>
                <div class="action-right">
                  <button @click="isEditingContact = false" class="cancel-btn">取消</button>
                  <button @click="saveContactItems" class="save-btn">💾 儲存</button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
const supabase = useSupabaseClient()

// --- 日期與時間管理 ---
const d = new Date()
const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const todayDisplay = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日${days[d.getDay()]}`

const currentTime = ref('')
let timer = null
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-TW', { hour12: false })
}

// --- 聯絡簿與須知狀態 ---
const parentNotices = ref([])
const contactBookItems = ref([])
const officerPasswords = ref({ academic: '', counseling: '' })

// 編輯模式狀態與當前編輯者身分
const isEditingContact = ref(false)
const editingContactItems = ref([])
const currentEditorRole = ref('') // 用來精準記錄是導師還是股長

// --- 出缺席狀態管理 ---
const allStudents = ref([])
const todayAttendances = ref([])

const expectedCount = computed(() => allStudents.value.length)
const presentCount = computed(() => todayAttendances.value.filter(a => a.status === '已到').length)
const absentStudentsList = computed(() => {
  return allStudents.value.filter(s => {
    const record = todayAttendances.value.find(a => a.student_id === s.id)
    return !record || record.status === '未到' || record.status === '請假'
  })
})
const absentCount = computed(() => absentStudentsList.value.length)

// --- 資料抓取 ---
const fetchData = async () => {
  // 1. 抓取聯絡簿與家長須知
  const { data: boardData } = await supabase
    .from('contact_books')
    .select('notices, contact_items')
    .eq('record_date', todayISO)
    .maybeSingle()

  parentNotices.value = boardData?.notices || []
  contactBookItems.value = boardData?.contact_items || []

  // 2. 抓取後台設定的股長密碼
  const { data: pwdData } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'board_officer_passwords')
    .maybeSingle()
    
  if (pwdData?.setting_value) {
    officerPasswords.value = pwdData.setting_value
  }

  // 3. 抓取學生名單與今日打卡紀錄
  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  if (sData) allStudents.value = sData

  const { data: attData } = await supabase.from('attendances').select('*').eq('record_date', todayISO)
  if (attData) todayAttendances.value = attData
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
  fetchData()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// --- 聯絡簿編輯與密碼邏輯 ---
const unlockContactEdit = () => {
  const pwd = window.prompt("🔒 進入編輯模式，請輸入「學藝股長」或「輔導股長」密碼：")
  if (!pwd) return
  
  // 驗證密碼，並將身分精準設定為符合截圖格式的「股長」或「導師」
  if (
    (officerPasswords.value.academic && pwd === officerPasswords.value.academic) || 
    (officerPasswords.value.counseling && pwd === officerPasswords.value.counseling)
  ) {
    currentEditorRole.value = '股長'
    isEditingContact.value = true
    editingContactItems.value = [...contactBookItems.value] 
  } else if (pwd === '168168168') {
    currentEditorRole.value = '導師'
    isEditingContact.value = true
    editingContactItems.value = [...contactBookItems.value] 
  } else {
    alert("❌ 密碼錯誤！請確認密碼是否正確。")
  }
}

const addContactItem = () => editingContactItems.value.push('')
const removeContactItem = (i) => editingContactItems.value.splice(i, 1)

// --- 儲存聯絡簿與寫入稽核紀錄 ---
const saveContactItems = async () => {
  try {
    // 1. 寫入聯絡簿資料
    const { error: upsertError } = await supabase.from('contact_books').upsert({
      record_date: todayISO, 
      notices: parentNotices.value, 
      contact_items: editingContactItems.value
    }, { onConflict: 'record_date' })
    
    if (upsertError) throw upsertError

    // 2. 獲取真實用戶 IP
    let clientIp = null
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipRes.json()
      clientIp = ipData.ip
    } catch (e) {
      console.warn("無法取得真實 IP", e)
    }

    // 3. 寫入稽核紀錄 (✨補上被資料庫要求必填的 board_date 欄位！)
    const { error: logError } = await supabase.from('board_edit_logs').insert({
      board_date: todayISO, // 補上遺漏的必填日期
      board_type: '聯絡簿', 
      editor_role: currentEditorRole.value, 
      ip_address: clientIp
    })

    if (logError) {
      console.error("稽核紀錄寫入失敗:", logError)
      alert(`⚠️ 聯絡簿事項已儲存，但「稽核紀錄」寫入失敗！\n\n系統訊息：${logError.message}`)
    } else {
      alert("✅ 聯絡簿已成功更新發布！(稽核紀錄亦已同步寫入後台)")
    }

    // 4. 更新畫面
    contactBookItems.value = [...editingContactItems.value]
    isEditingContact.value = false
  } catch (error) {
    alert("❌ 聯絡簿儲存失敗：" + error.message)
  }
}
</script>

<style scoped>
/* ================= 頁面底色與整體排版 ================= */
.page-container {
  min-height: 100vh;
  background-color: #f3f4f6;
  padding: 20px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ================= 共用黑板樣式 ================= */
.blackboard {
  background-color: #315243;
  border: 10px solid #754d29;
  border-radius: 8px;
  padding: 20px 25px;
  box-shadow: 0 6px 12px rgba(0,0,0,0.15), inset 0 0 10px rgba(0,0,0,0.3);
}

.board-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: bold;
}
.notice-title { color: #fca5a5; }
.contact-title { color: #f59e0b; }

.board-date {
  color: #cbd5e1;
  margin: 8px 0 0 0;
  font-size: 0.95rem;
}

.dashed-divider {
  border-bottom: 2px dashed #94a3b8;
  margin: 15px 0;
  opacity: 0.6;
}

.board-content {
  color: white;
  min-height: 80px;
}
.empty-text-italic {
  color: #94a3b8;
  font-style: italic;
  font-size: 1.1rem;
}
.item-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.item-list li { font-size: 1.15rem; letter-spacing: 0.5px; }

/* ================= 下半部：左右雙欄佈局 ================= */
.main-split {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* ================= 左欄：打卡與控制面板 ================= */
.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.control-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  text-align: center;
}
.clock-display {
  font-size: 2.2rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 20px;
}
.button-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
.btn {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: bold;
  color: white;
  text-decoration: none;
  border: none;
  cursor: pointer;
  display: inline-block;
}
.btn-orange { background: #f59e0b; }
.btn-green { background: #10b981; }
.btn-blue { background: #3b82f6; }
.btn-dark { background: #64748b; }
.btn-purple { background: #8b5cf6; }
.btn-red { background: #ef4444; }

.stats-row {
  display: flex;
  gap: 15px;
}
.stat-box {
  flex: 1;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  font-size: 1.05rem;
  font-weight: bold;
}
.stat-expected { background: #fef3c7; color: #92400e; }
.stat-present { background: #dcfce7; color: #166534; }
.stat-absent { background: #ffe4e6; color: #be123c; }

.student-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
.student-card {
  background: #ffe4e6;
  border-radius: 6px;
  padding: 15px 10px;
  text-align: center;
  color: #e11d48;
  font-weight: bold;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.student-seat { font-size: 1.2rem; margin-bottom: 5px; }
.student-name { font-size: 1.1rem; margin-bottom: 5px; color: #be123c; }
.student-status { font-size: 0.9rem; opacity: 0.9; }

/* ================= 右欄：今日聯絡簿 ================= */
.right-panel {
  flex: 1;
  min-width: 0;
}
.board-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.edit-btn {
  background-color: #f59e0b;
  color: #1e293b;
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
}

/* 編輯模式 */
.edit-mode {
  background: rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 8px;
}
.edit-row { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  margin-bottom: 10px; 
}
.row-num { 
  font-size: 1.1rem; 
  color: #f59e0b; 
  width: 25px; 
  font-weight: bold;
}
.edit-input { 
  flex: 1; 
  padding: 8px 12px; 
  font-size: 1rem; 
  border-radius: 6px; 
  border: none; 
}
.del-btn { 
  background: #ef4444; 
  color: white; 
  border: none; 
  padding: 8px 12px; 
  border-radius: 6px; 
  cursor: pointer; 
}

.edit-actions { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-top: 20px; 
}
.add-btn { 
  background: transparent; 
  color: white; 
  border: 1px dashed #cbd5e1; 
  padding: 8px 15px; 
  border-radius: 6px; 
  cursor: pointer; 
}
.action-right { display: flex; gap: 10px; }
.cancel-btn { background: #64748b; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.save-btn { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }

/* 📱 響應式調整 */
@media (max-width: 1024px) {
  .main-split { flex-direction: column; }
  .student-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 600px) {
  .student-grid { grid-template-columns: repeat(2, 1fr); }
  .stats-row { flex-direction: column; }
}
</style>
