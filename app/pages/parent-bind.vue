<template>
  <div class="bind-container">
    <div class="bind-card">
      <div class="card-header">
        <h2>👨‍👩‍👧 家長系統通知綁定</h2>
        <p>請選擇您的孩子並輸入您的 Email，以便接收出缺席與緊急通知。</p>
      </div>

      <form @submit.prevent="submitBinding" class="bind-form">
        <div class="form-group">
          <label for="student">👩‍🎓 選擇學生</label>
          <select id="student" v-model="selectedStudentId" required :disabled="isLoading">
            <option value="" disabled selected>請選擇座號與姓名...</option>
            <option v-for="student in students" :key="student.id" :value="student.id">
              {{ student.seat_number }}號 - {{ student.hidden_name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="email">✉️ 您的 Email 信箱</label>
          <input 
            id="email" 
            v-model="parentEmail" 
            type="email" 
            placeholder="例如: example@gmail.com" 
            required 
            :disabled="isLoading"
          />
        </div>

        <div v-if="sysMessage.text" :class="['message-box', sysMessage.type]">
          {{ sysMessage.text }}
        </div>

        <button type="submit" class="submit-btn" :disabled="isLoading">
          {{ isLoading ? '處理中...' : '✅ 確認綁定' }}
        </button>
      </form>
      
      <div class="footer-note">
        * 註：每位學生最多綁定 2 組家長信箱。若需修改已綁定的信箱，請透過聯絡簿聯繫導師。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const students = ref([])
const selectedStudentId = ref('')
const parentEmail = ref('')
const isLoading = ref(false)
const sysMessage = ref({ type: '', text: '' })

// 顯示提示訊息的小工具
const showMessage = (type, text) => {
  sysMessage.value = { type, text }
  // 5秒後自動清除訊息
  if (type === 'success') {
    setTimeout(() => { sysMessage.value = { type: '', text: '' } }, 5000)
  }
}

// 1. 載入名單：嚴格限制只撈取 id, 座號 與 隱藏姓名 (保護隱私)
const fetchStudents = async () => {
  const { data, error } = await supabase
    .from('students')
    .select('id, seat_number, hidden_name') // 絕對不撈 real_name
    .order('seat_number', { ascending: true })

  if (error) {
    showMessage('error', '無法載入學生名單，請重新整理網頁。')
  } else {
    students.value = data
  }
}

// 2. 處理綁定邏輯
const submitBinding = async () => {
  if (!selectedStudentId.value || !parentEmail.value) return
  
  isLoading.value = true
  sysMessage.value = { type: '', text: '' } // 清空之前的訊息

  try {
    // 步驟 A：檢查該學生目前綁定了幾個信箱
    const { data: existingParents, error: countError } = await supabase
      .from('parents')
      .select('id')
      .eq('student_id', selectedStudentId.value)

    if (countError) throw countError

    // 步驟 B：限制最多 2 位家長
    if (existingParents.length >= 2) {
      showMessage('error', '❌ 綁定失敗：此學生已達到綁定上限 (2位)。若需修改請聯繫導師。')
      isLoading.value = false
      return
    }

    // 步驟 C：檢查這個 Email 是不是已經綁過這個學生了 (避免家長重複點擊或忘記)
    const { data: duplicateEmail, error: dupError } = await supabase
      .from('parents')
      .select('id')
      .eq('student_id', selectedStudentId.value)
      .eq('email', parentEmail.value)
      
    if (dupError) throw dupError
    
    if (duplicateEmail.length > 0) {
       showMessage('error', '⚠️ 此 Email 已經綁定過這位學生囉！')
       isLoading.value = false
       return
    }

    // 步驟 D：正式寫入資料庫
    const { error: insertError } = await supabase
      .from('parents')
      .insert({
        student_id: selectedStudentId.value,
        email: parentEmail.value
      })

    if (insertError) throw insertError

    // 成功完成
    showMessage('success', '🎉 綁定成功！未來系統通知將會發送至此信箱。')
    
    // 清空表單讓下一位家長(或綁定第二個信箱)可以使用
    parentEmail.value = ''
    selectedStudentId.value = ''

  } catch (error) {
    console.error('綁定錯誤:', error)
    showMessage('error', '系統發生錯誤，請稍後再試。')
  } finally {
    isLoading.value = false
  }
}

// 網頁載入時自動抓取名單
onMounted(() => {
  fetchStudents()
})
</script>

<style scoped>
/* 讓背景溫馨、適合手機觀看 */
.bind-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #fdf6e3; /* 溫暖的底色 */
  padding: 20px;
  font-family: 'sans-serif';
}

.bind-card {
  background: white;
  width: 100%;
  max-width: 450px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);
  padding: 30px;
  border-top: 8px solid #f59e0b; /* 活潑的橘黃色頂部 */
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}
.card-header h2 { color: #b45309; margin-bottom: 10px; font-size: 1.6rem; }
.card-header p { color: #78716c; font-size: 0.95rem; line-height: 1.5; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #444; }

/* 輸入框與下拉選單設計 */
select, input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #d6d3d1;
  border-radius: 8px;
  font-size: 1.1rem;
  background-color: #fafaf9;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
select:focus, input:focus { outline: none; border-color: #f59e0b; background-color: white; }
select:disabled, input:disabled { opacity: 0.6; cursor: not-allowed; }

/* 按鈕設計 */
.submit-btn {
  width: 100%;
  padding: 14px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 10px;
}
.submit-btn:hover:not(:disabled) { background-color: #059669; }
.submit-btn:disabled { background-color: #9ca3af; cursor: not-allowed; }

/* 訊息提示框 */
.message-box { padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: bold; }
.message-box.error { background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
.message-box.success { background-color: #d1fae5; color: #059669; border: 1px solid #a7f3d0; }

.footer-note { margin-top: 25px; font-size: 0.85rem; color: #a8a29e; text-align: center; line-height: 1.4; }
</style>