<template>
  <div>
    <div class="table-header"><h3>⚙️ 系統設定與密碼管理</h3></div>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()

const pwdConfig = ref({ type: 'dynamic', custom_pwd: '' })
const isSaving = ref(false)

// 自動計算今天的動態密碼 (YYMMDD + 59)
const currentDynamicPwd = computed(() => {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}59`
})

// 載入當前設定
const fetchConfig = async () => {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'admin_password').maybeSingle()
  if (data?.setting_value) pwdConfig.value = data.setting_value
}
onMounted(() => fetchConfig())

// 儲存設定至資料庫
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
.custom-pwd-box { margin-left: 28px; padding: 15px; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; display: flex; align-items: center; gap: 10px; }
.edit-input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 1rem; width: 250px; }
.save-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 1.1rem; cursor: pointer; margin-top: 20px; }
.save-btn:disabled { background: #94a3b8; cursor: not-allowed; }
</style>
