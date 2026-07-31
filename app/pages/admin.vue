<template>
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
