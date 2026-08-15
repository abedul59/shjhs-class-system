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
          
          <!-- 💡 僅新增此行：公佈欄管理按鈕 -->
          <button @click="currentTab = 'announcements'" :class="{ active: currentTab === 'announcements' }">📌 公佈欄管理</button>

          <button @click="currentTab = 'messages'" :class="{ active: currentTab === 'messages' }">💬 私訊管理</button>
          <button @click="currentTab = 'students'" :class="{ active: currentTab === 'students' }">👩‍🎓 學生管理</button>
          <button @click="currentTab = 'security'" :class="{ active: currentTab === 'security' }">🛡️ 安全與 IP</button>
          <button @click="currentTab = 'audit'" :class="{ active: currentTab === 'audit' }">🕵️ 系統稽核</button>
          <button @click="currentTab = 'communication'" :class="{ active: currentTab === 'communication' }">📨 通知紀錄</button>
          <button @click="currentTab = 'officers'" :class="{ active: currentTab === 'officers' }">🔐 職位密碼管理</button>
          
          <!-- 💡 首頁按鈕控制分頁 -->
          <button @click="currentTab = 'indexButtons'" :class="{ active: currentTab === 'indexButtons' }">🎛️ 首頁按鈕控制</button>
          
          <button @click="currentTab = 'settings'" :class="{ active: currentTab === 'settings' }">⚙️ 系統設定</button>
          <button @click="currentTab = 'backup'" :class="{ active: currentTab === 'backup' }">📦 系統備份</button>
          <NuxtLink to="/" class="back-btn">⬅️ 返回前台</NuxtLink>
        </div>
      </header>

      <!-- 📝 內容渲染區 (自動引入 app/components/ 內的檔案) -->
      <main class="data-table">
        <AdminAttendance v-if="currentTab === 'attendance'" />
        <AdminHomework v-if="currentTab === 'homework'" />
        <AdminBoard v-if="currentTab === 'board'" />
        
        <!-- 💡 僅新增此行：渲染公佈欄元件 -->
        <AdminAnnouncements v-if="currentTab === 'announcements'" />

        <AdminMessages v-if="currentTab === 'messages'" />
        <AdminStudents v-if="currentTab === 'students'" />
        <AdminSecurity v-if="currentTab === 'security'" />
        <AdminAudit v-if="currentTab === 'audit'" />
        <AdminCommunication v-if="currentTab === 'communication'" />
        <AdminOfficers v-if="currentTab === 'officers'" />
        
        <!-- 💡 渲染首頁按鈕控制元件 -->
        <AdminIndexButtons v-if="currentTab === 'indexButtons'" />
        
        <AdminSettings v-if="currentTab === 'settings'" />
        <AdminBackup v-if="currentTab === 'backup'" />
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
  transition: 0.2s;
}
.header-buttons button:hover {
  background: #cbd5e1;
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
  transition: 0.2s;
}
.back-btn:hover {
  background: #dc2626;
}

/* 內容區塊樣式 */
.data-table { 
  background: white; 
  padding: 25px; 
  border-radius: 12px; 
  box-shadow: 0 4px 6px rgba(0,0,0,0.05); 
}
</style>
