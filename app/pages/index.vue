<template>
  <div class="dashboard-container">
    <!-- ================= 頂部導覽列 ================= -->
    <header class="dashboard-header">
      <div class="header-title">
        <h1>🏫 班級電子黑板系統</h1>
        <p class="date-display">{{ currentDate }}</p>
      </div>
      
      <div class="action-buttons">
        <button @click="openEmergencyModal" class="btn-nav btn-danger">🚨 緊急通知</button>
        <!-- 💡 這裡已經將原本的攔截邏輯移除，改為直接跳轉 -->
        <button @click="goToDiscipline" class="btn-nav btn-discipline">📋 秩序管理</button>
        <button @click="goToAssignments" class="btn-nav btn-homework">📚 作業繳交</button>
        <button @click="goToAdmin" class="btn-nav btn-admin">⚙️ 後台管理</button>
      </div>
    </header>

    <!-- ================= 雙黑板主畫面 ================= -->
    <main class="boards-wrapper">
      <!-- 左側黑板：聯絡簿 -->
      <section class="blackboard">
        <div class="board-header">
          <h2>📝 聯絡簿</h2>
        </div>
        <div class="board-content">
          <div v-if="isLoading" class="loading">載入中...</div>
          <div v-else-if="contactBookItems.length === 0" class="empty-state">
            目前尚無聯絡簿事項...
          </div>
          <ul v-else class="item-list">
            <li v-for="item in contactBookItems" :key="item.id">
              {{ item.content }}
            </li>
          </ul>
        </div>
      </section>

      <!-- 右側黑板：班級公告 -->
      <section class="blackboard">
        <div class="board-header">
          <h2>📢 班級公告</h2>
        </div>
        <div class="board-content">
          <div v-if="isLoading" class="loading">載入中...</div>
          <div v-else-if="announcements.length === 0" class="empty-state">
            目前尚無班級公告...
          </div>
          <ul v-else class="item-list">
            <li v-for="item in announcements" :key="item.id">
              {{ item.content }}
            </li>
          </ul>
        </div>
      </section>
    </main>

    <!-- ================= 緊急通知 Modal ================= -->
    <EmergencyModal 
      v-if="showEmergencyModal" 
      @close="showEmergencyModal = false" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 狀態控制
const isLoading = ref(true)
const showEmergencyModal = ref(false)
const contactBookItems = ref([])
const announcements = ref([])
const currentDate = ref('')

const supabase = useSupabaseClient()

// 初始化時間與載入資料
onMounted(async () => {
  const now = new Date()
  currentDate.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
  await fetchBoardData()
})

// 讀取黑板資料
const fetchBoardData = async () => {
  isLoading.value = true
  try {
    // 假設您有 boards 資料表，根據您的實際架構調整
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    if (data) {
      contactBookItems.value = data.filter(d => d.type === 'contact_book')
      announcements.value = data.filter(d => d.type === 'announcement')
    }
  } catch (error) {
    console.error('讀取黑板資料失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 💡 路由跳轉邏輯 (完全移除 prompt 密碼檢查，交給各分頁自行驗證)
const goToDiscipline = () => {
  navigateTo('/discipline')
}

const goToAssignments = () => {
  navigateTo('/assignments')
}

const goToAdmin = () => {
  navigateTo('/admin')
}

// 開啟緊急通知
const openEmergencyModal = () => {
  showEmergencyModal.value = true
}
</script>

<style scoped>
/* ================= 全局與容器 ================= */
.dashboard-container {
  min-height: 100vh;
  background-color: #f1f5f9;
  padding: 20px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

/* ================= 頂部導覽列 ================= */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 20px 30px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  margin-bottom: 25px;
}

.header-title h1 {
  margin: 0;
  color: #1e293b;
  font-size: 1.8rem;
}

.date-display {
  margin: 5px 0 0 0;
  color: #64748b;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-nav {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  font-size: 1.05rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
}

.btn-danger { background-color: #ef4444; }
.btn-danger:hover { background-color: #dc2626; }

.btn-discipline { background-color: #f59e0b; }
.btn-discipline:hover { background-color: #d97706; }

.btn-homework { background-color: #3b82f6; }
.btn-homework:hover { background-color: #2563eb; }

.btn-admin { background-color: #475569; }
.btn-admin:hover { background-color: #334155; }

/* ================= 雙黑板主畫面 ================= */
.boards-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
  min-height: 70vh;
}

@media (max-width: 900px) {
  .boards-wrapper {
    grid-template-columns: 1fr;
  }
}

.blackboard {
  background-color: #1a472a; /* 經典黑板綠 */
  border: 12px solid #8b5a2b; /* 木質邊框 */
  border-radius: 10px;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 10px 15px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}

.board-header {
  border-bottom: 2px dashed rgba(255,255,255,0.3);
  padding: 15px 20px;
  text-align: center;
}

.board-header h2 {
  color: white;
  margin: 0;
  font-size: 1.8rem;
  letter-spacing: 2px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.board-content {
  flex: 1;
  padding: 20px;
  color: white;
  font-size: 1.4rem;
  line-height: 1.8;
  font-family: 'Kaiti TC', 'DFKai-sb', serif; /* 粉筆字體風格 */
}

.item-list {
  list-style-type: none;
  padding-left: 0;
  margin: 0;
}

.item-list li {
  margin-bottom: 15px;
  padding-left: 25px;
  position: relative;
}

.item-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #fcd34d; /* 黃色粉筆點點 */
}

.loading, .empty-state {
  text-align: center;
  color: rgba(255,255,255,0.6);
  margin-top: 40px;
  font-style: italic;
}
</style>
