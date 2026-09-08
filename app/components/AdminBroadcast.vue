<template>
  <div class="admin-section">
    <div class="header-box">
      <h3>📡 教室廣播遙控與定時系統</h3>
      <p class="help-text">💡 本系統可將文字與音效遠端傳送至班級首頁（教室電腦）。手動發送將於 5 秒內觸發，定時排程精準度為 1 分鐘。</p>
    </div>

    <!-- 上半部：🚨 即時遙控發送器 -->
    <div class="card manual-card">
      <h4 class="card-title">🚨 即時遙控發送 (手動廣播)</h4>
      
      <div class="form-grid">
        <div class="form-group full-width">
          <label>📝 廣播文字內容：</label>
          <input type="text" v-model="manualConfig.text" class="custom-input large-input" placeholder="例如：請各組組長現在到導師辦公室集合！" />
        </div>

        <div class="form-group">
          <label>🔊 播放音效：</label>
          <select v-model="manualConfig.sound" class="custom-input">
            <option value="none">🔇 無音效 (純文字閃爍)</option>
            <option value="chime">🛎️ 叮咚聲 (適合一般通知)</option>
            <option value="bell">🏫 學校鐘聲 (適合上下課)</option>
            <option value="alert">⚠️ 短促嗶聲 (適合緊急警告)</option>
          </select>
        </div>

        <div class="form-group">
          <label>🔁 音效播放次數：</label>
          <select v-model.number="manualConfig.playCount" class="custom-input">
            <option value="1">1 次</option>
            <option value="2">2 次</option>
            <option value="3">3 次 (奪命連環叩)</option>
          </select>
        </div>
      </div>

      <!-- 測試區塊與發送按鈕 -->
      <div class="action-row">
        <button @click="testSound" class="btn-test">🎧 電腦本機試聽音效</button>
        <button @click="sendManualBroadcast" class="btn-send" :disabled="isSending">
          {{ isSending ? '🚀 訊號發送中...' : '🚀 立刻發送到教室螢幕！' }}
        </button>
      </div>
    </div>

    <!-- 下半部：⏰ 定時排程管理 -->
    <div class="card schedule-card">
      <div class="schedule-header">
        <h4 class="card-title">⏰ 定時廣播排程 (每日循環)</h4>
        <button @click="addSchedule" class="btn-add">➕ 新增一筆排程</button>
      </div>

      <div v-if="schedules.length === 0" class="empty-state">
        目前沒有任何定時排程。
      </div>

      <div v-else class="schedule-list">
        <div v-for="(sch, index) in schedules" :key="index" class="schedule-item" :class="{'is-disabled': !sch.isActive}">
          
          <!-- 左側：開關與時間 -->
          <div class="sch-left">
            <input type="checkbox" v-model="sch.isActive" class="toggle-chk" title="啟用/停用此排程" />
            <input type="time" v-model="sch.time" class="time-input" required />
          </div>

          <!-- 中間：文字與設定 -->
          <div class="sch-middle">
            <input type="text" v-model="sch.text" class="custom-input text-input" placeholder="排程廣播文字..." />
            <select v-model="sch.sound" class="custom-input mini-select">
              <option value="none">🔇 無</option>
              <option value="chime">🛎️ 叮咚</option>
              <option value="bell">🏫 鐘聲</option>
              <option value="alert">⚠️ 警告</option>
            </select>
            <select v-model.number="sch.playCount" class="custom-input mini-select">
              <option value="1">1次</option>
              <option value="2">2次</option>
              <option value="3">3次</option>
            </select>
          </div>

          <!-- 右側：刪除按鈕 -->
          <div class="sch-right">
            <button @click="removeSchedule(index)" class="btn-del" title="刪除此排程">🗑️</button>
          </div>
        </div>
      </div>

      <div class="save-row">
        <button @click="saveSchedules" class="btn-save-all" :disabled="isSavingSch">
          {{ isSavingSch ? '儲存中...' : '💾 儲存所有排程設定' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

// === 音效連結庫 (與前端一致) ===
const sounds = {
  chime: 'https://actions.google.com/sounds/v1/alarms/dosimeter_alarm.ogg',
  bell: 'https://actions.google.com/sounds/v1/alarms/school_bell.ogg',
  alert: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg'
}

// === 狀態變數 ===
const isSending = ref(false)
const isSavingSch = ref(false)

const manualConfig = ref({
  text: '',
  sound: 'chime',
  playCount: 1,
  triggerTimestamp: 0 // 這是觸發前端更新的關鍵
})

const schedules = ref([])

// === 載入資料 ===
const fetchSettings = async () => {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'broadcast_settings').maybeSingle()
  if (data && data.setting_value) {
    if (data.setting_value.schedules) {
      schedules.value = data.setting_value.schedules
    }
  }
}

onMounted(() => fetchSettings())

// === 本機試聽音效 ===
const testSound = () => {
  if (manualConfig.value.sound === 'none') return alert('您目前選擇「無音效」喔！')
  const audio = new Audio(sounds[manualConfig.value.sound])
  audio.play()
}

// === 🚀 儲存並發送「手動廣播」訊號 ===
const sendManualBroadcast = async () => {
  if (!manualConfig.value.text.trim()) return alert('⚠️ 廣播文字不可為空！')
  
  isSending.value = true
  
  // 更新時間戳記，確保前端知道這是「新」的指令
  manualConfig.value.triggerTimestamp = Date.now()

  // 我們把 manualConfig 和 schedules 打包一起存進 broadcast_settings
  const newSettings = {
    manual: manualConfig.value,
    schedules: schedules.value
  }

  const { error } = await supabase.from('system_settings').upsert(
    { setting_key: 'broadcast_settings', setting_value: newSettings },
    { onConflict: 'setting_key' }
  )

  if (!error) {
    alert('✅ 廣播訊號已發送！教室端將於 5 秒內響起！')
  } else {
    alert('❌ 發送失敗，請稍後再試。')
  }
  
  isSending.value = false
}

// === ⏰ 排程管理邏輯 ===
const addSchedule = () => {
  schedules.value.push({
    isActive: true,
    time: '08:00',
    text: '早自修時間開始，請同學回到座位。',
    sound: 'bell',
    playCount: 1
  })
}

const removeSchedule = (index) => {
  if (confirm('確定要刪除這筆排程嗎？')) {
    schedules.value.splice(index, 1)
  }
}

const saveSchedules = async () => {
  // 檢查時間格式是否都有填寫
  if (schedules.value.some(s => !s.time)) return alert('⚠️ 有排程的時間未填寫完整！')
  
  isSavingSch.value = true
  
  const newSettings = {
    // 保留 manual 先前的紀錄，避免被洗掉
    manual: manualConfig.value,
    schedules: schedules.value
  }

  const { error } = await supabase.from('system_settings').upsert(
    { setting_key: 'broadcast_settings', setting_value: newSettings },
    { onConflict: 'setting_key' }
  )

  if (!error) alert('✅ 定時排程已儲存生效！')
  else alert('❌ 儲存失敗')
  
  isSavingSch.value = false
}
</script>

<style scoped>
.admin-section { font-family: sans-serif; }
.header-box { margin-bottom: 20px; }
.header-box h3 { margin: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 1.4rem; }
.help-text { font-size: 0.95rem; color: #64748b; margin-top: 10px; }

.card { background: white; padding: 25px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 25px; }
.card-title { margin-top: 0; margin-bottom: 20px; font-size: 1.2rem; color: #0f172a; padding-bottom: 10px; border-bottom: 1px dashed #cbd5e1; }

.manual-card { border-left: 5px solid #ef4444; }
.schedule-card { border-left: 5px solid #3b82f6; }

/* 共通表單樣式 */
.form-grid { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
.full-width { flex: 100%; }
.form-group label { font-weight: bold; color: #475569; }

.custom-input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; outline: none; transition: 0.2s;}
.custom-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
.large-input { font-size: 1.1rem; padding: 12px; font-weight: bold; color: #b45309; background: #fffbeb; border-color: #fcd34d; }

.action-row { display: flex; gap: 15px; justify-content: flex-end; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
.btn-test { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-test:hover { background: #e2e8f0; }

.btn-send { background: #ef4444; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 1.15rem; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px rgba(239,68,68,0.3); }
.btn-send:hover:not(:disabled) { background: #dc2626; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(239,68,68,0.4); }
.btn-send:disabled { background: #fca5a5; cursor: not-allowed; transform: none; box-shadow: none; }


/* 排程區域樣式 */
.schedule-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; }
.schedule-header .card-title { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.btn-add { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-add:hover { background: #059669; }

.empty-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; background: #f8fafc; border-radius: 8px; }

.schedule-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.schedule-item { display: flex; align-items: center; gap: 15px; background: #f8fafc; padding: 12px 15px; border-radius: 8px; border: 1px solid #e2e8f0; transition: 0.3s; flex-wrap: wrap; }
.schedule-item.is-disabled { opacity: 0.6; filter: grayscale(100%); background: #f1f5f9; }

.sch-left { display: flex; align-items: center; gap: 10px; }
.toggle-chk { transform: scale(1.5); accent-color: #3b82f6; cursor: pointer; }
.time-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.1rem; font-family: monospace; font-weight: bold; }

.sch-middle { display: flex; flex: 1; gap: 10px; min-width: 300px; }
.text-input { flex: 1; }
.mini-select { width: 120px; }

.sch-right { display: flex; align-items: center; }
.btn-del { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 1.1rem; transition: 0.2s;}
.btn-del:hover { background: #fecaca; color: #b91c1c; }

.save-row { display: flex; justify-content: flex-end; padding-top: 15px; border-top: 1px solid #e2e8f0; }
.btn-save-all { background: #3b82f6; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-save-all:hover:not(:disabled) { background: #2563eb; }
.btn-save-all:disabled { background: #93c5fd; cursor: not-allowed; }

@media (max-width: 768px) {
  .schedule-item { flex-direction: column; align-items: flex-start; }
  .sch-middle { flex-direction: column; width: 100%; }
  .mini-select { width: 100%; }
}
</style>
