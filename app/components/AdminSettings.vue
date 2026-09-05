<template>
  <div>
    <div class="table-header"><h3>⚙️ 系統設定與密碼管理</h3></div>
    
    <!-- 密碼設定區塊 -->
    <div class="settings-section">
      <h4>🔑 後台解鎖與推播密碼模式</h4>
      <p class="help-text">💡 提示：為避免設定錯誤導致您永遠無法登入，系統已保留 <strong>168168168</strong> 作為永久萬用救援密碼。</p>
      
      <div class="radio-group">
        <label>
          <input type="radio" v-model="pwdConfig.type" value="dynamic" />
          <strong>動態密碼</strong> (今日日期 YYMMDD + 59)
          <span class="preview-tag" v-if="pwdConfig.type === 'dynamic'">👉 今日密碼為：{{ currentDynamicPwd }}</span>
        </label>
        
        <label>
          <input type="radio" v-model="pwdConfig.type" value="custom" />
          <strong>自訂固定密碼</strong>
        </label>
      </div>

      <div v-if="pwdConfig.type === 'custom'" class="custom-pwd-box">
        <label>請設定您的專屬密碼：</label>
        <input type="text" v-model="pwdConfig.custom_pwd" class="edit-input" placeholder="請輸入密碼..." />
      </div>

      <button @click="saveSettings" class="save-btn" :disabled="isSaving">
        {{ isSaving ? '儲存中...' : '💾 儲存密碼設定' }}
      </button>
    </div>

    <!-- 🕒 首頁時鐘大小設定區塊 -->
    <div class="settings-section" style="margin-top: 25px;">
      <h4>🕒 首頁時鐘字體大小設定</h4>
      <p class="help-text">💡 您可以自訂首頁上方大時鐘的顯示大小（預設為 35px，修改後請至首頁查看效果）。</p>
      
      <div class="custom-pwd-box" style="margin-left: 0; border-left-color: #10b981;">
        <label>字體大小 (px)：</label>
        <input type="number" v-model="clockFontSize" class="edit-input" style="width: 150px;" min="10" max="150" />
        <button @click="saveClockSettings" class="save-btn" style="margin-top: 0; padding: 8px 16px; font-size: 1rem; background-color: #10b981;" :disabled="isSavingClock">
          {{ isSavingClock ? '儲存中...' : '💾 儲存時鐘大小' }}
        </button>
      </div>
    </div>

    <!-- 💡 新增：🔄 首頁自動更新頻率設定區塊 -->
    <div class="settings-section" style="margin-top: 25px;">
      <h4>🔄 首頁自動更新頻率設定</h4>
      <p class="help-text">💡 設定首頁在背景「無感重新整理」資料的頻率（預設為 60 秒）。若設為 0 則代表關閉自動更新。</p>
      
      <div class="custom-pwd-box" style="margin-left: 0; border-left-color: #8b5cf6;">
        <label>更新間隔 (秒)：</label>
        <input type="number" v-model="autoRefreshSeconds" class="edit-input" style="width: 150px;" min="0" max="3600" />
        <button @click="saveRefreshSettings" class="save-btn" style="margin-top: 0; padding: 8px 16px; font-size: 1rem; background-color: #8b5cf6;" :disabled="isSavingRefresh">
          {{ isSavingRefresh ? '儲存中...' : '💾 儲存更新頻率' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()

const pwdConfig = ref({ type: 'dynamic', custom_pwd: '' })
const isSaving = ref(false)

const clockFontSize = ref(35)
const isSavingClock = ref(false)

// 💡 新增：自動更新秒數狀態變數
const autoRefreshSeconds = ref(60)
const isSavingRefresh = ref(false)

// 自動計算今天的動態密碼 (YYMMDD + 59)
const currentDynamicPwd = computed(() => {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}59`
})

// 載入當前所有設定
const fetchConfig = async () => {
  // 載入密碼設定
  const { data: pwdData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'admin_password').maybeSingle()
  if (pwdData?.setting_value) pwdConfig.value = pwdData.setting_value

  // 載入時鐘大小設定
  const { data: clockData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'index_clock_size').maybeSingle()
  if (clockData && clockData.setting_value) {
    clockFontSize.value = Number(clockData.setting_value) || 35
  }

  // 💡 載入自動更新秒數設定
  const { data: refreshData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'index_auto_refresh_seconds').maybeSingle()
  if (refreshData && refreshData.setting_value !== undefined) {
    autoRefreshSeconds.value = Number(refreshData.setting_value)
  }
}
onMounted(() => fetchConfig())

// 儲存密碼設定
const saveSettings = async () => {
  if (pwdConfig.value.type === 'custom' && !pwdConfig.value.custom_pwd.trim()) {
    return alert('❌ 請輸入您的自訂密碼！')
  }
  isSaving.value = true
  const { error } = await supabase.from('system_settings').upsert(
    { setting_key: 'admin_password', setting_value: pwdConfig.value },
    { onConflict: 'setting_key' }
  )
  if (!error) alert('✅ 密碼設定已成功更新！下次登入或發信即刻生效。')
  else alert('❌ 儲存失敗')
  isSaving.value = false
}

// 儲存時鐘大小
const saveClockSettings = async () => {
  isSavingClock.value = true
  const { error } = await supabase.from('system_settings').upsert(
    { setting_key: 'index_clock_size', setting_value: clockFontSize.value },
    { onConflict: 'setting_key' }
  )
  if (!error) alert('✅ 首頁時鐘大小已成功更新！')
  else alert('❌ 儲存失敗')
  isSavingClock.value = false
}

// 💡 儲存自動更新秒數
const saveRefreshSettings = async () => {
  isSavingRefresh.value = true
  const { error } = await supabase.from('system_settings').upsert(
    { setting_key: 'index_auto_refresh_seconds', setting_value: autoRefreshSeconds.value },
    { onConflict: 'setting_key' }
  )
  if (!error) alert('✅ 自動更新頻率設定成功！重整首頁後生效。')
  else alert('❌ 儲存失敗')
  isSavingRefresh.value = false
}
</script>

<style scoped>
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.table-header h3 { margin: 0; color: #334155; }
.settings-section { background: white; padding: 25px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.settings-section h4 { margin-top: 0; color: #1e293b; }
.help-text { font-size: 0.95rem; color: #64748b; margin-bottom: 20px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 15px; }
.radio-group { display: flex; flex-direction: column; gap: 15px; margin: 20px 0; font-size: 1.1rem; }
.radio-group label { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.preview-tag { background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 0.95rem; font-weight: bold; margin-left: 10px; }
.custom-pwd-box { margin-left: 28px; padding: 15px; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;}
.edit-input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 1rem; width: 250px; }
.save-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 1.1rem; cursor: pointer; margin-top: 20px; transition: 0.2s;}
.save-btn:hover:not(:disabled) { filter: brightness(0.9); }
.save-btn:disabled { background: #94a3b8; cursor: not-allowed; }
</style>
