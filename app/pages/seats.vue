<template>
  <div class="seats-page">
    <div v-if="!isLoggedIn" class="login-container">
      <div class="login-card">
        <h2>🪑 學生座位管理系統</h2>
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

    <div v-else class="workspace">
      <header class="workspace-header">
        <h2>🪑 座位排版系統</h2>
        
        <!-- 💡 新增：三組獨立的字體與樣式設定區 -->
        <div class="style-controls-wrapper">
          <div class="style-group">
            <span class="group-label">座號：</span>
            <input type="number" v-model="seatSettings.numberSize" min="10" max="40" class="num-input"> px
            <input type="color" v-model="seatSettings.numberColor" class="color-input">
          </div>
          <div class="style-group">
            <span class="group-label">姓名：</span>
            <input type="number" v-model="seatSettings.nameSize" min="10" max="40" class="num-input"> px
            <input type="color" v-model="seatSettings.nameColor" class="color-input">
          </div>
          <div class="style-group">
            <span class="group-label">其他：</span>
            <input type="number" v-model="seatSettings.otherSize" min="10" max="40" class="num-input"> px
            <input type="color" v-model="seatSettings.otherColor" class="color-input">
          </div>
        </div>

        <div class="header-actions">
          <button @click="toggleRotation" class="btn-rotate">
            🔄 旋轉版面 (目前: {{ isRotated ? '反向' : '正向' }})
          </button>
          <button @click="saveLayout" class="btn-save" :disabled="isSaving">
            {{ isSaving ? '儲存中...' : '💾 儲存並發布' }}
          </button>
          <button @click="logout" class="btn-logout">登出</button>
        </div>
      </header>

      <div class="tips">
        💡 提示：手機上可左右滑動查看完整座位。拖曳座位可交換位置，點擊左上角「取消」即可隱藏不需要的空位。
      </div>

      <!-- 教室版面區 -->
      <div class="classroom-wrapper">
        <div :class="['classroom-area', { 'is-rotated': isRotated }]">
          
          <div class="labels-grid">
            <div v-for="n in 6" :key="'label-'+n" class="row-label">
              第{{ n }}排
            </div>
          </div>

          <div class="seats-grid">
            <div 
              v-for="(seat, index) in seatsList" 
              :key="seat.id"
              :class="['seat-card', { 'is-hidden-seat': seat.isHidden }]"
              draggable="true"
              @dragstart="onDragStart($event, index)"
              @dragover.prevent
              @drop="onDrop($event, index)"
            >
              <div class="seat-header">
                <span class="seat-id">{{ seat.id }}</span>
                <button @click="toggleSeatVisibility(seat)" class="btn-toggle-vis">
                  {{ seat.isHidden ? '👁️ 恢復' : '❌ 取消' }}
                </button>
              </div>
              
              <!-- 💡 新增：拆分為三個獨立輸入框 -->
              <div class="seat-content-inputs">
                <input 
                  type="text" 
                  v-model="seat.seatNum" 
                  class="field-input" 
                  placeholder="座號"
                  :style="{ fontSize: seatSettings.numberSize + 'px', color: seatSettings.numberColor }"
                />
                <input 
                  type="text" 
                  v-model="seat.name" 
                  class="field-input" 
                  placeholder="姓名"
                  :style="{ fontSize: seatSettings.nameSize + 'px', color: seatSettings.nameColor }"
                />
                <input 
                  type="text" 
                  v-model="seat.other" 
                  class="field-input" 
                  placeholder="其他(選填)"
                  :style="{ fontSize: seatSettings.otherSize + 'px', color: seatSettings.otherColor }"
                />
              </div>
            </div>
          </div>

          <div class="teacher-desk-area">
            <div class="teacher-desk">
              <h3>講桌</h3>
              <div class="desk-controls">
                <label class="toggle-label">
                  <input type="checkbox" v-model="isVisibleOnIndex" />
                  顯示於首頁
                </label>
              </div>
            </div>
          </div>

        </div>
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

const isRotated = ref(false)
const isVisibleOnIndex = ref(false)
const seatsList = ref([])

// 💡 預設的獨立設定值
const seatSettings = ref({
  numberSize: 16, numberColor: '#64748b',
  nameSize: 20, nameColor: '#e11d48',
  otherSize: 14, otherColor: '#94a3b8'
})

const initSeats = () => {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    seatNum: `${i + 1}號`,
    name: '姓名',
    other: '',
    isHidden: false
  }))
}

onMounted(async () => {
  if (sessionStorage.getItem('seats_admin_logged_in') === 'true') {
    isLoggedIn.value = true
    await fetchLayout()
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
      sessionStorage.setItem('seats_admin_logged_in', 'true')
      await fetchLayout()
    } else alert('❌ 密碼錯誤！')
  } catch (e) {
    if (passwordInput.value === '168168168') { isLoggedIn.value = true; sessionStorage.setItem('seats_admin_logged_in', 'true'); await fetchLayout() }
    else alert('驗證發生錯誤。')
  } finally { isLoggingIn.value = false; passwordInput.value = '' }
}

const logout = () => { sessionStorage.removeItem('seats_admin_logged_in'); isLoggedIn.value = false; navigateTo('/') }

const fetchLayout = async () => {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'seating_chart_data').maybeSingle()

  if (data?.setting_value) {
    // 💡 處理舊資料轉換 (將原本的 content 拆解為 seatNum, name, other)
    seatsList.value = (data.setting_value.seats || initSeats()).map(seat => {
      if (seat.content !== undefined) {
        const lines = seat.content.split('\n')
        return {
          id: seat.id,
          isHidden: seat.isHidden,
          seatNum: lines[0] || '',
          name: lines[1] || '',
          other: lines.slice(2).join(' ') || ''
        }
      }
      return seat
    })
    
    isRotated.value = data.setting_value.isRotated || false
    isVisibleOnIndex.value = data.setting_value.isVisible || false
    
    // 💡 處理舊設定轉換
    if (data.setting_value.settings) {
      if (data.setting_value.settings.nameSize) {
        seatSettings.value = data.setting_value.settings
      } else if (data.setting_value.settings.fontSize) {
        // 舊版單一字體設定的轉換過渡
        seatSettings.value.numberSize = data.setting_value.settings.fontSize
        seatSettings.value.nameSize = data.setting_value.settings.fontSize + 4
        seatSettings.value.otherSize = data.setting_value.settings.fontSize - 2
        seatSettings.value.numberColor = data.setting_value.settings.fontColor
        seatSettings.value.nameColor = data.setting_value.settings.fontColor
        seatSettings.value.otherColor = data.setting_value.settings.fontColor
      }
    }
  } else {
    seatsList.value = initSeats()
  }
}

const saveLayout = async () => {
  isSaving.value = true
  try {
    const payload = { seats: seatsList.value, isRotated: isRotated.value, isVisible: isVisibleOnIndex.value, settings: seatSettings.value }
    await supabase.from('system_settings').upsert({ setting_key: 'seating_chart_data', setting_value: payload }, { onConflict: 'setting_key' })
    alert('✅ 座位表設定已成功儲存並發布！')
  } catch (error) { alert('❌ 儲存失敗') } finally { isSaving.value = false }
}

const toggleSeatVisibility = (seat) => { seat.isHidden = !seat.isHidden }
const draggedIndex = ref(null)
const onDragStart = (event, index) => { draggedIndex.value = index; event.dataTransfer.effectAllowed = 'move' }
const onDrop = (event, dropIndex) => {
  if (draggedIndex.value !== null && draggedIndex.value !== dropIndex) {
    const temp = seatsList.value[draggedIndex.value]
    seatsList.value[draggedIndex.value] = seatsList.value[dropIndex]
    seatsList.value[dropIndex] = temp
  }
  draggedIndex.value = null
}
const toggleRotation = () => { isRotated.value = !isRotated.value }
</script>

<style scoped>
.seats-page { min-height: 100vh; background: #f1f5f9; font-family: sans-serif; }
.login-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; padding: 20px; }
.login-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
.subtitle { color: #64748b; margin-bottom: 20px; }
.form-group { margin-bottom: 20px; text-align: left; }
.form-control { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; }
.btn-submit { width: 100%; padding: 12px; background: #0f766e; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
.back-link { margin-top: 15px; }

.workspace { padding: 20px; max-width: 1200px; margin: 0 auto; }
.workspace-header { 
  display: flex; justify-content: space-between; align-items: center; 
  background: white; padding: 15px 25px; border-radius: 8px; margin-bottom: 15px; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.05); flex-wrap: wrap; gap: 15px;
}
.workspace-header h2 { margin: 0; color: #0f766e; }

/* 獨立設定區塊樣式 */
.style-controls-wrapper { display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; background: #f8fafc; padding: 10px 15px; border-radius: 6px; border: 1px solid #e2e8f0;}
.style-group { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; font-weight: bold; color: #475569; border-right: 2px solid #e2e8f0; padding-right: 15px; }
.style-group:last-child { border-right: none; padding-right: 0; }
.num-input { width: 55px; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center;}
.color-input { width: 35px; height: 30px; padding: 0; border: none; cursor: pointer; border-radius: 4px;}

.header-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.btn-rotate { background: #e2e8f0; color: #334155; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-save { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-logout { background: #ef4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.tips { background: #fffbeb; color: #b45309; padding: 10px 15px; border-radius: 6px; border: 1px dashed #fcd34d; margin-bottom: 20px; font-size: 0.95rem; line-height: 1.5; }

.classroom-wrapper { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow-x: auto; -webkit-overflow-scrolling: touch; }
.classroom-area { width: 100%; min-width: 900px; margin: 0 auto; transition: transform 0.5s ease; }
.classroom-area.is-rotated { transform: rotate(180deg); }
.classroom-area.is-rotated .seat-card, .classroom-area.is-rotated .row-label, .classroom-area.is-rotated .teacher-desk { transform: rotate(-180deg); }

.labels-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 15px; }
.row-label { text-align: center; font-weight: bold; color: #0f766e; font-size: 1.1rem; transition: transform 0.5s ease; }
.seats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 40px; }

.seat-card {
  border: 2px solid #cbd5e1; border-radius: 8px; background: #f8fafc; padding: 8px;
  text-align: center; cursor: grab; transition: all 0.3s ease;
  display: flex; flex-direction: column; min-height: 110px;
}
.seat-card:active { cursor: grabbing; border-color: #0f766e; transform: scale(0.95); }
.seat-card:hover { border-color: #94a3b8; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.is-hidden-seat { opacity: 0.4; background: #e2e8f0; border: 2px dashed #94a3b8; }
.seat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.seat-id { font-size: 0.8rem; color: #94a3b8; font-weight: bold; }
.btn-toggle-vis { background: white; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; }
.btn-toggle-vis:hover { background: #f1f5f9; }

/* 三個獨立輸入框樣式 */
.seat-content-inputs { display: flex; flex-direction: column; gap: 2px; flex: 1; justify-content: center;}
.field-input {
  width: 100%; border: 1px dashed transparent; background: transparent; text-align: center; 
  font-weight: bold; padding: 2px; transition: 0.2s; border-radius: 4px;
}
.field-input:focus, .field-input:hover { border-color: #cbd5e1; background: white; outline: none; }

.teacher-desk-area { display: flex; justify-content: center; margin-bottom: 20px;}
.teacher-desk { border: 3px solid #0f766e; background: #f0fdfa; padding: 15px 30px; border-radius: 8px; text-align: center; width: 250px; transition: transform 0.5s ease; }
.teacher-desk h3 { margin: 0 0 10px 0; color: #0f766e; }
.desk-controls { background: white; padding: 5px 10px; border-radius: 4px; border: 1px solid #cbd5e1; }
.toggle-label { font-weight: bold; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; }

@media (max-width: 900px) {
  .workspace-header { flex-direction: column; align-items: stretch; text-align: center;}
  .style-controls-wrapper { flex-direction: column; gap: 10px; }
  .style-group { border-right: none; padding-right: 0; justify-content: center; }
  .header-actions { flex-direction: column; }
}
</style>
