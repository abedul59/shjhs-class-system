<template>
  <div class="admin-container">
    <div v-if="!isUnlocked" class="lock-screen">
      <div class="lock-box">
        <h2>🔒 導師專屬後台</h2>
        <input v-model="passwordInput" type="password" placeholder="請輸入密碼..." @keyup.enter="verifyPassword"/>
        <button @click="verifyPassword">解鎖進入</button>
      </div>
    </div>

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
          <NuxtLink to="/" class="back-btn">⬅️ 返回前台</NuxtLink>
        </div>
      </header>

      <main class="data-table">
        <AdminAttendance v-if="currentTab === 'attendance'" />
        <AdminHomework v-if="currentTab === 'homework'" />
        <AdminBoard v-if="currentTab === 'board'" />
        <AdminMessages v-if="currentTab === 'messages'" />
        <AdminStudents v-if="currentTab === 'students'" />
        <AdminSecurity v-if="currentTab === 'security'" />
        <AdminAudit v-if="currentTab === 'audit'" />
        <AdminCommunication v-if="currentTab === 'communication'" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const isUnlocked = ref(false)
const passwordInput = ref('')
const currentTab = ref('board') // 預設開啟分頁

const verifyPassword = () => {
  if (passwordInput.value === '168168168') isUnlocked.value = true
  else alert('❌ 密碼錯誤！')
}
</script>

<style scoped>
.admin-container { min-height: 100vh; background-color: #f1f5f9; font-family: sans-serif; padding-bottom: 50px; }
.lock-screen { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #1e293b; }
.lock-box { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 400px; }
.lock-box input { width: 100%; padding: 12px; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; }
.lock-box button { width: 100%; padding: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
.dashboard { max-width: 1400px; margin: 0 auto; padding: 20px; }
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: white; padding: 15px 25px; border-radius: 12px; flex-wrap: wrap; gap: 15px; }
.header-buttons button { padding: 8px 15px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; background: #e2e8f0; color: #475569; margin-right: 5px; }
.header-buttons button.active { background: #3b82f6; color: white; }
.back-btn { text-decoration: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; background: #ef4444; color: white; display: inline-block; }
.data-table { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
</style>
