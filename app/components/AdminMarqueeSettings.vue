<template>
  <div class="admin-section">
    <h3>📢 首頁跑馬燈獨立管理</h3>
    <p class="help-text">💡 編輯並儲存後，班級首頁將會在 60 秒內的自動更新週期自動同步效果。</p>
    
    <div class="form-group chk-group">
      <label class="icon-toggle">
        <input type="checkbox" v-model="settings.isVisible" class="large-checkbox" />
        👁️ 啟用/顯示跑馬燈
      </label>
    </div>

    <div class="form-group">
      <label>📝 跑馬燈公告內容：</label>
      <input type="text" v-model="settings.text" class="custom-input" placeholder="請輸入公告內容..." />
    </div>

    <div class="settings-grid">
      <div class="form-group">
        <label>✨ 動畫效果：</label>
        <select v-model="settings.effect" class="custom-input">
          <option value="scroll-left">向左捲動 (經典跑馬燈)</option>
          <option value="blink">閃爍警告</option>
          <option value="pulse">呼吸光暈</option>
          <option value="static">靜態置中</option>
        </select>
      </div>

      <div class="form-group">
        <label>⏱️ 動畫速度/週期 (秒)：</label>
        <input type="number" v-model="settings.speed" class="custom-input" min="1" max="60" />
        <small class="hint">數字越小速度越快。建議：捲動設 15，閃爍設 2</small>
      </div>

      <div class="form-group">
        <label>🔤 文字顏色：</label>
        <div class="color-picker-box">
          <input type="color" v-model="settings.color" class="color-input" />
          <span class="color-hex">{{ settings.color }}</span>
        </div>
      </div>

      <div class="form-group">
        <label>🎨 背景顏色：</label>
        <div class="color-picker-box">
          <input type="color" v-model="settings.bgColor" class="color-input" />
          <span class="color-hex">{{ settings.bgColor }}</span>
        </div>
      </div>
    </div>

    <!-- 👁️ 即時預覽區塊 -->
    <div class="preview-box">
      <h4>👁️ 即時預覽效果</h4>
      <div class="marquee-preview-container" :style="{ backgroundColor: settings.bgColor, color: settings.color, '--mq-speed': settings.speed + 's' }">
        <div :class="['marquee-content', `effect-${settings.effect}`]">
          {{ settings.text || '（請輸入公告內容以預覽）' }}
        </div>
      </div>
    </div>

    <button @click="saveSettings" class="save-btn" :disabled="isSaving">
      {{ isSaving ? '儲存中...' : '💾 儲存跑馬燈設定' }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const isSaving = ref(false)
const settings = ref({
  isVisible: false,
  text: '期中考即將到來，請同學記得準備2B鉛筆！',
  speed: 15,
  effect: 'scroll-left',
  color: '#dc2626',
  bgColor: '#fee2e2'
})

// 載入設定
const fetchSettings = async () => {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'marquee_settings').maybeSingle()
  if (data && data.setting_value) {
    settings.value = { ...settings.value, ...data.setting_value }
  }
}

onMounted(() => fetchSettings())

// 儲存設定
const saveSettings = async () => {
  isSaving.value = true
  const { error } = await supabase.from('system_settings').upsert(
    { setting_key: 'marquee_settings', setting_value: settings.value },
    { onConflict: 'setting_key' }
  )
  if (!error) alert('✅ 跑馬燈設定已成功儲存並同步至首頁！')
  else alert('❌ 儲存失敗')
  isSaving.value = false
}
</script>

<style scoped>
.admin-section { background: white; padding: 25px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.admin-section h3 { margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
.help-text { font-size: 0.95rem; color: #64748b; margin-bottom: 20px; }

.form-group { margin-bottom: 15px; display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-weight: bold; color: #475569; }
.custom-input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; outline: none; }
.custom-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
.hint { font-size: 0.85rem; color: #94a3b8; margin-top: 2px; }

.settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;}

.icon-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; background: #f1f5f9; padding: 10px 15px; border-radius: 6px; border: 1px solid #cbd5e1; width: max-content; }
.large-checkbox { transform: scale(1.3); accent-color: #3b82f6; }

.color-picker-box { display: flex; align-items: center; gap: 10px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 12px; }
.color-input { -webkit-appearance: none; -moz-appearance: none; appearance: none; width: 30px; height: 30px; border: none; cursor: pointer; padding: 0; background: transparent;}
.color-hex { font-family: monospace; font-size: 1.05rem; font-weight: bold; text-transform: uppercase; }

.save-btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 1.1rem; cursor: pointer; transition: 0.2s; width: 100%;}
.save-btn:hover:not(:disabled) { background: #2563eb; }

/* 預覽區塊樣式 (與首頁一致) */
.preview-box { margin-bottom: 20px; padding: 15px; background: #fffbeb; border: 1px dashed #fcd34d; border-radius: 8px; }
.preview-box h4 { margin: 0 0 10px 0; color: #b45309; }
.marquee-preview-container { width: 100%; overflow: hidden; padding: 10px 15px; border-radius: 8px; font-size: 1.15rem; font-weight: bold; display: flex; align-items: center; box-sizing: border-box; }
.marquee-content { white-space: nowrap; width: 100%; }
.effect-scroll-left { display: inline-block; padding-left: 100%; animation: scroll var(--mq-speed) linear infinite; }
@keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
.effect-blink { text-align: center; animation: blink var(--mq-speed) step-end infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.effect-pulse { text-align: center; animation: pulse var(--mq-speed) ease-in-out infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); opacity: 0.8; } }
.effect-static { text-align: center; }
</style>
