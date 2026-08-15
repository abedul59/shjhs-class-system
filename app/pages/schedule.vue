<template>
  <div class="schedule-page">
    <!-- 🔒 鎖定畫面 -->
    <div v-if="!isLoggedIn" class="login-container">
      <div class="login-card">
        <h2>🗓️ 班級課表管理</h2>
        <p class="subtitle">此區域僅限導師進入</p>
        <div class="form-group">
          <label>請輸入導師後台密碼：</label>
          <input 
            v-model="passwordInput" 
            type="password" 
            placeholder="支援動態密碼..." 
            class="form-control" 
            @keyup.enter="handleLogin"
          />
        </div>
        <button @click="handleLogin" class="btn-submit" :disabled="isLoggingIn">
          {{ isLoggingIn ? '驗證中...' : '解鎖進入' }}
        </button>
        <div class="back-link">
          <NuxtLink to="/">⬅️ 返回首頁</NuxtLink>
        </div>
      </div>
    </div>

    <!-- 🗓️ 課表編輯區 -->
    <div v-else class="workspace">
      <header class="workspace-header">
        <h2>🗓️ 班級課表管理系統</h2>
        <div class="header-actions">
          <button @click="saveSchedule" class="btn-save" :disabled="isSaving">
            {{ isSaving ? '⏳ 儲存中...' : '💾 儲存並發布' }}
          </button>
          <button @click="logout" class="btn-logout">登出</button>
        </div>
      </header>

      <div class="tips">
        💡 提示：請設定每節課的開始與結束時間 (24小時制，如 08:15)。首頁會自動根據當下時間顯示目前與下一節課。留空表示該時段沒有特定課程。
      </div>

      <div class="schedule-container">
        <table class="schedule-table">
          <thead>
            <tr>
              <th width="80">節次</th>
              <th width="140">時間設定</th>
              <th>星期一</th>
              <th>星期二</th>
              <th>星期三</th>
              <th>星期四</th>
              <th>星期五</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(period, pIndex) in scheduleData.periods" :key="'p-'+pIndex">
              <td class="period-name"><strong>{{ period.name }}</strong></td>
              <td class="time-inputs">
                <input type="time" v-model="period.startTime" class="time-ctrl" />
                <span>-</span>
                <input type="time" v-model="period.endTime" class="time-ctrl" />
              </td>
              <td v-for="day in 5" :key="'d-'+day">
                <div class="subject-input-group">
                  <input type="text" v-model="period.days[day-1].subject" placeholder="科目名稱" class="subject-input" />
                  <input type="text" v-model="period.days[day-1].teacher" placeholder="老師(選填)" class="teacher-input" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const isLoggedIn = ref(false)
const isLoggingIn = ref(false)
const passwordInput = ref('')
const isSaving = ref(false)

// 預設課表資料結構
const defaultSchedule = {
  periods: [
    { name: '早修', startTime: '07:30', endTime: '08:15', days: Array(5).fill().map(() => ({ subject: '', teacher: '' })) },
    { name: '第一節', startTime: '08:20', endTime: '09:05', days: Array(5).fill().map(() => ({ subject: '', teacher: '' })) },
    { name: '第二節', startTime: '09:15', endTime: '10:00', days: Array(5).fill().map(() => ({ subject: '', teacher: '' })) },
    { name: '第三節', startTime: '10:10', endTime: '10:55', days: Array(5).fill().map(() => ({ subject: '', teacher: '' })) },
    { name: '第四節', startTime: '11:05', endTime: '11:50', days: Array(5).fill().map(() => ({ subject: '', teacher: '' })) },
    { name: '午休', startTime: '12:00', endTime: '13:00', days: Array(5).fill().map(() => ({ subject: '', teacher: '' })) },
    { name: '第五節', startTime: '13:10', endTime: '13:55', days: Array(5).fill().map(() => ({ subject: '', teacher: '' })) },
    { name: '第六節', startTime: '14:05', endTime: '14:50', days: Array(5).fill().map(() => ({ subject: '', teacher: '' })) },
    { name: '第七節', startTime: '15:05', endTime: '15:50', days: Array(5).fill().map(() => ({ subject: '', teacher: '' })) },
    { name: '第八節', startTime: '16:00', endTime: '16:45', days: Array(5).fill().map(() => ({ subject: '', teacher: '' })) }
  ]
}

const scheduleData = ref(JSON.parse(JSON.stringify(defaultSchedule)))

onMounted(async () => {
  if (sessionStorage.getItem('schedule_admin_logged_in') === 'true') {
    isLoggedIn.value = true
    await fetchSchedule()
  }
})

const handleLogin = async () => {
  if (!passwordInput.value) return
  isLoggingIn.value = true
  
  try {
    const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'admin_password').maybeSingle()
    let expectedPwd = '168168168' 
    if (data?.setting_value) {
      const config = data.setting_value
      if (config.type === 'dynamic') {
        const d = new Date(); const yy = String(d.getFullYear()).slice(2); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0')
        expectedPwd = `${yy}${mm}${dd}59`
      } else if (config.type === 'custom' && config.custom_pwd) { expectedPwd = config.custom_pwd }
    }
    if (passwordInput.value === expectedPwd || passwordInput.value === '168168168') {
      isLoggedIn.value = true
      sessionStorage.setItem('schedule_admin_logged_in', 'true')
      await fetchSchedule()
    } else alert('❌ 密碼錯誤！')
  } catch (e) {
    if (passwordInput.value === '168168168') { isLoggedIn.value = true; sessionStorage.setItem('schedule_admin_logged_in', 'true'); await fetchSchedule() }
    else alert('驗證發生錯誤。')
  } finally { isLoggingIn.value = false; passwordInput.value = '' }
}

const logout = () => { sessionStorage.removeItem('schedule_admin_logged_in'); isLoggedIn.value = false; navigateTo('/') }

const fetchSchedule = async () => {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'class_schedule_data').maybeSingle()
  if (data?.setting_value && data.setting_value.periods) {
    scheduleData.value = data.setting_value
  } else {
    scheduleData.value = JSON.parse(JSON.stringify(defaultSchedule))
  }
}

const saveSchedule = async () => {
  isSaving.value = true
  try {
    const { error } = await supabase.from('system_settings').upsert({
      setting_key: 'class_schedule_data',
      setting_value: scheduleData.value
    }, { onConflict: 'setting_key' })
    
    if (error) throw error
    alert('✅ 課表已成功儲存並同步至首頁！')
  } catch (err) {
    alert('❌ 儲存失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.schedule-page { min-height: 100vh; background: #f1f5f9; font-family: sans-serif; }
.login-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; padding: 20px; }
.login-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
.subtitle { color: #64748b; margin-bottom: 20px; }
.form-group { margin-bottom: 20px; text-align: left; }
.form-control { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; }
.btn-submit { width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
.back-link { margin-top: 15px; }

.workspace { padding: 20px; max-width: 1400px; margin: 0 auto; }
.workspace-header { 
  display: flex; justify-content: space-between; align-items: center; 
  background: white; padding: 15px 25px; border-radius: 8px; margin-bottom: 15px; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.05); flex-wrap: wrap; gap: 15px;
}
.workspace-header h2 { margin: 0; color: #1e3a8a; }

.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-save { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-logout { background: #ef4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.tips { background: #fffbeb; color: #b45309; padding: 10px 15px; border-radius: 6px; border: 1px dashed #fcd34d; margin-bottom: 20px; font-size: 0.95rem; line-height: 1.5; }

.schedule-container { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow-x: auto; }
.schedule-table { width: 100%; min-width: 1000px; border-collapse: collapse; text-align: center; }
.schedule-table th, .schedule-table td { border: 1px solid #cbd5e1; padding: 10px; }
.schedule-table th { background: #f8fafc; color: #334155; font-size: 1.1rem; }
.period-name { background: #f1f5f9; color: #0f172a; }

.time-inputs { display: flex; align-items: center; justify-content: center; gap: 5px; }
.time-ctrl { padding: 4px; border: 1px solid #94a3b8; border-radius: 4px; font-family: monospace; font-size: 0.9rem;}

.subject-input-group { display: flex; flex-direction: column; gap: 5px; }
.subject-input { padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; text-align: center; color: #1e293b;}
.subject-input:focus { border-color: #3b82f6; outline: none; background: #eff6ff;}
.teacher-input { padding: 4px; border: 1px dashed #cbd5e1; border-radius: 4px; font-size: 0.85rem; text-align: center; color: #64748b;}
</style>
