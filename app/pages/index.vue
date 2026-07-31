<template>
  <div class="page-container">
    <!-- 頂部：家長須知事項 -->
    <div class="blackboard top-board">
      <h2 class="board-title notice-title">📢 家長須知事項</h2>
      <div class="dashed-divider"></div>
      <div class="board-content">
        <div v-if="parentNotices.length === 0" class="empty-text-italic">目前無特別須知事項</div>
        <ul v-else class="item-list">
          <li v-for="(notice, index) in parentNotices" :key="'n-'+index"><span class="bullet">📌</span> {{ notice }}</li>
        </ul>
      </div>
    </div>

    <!-- 下半部：雙欄佈局 -->
    <div class="main-split">
      <!-- 左側：控制面板 -->
      <div class="left-panel">
        <div class="control-card">
          <div class="clock-display">🕒 {{ currentTime }}</div>
          
          <div class="button-group">
            <NuxtLink to="/parent-bind" class="btn btn-orange">👨‍👩‍👧 綁定</NuxtLink>
            <NuxtLink to="/parent-message" class="btn btn-green">💬 家長私訊</NuxtLink>
            <NuxtLink to="/student-message" class="btn btn-blue">💬 學生私訊</NuxtLink>
            <NuxtLink to="/admin" class="btn btn-dark">⚙️ 後台</NuxtLink>
            <NuxtLink to="/assignments" class="btn btn-purple">📚 作業管理</NuxtLink>
            <button @click="openDiscipline" class="btn btn-dark-blue">⚖️ 秩序管理</button>
            <button @click="openEmergencyModal" class="btn btn-red">🚨 緊急通知</button>
            <!-- 💡 新增：座位管理按鈕 (直接導向，不在index.vue做密碼驗證) -->
            <NuxtLink to="/seats" class="btn btn-teal">🪑 座位管理</NuxtLink>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-box stat-expected">應到: <strong>{{ expectedCount }}</strong></div>
          <div class="stat-box stat-present">已到: <strong>{{ presentCount }}</strong></div>
          <div class="stat-box stat-absent">未到: <strong>{{ absentCount }}</strong></div>
        </div>

        <div class="student-grid">
          <div v-for="student in absentStudentsList" :key="student.id" class="student-card absent-card">
            <div class="student-seat">{{ student.seat_number }}</div>
            <div class="student-name">{{ student.real_name }}</div>
            <div class="student-status">未到</div>
          </div>
        </div>
      </div>

      <!-- 右側：今日聯絡簿 -->
      <div class="right-panel">
        <div class="blackboard contact-board">
          <div class="board-header">
            <div>
              <h2 class="board-title contact-title">⭐ 今日聯絡簿</h2>
              <p class="board-date">{{ todayDisplay }}</p>
            </div>
            <button v-if="!isEditingContact" @click="unlockContactEdit" class="edit-btn">✏️ 編輯</button>
          </div>
          <div class="dashed-divider"></div>
          <div class="board-content">
            <div v-if="!isEditingContact">
              <div v-if="contactBookItems.length === 0" class="empty-text-italic">目前尚無聯絡簿事項...</div>
              <ul v-else class="item-list contact-list">
                <li v-for="(item, index) in contactBookItems" :key="'c-'+index">{{ index + 1 }}. {{ item }}</li>
              </ul>
            </div>
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

    <!-- 💡 新增：班級座位表顯示區 (若導師設定顯示，才渲染) -->
    <div v-if="seatingChart.isVisible" class="seating-display-board">
      <h3 class="seating-title">🪑 班級座位表</h3>
      <div class="seating-wrapper">
        <div :class="['seating-area', { 'is-rotated': seatingChart.isRotated }]">
          
          <div class="seats-grid-readonly">
            <div v-for="seat in seatingChart.seats" :key="seat.id" class="seat-card-readonly">
              <div class="seat-id-readonly">{{ seat.id }}</div>
              <div class="seat-text-readonly" v-html="seat.content.replace(/\n/g, '<br>')"></div>
            </div>
          </div>

          <div class="teacher-desk-readonly">
            <h3>講桌</h3>
          </div>

        </div>
      </div>
    </div>

    <!-- 掛載並控制 EmergencyModal 元件 -->
    <EmergencyModal v-if="showEmergencyModal" @close="showEmergencyModal = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
const supabase = useSupabaseClient()

const showEmergencyModal = ref(false)

const openEmergencyModal = () => {
  const pwd = window.prompt("🔒 進入緊急通知系統，請輸入「導師」密碼：")
  const teacherPwd = officerPasswords.value.teacher || '168168168'
  if (pwd === teacherPwd) {
    showEmergencyModal.value = true
  } else if (pwd !== null) { 
    alert("❌ 密碼錯誤！無法使用此功能。")
  }
}

const openDiscipline = () => {
  navigateTo('/discipline')
}

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

const parentNotices = ref([])
const contactBookItems = ref([])
const officerPasswords = ref({ academic: '', counseling: '', discipline: '', teacher: '168168168' })

// 💡 儲存座位表資料
const seatingChart = ref({ isVisible: false, isRotated: false, seats: [] })

const isEditingContact = ref(false)
const editingContactItems = ref([])
const currentEditorRole = ref('') 

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

const fetchData = async () => {
  // 抓取聯絡簿
  const { data: boardData } = await supabase
    .from('contact_books')
    .select('notices, contact_items')
    .eq('record_date', todayISO)
    .maybeSingle()

  parentNotices.value = boardData?.notices || []
  contactBookItems.value = boardData?.contact_items || []

  // 抓取密碼設定與座位表設定
  const { data: sysData } = await supabase
    .from('system_settings')
    .select('*')
    .in('setting_key', ['board_officer_passwords', 'seating_chart_data'])

  if (sysData) {
    const pwdSetting = sysData.find(s => s.setting_key === 'board_officer_passwords')
    if (pwdSetting) officerPasswords.value = { ...officerPasswords.value, ...pwdSetting.setting_value }
    
    const seatSetting = sysData.find(s => s.setting_key === 'seating_chart_data')
    if (seatSetting) seatingChart.value = seatSetting.setting_value
  }

  // 抓取學生與出缺席
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

const unlockContactEdit = () => {
  const pwd = window.prompt("🔒 進入編輯模式，請輸入「學藝股長」或「輔導股長」密碼：")
  if (!pwd) return
  
  const teacherPwd = officerPasswords.value.teacher || '168168168'
  
  if (
    (officerPasswords.value.academic && pwd === officerPasswords.value.academic) || 
    (officerPasswords.value.counseling && pwd === officerPasswords.value.counseling)
  ) {
    currentEditorRole.value = '股長'
    isEditingContact.value = true
    editingContactItems.value = [...contactBookItems.value] 
  } else if (pwd === teacherPwd) {
    currentEditorRole.value = '導師'
    isEditingContact.value = true
    editingContactItems.value = [...contactBookItems.value] 
  } else {
    alert("❌ 密碼錯誤！請確認密碼是否正確。")
  }
}

const addContactItem = () => editingContactItems.value.push('')
const removeContactItem = (i) => editingContactItems.value.splice(i, 1)

const saveContactItems = async () => {
  try {
    const { error: upsertError } = await supabase.from('contact_books').upsert({
      record_date: todayISO, notices: parentNotices.value, contact_items: editingContactItems.value
    }, { onConflict: 'record_date' })
    if (upsertError) throw upsertError

    let clientIp = null
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipRes.json()
      clientIp = ipData.ip
    } catch (e) { console.warn("無法取得真實 IP", e) }

    await supabase.from('board_edit_logs').insert({
      board_date: todayISO, board_type: '聯絡簿', editor_role: currentEditorRole.value, ip_address: clientIp
    })

    alert("✅ 聯絡簿已成功更新發布！")
    contactBookItems.value = [...editingContactItems.value]
    isEditingContact.value = false
  } catch (error) {
    alert("❌ 聯絡簿儲存失敗：" + error.message)
  }
}
</script>

<style scoped>
/* 原有的樣式保留 */
.page-container { min-height: 100vh; background-color: #f3f4f6; padding: 20px; font-family: sans-serif; display: flex; flex-direction: column; gap: 20px; }
.blackboard { background-color: #315243; border: 10px solid #754d29; border-radius: 8px; padding: 20px 25px; box-shadow: 0 6px 12px rgba(0,0,0,0.15), inset 0 0 10px rgba(0,0,0,0.3); }
.board-title { margin: 0; font-size: 1.4rem; font-weight: bold; }
.notice-title { color: #fca5a5; }
.contact-title { color: #f59e0b; }
.board-date { color: #cbd5e1; margin: 8px 0 0 0; font-size: 0.95rem; }
.dashed-divider { border-bottom: 2px dashed #94a3b8; margin: 15px 0; opacity: 0.6; }
.board-content { color: white; min-height: 80px; }
.empty-text-italic { color: #94a3b8; font-style: italic; font-size: 1.1rem; }
.item-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.item-list li { font-size: 1.15rem; letter-spacing: 0.5px; }

.main-split { display: flex; gap: 20px; align-items: flex-start; }
.left-panel { flex: 1; display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.control-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: center; }
.clock-display { font-size: 2.2rem; font-weight: bold; color: #1e293b; margin-bottom: 20px; }
.button-group { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.btn { padding: 8px 12px; border-radius: 6px; font-size: 0.95rem; font-weight: bold; color: white; border: none; cursor: pointer; display: inline-block; text-decoration: none;}
.btn-orange { background: #f59e0b; }
.btn-green { background: #10b981; }
.btn-blue { background: #3b82f6; }
.btn-dark { background: #64748b; }
.btn-purple { background: #8b5cf6; }
.btn-red { background: #ef4444; }
.btn-dark-blue { background: #1e3a8a; } 
.btn-teal { background: #0f766e; } /* 新增座位管理按鈕顏色 */

.stats-row { display: flex; gap: 15px; }
.stat-box { flex: 1; padding: 12px; border-radius: 6px; text-align: center; font-size: 1.05rem; font-weight: bold; }
.stat-expected { background: #fef3c7; color: #92400e; }
.stat-present { background: #dcfce7; color: #166534; }
.stat-absent { background: #ffe4e6; color: #be123c; }

.student-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.student-card { background: #ffe4e6; border-radius: 6px; padding: 15px 10px; text-align: center; color: #e11d48; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.student-seat { font-size: 1.2rem; margin-bottom: 5px; }
.student-name { font-size: 1.1rem; margin-bottom: 5px; color: #be123c; }
.student-status { font-size: 0.9rem; opacity: 0.9; }

.right-panel { flex: 1; min-width: 0; }
.board-header { display: flex; justify-content: space-between; align-items: flex-start; }
.edit-btn { background-color: #f59e0b; color: #1e293b; border: none; padding: 6px 16px; border-radius: 6px; font-weight: bold; font-size: 0.95rem; cursor: pointer; }

.edit-mode { background: rgba(0, 0, 0, 0.2); padding: 15px; border-radius: 8px; }
.edit-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.row-num { font-size: 1.1rem; color: #f59e0b; width: 25px; font-weight: bold; }
.edit-input { flex: 1; padding: 8px 12px; font-size: 1rem; border-radius: 6px; border: none; }
.del-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }

.edit-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
.add-btn { background: transparent; color: white; border: 1px dashed #cbd5e1; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.action-right { display: flex; gap: 10px; }
.cancel-btn { background: #64748b; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.save-btn { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }

/* 💡 新增：首頁顯示的座位表樣式 (唯讀版) */
.seating-display-board {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  margin-top: 10px;
}
.seating-title {
  margin-top: 0;
  color: #0f766e;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 10px;
  margin-bottom: 20px;
  text-align: center;
}
.seating-wrapper {
  display: flex;
  justify-content: center;
  overflow: hidden;
}
.seating-area {
  width: 100%;
  max-width: 800px;
  transition: transform 0.5s ease;
}
.seating-area.is-rotated { transform: rotate(180deg); }
.seating-area.is-rotated .seat-card-readonly { transform: rotate(-180deg); }
.seating-area.is-rotated .teacher-desk-readonly { transform: rotate(-180deg); }

.seats-grid-readonly {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  margin-bottom: 30px;
}
.seat-card-readonly {
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px;
  text-align: center;
  height: 80px;
  display: flex;
  flex-direction: column;
  transition: transform 0.5s ease;
}
.seat-id-readonly {
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: left;
  margin-bottom: 5px;
  font-weight: bold;
}
.seat-text-readonly {
  font-size: 0.95rem;
  font-weight: bold;
  color: #1e293b;
  line-height: 1.3;
}

.teacher-desk-readonly {
  border: 3px solid #0f766e;
  background: #f0fdfa;
  padding: 12px 20px;
  border-radius: 8px;
  text-align: center;
  width: 200px;
  margin: 0 auto;
  transition: transform 0.5s ease;
}
.teacher-desk-readonly h3 {
  margin: 0;
  color: #0f766e;
  font-size: 1.1rem;
}

@media (max-width: 1024px) { 
  .main-split { flex-direction: column; } 
  .student-grid { grid-template-columns: repeat(3, 1fr); } 
}
@media (max-width: 768px) {
  .seats-grid-readonly { gap: 5px; }
  .seat-card-readonly { padding: 5px; height: 70px; }
  .seat-text-readonly { font-size: 0.85rem; }
}
</style>
