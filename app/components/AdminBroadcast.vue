<template>
  <div class="admin-section">
    <div class="header-box">
      <h3>📡 教室廣播遙控與定時系統</h3>
      <p class="help-text">💡 本系統可將文字與音效遠端傳送至班級首頁（教室電腦）。手動發送將於 5 秒內觸發，定時排程精準度為 1 分鐘。</p>
      
      <!-- 🛡️ IP 狀態安全檢測區塊 -->
      <div class="ip-security-banner" :class="isCurrentDeviceClassroom ? 'is-safe' : 'is-warning'">
        <strong>🛡️ 廣播安全隔離檢測：</strong> 
        您的目前 IP 為 {{ currentIP }}。<br>
        狀態：{{ isCurrentDeviceClassroom ? '✅ 這台是教室電腦！首頁將會接收並發出廣播。' : '⚠️ 這台不是教室電腦。為保護隱私，您的首頁已啟動靜音隔離，家長在家絕對聽不到廣播。' }}
      </div>
    </div>

    <!-- 上半部：🚨 即時遙控發送器 -->
    <div class="card manual-card">
      <h4 class="card-title">🚨 即時遙控發送 (手動廣播)</h4>
      
      <div class="form-grid">
        <div class="form-group full-width">
          <label>📝 廣播文字內容 (將於音效後自動語音朗讀)：</label>
          <input type="text" v-model="manualConfig.text" class="custom-input large-input" placeholder="例如：請各組組長現在到導師辦公室集合！" />
        </div>

        <div class="form-group">
          <label>🔊 播放音效：</label>
          <select v-model="manualConfig.sound" class="custom-input">
            <option v-for="opt in soundOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
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
        <button @click="testSoundAndTTS" class="btn-test" :disabled="isTesting">
          {{ isTesting ? '🔊 試聽模擬中...' : '🎧 本機模擬試聽 (音效+語音)' }}
        </button>
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

      <div v-if="schedules.length === 0" class="empty-state">目前沒有任何定時排程。</div>

      <div v-else class="schedule-list">
        <div v-for="(sch, index) in schedules" :key="index" class="schedule-item" :class="{'is-disabled': !sch.isActive}">
          
          <div class="sch-left">
            <input type="checkbox" v-model="sch.isActive" class="toggle-chk" title="啟用/停用此排程" />
            <input type="time" v-model="sch.time" class="time-input" required />
          </div>

          <div class="sch-middle">
            <input type="text" v-model="sch.text" class="custom-input text-input" placeholder="排程廣播文字..." />
            <select v-model="sch.sound" class="custom-input mini-select">
              <option v-for="opt in soundOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <select v-model.number="sch.playCount" class="custom-input mini-select-small">
              <option value="1">1次</option><option value="2">2次</option><option value="3">3次</option>
            </select>
          </div>

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

// === 25 種音效選單 ===
const soundOptions = [
  { value: 'none', label: '🔇 無音效 (純文字)' },
  { value: 'bell', label: '🏫 傳統學校鐘聲' },
  { value: 'alert', label: '⚠️ 短促警告聲' },
  { value: 'digital_alarm', label: '⏰ 數位電子鬧鐘' },
  { value: 'bugle', label: '🎺 晨會軍號聲' },
  { value: 'clock_ring', label: '🕰️ 復古機械鐘' },
  { value: 'boing', label: '🤪 卡通彈跳聲' },
  { value: 'pop', label: '🫧 清脆啵啵聲' },
  { value: 'slide_whistle', label: '🎢 滑笛上升聲' },
  { value: 'text_msg', label: '💬 訊息通知音' },
  { value: 'cash_register', label: '💰 收銀機叮噹' },
  { value: 'clock_tick', label: '⏱️ 時鐘滴答聲' },
  { value: 'clear_throat', label: '🗣️ 清喉嚨提示' },
  { value: 'guitar', label: '🎸 吉他刷弦聲' },
  { value: 'harp', label: '👼 豎琴滑音' },
  { value: 'xylophone', label: '🎹 木琴敲擊聲' },
  { value: 'sci_fi_beep', label: '🛸 科幻雷達音' },
  { value: 'robot', label: '🤖 機器人代碼聲' },
  { value: 'hammer', label: '🔨 木槌敲擊聲' },
  { value: 'bike_bell', label: '🚲 腳踏車鈴聲' },
  { value: 'car_horn', label: '🚗 汽車喇叭聲' },
  { value: 'train', label: '🚂 火車汽笛聲' },
  { value: 'thunder', label: '🌩️ 雷聲巨響' },
  { value: 'rooster', label: '🐓 公雞啼叫聲' },
  { value: 'dog', label: '🐕 狗吠聲' },
  { value: 'cat', label: '🐈 貓叫聲' }
]

const sounds = {
  bell: 'https://actions.google.com/sounds/v1/alarms/school_bell.ogg',
  alert: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  digital_alarm: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
  bugle: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg',
  clock_ring: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg',
  boing: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg',
  pop: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
  slide_whistle: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle_up.ogg',
  text_msg: 'https://actions.google.com/sounds/v1/communication/getting_a_text.ogg',
  cash_register: 'https://actions.google.com/sounds/v1/foley/cash_register.ogg',
  clock_tick: 'https://actions.google.com/sounds/v1/household/clock_ticking.ogg',
  clear_throat: 'https://actions.google.com/sounds/v1/human_voices/human_clearing_throat.ogg',
  guitar: 'https://actions.google.com/sounds/v1/instruments/acoustic_guitar_strum.ogg',
  harp: 'https://actions.google.com/sounds/v1/instruments/orchestral_harp_glissando_up.ogg',
  xylophone: 'https://actions.google.com/sounds/v1/instruments/xylophone_up.ogg',
  sci_fi_beep: 'https://actions.google.com/sounds/v1/science_fiction/sci_fi_beep.ogg',
  robot: 'https://actions.google.com/sounds/v1/science_fiction/robot_code.ogg',
  hammer: 'https://actions.google.com/sounds/v1/tools/hammer_hitting_wood.ogg',
  bike_bell: 'https://actions.google.com/sounds/v1/transportation/bicycle_bell.ogg',
  car_horn: 'https://actions.google.com/sounds/v1/transportation/car_horn.ogg',
  train: 'https://actions.google.com/sounds/v1/transportation/train_whistle.ogg',
  thunder: 'https://actions.google.com/sounds/v1/weather/thunder_crack.ogg',
  rooster: 'https://actions.google.com/sounds/v1/animals/rooster_crowing.ogg',
  dog: 'https://actions.google.com/sounds/v1/animals/dog_barking.ogg',
  cat: 'https://actions.google.com/sounds/v1/animals/cat_meow.ogg'
}

// === 狀態變數 ===
const isSending = ref(false)
const isSavingSch = ref(false)
const isTesting = ref(false)

const currentIP = ref('檢查中...')
const isCurrentDeviceClassroom = ref(false)

const manualConfig = ref({ text: '', sound: 'bell', playCount: 1, triggerTimestamp: 0 })
const schedules = ref([])

// === 載入資料與 IP 檢查 ===
const fetchSettingsAndCheckIP = async () => {
  // 1. 抓取廣播設定
  const { data: bData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'broadcast_settings').maybeSingle()
  if (bData && bData.setting_value && bData.setting_value.schedules) {
    schedules.value = bData.setting_value.schedules
  }

  // 2. 抓取目前 IP 並進行褐名單比對 (模擬首頁的防護牆)
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json')
    const { ip } = await ipRes.json()
    currentIP.value = ip
    
    const { data: rules } = await supabase.from('ip_rules').select('ip_range').eq('rule_type', '褐名單')
    if (rules && rules.length > 0) {
      isCurrentDeviceClassroom.value = rules.some(r => ip.startsWith(r.ip_range))
    }
  } catch (e) {
    currentIP.value = '無法取得 IP'
  }
}

onMounted(() => fetchSettingsAndCheckIP())

// === 本機完美模擬試聽 (音效 -> TTS) ===
const testSoundAndTTS = async () => {
  if (isTesting.value) return
  isTesting.value = true

  // 1. 播音效
  if (manualConfig.value.sound !== 'none' && sounds[manualConfig.value.sound]) {
    for (let i = 0; i < manualConfig.value.playCount; i++) {
      await new Promise((resolve) => {
        const audio = new Audio(sounds[manualConfig.value.sound])
        audio.onended = resolve
        audio.onerror = resolve
        audio.play().catch(resolve)
      })
      await new Promise(r => setTimeout(r, 500))
    }
  }

  // 2. 播語音
  if (manualConfig.value.text.trim()) {
    await new Promise((resolve) => {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(manualConfig.value.text)
      utterance.lang = 'zh-TW'
      utterance.onend = resolve
      utterance.onerror = resolve
      window.speechSynthesis.speak(utterance)
    })
  }
  
  isTesting.value = false
}

// === 🚀 發送廣播 ===
const sendManualBroadcast = async () => {
  if (!manualConfig.value.text.trim()) return alert('⚠️ 廣播文字不可為空！')
  isSending.value = true
  manualConfig.value.triggerTimestamp = Date.now()
  
  const newSettings = { manual: manualConfig.value, schedules: schedules.value }
  const { error } = await supabase.from('system_settings').upsert({ setting_key: 'broadcast_settings', setting_value: newSettings }, { onConflict: 'setting_key' })

  if (!error) alert('✅ 廣播訊號已發送！教室端將於 5 秒內響起！')
  else alert('❌ 發送失敗，請稍後再試。')
  isSending.value = false
}

// === ⏰ 排程管理 ===
const addSchedule = () => { schedules.value.push({ isActive: true, time: '08:00', text: '早自修時間開始，請同學回到座位。', sound: 'bell', playCount: 1 }) }
const removeSchedule = (index) => { if (confirm('確定要刪除這筆排程嗎？')) schedules.value.splice(index, 1) }

const saveSchedules = async () => {
  if (schedules.value.some(s => !s.time)) return alert('⚠️ 有排程的時間未填寫完整！')
  isSavingSch.value = true
  const newSettings = { manual: manualConfig.value, schedules: schedules.value }
  const { error } = await supabase.from('system_settings').upsert({ setting_key: 'broadcast_settings', setting_value: newSettings }, { onConflict: 'setting_key' })
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

/* IP 安全防護標語 */
.ip-security-banner { padding: 12px 15px; border-radius: 8px; margin-top: 15px; font-size: 0.95rem; line-height: 1.5; border: 1px solid transparent;}
.is-safe { background-color: #dcfce7; color: #166534; border-color: #bbf7d0; }
.is-warning { background-color: #fef9c3; color: #854d0e; border-color: #fde047; }

.card { background: white; padding: 25px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 25px; }
.card-title { margin-top: 0; margin-bottom: 20px; font-size: 1.2rem; color: #0f172a; padding-bottom: 10px; border-bottom: 1px dashed #cbd5e1; }
.manual-card { border-left: 5px solid #ef4444; }
.schedule-card { border-left: 5px solid #3b82f6; }

.form-grid { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
.full-width { flex: 100%; }
.form-group label { font-weight: bold; color: #475569; }

.custom-input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; outline: none; transition: 0.2s;}
.custom-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
.large-input { font-size: 1.1rem; padding: 12px; font-weight: bold; color: #b45309; background: #fffbeb; border-color: #fcd34d; }

.action-row { display: flex; gap: 15px; justify-content: flex-end; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 20px; flex-wrap: wrap;}
.btn-test { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-test:hover:not(:disabled) { background: #e2e8f0; }

.btn-send { background: #ef4444; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 1.15rem; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px rgba(239,68,68,0.3); }
.btn-send:hover:not(:disabled) { background: #dc2626; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(239,68,68,0.4); }
.btn-send:disabled, .btn-test:disabled { filter: grayscale(50%); opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }

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
.mini-select { width: 160px; }
.mini-select-small { width: 80px; }

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
  .mini-select, .mini-select-small { width: 100%; }
}
</style>
