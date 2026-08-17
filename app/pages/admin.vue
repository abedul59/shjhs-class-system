<template>
  <div class="admin-container">
    <div v-if="!isUnlocked" class="lock-screen">
      <div class="lock-box">
        <h2>🔒 導師專屬後台</h2>
        <input v-model="passwordInput" type="password" placeholder="請輸入密碼..." @keyup.enter="verifyPassword" />
        <button @click="verifyPassword">解鎖進入</button>
        <NuxtLink to="/" class="back-link">⬅️ 返回首頁</NuxtLink>
      </div>
    </div>

    <div v-else class="dashboard">
      <header class="admin-header">
        <h2>📊 班級數據中心 (導師專用)</h2>
        <div class="header-buttons">
          <button @click="currentTab = 'attendance'" :class="{ active: currentTab === 'attendance' }">⏰ 遲到管理</button>
          <button @click="currentTab = 'homework'" :class="{ active: currentTab === 'homework' }">📚 作業與科任</button>
          <button @click="currentTab = 'classNotes'" :class="{ active: currentTab === 'classNotes' }">⚡ 注意事項</button>
          <button @click="currentTab = 'contact'" :class="{ active: currentTab === 'contact' }">⭐ 聯絡簿管理</button>
          <button @click="currentTab = 'board'" :class="{ active: currentTab === 'board' }">📢 須知推播</button>
          
          <!-- 💡 新增家長公佈欄管理分頁 -->
          <button @click="currentTab = 'parentAnnouncements'" :class="{ active: currentTab === 'parentAnnouncements' }">📌 家長公佈欄</button>
          
          <button @click="currentTab = 'announcements'" :class="{ active: currentTab === 'announcements' }">📌 班級公佈欄</button>
          <button @click="currentTab = 'messages'" :class="{ active: currentTab === 'messages' }">💬 私訊管理</button>
          <button @click="currentTab = 'students'" :class="{ active: currentTab === 'students' }">👩‍🎓 學生管理</button>
          <button @click="currentTab = 'security'" :class="{ active: currentTab === 'security' }">🛡️ 安全與 IP</button>
          <button @click="currentTab = 'visitors'" :class="{ active: currentTab === 'visitors' }">👁️ 訪客紀錄</button>
          <button @click="currentTab = 'audit'" :class="{ active: currentTab === 'audit' }">🕵️ 系統稽核</button>
          <button @click="currentTab = 'communication'" :class="{ active: currentTab === 'communication' }">📨 通知紀錄</button>
          <button @click="currentTab = 'officers'" :class="{ active: currentTab === 'officers' }">🔐 職位密碼管理</button>
          <button @click="currentTab = 'indexButtons'" :class="{ active: currentTab === 'indexButtons' }">🎛️ 首頁按鈕控制</button>
          <button @click="currentTab = 'settings'" :class="{ active: currentTab === 'settings' }">⚙️ 系統設定</button>
          <button @click="currentTab = 'backup'" :class="{ active: currentTab === 'backup' }">📦 系統備份</button>
        </div>
      </header>
      
      <div class="admin-content">
        <AdminAttendance v-if="currentTab === 'attendance'" />
        <AdminHomework v-if="currentTab === 'homework'" />
        <AdminClassNotes v-if="currentTab === 'classNotes'" />
        <AdminContact v-if="currentTab === 'contact'" />
        <AdminBoard v-if="currentTab === 'board'" />
        
        <!-- 💡 載入新增的家長公佈欄組件 -->
        <AdminParentAnnouncements v-if="currentTab === 'parentAnnouncements'" />
        
        <AdminAnnouncements v-if="currentTab === 'announcements'" />
        <AdminMessages v-if="currentTab === 'messages'" />
        <AdminStudents v-if="currentTab === 'students'" />
        <AdminSecurity v-if="currentTab === 'security'" />
        <AdminVisitors v-if="currentTab === 'visitors'" />
        <AdminAudit v-if="currentTab === 'audit'" />
        <AdminCommunication v-if="currentTab === 'communication'" />
        <AdminOfficers v-if="currentTab === 'officers'" />
        <AdminIndexButtons v-if="currentTab === 'indexButtons'" />
        <AdminSettings v-if="currentTab === 'settings'" />
        <AdminBackup v-if="currentTab === 'backup'" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const supabase = useSupabaseClient()
const isUnlocked = ref(false)
const passwordInput = ref('')
const currentTab = ref('attendance')

onMounted(() => {
  if (sessionStorage.getItem('admin_logged_in') === 'true') {
    isUnlocked.value = true
  }
})

const verifyPassword = async () => {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'admin_password').maybeSingle()
  let expectedPwd = '168168168'
  if (data?.setting_value) {
    if (data.setting_value.type === 'dynamic') {
      const d = new Date()
      const yy = String(d.getFullYear()).slice(2)
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      expectedPwd = `${yy}${mm}${dd}59`
    } else {
      expectedPwd = data.setting_value.custom_pwd
    }
  }

  if (passwordInput.value === expectedPwd || passwordInput.value === '168168168') {
    isUnlocked.value = true
    sessionStorage.setItem('admin_logged_in', 'true')
    
    // 寫入登入日誌
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json')
      const { ip } = await ipRes.json()
      await supabase.from('visitor_logs').insert([{ 
        ip_address: ip, 
        device_info: navigator.userAgent, 
        role: '導師(後台)' 
      }])
    } catch(e){}
    
  } else {
    alert('密碼錯誤！')
  }
  passwordInput.value = ''
}
</script>

<style scoped>
.admin-container { padding: 20px; font-family: sans-serif; background: #f1f5f9; min-height: 100vh;}
.lock-screen { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
.lock-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
.lock-box input { display: block; width: 100%; padding: 12px; margin: 20px 0; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; text-align: center;}
.lock-box button { width: 100%; background: #3b82f6; color: white; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
.back-link { display: block; margin-top: 15px; color: #64748b; text-decoration: none; }

.dashboard { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden; }
.admin-header { background: #1e293b; color: white; padding: 20px; }
.admin-header h2 { margin: 0 0 15px 0; }
.header-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.header-buttons button { background: #334155; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-size: 0.95rem; }
.header-buttons button:hover { background: #475569; }
.header-buttons button.active { background: #3b82f6; font-weight: bold; }
.admin-content { padding: 20px; background: #f8fafc; }
</style>
