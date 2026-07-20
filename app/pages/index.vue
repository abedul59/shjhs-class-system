<template>
  <div class="frontend-container">
    <header class="main-header">
      <div class="header-content">
        <h1>🏫 班級數位聯絡網</h1>
        <p class="date-text">今天是：{{ todayDisplay }}</p>
      </div>
    </header>

    <main class="dashboard-content">
      
      <!-- ================= 區塊 A：家長須知 (唯讀，僅導師可於後台編輯) ================= -->
      <section class="board-card notice-card">
        <div class="card-header">
          <h2 class="title-notice">📢 家長重要須知</h2>
        </div>
        <div class="divider"></div>
        <div class="card-body">
          <div v-if="parentNotices.length === 0" class="empty-text">
            目前尚無重要須知事項...
          </div>
          <ul v-else class="item-list">
            <li v-for="(notice, index) in parentNotices" :key="'n-'+index">
              <span class="bullet">📌</span> {{ notice }}
            </li>
          </ul>
        </div>
      </section>

      <!-- ================= 區塊 B：今日聯絡簿 (股長可解鎖編輯) ================= -->
      <section class="board-card contact-card">
        <div class="card-header contact-header">
          <div>
            <h2 class="title-contact">⭐ 今日聯絡簿</h2>
            <p class="sub-date">{{ todayDisplay }}</p>
          </div>
          <button v-if="!isEditingContact" @click="unlockContactEdit" class="edit-btn">
            ✏️ 編輯
          </button>
        </div>
        <div class="dashed-divider"></div>
        
        <div class="card-body">
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

          <!-- 編輯模式 -->
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
                <button @click="saveContactItems" class="save-btn">💾 儲存發布</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= 區塊 C：快速導覽選單 ================= -->
      <section class="quick-links">
        <NuxtLink to="/student-message" class="nav-btn student-btn">
          <span class="icon">🧑‍🎓</span>
          <span class="text">學生私訊頻道</span>
        </NuxtLink>
        <NuxtLink to="/parent-message" class="nav-btn parent-btn">
          <span class="icon">👨‍👩‍👧</span>
          <span class="text">家長私訊頻道</span>
        </NuxtLink>
        <NuxtLink to="/parent-bind" class="nav-btn bind-btn">
          <span class="icon">🔗</span>
          <span class="text">家長帳號綁定</span>
        </NuxtLink>
        <NuxtLink to="/admin" class="nav-btn admin-btn">
          <span class="icon">🔒</span>
          <span class="text">導師專屬後台</span>
        </NuxtLink>
      </section>

    </main>
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
const officerPasswords = ref({ academic: '', counseling: '' })

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

// 解鎖編輯模式
const unlockContactEdit = () => {
  const pwd = window.prompt("🔒 進入編輯模式，請輸入「學藝股長」或「輔導股長」密碼：")
  if (!pwd) return // 按下取消
  
  // 驗證是否符合學藝、輔導密碼，或萬用導師密碼 168168168
  if (
    (officerPasswords.value.academic && pwd === officerPasswords.value.academic) || 
    (officerPasswords.value.counseling && pwd === officerPasswords.value.counseling) || 
    pwd === '168168168'
  ) {
    isEditingContact.value = true
    editingContactItems.value = [...contactBookItems.value] 
  } else {
    alert("❌ 密碼錯誤！請確認密碼是否已由導師在後台設定。")
  }
}

// 增刪事項
const addContactItem = () => editingContactItems.value.push('')
const removeContactItem = (i) => editingContactItems.value.splice(i, 1)

// 儲存聯絡簿 (包含寫入稽核紀錄)
const saveContactItems = async () => {
  try {
    // ⚠️ 關鍵：必須把 parentNotices.value 一併傳入，否則原本導師寫的家長須知會被清空！
    const { error } = await supabase.from('contact_books').upsert({
      record_date: todayISO, 
      notices: parentNotices.value, // 保留家長須知
      contact_items: editingContactItems.value // 更新聯絡簿事項
    }, { onConflict: 'record_date' })
    
    if (error) throw error

    // 更新成功後，同步畫面並關閉編輯模式
    contactBookItems.value = [...editingContactItems.value]
    isEditingContact.value = false
    alert("✅ 聯絡簿已成功更新發布！")
    
    // 寫入黑板編輯稽核紀錄
    await supabase.from('board_edit_logs').insert({
      board_type: '聯絡簿',
      editor_role: '股長/學生',
      ip_address: '前台登入'
    })
  } catch (error) {
    alert("❌ 儲存失敗：" + error.message)
  }
}
</script>

<style scoped>
/* ================= 系統共用與排版樣式 ================= */
.frontend-container {
  min-height: 100vh;
  background-color: #f1f5f9;
  font-family: sans-serif;
}

.main-header {
  background: #1e293b;
  color: white;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.main-header h1 { margin: 0 0 5px 0; font-size: 1.8rem; }
.date-text { margin: 0; color: #94a3b8; font-size: 1.1rem; }

.dashboard-content {
  max-width: 1000px;
  margin: 30px auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

/* ================= 區塊 A：家長須知 (現代白底風格) ================= */
.board-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.notice-card {
  background: white;
  border: 1px solid #e2e8f0;
}
.card-header { padding: 15px 20px; }
.title-notice { margin: 0; color: #b45309; font-size: 1.4rem; }
.divider { height: 1px; background: #e2e8f0; margin: 0 20px; }
.card-body { padding: 20px; }

.empty-text { color: #94a3b8; font-size: 1.1rem; text-align: center; padding: 20px 0; }
.item-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.item-list li { font-size: 1.15rem; color: #334155; line-height: 1.5; }
.bullet { display: inline-block; margin-right: 8px; }

/* ================= 區塊 B：聯絡簿事項 (黑板風格) ================= */
.contact-card {
  background: #2b4c3f; /* 黑板深綠色 */
  border: 6px solid #8b5a2b; /* 木紋邊框色 */
  border-radius: 8px;
  box-shadow: 0 8px 15px rgba(0,0,0,0.2), inset 0 0 20px rgba(0,0,0,0.5);
  color: white;
}
.contact-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px 10px 25px;
}
.title-contact { margin: 0; color: #fbbf24; font-size: 1.5rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); }
.sub-date { margin: 5px 0 0 0; color: #cbd5e1; font-size: 0.95rem; }
.dashed-divider {
  border-bottom: 2px dashed #94a3b8;
  margin: 10px 25px;
  opacity: 0.5;
}

/* 黑板按鈕 */
.edit-btn {
  background: #fbbf24;
  color: #1e293b;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: background 0.2s;
}
.edit-btn:hover { background: #f59e0b; }

.empty-text-italic { color: #94a3b8; font-size: 1.1rem; font-style: italic; padding: 10px 5px; }
.contact-list li { color: #f8fafc; font-size: 1.2rem; letter-spacing: 1px; }

/* 編輯模式 */
.edit-mode { background: rgba(0, 0, 0, 0.2); padding: 20px; border-radius: 8px; }
.edit-row { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
.row-num { font-size: 1.2rem; color: #fbbf24; font-weight: bold; width: 25px; }
.edit-input {
  flex: 1;
  padding: 10px 15px;
  font-size: 1.1rem;
  border: 2px solid #64748b;
  border-radius: 6px;
  background: #f8fafc;
  color: #1e293b;
}
.edit-input:focus { outline: none; border-color: #fbbf24; }
.del-btn { background: #ef4444; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; }

.edit-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; flex-wrap: wrap; gap: 15px; }
.add-btn { background: rgba(255, 255, 255, 0.1); color: white; border: 1px dashed #cbd5e1; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.add-btn:hover { background: rgba(255, 255, 255, 0.2); }
.action-right { display: flex; gap: 10px; }
.cancel-btn { background: #64748b; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.save-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1.05rem; }

/* ================= 區塊 C：底部快速連結按鈕 ================= */
.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 15px;
  margin-top: 10px;
}
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.2rem;
  color: white;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.nav-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }
.icon { font-size: 1.5rem; }

.student-btn { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.parent-btn { background: linear-gradient(135deg, #f59e0b, #d97706); }
.bind-btn { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.admin-btn { background: linear-gradient(135deg, #10b981, #059669); }

/* RWD */
@media (max-width: 600px) {
  .contact-header { flex-direction: column; align-items: flex-start; gap: 15px; }
  .edit-btn { width: 100%; }
  .edit-actions { flex-direction: column; }
  .add-btn, .action-right { width: 100%; }
  .action-right { display: grid; grid-template-columns: 1fr 1fr; }
  .nav-btn { font-size: 1.1rem; padding: 15px; }
}
</style>
