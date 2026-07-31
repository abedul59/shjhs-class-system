<template>
  <div class="seats-page">
    <!-- ================= 獨立登入介面 ================= -->
    <div v-if="!isLoggedIn" class="login-container">
      <div class="login-card">
        <h2>🪑 學生座位管理系統</h2>
        <p class="subtitle">此區域僅限導師進入</p>
        <div class="form-group">
          <label>請輸入導師密碼：</label>
          <input 
            v-model="passwordInput" 
            type="password" 
            placeholder="請輸入密碼..." 
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

    <!-- ================= 座位排版主介面 ================= -->
    <div v-else class="workspace">
      <header class="workspace-header">
        <h2>🪑 學生座位排版系統</h2>
        
        <!-- 💡 新增：字體與樣式設定區 -->
        <div class="style-controls">
          <label class="setting-item">
            字體大小: 
            <input type="number" v-model="seatSettings.fontSize" min="10" max="40" class="num-input"> px
          </label>
          <label class="setting-item">
            字體顏色: 
            <input type="color" v-model="seatSettings.fontColor" class="color-input">
          </label>
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
        💡 提示：拖曳座位可交換位置。不需要的座位點擊左上角「取消」即可隱藏。
      </div>

      <!-- 教室版面區 -->
      <div class="classroom-wrapper">
        <div :class="['classroom-area', { 'is-rotated': isRotated }]">
          
          <!-- 💡 新增：排數標籤 (1到6排) -->
          <div class="labels-grid">
            <div v-for="n in 6" :key="'label-'+n" class="row-label">
              第{{ n }}排
            </div>
          </div>

          <!-- 座位網格 -->
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
              <!-- 座位標頭：包含編號與取消/恢復按鈕 -->
              <div class="seat-header">
                <span class="seat-id">{{ seat.id }}</span>
                <button @click="toggleSeatVisibility(seat)" class="btn-toggle-vis">
                  {{ seat.isHidden ? '👁️ 恢復' : '❌ 取消' }}
                </button>
              </div>
              
              <!-- 綁定自訂的字體大小與顏色 -->
              <textarea 
                v-model="seat.content" 
                class="seat-input"
                placeholder="輸入姓名..."
                rows="2"
                :style="{ fontSize: seatSettings.fontSize + 'px', color: seatSettings.fontColor }"
              ></textarea>
            </div>
          </div>

          <!-- 講桌區域 -->
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

// 座位資料與版面設定
const isRotated = ref(false)
const isVisibleOnIndex = ref(false)
const seatsList = ref([])

// 新增字體設定狀態
const seatSettings = ref({
  fontSize: 16,
  fontColor: '#1e293b'
})

// 初始化 30 個座位，新增 isHidden 屬性
const initSeats = () => {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    content: `${i + 1}號\n姓名`,
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
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'board_officer_passwords')
      .maybeSingle()
      
    const teacherPwd = data?.setting_value?.teacher || '168168168'
    
    if (passwordInput.value === teacherPwd) {
      isLoggedIn.value = true
      sessionStorage.setItem('seats_admin_logged_in', 'true')
      await fetchLayout()
    } else {
      alert('❌ 密碼錯誤！')
    }
  } catch (e) {
    alert('驗證發生錯誤。')
  } finally {
    isLoggingIn.value = false
    passwordInput.value = ''
  }
}

const logout = () => {
  sessionStorage.removeItem('seats_admin_logged_in')
  isLoggedIn.value = false
  navigateTo('/')
}

const fetchLayout = async () => {
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'seating_chart_data')
    .maybeSingle()

  if (data?.setting_value) {
    seatsList.value = data.setting_value.seats || initSeats()
    isRotated.value = data.setting_value.isRotated || false
    isVisibleOnIndex.value = data.setting_value.isVisible || false
    // 讀取樣式設定
    if (data.setting_value.settings) {
      seatSettings.value = data.setting_value.settings
    }
  } else {
    seatsList.value = initSeats()
  }
}

const saveLayout = async () => {
  isSaving.value = true
  try {
    const payload = {
      seats: seatsList.value,
      isRotated: isRotated.value,
      isVisible: isVisibleOnIndex.value,
      settings: seatSettings.value
    }

    await supabase.from('system_settings').upsert(
      { setting_key: 'seating_chart_data', setting_value: payload },
      { onConflict: 'setting_key' }
    )
    alert('✅ 座位表設定已成功儲存並發布！')
  } catch (error) {
    alert('❌ 儲存失敗')
  } finally {
    isSaving.value = false
  }
}

// 隱藏/顯示座位切換
const toggleSeatVisibility = (seat) => {
  seat.isHidden = !seat.isHidden
}

const draggedIndex = ref(null)

const onDragStart = (event, index) => {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

const onDrop = (event, dropIndex) => {
  if (draggedIndex.value !== null && draggedIndex.value !== dropIndex) {
    const temp = seatsList.value[draggedIndex.value]
    seatsList.value[draggedIndex.value] = seatsList.value[dropIndex]
    seatsList.value[dropIndex] = temp
  }
  draggedIndex.value = null
}

const toggleRotation = () => {
  isRotated.value = !isRotated.value
}
</script>

<style scoped>
.seats-page { min-height: 100vh; background: #f1f5f9; font-family: sans-serif; }

.login-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
.login-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 400px; text-align: center; }
.subtitle { color: #64748b; margin-bottom: 20px; }
.form-group { margin-bottom: 20px; text-align: left; }
.form-control { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; }
.btn-submit { width: 100%; padding: 12px; background: #0f766e; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
.back-link { margin-top: 15px; }

.workspace { padding: 20px; max-width: 1200px; margin: 0 auto; }
.workspace-header { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px 25px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); flex-wrap: wrap; gap: 15px;}
.workspace-header h2 { margin: 0; color: #0f766e; }

/* 字體設定控制項 */
.style-controls { display: flex; gap: 15px; align-items: center; background: #f8fafc; padding: 8px 15px; border-radius: 6px; border: 1px solid #e2e8f0; }
.setting-item { font-size: 0.95rem; font-weight: bold; color: #475569; display: flex; align-items: center; gap: 8px; }
.num-input { width: 60px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; }
.color-input { width: 40px; height: 30px; padding: 0; border: none; cursor: pointer; }

.header-actions { display: flex; gap: 10px; }
.btn-rotate { background: #e2e8f0; color: #334155; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-save { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-logout { background: #ef4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.tips { background: #fffbeb; color: #b45309; padding: 10px 15px; border-radius: 6px; border: 1px dashed #fcd34d; margin-bottom: 20px; }

.classroom-wrapper { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden; display: flex; justify-content: center; }
.classroom-area { width: 100%; max-width: 900px; transition: transform 0.5s ease; }

/* 旋轉控制 */
.classroom-area.is-rotated { transform: rotate(180deg); }
.classroom-area.is-rotated .seat-card,
.classroom-area.is-rotated .row-label, 
.classroom-area.is-rotated .teacher-desk { transform: rotate(-180deg); } /* 抗旋轉保持文字正向 */

/* 排數標籤 */
.labels-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 15px; }
.row-label { text-align: center; font-weight: bold; color: #0f766e; font-size: 1.1rem; transition: transform 0.5s ease; }

/* 座位網格 */
.seats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 40px; }

.seat-card {
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px;
  text-align: center;
  cursor: grab;
  transition: all 0.3s ease;
  height: 100px;
  display: flex;
  flex-direction: column;
}
.seat-card:active { cursor: grabbing; border-color: #0f766e; transform: scale(0.95); }
.seat-card:hover { border-color: #94a3b8; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

/* 隱藏座位的視覺效果 */
.is-hidden-seat {
  opacity: 0.4;
  background: #e2e8f0;
  border: 2px dashed #94a3b8;
}

.seat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.seat-id { font-size: 0.8rem; color: #94a3b8; font-weight: bold; }
.btn-toggle-vis { background: white; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; }
.btn-toggle-vis:hover { background: #f1f5f9; }

.seat-input {
  width: 100%;
  flex: 1;
  border: none;
  background: transparent;
  text-align: center;
  font-weight: bold;
  resize: none;
}
.seat-input:focus { outline: none; background: #fff; border-radius: 4px; }

.teacher-desk-area { display: flex; justify-content: center; }
.teacher-desk { border: 3px solid #0f766e; background: #f0fdfa; padding: 15px 30px; border-radius: 8px; text-align: center; width: 250px; transition: transform 0.5s ease; }
.teacher-desk h3 { margin: 0 0 10px 0; color: #0f766e; }
.desk-controls { background: white; padding: 5px 10px; border-radius: 4px; border: 1px solid #cbd5e1; }
.toggle-label { font-weight: bold; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; }
</style>
