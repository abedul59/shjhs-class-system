<template>
  <div class="page-container">
    
    <!-- ================= 家長須知區塊 (維持原樣) ================= -->
    <div class="notice-section">
      <h2 class="notice-title">📢 家長重要須知</h2>
      <div v-if="parentNotices.length === 0" class="empty-text">
        目前尚無重要須知事項...
      </div>
      <ul v-else class="notice-list">
        <li v-for="(notice, index) in parentNotices" :key="'n-'+index">
          <span class="bullet">📌</span> {{ notice }}
        </li>
      </ul>
    </div>

    <!-- ================= 聯絡簿區塊 (完美還原附圖排版與色彩) ================= -->
    <div class="blackboard-container">
      
      <!-- 黑板標頭區 -->
      <div class="blackboard-header">
        <div class="header-left">
          <h3 class="board-title">⭐ 今日聯絡簿</h3>
          <p class="board-date">{{ todayDisplay }}</p>
        </div>
        
        <!-- 點擊觸發密碼解鎖 -->
        <button v-if="!isEditingContact" @click="unlockContactEdit" class="edit-btn">
          ✏️ 編輯
        </button>
      </div>

      <!-- 分隔虛線 -->
      <div class="dashed-divider"></div>

      <!-- 黑板內容區 -->
      <div class="blackboard-content">
        
        <!-- 檢視模式 -->
        <div v-if="!isEditingContact">
          <div v-if="contactBookItems.length === 0" class="empty-text-italic">
            目前尚無聯絡簿事項...
          </div>
          <ul v-else class="contact-list">
            <li v-for="(item, index) in contactBookItems" :key="'c-'+index">
              {{ index + 1 }}. {{ item }}
            </li>
          </ul>
        </div>

        <!-- 編輯模式 -->
        <div v-else class="edit-mode">
          <div v-for="(item, index) in editingContactItems" :key="'edit-'+index" class="edit-row">
            <span class="row-num">{{ index + 1 }}.</span>
            <input v-model="editingContactItems[index]" type="text" placeholder="輸入聯絡簿事項..." class="edit-input"/>
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
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

// 基礎日期設定
const d = new Date()
const todayISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const todayDisplay = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日${days[d.getDay()]}`

// 狀態管理
const parentNotices = ref([])
const contactBookItems = ref([])
const officerPasswords = ref({ academic: '', counseling: '' }) // 儲存後台抓回來的股長密碼

// 編輯模式狀態
const isEditingContact = ref(false)
const editingContactItems = ref([])

// 抓取今日資料與密碼設定
const fetchData = async () => {
  // 1. 抓取今日聯絡簿與家長須知
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
}

onMounted(() => fetchData())

// 解鎖編輯模式 (最新密碼驗證邏輯)
const unlockContactEdit = () => {
  const pwd = window.prompt("🔒 進入編輯模式，請輸入「學藝股長」或「輔導股長」密碼：")
  if (!pwd) return // 按下取消或直接關閉
  
  // 驗證是否符合學藝、輔導密碼，或是萬用導師密碼 168168168
  if (
    (officerPasswords.value.academic && pwd === officerPasswords.value.academic) || 
    (officerPasswords.value.counseling && pwd === officerPasswords.value.counseling) || 
    pwd === '168168168'
  ) {
    isEditingContact.value = true
    editingContactItems.value = [...contactBookItems.value] 
  } else {
    alert("❌ 密碼錯誤！請確認密碼是否正確，或請導師確認是否已於後台設定密碼。")
  }
}

// 增刪事項
const addContactItem = () => editingContactItems.value.push('')
const removeContactItem = (i) => editingContactItems.value.splice(i, 1)

// 儲存聯絡簿
const saveContactItems = async () => {
  try {
    // ⚠️ 關鍵防呆：必須把 parentNotices.value 一併傳入，否則導師寫好的家長須知會被清空！
    const { error } = await supabase.from('contact_books').upsert({
      record_date: todayISO, 
      notices: parentNotices.value, // 保留原有的家長須知
      contact_items: editingContactItems.value // 更新前台剛編輯的聯絡簿事項
    }, { onConflict: 'record_date' })
    
    if (error) throw error

    // 更新成功後，同步畫面並關閉編輯模式
    contactBookItems.value = [...editingContactItems.value]
    isEditingContact.value = false
    alert("✅ 聯絡簿已成功更新發布！")
    
  } catch (error) {
    alert("❌ 儲存失敗：" + error.message)
  }
}
</script>

<style scoped>
.page-container {
  max-width: 900px;
  margin: 30px auto;
  padding: 0 20px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

/* ================= 家長須知區塊樣式 ================= */
.notice-section {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.notice-title {
  margin: 0 0 15px 0;
  color: #b45309;
  font-size: 1.4rem;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 10px;
}
.empty-text { color: #94a3b8; font-size: 1.1rem; }
.notice-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.notice-list li { font-size: 1.15rem; color: #334155; line-height: 1.5; }

/* ================= 黑板區塊樣式 (完美還原截圖) ================= */
.blackboard-container {
  background-color: #2F4F3F; /* 深綠色黑板底色 */
  border: 8px solid #8B5A2B; /* 木紋邊框顏色 */
  border-radius: 12px;       /* 圖片中帶有微圓角 */
  padding: 20px 25px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2), inset 0 0 15px rgba(0,0,0,0.4);
}

.blackboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.board-title {
  color: #FFC107; /* 標題黃字 */
  margin: 0;
  font-size: 1.4rem;
  font-weight: bold;
}

.board-date {
  color: #E2E8F0; /* 偏白的日期文字 */
  margin: 8px 0 0 0;
  font-size: 1rem;
}

.edit-btn {
  background-color: #FFC107; /* 黃色編輯按鈕 */
  color: #1e293b;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.2s;
}
.edit-btn:hover {
  opacity: 0.9;
}

.dashed-divider {
  border-bottom: 2px dashed #94a3b8; /* 虛線分隔線 */
  margin: 15px 0;
  opacity: 0.6;
}

.blackboard-content {
  min-height: 100px;
}

.empty-text-italic {
  color: #cbd5e1; /* 淺灰白色 */
  font-style: italic;
  font-size: 1.1rem;
  padding: 5px 0;
}

.contact-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.contact-list li {
  color: #f8fafc;
  font-size: 1.2rem;
  letter-spacing: 0.5px;
}

/* ================= 編輯模式樣式 ================= */
.edit-mode {
  background: rgba(0, 0, 0, 0.25);
  padding: 15px;
  border-radius: 8px;
}
.edit-row { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  margin-bottom: 12px; 
}
.row-num { 
  font-size: 1.2rem; 
  color: #FFC107; 
  width: 25px; 
  font-weight: bold;
}
.edit-input { 
  flex: 1; 
  padding: 10px; 
  font-size: 1.1rem; 
  border-radius: 6px; 
  border: none; 
  outline: none;
}
.del-btn { 
  background: #ef4444; 
  color: white; 
  border: none; 
  padding: 10px 12px; 
  border-radius: 6px; 
  cursor: pointer; 
}

.edit-actions { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-top: 20px; 
  flex-wrap: wrap; 
  gap: 15px;
}
.add-btn { 
  background: transparent; 
  color: white; 
  border: 1px dashed #cbd5e1; 
  padding: 8px 15px; 
  border-radius: 6px; 
  cursor: pointer; 
}
.add-btn:hover { background: rgba(255,255,255,0.1); }
.action-right { 
  display: flex; 
  gap: 10px; 
}
.cancel-btn { 
  background: #64748b; 
  color: white; 
  border: none; 
  padding: 8px 15px; 
  border-radius: 6px; 
  cursor: pointer; 
}
.save-btn { 
  background: #10b981; 
  color: white; 
  border: none; 
  padding: 8px 15px; 
  border-radius: 6px; 
  cursor: pointer; 
  font-weight: bold; 
}
</style>
