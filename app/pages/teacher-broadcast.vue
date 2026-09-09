<template>
  <div class="admin-container">
    <!-- 🔒 密碼鎖定畫面 -->
    <div v-if="!isUnlocked" class="lock-screen">
      <div class="lock-box">
        <h2>📢 科任 / 教師廣播系統</h2>
        <p class="lock-hint">請輸入導師密碼 或 科任老師密碼：</p>
        <input v-model="passwordInput" type="password" placeholder="請輸入密碼..." @keyup.enter="verifyPassword" />
        <button @click="verifyPassword" :disabled="isChecking">解鎖進入</button>
        <NuxtLink to="/" class="back-link">⬅️ 返回首頁</NuxtLink>
      </div>
    </div>

    <!-- 🔓 解鎖後的廣播控制面板 -->
    <div v-else class="dashboard">
      <header class="admin-header">
        <div class="header-left">
          <h2>👨‍🏫 教師教室廣播系統</h2>
          <span class="role-badge">目前身分：{{ currentRole }}</span>
        </div>
        <div class="header-buttons">
          <NuxtLink to="/" class="back-btn">⬅️ 返回班級首頁</NuxtLink>
          <button @click="handleLogout" class="logout-btn">🚪 登出</button>
        </div>
      </header>

      <main class="data-table">
        <div class="header-box">
          <p class="help-text">💡 此為科任老師專屬廣播通道。您的設定與日誌獨立儲存，不會與導師的設定混淆。</p>
          <div class="ip-security-banner" :class="isCurrentDeviceClassroom ? 'is-safe' : 'is-warning'">
            <strong>🛡️ 廣播安全隔離檢測：</strong> 
            您的目前 IP 為 <span class="highlight-ip">{{ currentIP }}</span>。<br>
            狀態：{{ isCurrentDeviceClassroom ? '✅ 位於褐色名單內！若未指定單一名稱，將廣播至全校首頁。' : '⚠️ 這台不是教室電腦。為保護隱私，您的首頁已啟動靜音隔離。' }}
          </div>
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

        <!-- 手動廣播 -->
        <div class="card manual-card">
          <div class="card-header-row">
            <h4 class="card-title">🚨 即時遙控發送 (手動廣播)</h4>
            <button @click="saveAsPreset" class="btn-save-preset">💾 將目前設定存為罐頭</button>
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
              <label>🗣️ 語音朗讀次數：</label>
              <select v-model.number="manualConfig.textPlayCount" class="custom-input"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>
            </div>
            <div class="form-group">
              <label>⏳ 畫面保留：</label>
              <select v-model.number="manualConfig.displayDuration" class="custom-input">
                <option value="10">10 秒</option><option value="30">30 秒</option><option value="60">1 分鐘</option><option value="120">2 分鐘</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label>🎯 指定接收單一【設備名稱】：</label>
              <div class="ip-control-group">
                <select v-model="manualConfig.targetIP" class="custom-input flex-2">
                  <option value="">🌐 全發送</option>
                  <option v-for="target in savedIPs" :key="target" :value="target">🎯 {{ target }}</option>
                </select>
                <input type="text" v-model="newIPInput" class="custom-input flex-1" placeholder="輸入名稱 (如: 701教室)..." />
                <button @click="saveNewIP" class="btn-sub">💾 加入選單</button>
                <button v-if="manualConfig.targetIP" @click="removeSavedIP(manualConfig.targetIP)" class="btn-sub-del">🗑️ 刪除</button>
              </div>
            </div>
          </div>

          <div class="action-row">
            <button @click="testSoundAndTTS" class="btn-test" :disabled="isTesting">{{ isTesting ? '🔊 試聽模擬中...' : '🎧 本機模擬試聽' }}</button>
            <button @click="sendManualBroadcast" class="btn-send" :disabled="isSending">{{ isSending ? '🚀 發送中...' : '🚀 發送廣播！' }}</button>
          </div>
        </div>

        <!-- 定時排程 -->
        <div class="card schedule-card">
          <div class="schedule-header">
            <h4 class="card-title">⏰ 定時廣播排程 (專屬獨立)</h4>
            <button @click="addSchedule" class="btn-add">➕ 新增一筆</button>
          </div>
          <div v-if="schedules.length === 0" class="empty-state">目前沒有任何定時排程。</div>
          <div v-else class="schedule-list">
            <div v-for="(sch, index) in schedules" :key="index" class="schedule-item" :class="{'is-disabled': !sch.isActive}">
              <div class="sch-row top-row">
                <input type="checkbox" v-model="sch.isActive" class="toggle-chk" />
                <input type="time" v-model="sch.time" class="time-input" required />
                <input type="text" v-model="sch.text" class="custom-input text-input" placeholder="廣播文字..." />
                <button @click="removeSchedule(index)" class="btn-del">🗑️</button>
              </div>
              <div class="sch-row bottom-row">
                <div class="mini-group"><label>音效:</label><select v-model="sch.sound" class="custom-input mini-select"><option v-for="opt in soundOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option></select></div>
                <div class="mini-group"><label>音/語:</label><select v-model.number="sch.playCount" class="custom-input mini-select-small"><option value="1">1</option><option value="2">2</option></select><select v-model.number="sch.textPlayCount" class="custom-input mini-select-small"><option value="1">1</option><option value="2">2</option></select></div>
                <div class="mini-group"><label>保留:</label><select v-model.number="sch.displayDuration" class="custom-input mini-select-small"><option value="10">10秒</option><option value="60">1分</option></select></div>
                <div class="mini-group ip-group"><label>對象:</label><select v-model="sch.targetIP" class="custom-input ip-select"><option value="">🌐 全發送</option><option v-for="t in savedIPs" :key="t" :value="t">{{ t }}</option></select></div>
              </div>
            </div>
          </div>
          <div class="save-row">
            <button @click="saveSettingsToDB" class="btn-save-all" :disabled="isSavingSch">{{ isSavingSch ? '儲存中...' : '💾 儲存排程' }}</button>
          </div>
        </div>

        <!-- 歷史紀錄 -->
        <div class="card logs-card">
          <div class="card-header-row">
            <h4 class="card-title">📝 科任廣播獨立日誌</h4>
            <div class="log-actions">
              <button @click="exportCSV" class="btn-outline">📊 匯出 CSV</button>
            </div>
          </div>
          <div class="table-container">
            <table class="logs-table">
              <thead><tr><th>時間</th><th>類型</th><th>發送人</th><th>文字內容</th><th>音效</th><th>對象</th><th>IP</th></tr></thead>
              <tbody>
                <tr v-if="broadcastLogs.length === 0"><td colspan="7" class="empty-log">尚無紀錄。</td></tr>
                <tr v-for="log in broadcastLogs" :key="log.id">
                  <td class="col-time">{{ log.time }}</td>
                  <td><span class="type-tag" :class="log.type === '手動發送' ? 't-manual' : 't-auto'">{{ log.type }}</span></td>
                  <td><strong>{{ log.sender }}</strong></td>
                  <td class="col-text">{{ log.text }}</td>
                  <td>{{ getSoundLabel(log.sound) }}</td>
                  <td class="col-ip">{{ log.targetIP }}</td>
                  <td class="col-ip">{{ log.ip }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const isUnlocked = ref(false)
const isChecking = ref(false)
const passwordInput = ref('')
const currentRole = ref('')

const verifyPassword = async () => {
  if (!passwordInput.value) return alert('請輸入密碼！')
  isChecking.value = true

  // 1. 取得導師動態密碼
  const { data: adminData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'admin_password').maybeSingle()
  let expectedAdminPwd = '168168168'
  if (adminData?.setting_value) {
    if (adminData.setting_value.type === 'dynamic') {
      const d = new Date(); const yy = String(d.getFullYear()).slice(2); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0')
      expectedAdminPwd = `${yy}${mm}${dd}59`
    } else if (adminData.setting_value.type === 'custom') { expectedAdminPwd = adminData.setting_value.custom_pwd }
  }

  // 2. 取得科任老師密碼
  const { data: teachers } = await supabase.from('subject_teachers').select('subject_name, password')
  
  let valid = false; let rName = ''
  if (passwordInput.value === '168168168' || passwordInput.value === expectedAdminPwd) { valid = true; rName = '導師/管理員' } 
  else if (teachers) {
    const t = teachers.find(x => x.password === passwordInput.value)
    if (t) { valid = true; rName = `${t.subject_name}老師` }
  }

  if (valid) {
    isUnlocked.value = true; currentRole.value = rName
    sessionStorage.setItem('teacher_broadcast_auth', rName)
    fetchSettingsAndCheckIP()
  } else { alert('❌ 密碼錯誤！') }
  isChecking.value = false
}

const handleLogout = () => { isUnlocked.value = false; passwordInput.value = ''; sessionStorage.removeItem('teacher_broadcast_auth') }

onMounted(() => {
  const savedRole = sessionStorage.getItem('teacher_broadcast_auth')
  if (savedRole) { isUnlocked.value = true; currentRole.value = savedRole; fetchSettingsAndCheckIP() }
})

// ==================== 廣播核心邏輯 ====================
const soundOptions = [
  { value: 'none', label: '🔇 無音效 (純文字)' }, { value: 'bell_ring', label: '🛎️ 服務鈴 (叮叮)' }, { value: 'door_bell', label: '🚪 門鈴 (叮咚)' }, { value: 'computer_error', label: '⚠️ 電腦警告音' }, { value: 'water_droplet', label: '💧 水滴聲' }, { value: 'glass', label: '🥂 敲擊玻璃杯' }, { value: 'tap', label: '👆 輕觸聲' }, { value: 'branch_break', label: '🪵 樹枝斷裂聲' }, { value: 'button_tiny', label: '🖱️ 短促按鍵音' }, { value: 'button_click', label: '🖱️ 滑鼠點擊' }, { value: 'button_push', label: '🔘 按下按鈕' }, { value: 'camera_flashing', label: '📸 相機快門' }, { value: 'cd_tray', label: '💿 光碟機退片' }, { value: 'door_bump', label: '🚪 撞門聲' }, { value: 'keyboard_desk', label: '⌨️ 鍵盤敲擊' }, { value: 'metal_plate', label: '🛡️ 金屬敲擊' }, { value: 'pop_cork', label: '🍾 開香檳' }, { value: 'snap', label: '🫰 彈指聲' }, { value: 'staple_gun', label: '🖇️ 釘書機' }, { value: 'chord_1', label: '🎹 電子和弦 1' }, { value: 'chord_2', label: '🎹 電子和弦 2' }, { value: 'chord_3', label: '🎹 電子和弦 3' }, { value: 'heater_1', label: '🥁 爵士鼓聲 1' }, { value: 'heater_2', label: '🥁 爵士鼓聲 2' }, { value: 'heater_3', label: '🥁 爵士鼓聲 3' }, { value: 'kick_n_hat', label: '🥁 踢鼓與鈸' }, { value: 'punchy_kick', label: '🥁 重踢鼓' }, { value: 'side_stick', label: '🥁 鼓邊敲擊' }, { value: 'brk_snr', label: '🥁 小鼓打擊' }, { value: 'dry_ohh', label: '🥁 銅鈸開啟' }, { value: 'dsc_oh', label: '🥁 銅鈸迴響' }
]
const sounds = {
  bell_ring: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/bell_ring.mp3', door_bell: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/door_bell.mp3', computer_error: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/computer_error.mp3', water_droplet: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/water_droplet.mp3', glass: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/glass.mp3', tap: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/tap.mp3', branch_break: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/branch_break.mp3', button_tiny: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/button_tiny.mp3', button_click: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/button_click.mp3', button_push: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/button_push.mp3', camera_flashing: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/camera_flashing.mp3', cd_tray: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/cd_tray.mp3', door_bump: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/door_bump.mp3', keyboard_desk: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/keyboard_desk.mp3', metal_plate: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/metal_plate.mp3', pop_cork: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/pop_cork.mp3', snap: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/snap.mp3', staple_gun: 'https://cdn.jsdelivr.net/gh/ionden/ion.sound@3.0.7/sounds/staple_gun.mp3', chord_1: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_1.mp3', chord_2: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_2.mp3', chord_3: 'https://s3.amazonaws.com/freecodecamp/drums/Chord_3.mp3', heater_1: 'https://s3.amazonaws.com/freecodecamp/drums/Heater-1.mp3', heater_2: 'https://s3.amazonaws.com/freecodecamp/drums/Heater-2.mp3', heater_3: 'https://s3.amazonaws.com/freecodecamp/drums/Heater-3.mp3', kick_n_hat: 'https://s3.amazonaws.com/freecodecamp/drums/Kick_n_Hat.mp3', punchy_kick: 'https://s3.amazonaws.com/freecodecamp/drums/punchy_kick_1.mp3', side_stick: 'https://s3.amazonaws.com/freecodecamp/drums/side_stick_1.mp3', brk_snr: 'https://s3.amazonaws.com/freecodecamp/drums/Brk_Snr.mp3', dry_ohh: 'https://s3.amazonaws.com/freecodecamp/drums/Dry_Ohh.mp3', dsc_oh: 'https://s3.amazonaws.com/freecodecamp/drums/Dsc_Oh.mp3'
}

const isSending = ref(false); const isSavingSch = ref(false); const isTesting = ref(false)
const currentIP = ref('檢查中...'); const isCurrentDeviceClassroom = ref(false)

const manualConfig = ref({ text: '', sound: 'bell_ring', playCount: 1, textPlayCount: 1, displayDuration: 120, targetIP: '', triggerTimestamp: 0 })
const schedules = ref([]); const presets = ref([]); const savedIPs = ref([]); const newIPInput = ref('')
const broadcastLogs = ref([])

const getSoundLabel = (val) => { const f = soundOptions.find(s => s.value === val); return f ? f.label : val }

const fetchSettingsAndCheckIP = async () => {
  // 💡 注意：這裡寫入的是全新的獨立鍵值 teacher_broadcast_settings
  const { data: bData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'teacher_broadcast_settings').maybeSingle()
  if (bData && bData.setting_value) {
    if (bData.setting_value.schedules) schedules.value = bData.setting_value.schedules
    if (bData.setting_value.presets) presets.value = bData.setting_value.presets
    if (bData.setting_value.savedIPs) savedIPs.value = bData.setting_value.savedIPs
  }
  const { data: logData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'teacher_broadcast_logs').maybeSingle()
  if (logData && logData.setting_value) { broadcastLogs.value = logData.setting_value }

  try {
    const ipRes = await fetch('https://api.ipify.org?format=json')
    const { ip } = await ipRes.json()
    currentIP.value = ip
    const { data: rules } = await supabase.from('ip_rules').select('ip_range').eq('rule_type', '褐名單')
    if (rules && rules.length > 0) isCurrentDeviceClassroom.value = rules.some(r => ip.startsWith(r.ip_range))
  } catch (e) { currentIP.value = '無法取得 IP' }
}

const appendManualLog = async () => {
  const newLog = { id: Date.now(), time: new Date().toLocaleString('zh-TW', { hour12: false }), type: '手動發送', sender: currentRole.value, text: manualConfig.value.text, sound: manualConfig.value.sound, targetIP: manualConfig.value.targetIP || '全發送', ip: currentIP.value }
  broadcastLogs.value.unshift(newLog)
  if (broadcastLogs.value.length > 500) broadcastLogs.value = broadcastLogs.value.slice(0, 500)
  await supabase.from('system_settings').upsert({ setting_key: 'teacher_broadcast_logs', setting_value: broadcastLogs.value }, { onConflict: 'setting_key' })
}

const exportCSV = () => {
  const headers = ['時間', '類型', '發送人', '廣播內容', '音效代碼', '對象', '發出IP'];
  const rows = broadcastLogs.value.map(l => [ l.time, l.type, l.sender, `"${(l.text || '').replace(/"/g, '""')}"`, l.sound, `"${l.targetIP}"`, l.ip ]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" }); 
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `teacher_broadcast_logs_${Date.now()}.csv`; a.click();
}

const saveNewIP = async () => { if (!newIPInput.value.trim()) return; const newTarget = newIPInput.value.trim(); if (!savedIPs.value.includes(newTarget)) { savedIPs.value.push(newTarget); manualConfig.value.targetIP = newTarget; newIPInput.value = ''; await saveSettingsToDB(false); } }
const removeSavedIP = async (targetToRemove) => { if (confirm(`確定刪除？`)) { savedIPs.value = savedIPs.value.filter(t => t !== targetToRemove); manualConfig.value.targetIP = ''; await saveSettingsToDB(false); } }
const saveAsPreset = async () => { if (!manualConfig.value.text) return alert('請先輸入文字！'); const pn = prompt('命名：', manualConfig.value.text.substring(0,8)); if (!pn) return; presets.value.push({ name: pn, text: manualConfig.value.text, sound: manualConfig.value.sound, playCount: manualConfig.value.playCount, textPlayCount: manualConfig.value.textPlayCount, displayDuration: manualConfig.value.displayDuration, targetIP: manualConfig.value.targetIP }); await saveSettingsToDB(false); }
const applyPreset = (p) => { manualConfig.value.text = p.text; manualConfig.value.sound = p.sound; manualConfig.value.playCount = p.playCount || 1; manualConfig.value.textPlayCount = p.textPlayCount || 1; manualConfig.value.displayDuration = p.displayDuration || 120; manualConfig.value.targetIP = p.targetIP || '' }
const removePreset = async (idx) => { if (confirm('刪除？')) { presets.value.splice(idx, 1); await saveSettingsToDB(false) } }

const testSoundAndTTS = async () => {
  if (isTesting.value) return; isTesting.value = true
  if (manualConfig.value.sound !== 'none' && sounds[manualConfig.value.sound]) { for (let i = 0; i < manualConfig.value.playCount; i++) { await new Promise((res) => { const a = new Audio(sounds[manualConfig.value.sound]); a.onended = res; a.onerror = res; a.play().catch(res) }); await new Promise(r => setTimeout(r, 500)) } }
  if (manualConfig.value.text.trim()) { const c = manualConfig.value.textPlayCount || 1; for (let i = 0; i < c; i++) { await new Promise((res) => { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(manualConfig.value.text); u.lang = 'zh-TW'; u.onend = res; u.onerror = res; window.speechSynthesis.speak(u) }); if (i < c - 1) await new Promise(r => setTimeout(r, 800)) } }
  isTesting.value = false
}

const saveSettingsToDB = async (showAlert = true) => {
  isSavingSch.value = true
  const newSettings = { manual: manualConfig.value, schedules: schedules.value, presets: presets.value, savedIPs: savedIPs.value }
  const { error } = await supabase.from('system_settings').upsert({ setting_key: 'teacher_broadcast_settings', setting_value: newSettings }, { onConflict: 'setting_key' })
  if (showAlert) { if (!error) alert('✅ 儲存成功！'); else alert('❌ 儲存失敗') }
  isSavingSch.value = false
}

const sendManualBroadcast = async () => {
  if (!manualConfig.value.text.trim()) return alert('⚠️ 廣播文字不可為空！')
  isSending.value = true
  manualConfig.value.triggerTimestamp = Date.now()
  await saveSettingsToDB(false) 
  await appendManualLog() 
  alert('✅ 廣播訊號已發送！')
  isSending.value = false
}

const addSchedule = () => { schedules.value.push({ isActive: true, time: '08:00', text: '上課時間到', sound: 'bell_ring', playCount: 1, textPlayCount: 1, displayDuration: 120, targetIP: '' }) }
const removeSchedule = (index) => { if (confirm('確定刪除？')) schedules.value.splice(index, 1) }

</script>

<style scoped>
.admin-container { min-height: 100vh; background-color: #f1f5f9; font-family: sans-serif; padding-bottom: 50px; }
.lock-screen { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #0f172a; }
.lock-box { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 400px; }
.lock-box h2 { margin-top: 0; margin-bottom: 10px; color: #1e293b; font-size: 1.5rem; }
.lock-hint { color: #64748b; margin-bottom: 20px; font-weight: bold; }
.lock-box input { width: 100%; padding: 12px; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; box-sizing: border-box; font-size: 1.1rem; }
.lock-box button { width: 100%; padding: 12px; background-color: #8b5cf6; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 1.1rem; cursor: pointer; transition: 0.2s; }
.lock-box button:hover { background: #7c3aed; }
.back-link { display: inline-block; margin-top: 20px; color: #64748b; text-decoration: none; font-weight: bold; font-size: 0.95rem; }

.dashboard { max-width: 1400px; margin: 0 auto; padding: 20px; }
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: white; padding: 15px 25px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.header-left h2 { margin: 0 0 5px 0; color: #1e293b; }
.role-badge { background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 20px; font-size: 0.9rem; font-weight: bold; }
.header-buttons { display: flex; gap: 10px; }
.back-btn { text-decoration: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; background: #e2e8f0; color: #475569; transition: 0.2s; }
.back-btn:hover { background: #cbd5e1; }
.logout-btn { background: #ef4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.logout-btn:hover { background: #dc2626; }

.header-box { margin-bottom: 20px; }
.help-text { font-size: 0.95rem; color: #64748b; margin-top: 10px; }
.ip-security-banner { padding: 12px 15px; border-radius: 8px; margin-top: 15px; font-size: 0.95rem; line-height: 1.5; border: 1px solid transparent;}
.is-safe { background-color: #dcfce7; color: #166534; border-color: #bbf7d0; }
.is-warning { background-color: #fef9c3; color: #854d0e; border-color: #fde047; }
.highlight-ip { font-family: monospace; font-weight: bold; background: rgba(255,255,255,0.5); padding: 2px 6px; border-radius: 4px; }

.presets-section { background: #eff6ff; padding: 15px; border-radius: 8px; border: 1px dashed #93c5fd; margin-bottom: 25px; }
.presets-header { font-weight: bold; color: #1d4ed8; margin-bottom: 10px; }
.presets-list { display: flex; flex-wrap: wrap; gap: 10px; }
.preset-chip { display: flex; align-items: center; background: white; border: 1px solid #bfdbfe; border-radius: 20px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.preset-name { padding: 6px 12px; cursor: pointer; color: #2563eb; font-weight: bold; font-size: 0.9rem; }
.preset-name:hover { background: #dbeafe; }
.preset-del { background: #fee2e2; color: #ef4444; border: none; padding: 6px 10px; cursor: pointer; font-size: 0.8rem; border-left: 1px solid #bfdbfe; }

.card { background: white; padding: 25px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 25px; }
.card-header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 20px; flex-wrap: wrap; gap:10px;}
.card-title { margin: 0; font-size: 1.2rem; color: #0f172a; }
.btn-save-preset { background: #f8fafc; color: #0284c7; border: 1px solid #bae6fd; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; }

.manual-card { border-left: 5px solid #8b5cf6; }
.schedule-card { border-left: 5px solid #3b82f6; }
.logs-card { border-left: 5px solid #10b981; }

.form-grid { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 150px; }
.full-width { flex: 100%; }
.form-group label { font-weight: bold; color: #475569; font-size: 0.95rem; }
.custom-input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; outline: none; }
.large-input { font-size: 1.1rem; padding: 12px; font-weight: bold; color: #b45309; background: #fffbeb; border-color: #fcd34d; }

.ip-control-group { display: flex; gap: 10px; flex-wrap: wrap; align-items: center;}
.flex-2 { flex: 2; min-width: 150px; }
.flex-1 { flex: 1; min-width: 120px; }
.btn-sub { background: #10b981; color: white; border: none; padding: 10px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-sub-del { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; padding: 9px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; }

.action-row { display: flex; gap: 15px; justify-content: flex-end; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 20px; flex-wrap: wrap;}
.btn-test { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-send { background: #8b5cf6; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 1.15rem; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(139,92,246,0.3); }
.btn-send:hover:not(:disabled) { background: #7c3aed; transform: translateY(-2px); }
.btn-send:disabled, .btn-test:disabled { filter: grayscale(50%); opacity: 0.7; cursor: not-allowed; }

.schedule-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; }
.btn-add { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }

.empty-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; background: #f8fafc; border-radius: 8px; }
.schedule-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.schedule-item { display: flex; flex-direction: column; gap: 10px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
.schedule-item.is-disabled { opacity: 0.6; filter: grayscale(100%); background: #f1f5f9; }

.sch-row { display: flex; align-items: center; gap: 15px; width: 100%; flex-wrap: wrap; }
.toggle-chk { transform: scale(1.5); accent-color: #8b5cf6; cursor: pointer; }
.time-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.1rem; font-family: monospace; font-weight: bold; }
.text-input { flex: 1; min-width: 200px; }
.btn-del { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 1.1rem; margin-left: auto;}

.mini-group { display: flex; align-items: center; gap: 5px; font-size: 0.9rem; color: #475569; font-weight: bold; }
.mini-select { width: 130px; }
.mini-select-small { width: 60px; padding-left: 5px; padding-right: 5px;}
.ip-group { flex: 1; justify-content: flex-end; }
.ip-select { width: 140px; }

.save-row { display: flex; justify-content: flex-end; padding-top: 15px; border-top: 1px solid #e2e8f0; }
.btn-save-all { background: #3b82f6; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; }

.log-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-outline { background: white; color: #475569; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: bold; }
.table-container { width: 100%; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
.logs-table { width: 100%; border-collapse: collapse; min-width: 800px; font-size: 0.95rem; }
.logs-table th, .logs-table td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: left; }
.logs-table th { background: #f8fafc; font-weight: bold; color: #475569; }
.empty-log { text-align: center; color: #94a3b8; font-style: italic; padding: 30px !important; }
.type-tag { padding: 3px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; }
.t-manual { background: #fee2e2; color: #b91c1c; }
.t-auto { background: #e0e7ff; color: #4338ca; }
.col-time { white-space: nowrap; color: #64748b; font-size: 0.9rem; }
.col-text { font-weight: bold; color: #334155; }
.col-ip { font-family: monospace; color: #0369a1; }
</style>
