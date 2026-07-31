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
        💡 提示：按住座位方塊即可「拖曳」與其他座位交換位置。點擊座位內的文字框可直接修改文字。
      </div>

      <!-- 教室版面區 -->
      <div class="classroom-wrapper">
        <div :class="['classroom-area', { 'is-rotated': isRotated }]">
          
          <!-- 座位網格 (6欄 x 5列 = 30個座位) -->
          <div class="seats-grid">
            <div 
              v-for="(seat, index) in seatsList" 
              :key="seat.id"
              class="seat-card"
              draggable="true"
              @dragstart="onDragStart($event, index)"
              @dragover.prevent
              @drop="onDrop($event, index)"
            >
              <div class="seat-id">{{ seat.id }}</div>
              <textarea 
                v-model="seat.content" 
                class="seat-input"
                placeholder="輸入姓名..."
                rows="2"
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

// 初始化 30 個座位
const initSeats = () => {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    content: `${i + 1}號\n姓名`
  }))
}

onMounted(async () => {
  // 檢查 sessionStorage 確保重整不需重登
  if (sessionStorage.getItem('seats_admin_logged_in') === 'true') {
    isLoggedIn.value = true
    await fetchLayout()
  }
})

// 獨立的密碼驗證邏輯
const handleLogin = async () => {
  if (!passwordInput.value) return
  isLoggingIn.value = true
  
  try {
    const { data, error } = await supabase
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

// 從資料庫抓取座位表設定
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
  } else {
    seatsList.value = initSeats()
  }
}

// 儲存至資料庫
const saveLayout = async () => {
  isSaving.value = true
  try {
    const payload = {
      seats: seatsList.value,
      isRotated: isRotated.value,
      isVisible: isVisibleOnIndex.value
    }

    await supabase.from('system_settings').upsert(
      { setting_key: 'seating_chart_data', setting_value: payload },
      { onConflict: 'setting_key' }
    )
    alert('✅ 座位表已成功儲存並發布！')
  } catch (error) {
    alert('❌ 儲存失敗')
  } finally {
    isSaving.value = false
  }
}

// --- 拖曳邏輯 ---
const draggedIndex = ref(null)

const onDragStart = (event, index) => {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

const onDrop = (event, dropIndex) => {
  if (draggedIndex.value !== null && draggedIndex.value !== dropIndex) {
    // 交換陣列中的兩個元素
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

/* 登入介面 */
.login-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
.login-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 400px; text-align: center; }
.subtitle { color: #64748b; margin-bottom: 20px; }
.form-group { margin-bottom: 20px; text-align: left; }
.form-control { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; }
.btn-submit { width: 100%; padding: 12px; background: #0f766e; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
.back-link { margin-top: 15px; }

/* 主工作區 */
.workspace { padding: 20px; max-width: 1200px; margin: 0 auto; }
.workspace-header { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px 25px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.workspace-header h2 { margin: 0; color: #0f766e; }
.header-actions { display: flex; gap: 10px; }
.btn-rotate { background: #e2e8f0; color: #334155; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-save { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-logout { background: #ef4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.tips { background: #fffbeb; color: #b45309; padding: 10px 15px; border-radius: 6px; border: 1px dashed #fcd34d; margin-bottom: 20px; }

/* 教室版面 */
.classroom-wrapper { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden; display: flex; justify-content: center; }
.classroom-area { width: 100%; max-width: 900px; transition: transform 0.5s ease; }

/* 旋轉控制 */
.classroom-area.is-rotated { transform: rotate(180deg); }
.classroom-area.is-rotated .seat-card { transform: rotate(-180deg); }
.classroom-area.is-rotated .teacher-desk { transform: rotate(-180deg); }

/* 座位網格 */
.seats-grid { 
  display: grid; 
  grid-template-columns: repeat(6, 1fr); /* 6欄 */
  gap: 10px; 
  margin-bottom: 40px; 
}

.seat-card {
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px;
  text-align: center;
  cursor: grab;
  transition: all 0.3s ease;
  height: 90px;
  display: flex;
  flex-direction: column;
}
.seat-card:active { cursor: grabbing; border-color: #0f766e; transform: scale(0.95); }
.seat-card:hover { border-color: #94a3b8; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.seat-id { font-size: 0.8rem; color: #94a3b8; text-align: left; margin-bottom: 5px; font-weight: bold; }
.seat-input {
  width: 100%;
  flex: 1;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 1rem;
  font-weight: bold;
  color: #1e293b;
  resize: none;
}
.seat-input:focus { outline: none; background: #fff; border-radius: 4px; }

/* 講桌 */
.teacher-desk-area { display: flex; justify-content: center; }
.teacher-desk {
  border: 3px solid #0f766e;
  background: #f0fdfa;
  padding: 15px 30px;
  border-radius: 8px;
  text-align: center;
  width: 250px;
  transition: transform 0.5s ease;
}
.teacher-desk h3 { margin: 0 0 10px 0; color: #0f766e; }
.desk-controls { background: white; padding: 5px 10px; border-radius: 4px; border: 1px solid #cbd5e1; }
.toggle-label { font-weight: bold; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; }
</style>
