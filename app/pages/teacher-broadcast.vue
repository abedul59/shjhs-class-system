<template>
  <div class="page-container">
    <div class="top-nav">
      <NuxtLink to="/" class="back-btn">⬅ 返回班級首頁</NuxtLink>
    </div>

    <div class="content-wrapper">
      <div class="header-box">
        <h3>📢 教師專屬廣播控制中心</h3>
        <p class="help-text">💡 此為科任老師與導師專用的獨立廣播站，發送的廣播與排程與後台總管完全獨立。</p>
      </div>

      <!-- 🔒 密碼解鎖畫面 -->
      <div v-if="!isUnlocked" class="lock-screen">
        <div class="lock-box">
          <h4>🔒 系統安全鎖定</h4>
          <p class="hint">請輸入密碼解鎖廣播功能（支援導師與科任老師密碼）</p>
          <input type="password" v-model="pwdInput" class="custom-input pwd-input" placeholder="請輸入密碼..." @keyup.enter="verifyPassword" />
          <button @click="verifyPassword" class="btn-send unlock-btn" :disabled="isVerifying">
            {{ isVerifying ? '驗證中...' : '解鎖進入' }}
          </button>
        </div>
      </div>

      <!-- 🔓 解鎖後的廣播控制面板 -->
      <div v-else class="admin-section">
        <div class="ip-security-banner is-safe">
          <strong>目前操作身分：</strong> {{ currentTeacherRole }}<br>
          您的目前 IP 為 <span class="highlight-ip">{{ currentIP }}</span>
        </div>

        <!-- 罐頭訊息 -->
        <div v-if="presets.length > 0" class="presets-section">
          <div class="presets-header">📦 快速載入罐頭訊息：</div>
          <div class="presets-list">
            <div v-for="(preset, index) in presets" :key="index" class="preset-chip">
              <span class="preset-name" @click="applyPreset(preset)">{{ preset.name }}</span>
              <button class="preset-del" @click="removePreset(index)">✖</button>
            </div>
          </div>
        </div>

        <!-- 手動廣播區塊 -->
        <div class="card manual-card">
          <div class="card-header-row">
            <h4 class="card-title">🚨 即時遙控發送</h4>
            <button @click="saveAsPreset" class="btn-save-preset">💾 存為罐頭</button>
          </div>
          
          <div class="form-grid">
            <div class="form-group full-width">
              <label>📝 廣播文字內容：</label>
              <input type="text" v-model="manualConfig.text" class="custom-input large-input" placeholder="例如：請同學翻開課本第 50 頁！" />
            </div>
            <div class="form-group">
              <label>🔊 播放音效：</label>
              <select v-model="manualConfig.sound" class="custom-input">
                <option v-for="opt in soundOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>🔁 音效次數：</label>
              <select v-model.number="manualConfig.playCount" class="custom-input"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>
            </div>
            <div class="form-group">
              <label>🗣️ 語音朗讀：</label>
              <select v-model.number="manualConfig.textPlayCount" class="custom-input"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>
            </div>
            <div class="form-group">
              <label>⏳ 畫面保留：</label>
              <select v-model.number="manualConfig.displayDuration" class="custom-input">
                <option value="10">10 秒</option><option value="30">30 秒</option><option value="60">1 分鐘</option>
                <option value="120">2 分鐘</option><option value="300">5 分鐘</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label>🎯 指定接收單一【設備名稱】：</label>
              <div class="ip-control-group">
                <select v-model="manualConfig.targetIP" class="custom-input flex-2">
                  <option value="">🌐 全發送 (所有教室電腦)</option>
                  <option v-for="target in savedIPs" :key="target" :value="target">🎯 {{ target }}</option>
                </select>
                <input type="text" v-model="newIPInput" class="custom-input flex-1" placeholder="輸入名稱 (如: 701教室)..." />
                <button @click="saveNewIP" class="btn-sub">💾 加入</button>
                <button v-if="manualConfig.targetIP" @click="removeSavedIP(manualConfig.targetIP)" class="btn-sub-del">🗑️ 刪除</button>
              </div>
            </div>
          </div>

          <div class="action-row">
            <button @click="testSoundAndTTS" class="btn-test" :disabled="isTesting">
              {{ isTesting ? '🔊 試聽模擬中...' : '🎧 本機模擬試聽' }}
            </button>
            <button @click="sendManualBroadcast" class="btn-send" :disabled="isSending">
              {{ isSending ? '🚀 發送中...' : '🚀 立刻發送到教室！' }}
            </button>
          </div>
        </div>

        <!-- 定時排程區塊 -->
        <div class="card schedule-card">
          <div class="schedule-header">
            <h4 class="card-title">⏰ 定時廣播排程 (每日循環)</h4>
            <button @click="addSchedule" class="btn-add">➕ 新增排程</button>
          </div>
          <div v-if="schedules.length === 0" class="empty-state">目前沒有任何定時排程。</div>
          <div v-else class="schedule-list">
            <div v-for="(sch, index) in schedules" :key="index" class="schedule-item" :class="{'is-disabled': !sch.isActive}">
              <div class="sch-row top-row">
                <input type="checkbox" v-model="sch.isActive" class="toggle-chk" />
                <input type="time" v-model="sch.time" class="time-input" required />
                <input type="text" v-model="sch.text" class="custom-input text-input" placeholder="排程廣播文字..." />
                <button @click="removeSchedule(index)" class="btn-del">🗑️</button>
              </div>
              <div class="sch-row bottom-row">
                <div class="mini-group"><select v-model="sch.sound" class="custom-input mini-select"><option v-for="opt in soundOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option></select></div>
                <div class="mini-group"><select v-model.number="sch.playCount" class="custom-input mini-select-small"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div>
                <div class="mini-group"><select v-model.number="sch.textPlayCount" class="custom-input mini-select-small"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div>
                <div class="mini-group"><select v-model.number="sch.displayDuration" class="custom-input mini-select-small"><option value="10">10秒</option><option value="30">30秒</option><option value="60">1分</option><option value="120">2分</option></select></div>
                <div class="mini-group ip-group">
                  <select v-model="sch.targetIP" class="custom-input ip-select">
                    <option value="">🌐 全發送</option><option v-for="target in savedIPs" :key="target" :value="target">{{ target }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div class="save-row">
            <button @click="saveSettingsToDB" class="btn-save-all" :disabled="isSavingSch">
              {{ isSavingSch ? '儲存中...' : '💾 儲存所有排程與設定' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const supabase = useSupabaseClient()

const isUnlocked = ref(false)
const pwdInput = ref('')
const isVerifying = ref(false)
const currentTeacherRole = ref('')
const currentIP = ref('檢查中...')

const isSending = ref(false); const isSavingSch = ref(false); const isTesting = ref(false)

const soundOptions = [
  { value: 'none', label: '🔇 無音效 (純文字)' }, { value: 'bell_ring', label: '🛎️ 服務鈴 (叮叮)' },
  { value: 'door_bell', label: '🚪 門鈴 (叮咚)' }, { value: 'computer_error', label: '⚠️ 電腦警告音' },
  { value: 'water_droplet', label: '💧 水滴聲' }, { value: 'glass', label: '🥂 敲擊玻璃杯' },
  { value: 'tap', label: '👆 輕觸聲' }, { value: 'branch_break', label: '🪵 樹枝斷裂聲' },
  { value: 'button_tiny', label: '🖱️ 短促按鍵音' }, { value: 'button_click', label: '🖱️ 滑鼠點擊' },
  { value: 'button_push', label: '🔘 按下按鈕' }, { value: 'camera_flashing', label: '📸 相機快門' },
  { value: 'cd_tray', label: '💿 光碟機退片' }, { value: 'door_bump', label: '🚪 撞門聲' },
  { value: 'keyboard_desk', label: '⌨️ 鍵盤敲擊' }, { value: 'metal_plate', label: '🛡️ 金屬敲擊' },
  { value: 'pop_cork', label: '🍾 開香檳' }, { value: 'snap', label: '🫰 彈指聲' },
  { value: 'staple_gun', label: '🖇️ 釘書機' }, { value: 'chord_1', label: '🎹 電子和弦 1' },
  { value: 'chord_2', label: '🎹 電子和弦 2' }, { value: 'chord_3', label: '🎹 電子和弦 3' },
  { value: 'heater_1', label: '🥁 爵士鼓聲 1' }, { value: 'heater_2', label: '🥁 爵士鼓聲 2' },
  { value: 'heater_3', label: '🥁 爵士鼓聲 3' }, { value: 'kick_n_hat', label: '🥁 踢鼓與鈸' },
  { value: 'punchy_kick', label: '🥁 重踢鼓' }, { value: 'side_stick', label: '🥁 鼓邊敲擊' },
  { value: 'brk_snr', label: '🥁 小鼓打擊' }, { value: 'dry_ohh', label: '🥁 銅鈸開啟' },
  { value: 'dsc_oh', label: '🥁 銅鈸迴響' }
]

const sounds = {
  bell_ring: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/bell_ring.mp3', door_bell: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/door_bell.mp3',
  computer_error: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/computer_error.mp3', water_droplet: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/water_droplet.mp3',
  glass: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/glass.mp3', tap: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/tap.mp3',
  branch_break: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/branch_break.mp3', button_tiny: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/button_tiny.mp3',
  button_click: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/button_click.mp3', button_push: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/button_push.mp3',
  camera_flashing: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/camera_flashing.mp3', cd_tray: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/cd_tray.mp3',
  door_bump: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/door_bump.mp3', keyboard_desk: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/keyboard_desk.mp3',
  metal_plate: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/metal_plate.mp3', pop_cork: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/pop_cork.mp3',
  snap: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/snap.mp3', staple_gun: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/staple_gun.mp3',
  chord_1: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_1.mp3', chord_2: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_2.mp3',
  chord_3: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_3.mp3', heater_1: 'https://s3.amazonaws.com/freecodecamp/drums/Heater-1.mp3',
  heater_2: 'https://s3.amazonaws.com/freecodecamp/drums/Heater-2.mp3', heater_3: 'https://s3.amazonaws.com/freecodecamp/drums/Heater-3.mp3',
  kick_n_hat: 'https://s3.amazonaws.com/freecodecamp/drums/Kick_n_Hat.mp3', punchy_kick: 'https://s3.amazonaws.com/freecodecamp/drums/punchy_kick_1.mp3',
  side_stick: 'https://s3.amazonaws.com/freecodecamp/drums/side_stick_1.mp3', brk_snr: 'https://s3.amazonaws.com/freecodecamp/drums/Brk_Snr.mp3',
  dry_ohh: 'https://s3.amazonaws.com/freecodecamp/drums/Dry_Ohh.mp3', dsc_oh: 'https://s3.amazonaws.com/freecodecamp/drums/Dsc_Oh.mp3'
}

const manualConfig = ref({ text: '', sound: 'bell_ring', playCount: 1, textPlayCount: 1, displayDuration: 120, targetIP: '', triggerTimestamp: 0 })
const schedules = ref([]); const presets = ref([]); const savedIPs = ref([]); const newIPInput = ref('')

// === 🔒 密碼驗證 ===
const verifyPassword = async () => {
  if (!pwdInput.value) return alert('請輸入密碼！')
  isVerifying.value = true

  let verifiedRole = ''
  if (pwdInput.value === '168168168') {
    verifiedRole = '系統導師'
  } else {
    const { data: pwdData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'admin_password').maybeSingle()
    if (pwdData?.setting_value) {
      if (pwdData.setting_value.type === 'dynamic') {
        const cd = new Date(); const yy = String(cd.getFullYear()).slice(2); const mm = String(cd.getMonth()+1).padStart(2,'0'); const dd = String(cd.getDate()).padStart(2,'0')
        if (pwdInput.value === `${yy}${mm}${dd}59`) verifiedRole = '導師'
      } else if (pwdInput.value === pwdData.setting_value.custom_pwd) {
        verifiedRole = '導師'
      }
    }
  }

  if (!verifiedRole) {
    const { data: tData } = await supabase.from('subject_teachers').select('*')
    if (tData) {
      const matchTeacher = tData.find(t => t.password === pwdInput.value)
      if (matchTeacher) verifiedRole = `科任老師 (${matchTeacher.subject_name})`
    }
  }

  if (verifiedRole) {
    currentTeacherRole.value = verifiedRole
    isUnlocked.value = true
    pwdInput.value = ''
    fetchSettingsAndCheckIP()
  } else {
    alert('❌ 密碼錯誤！')
  }
  isVerifying.value = false
}

// === 資料庫互動邏輯 (獨立 Key: teacher_broadcast_settings) ===
const fetchSettingsAndCheckIP = async () => {
  const { data: bData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'teacher_broadcast_settings').maybeSingle()
  if (bData && bData.setting_value) {
    if (bData.setting_value.schedules) schedules.value = bData.setting_value.schedules
    if (bData.setting_value.presets) presets.value = bData.setting_value.presets
    if (bData.setting_value.savedIPs) savedIPs.value = bData.setting_value.savedIPs
  }
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json')
    const { ip } = await ipRes.json()
    currentIP.value = ip
  } catch (e) { currentIP.value = '無法取得 IP' }
}

const saveSettingsToDB = async (showAlert = true) => {
  isSavingSch.value = true
  const newSettings = { manual: manualConfig.value, schedules: schedules.value, presets: presets.value, savedIPs: savedIPs.value }
  const { error } = await supabase.from('system_settings').upsert({ setting_key: 'teacher_broadcast_settings', setting_value: newSettings }, { onConflict: 'setting_key' })
  if (showAlert) { if (!error) alert('✅ 設定已成功儲存！'); else alert('❌ 儲存失敗') }
  isSavingSch.value = false
}

const saveNewIP = async () => { if (!newIPInput.value.trim()) return; const newTarget = newIPInput.value.trim(); if (!savedIPs.value.includes(newTarget)) { savedIPs.value.push(newTarget); manualConfig.value.targetIP = newTarget; newIPInput.value = ''; await saveSettingsToDB(false); } }
const removeSavedIP = async (targetToRemove) => { if (confirm(`確定要將「${targetToRemove}」移除嗎？`)) { savedIPs.value = savedIPs.value.filter(t => t !== targetToRemove); manualConfig.value.targetIP = ''; await saveSettingsToDB(false); } }
const saveAsPreset = async () => { if (!manualConfig.value.text) return alert('⚠️ 請先輸入廣播文字再儲存！'); const presetName = prompt('請命名：', manualConfig.value.text.substring(0, 8) + '...'); if (!presetName) return; presets.value.push({ name: presetName, text: manualConfig.value.text, sound: manualConfig.value.sound, playCount: manualConfig.value.playCount, textPlayCount: manualConfig.value.textPlayCount, displayDuration: manualConfig.value.displayDuration, targetIP: manualConfig.value.targetIP }); await saveSettingsToDB(false) }
const applyPreset = (preset) => { manualConfig.value.text = preset.text; manualConfig.value.sound = preset.sound; manualConfig.value.playCount = preset.playCount || 1; manualConfig.value.textPlayCount = preset.textPlayCount || 1; manualConfig.value.displayDuration = preset.displayDuration || 120; manualConfig.value.targetIP = preset.targetIP || '' }
const removePreset = async (index) => { if (confirm('確定刪除此罐頭訊息嗎？')) { presets.value.splice(index, 1); await saveSettingsToDB(false) } }

const testSoundAndTTS = async () => {
  if (isTesting.value) return; isTesting.value = true
  if (manualConfig.value.sound !== 'none' && sounds[manualConfig.value.sound]) {
    for (let i = 0; i < manualConfig.value.playCount; i++) {
      await new Promise((resolve) => { const audio = new Audio(sounds[manualConfig.value.sound]); audio.onended = resolve; audio.onerror = resolve; audio.play().catch(resolve) })
      await new Promise(r => setTimeout(r, 500))
    }
  }
  if (manualConfig.value.text.trim()) {
    const ttsCount = manualConfig.value.textPlayCount || 1
    for (let i = 0; i < ttsCount; i++) {
      await new Promise((resolve) => { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(manualConfig.value.text); utterance.lang = 'zh-TW'; utterance.onend = resolve; utterance.onerror = resolve; window.speechSynthesis.speak(utterance) })
      if (i < ttsCount - 1) await new Promise(r => setTimeout(r, 800))
    }
  }
  isTesting.value = false
}

const sendManualBroadcast = async () => {
  if (!manualConfig.value.text.trim()) return alert('⚠️ 廣播文字不可為空！')
  isSending.value = true
  manualConfig.value.triggerTimestamp = Date.now()
  await saveSettingsToDB(false) 
  alert('✅ 廣播訊號已發送！')
  isSending.value = false
}

const addSchedule = () => { schedules.value.push({ isActive: true, time: '08:00', text: '上課時間開始', sound: 'bell_ring', playCount: 1, textPlayCount: 1, displayDuration: 120, targetIP: '' }) }
const removeSchedule = (index) => { if (confirm('確定要刪除這筆排程嗎？')) schedules.value.splice(index, 1) }

</script>

<style scoped>
.page-container { min-height: 100vh; background-color: #f1f5f9; padding: 20px; font-family: sans-serif; display: flex; flex-direction: column; align-items: center;}
.top-nav { width: 100%; max-width: 900px; margin-bottom: 20px; }
.back-btn { background: white; color: #475569; border: 1px solid #cbd5e1; padding: 8px 15px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block; transition: 0.2s; }
.back-btn:hover { background: #e2e8f0; }

.content-wrapper { width: 100%; max-width: 900px; }
.header-box { margin-bottom: 20px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;}
.header-box h3 { margin: 0 0 10px 0; color: #1e293b; font-size: 1.4rem; }
.help-text { font-size: 0.95rem; color: #64748b; margin: 0; }

.lock-screen { display: flex; justify-content: center; padding: 40px 20px; }
.lock-box { background: white; padding: 30px; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); width: 100%; max-width: 350px; border: 1px solid #e2e8f0;}
.lock-box h4 { margin: 0 0 10px 0; color: #334155; }
.lock-box .hint { font-size: 0.85rem; color: #64748b; margin-bottom: 20px; }
.pwd-input { text-align: center; font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; width: 100%; box-sizing: border-box;}
.unlock-btn { width: 100%; padding: 12px; }

.admin-section { font-family: sans-serif; }
.ip-security-banner { padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.95rem; line-height: 1.5; background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.highlight-ip { font-family: monospace; font-weight: bold; background: rgba(255,255,255,0.5); padding: 2px 6px; border-radius: 4px; }

.presets-section { background: #eff6ff; padding: 15px; border-radius: 8px; border: 1px dashed #93c5fd; margin-bottom: 25px; }
.presets-header { font-weight: bold; color: #1d4ed8; margin-bottom: 10px; }
.presets-list { display: flex; flex-wrap: wrap; gap: 10px; }
.preset-chip { display: flex; align-items: center; background: white; border: 1px solid #bfdbfe; border-radius: 20px; overflow: hidden; }
.preset-name { padding: 6px 12px; cursor: pointer; color: #2563eb; font-weight: bold; font-size: 0.9rem; }
.preset-name:hover { background: #dbeafe; }
.preset-del { background: #fee2e2; color: #ef4444; border: none; padding: 6px 10px; cursor: pointer; }
.preset-del:hover { background: #fecaca; }

.card { background: white; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px; }
.card-header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 15px; flex-wrap: wrap; gap:10px;}
.card-title { margin: 0; font-size: 1.1rem; color: #0f172a; }
.btn-save-preset { background: #f8fafc; color: #0284c7; border: 1px solid #bae6fd; padding: 6px 10px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem; }

.manual-card { border-left: 4px solid #ef4444; }
.schedule-card { border-left: 4px solid #3b82f6; }

.form-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 15px; }
.form-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 150px; }
.full-width { flex: 100%; }
.form-group label { font-weight: bold; color: #475569; font-size: 0.9rem; }

.custom-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; outline: none; }
.custom-input:focus { border-color: #3b82f6; }
.large-input { font-size: 1.05rem; padding: 10px; font-weight: bold; color: #b45309; background: #fffbeb; border-color: #fcd34d; }

.ip-control-group { display: flex; gap: 8px; flex-wrap: wrap; align-items: center;}
.flex-2 { flex: 2; min-width: 120px; }
.flex-1 { flex: 1; min-width: 100px; }
.btn-sub { background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-sub-del { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; padding: 7px 10px; border-radius: 6px; font-weight: bold; cursor: pointer; }

.action-row { display: flex; gap: 10px; justify-content: flex-end; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 15px; flex-wrap: wrap;}
.btn-test { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-send { background: #ef4444; color: white; border: none; padding: 10px 25px; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(239,68,68,0.3); }

.schedule-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; }
.btn-add { background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.9rem;}

.empty-state { text-align: center; padding: 20px; color: #94a3b8; font-style: italic; background: #f8fafc; border-radius: 8px; }
.schedule-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; }
.schedule-item { display: flex; flex-direction: column; gap: 8px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
.schedule-item.is-disabled { opacity: 0.6; filter: grayscale(100%); }

.sch-row { display: flex; align-items: center; gap: 10px; width: 100%; flex-wrap: wrap; }
.toggle-chk { transform: scale(1.3); cursor: pointer; }
.time-input { padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: monospace; font-weight: bold; }
.text-input { flex: 1; min-width: 150px; }
.btn-del { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; padding: 6px; border-radius: 4px; cursor: pointer; margin-left: auto;}

.mini-group { display: flex; align-items: center; gap: 5px; font-size: 0.85rem; color: #475569; }
.mini-select { width: 120px; padding: 4px; font-size: 0.85rem; }
.mini-select-small { width: 50px; padding: 4px; font-size: 0.85rem; }
.ip-group { flex: 1; justify-content: flex-end; }
.ip-select { width: 120px; padding: 4px; font-size: 0.85rem; }

.save-row { display: flex; justify-content: flex-end; padding-top: 15px; border-top: 1px solid #e2e8f0; }
.btn-save-all { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }

@media (max-width: 768px) {
  .sch-row { flex-direction: column; align-items: flex-start; }
  .btn-del { margin-left: 0; align-self: flex-end; }
  .ip-group { justify-content: flex-start; width: 100%; }
  .ip-select { width: 100%; }
}
</style>
