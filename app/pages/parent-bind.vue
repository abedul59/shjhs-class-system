<template>
  <div class="bind-container">
    <div class="bind-card">
      <div class="card-header">
        <h2>👨‍👩‍👧 家長系統通知綁定</h2>
        <p>請選擇您的孩子並完成雙重身分驗證，以便接收通知。</p>
      </div>

      <form @submit.prevent="submitBinding" class="bind-form">
        <div class="form-group">
          <label>👩‍🎓 選擇學生</label>
          <select v-model="selectedStudentId" required :disabled="isLoading">
            <option value="" disabled selected>請選擇座號與姓名...</option>
            <option v-for="student in students" :key="student.id" :value="student.id">
              {{ student.seat_number }}號 - {{ student.hidden_name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>🎂 學生生日</label>
          <input v-model="studentBirthday" type="password" placeholder="西元生日 (例: 20130514)" required :disabled="isLoading" />
        </div>

        <div class="form-group">
          <label>🪪 身分證後五碼</label>
          <input v-model="studentIdLast5" type="password" maxlength="5" placeholder="請輸入身分證後五碼" required :disabled="isLoading" />
        </div>

        <div class="form-group">
          <label>✉️ 您的 Email 信箱</label>
          <input v-model="parentEmail" type="email" placeholder="例如: example@gmail.com" required :disabled="isLoading" />
        </div>

        <div v-if="sysMessage.text" :class="['message-box', sysMessage.type]">{{ sysMessage.text }}</div>

        <button type="submit" class="submit-btn" :disabled="isLoading">
          {{ isLoading ? '處理中...' : '✅ 驗證並綁定' }}
        </button>
        
        <div style="text-align: center; margin-top: 15px;">
          <NuxtLink to="/" class="back-link">返回打卡首頁</NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const students = ref([]); const selectedStudentId = ref('')
const studentBirthday = ref(''); const studentIdLast5 = ref('') // 新增變數
const parentEmail = ref(''); const isLoading = ref(false); const sysMessage = ref({ type: '', text: '' })

const showMessage = (type, text) => {
  sysMessage.value = { type, text }
  if (type === 'success') setTimeout(() => { sysMessage.value = { type: '', text: '' } }, 5000)
}

const fetchStudents = async () => {
  const { data } = await supabase.from('students').select('id, seat_number, hidden_name').order('seat_number')
  if (data) students.value = data
}

const submitBinding = async () => {
  if (!selectedStudentId.value || !parentEmail.value || !studentBirthday.value || !studentIdLast5.value) return
  isLoading.value = true; sysMessage.value = { type: '', text: '' } 

  try {
    // 💡 雙重身分驗證！同時比對生日與身分證後五碼
    const { data: verifyData, error: verifyError } = await supabase
      .from('students').select('id')
      .eq('id', selectedStudentId.value)
      .eq('birthday', studentBirthday.value)
      .eq('id_last_5', studentIdLast5.value) // 新增驗證條件
      .single()

    if (verifyError || !verifyData) {
      showMessage('error', '❌ 身分驗證失敗：生日或身分證後五碼輸入錯誤！')
      isLoading.value = false; return
    }

    // 檢查綁定數量與重複 (與之前相同)
    const { data: existingParents } = await supabase.from('parents').select('id').eq('student_id', selectedStudentId.value)
    if (existingParents.length >= 2) { showMessage('error', '❌ 此學生已達綁定上限 (2位)。'); isLoading.value = false; return }

    const { data: duplicateEmail } = await supabase.from('parents').select('id').eq('student_id', selectedStudentId.value).eq('email', parentEmail.value)
    if (duplicateEmail.length > 0) { showMessage('error', '⚠️ 此 Email 已綁定過這位學生囉！'); isLoading.value = false; return }

    // 寫入資料庫
    await supabase.from('parents').insert({ student_id: selectedStudentId.value, email: parentEmail.value })

    showMessage('success', '🎉 雙重驗證通過！綁定成功！')
    parentEmail.value = ''; studentBirthday.value = ''; studentIdLast5.value = ''; selectedStudentId.value = ''

  } catch (error) { showMessage('error', '系統錯誤，請稍後再試。') } finally { isLoading.value = false }
}
onMounted(() => fetchStudents())
</script>

<style scoped>
/* (完全沿用原本的 CSS 即可，以下省略以節省版面) */
.bind-container { min-height: 100vh; display: flex; justify-content: center; align-items: center; background-color: #fdf6e3; padding: 20px; font-family: 'sans-serif'; }
.bind-card { background: white; width: 100%; max-width: 450px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); padding: 30px; border-top: 8px solid #f59e0b; }
.card-header { text-align: center; margin-bottom: 30px; }
.card-header h2 { color: #b45309; margin-bottom: 10px; font-size: 1.6rem; }
.card-header p { color: #78716c; font-size: 0.95rem; line-height: 1.5; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #444; }
select, input { width: 100%; padding: 12px 15px; border: 1px solid #d6d3d1; border-radius: 8px; font-size: 1.1rem; background-color: #fafaf9; box-sizing: border-box; }
select:focus, input:focus { outline: none; border-color: #f59e0b; background-color: white; }
.submit-btn { width: 100%; padding: 14px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-size: 1.2rem; font-weight: bold; cursor: pointer; margin-top: 10px; }
.message-box { padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: bold; }
.message-box.error { background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
.message-box.success { background-color: #d1fae5; color: #059669; border: 1px solid #a7f3d0; }
.back-link { color: #f59e0b; text-decoration: none; font-weight: bold; font-size: 0.9rem; }
</style>