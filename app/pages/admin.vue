<template>
  <div class="admin-container">
    <!-- 🔒 鎖定畫面 -->
    <div v-if="!isUnlocked" class="lock-screen">
      <div class="lock-box">
        <h2>🔒 導師專屬後台</h2>
        <input 
          v-model="passwordInput" 
          type="password" 
          placeholder="請輸入密碼..." 
          @keyup.enter="verifyPassword"
        />
        <button @click="verifyPassword">解鎖進入</button>
      </div>
    </div>

    <!-- 📊 後台主控台 -->
    <div v-else class="dashboard">
      <header class="admin-header">
        <h2>📊 班級數據中心 (導師專用)</h2>
        <div class="header-buttons">
          <button @click="currentTab = 'attendance'" :class="{ active: currentTab === 'attendance' }">⏰ 遲到管理</button>
          <button @click="currentTab = 'homework'" :class="{ active: currentTab === 'homework' }">📚 作業與科任</button>
          <button @click="currentTab = 'board'" :class="{ active: currentTab === 'board' }">📢 須知推播</button>
          <button @click="currentTab = 'messages'" :class="{ active: currentTab === 'messages' }">💬 私訊管理</button>
          <button @click="currentTab = 'students'" :class="{ active: currentTab === 'students' }">👩‍🎓 學生管理</button>
          <button @click="currentTab = 'security'" :class="{ active: currentTab === 'security' }">🛡️ 安全與 IP</button>
          <button @click="currentTab = 'audit'" :class="{ active: currentTab === 'audit' }">🕵️ 系統稽核</button>
          <button @click="currentTab = 'communication'" :class="{ active: currentTab === 'communication' }">📨 通知紀錄</button>
          <!-- 💡 這裡完美整合了剛做好的密碼管理元件 -->
          <button @click="currentTab = 'officers'" :class="{ active: currentTab === 'officers' }">🔐 職位密碼管理</button>
          <button @click="currentTab = 'settings'" :class="{ active: currentTab === 'settings' }">⚙️ 系統設定</button>
          <NuxtLink to="/" class="back-btn">⬅️ 返回前台</NuxtLink>
        </div>
      </header>

      <!-- 📝 內容渲染區 (自動引入 app/components/ 內的檔案) -->
      <main class="data-table">
        <AdminAttendance v-if="currentTab === 'attendance'" />
        <AdminHomework v-if="currentTab === 'homework'" />
        <AdminBoard v-if="currentTab === 'board'" />
        <AdminMessages v-if="currentTab === 'messages'" />
        <AdminStudents v-if="currentTab === 'students'" />
        <AdminSecurity v-if="currentTab === 'security'" />
        <AdminAudit v-if="currentTab === 'audit'" />
        <AdminCommunication v-if="currentTab === 'communication'" />
        <!-- 💡 渲染密碼管理元件 -->
        <AdminOfficers v-if="currentTab === 'officers'" />
        <AdminSettings v-if="currentTab === 'settings'" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const supabase = useSupabaseClient()
const isUnlocked = ref(false)
const passwordInput = ref('')
const currentTab = ref('board') // 預設開啟家長須知分頁

// 密碼驗證邏輯 (支援動態密碼、自訂密碼與萬用救援密碼)
const verifyPassword = async () => {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_password')
      .maybeSingle()
    
    let expectedPwd = '168168168' // 若資料庫尚未設定，預設為原密碼
    
    if (data?.setting_value) {
      const config = data.setting_value
      if (config.type === 'dynamic') {
        // 計算今日動態密碼 (YYMMDD + 59)
        const d = new Date()
        const yy = String(d.getFullYear()).slice(2)
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        expectedPwd = `${yy}${mm}${dd}59`
      } else if (config.type === 'custom' && config.custom_pwd) {
        // 使用自訂密碼
        expectedPwd = config.custom_pwd
      }
    }

    // 萬用救援密碼 168168168 保留不變，防止您將自己鎖在系統外
    if (passwordInput.value === expectedPwd || passwordInput.value === '168168168') {
      isUnlocked.value = true
    } else {
      alert('❌ 密碼錯誤！')
    }
  } catch (e) {
    // 網路異常時的安全降級機制
    if (passwordInput.value === '168168168') isUnlocked.value = true
    else alert('❌ 密碼錯誤或無法連線至設定檔！')
  }
}
</script>

<style scoped>
.admin-container { 
  min-height: 100vh; 
  background-color: #f1f5f9; 
  font-family: sans-serif; 
  padding-bottom: 50px; 
}

/* 鎖定畫面樣式 */
.lock-screen { 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  height: 100vh; 
  background-color: #1e293b; 
}
.lock-box { 
  background: white; 
  padding: 40px; 
  border-radius: 12px; 
  text-align: center; 
  box-shadow: 0 10px 25px rgba(0,0,0,0.5); 
  width: 400px; 
}
.lock-box input { 
  width: 100%; 
  padding: 12px; 
  margin-bottom: 20px; 
  border: 1px solid #cbd5e1; 
  border-radius: 6px; 
  text-align: center;
  box-sizing: border-box;
}
.lock-box button { 
  width: 100%; 
  padding: 12px; 
  background-color: #3b82f6; 
  color: white; 
  border: none; 
  border-radius: 6px; 
  font-weight: bold; 
  cursor: pointer; 
}

/* 儀表板樣式 */
.dashboard { 
  max-width: 1400px; 
  margin: 0 auto; 
  padding: 20px; 
}
.admin-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 25px; 
  background: white; 
  padding: 15px 25px; 
  border-radius: 12px; 
  flex-wrap: wrap; 
  gap: 15px; 
}
.header-buttons button { 
  padding: 8px 15px; 
  border: none; 
  border-radius: 6px; 
  cursor: pointer; 
  font-weight: bold; 
  background: #e2e8f0; 
  color: #475569; 
  margin-right: 5px;
  margin-bottom: 5px; 
}
.header-buttons button.active { 
  background: #3b82f6; 
  color: white; 
}
.back-btn { 
  text-decoration: none; 
  padding: 8px 15px; 
  border-radius: 6px; 
  font-weight: bold; 
  background: #ef4444; 
  color: white; 
  display: inline-block; 
}

/* 內容區塊樣式 */
.data-table { 
  background: white; 
  padding: 25px; 
  border-radius: 12px; 
  box-shadow: 0 4px 6px rgba(0,0,0,0.05); 
}
</style><template>
  <div class="admin-layout">
    <!-- ================= 側邊導覽列 (Sidebar) ================= -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">⚙️ 班級後台管理</h2>
      </div>

      <nav class="sidebar-nav">
        <!-- 核心功能區 -->
        <div class="nav-section">日常管理</div>
        <button :class="['nav-btn', { active: currentTab === 'board' }]" @click="currentTab = 'board'">📝 黑板與聯絡簿</button>
        <button :class="['nav-btn', { active: currentTab === 'attendance' }]" @click="currentTab = 'attendance'">🙋‍♂️ 出缺席管理</button>
        <button :class="['nav-btn', { active: currentTab === 'students' }]" @click="currentTab = 'students'">👨‍🎓 學生名單管理</button>
        <button :class="['nav-btn', { active: currentTab === 'homework' }]" @click="currentTab = 'homework'">📚 作業繳交管理</button>
        
        <!-- 通訊與紀錄區 -->
        <div class="nav-section">通訊與紀錄</div>
        <button :class="['nav-btn', { active: currentTab === 'messages' }]" @click="currentTab = 'messages'">💬 師生私訊紀錄</button>
        <button :class="['nav-btn', { active: currentTab === 'communication' }]" @click="currentTab = 'communication'">🚨 緊急通知紀錄</button>
        <button :class="['nav-btn', { active: currentTab === 'audit' }]" @click="currentTab = 'audit'">👁️ 編輯稽核紀錄</button>
        
        <!-- 系統設定區 -->
        <div class="nav-section">系統設定</div>
        <!-- 💡 這是我們剛新增的職位密碼管理分頁 -->
        <button :class="['nav-btn', { active: currentTab === 'officers' }]" @click="currentTab = 'officers'">🔐 職位與密碼管理</button>
        <button :class="['nav-btn', { active: currentTab === 'security' }]" @click="currentTab = 'security'">🛡️ 安全與 IP 設定</button>
        <button :class="['nav-btn', { active: currentTab === 'settings' }]" @click="currentTab = 'settings'">⚙️ 其他系統設定</button>
      </nav>

      <div class="sidebar-footer">
        <NuxtLink to="/" class="btn-home">⬅️ 返回前台首頁</NuxtLink>
      </div>
    </aside>

    <!-- ================= 主內容區 (Main Content) ================= -->
    <main class="main-content">
      <!-- 根據 currentTab 動態載入對應的元件 -->
      <AdminBoard v-if="currentTab === 'board'" />
      <AdminAttendance v-if="currentTab === 'attendance'" />
      <AdminStudents v-if="currentTab === 'students'" />
      <AdminHomework v-if="currentTab === 'homework'" />
      <AdminMessages v-if="currentTab === 'messages'" />
      <AdminCommunication v-if="currentTab === 'communication'" />
      <AdminAudit v-if="currentTab === 'audit'" />
      <!-- 💡 掛載新的股長密碼管理元件 -->
      <AdminOfficers v-if="currentTab === 'officers'" />
      <AdminSecurity v-if="currentTab === 'security'" />
      <AdminSettings v-if="currentTab === 'settings'" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 預設進入後台時，顯示「黑板與聯絡簿」分頁
const currentTab = ref('board')
</script>

<style scoped>
/* ================= 後台整體佈局 ================= */
.admin-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f1f5f9;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

/* ================= 側邊欄樣式 ================= */
.sidebar {
  width: 260px;
  background-color: #1e293b;
  color: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.1);
}

.sidebar-header {
  padding: 20px;
  background-color: #0f172a;
  border-bottom: 1px solid #334155;
}
.sidebar-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: bold;
  color: #f8fafc;
}

.sidebar-nav {
  flex: 1;
  padding: 15px 0;
  overflow-y: auto;
}

.nav-section {
  padding: 15px 20px 5px 20px;
  font-size: 0.85rem;
  color: #94a3b8;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-btn {
  width: 100%;
  display: block;
  text-align: left;
  background: transparent;
  color: #cbd5e1;
  border: none;
  padding: 12px 20px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 4px solid transparent;
}
.nav-btn:hover {
  background-color: #334155;
  color: white;
}
.nav-btn.active {
  background-color: #3b82f6;
  color: white;
  border-left-color: #60a5fa;
  font-weight: bold;
}

.sidebar-footer {
  padding: 20px;
  background-color: #0f172a;
  border-top: 1px solid #334155;
}
.btn-home {
  display: block;
  text-align: center;
  background-color: #475569;
  color: white;
  text-decoration: none;
  padding: 10px;
  border-radius: 6px;
  font-weight: bold;
  transition: background 0.2s;
}
.btn-home:hover {
  background-color: #64748b;
}

/* ================= 主內容區樣式 ================= */
.main-content {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  height: 100vh;
  box-sizing: border-box;
}

/* 響應式：螢幕較小時將側邊欄改為頂部導覽或縮小 */
@media (max-width: 768px) {
  .admin-layout {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    height: auto;
  }
  .sidebar-nav {
    display: flex;
    flex-wrap: wrap;
    padding: 10px;
  }
  .nav-section {
    width: 100%;
  }
  .nav-btn {
    width: auto;
    flex: 1 1 45%;
    margin: 2px;
    border-radius: 4px;
    border-left: none;
    border-bottom: 3px solid transparent;
  }
  .nav-btn.active {
    border-left: none;
    border-bottom-color: #60a5fa;
  }
  .main-content {
    height: auto;
    padding: 15px;
  }
}
</style>
