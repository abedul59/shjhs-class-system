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
          <label>🎂 學生出生西元年和生日</label>
          <input v-model="studentBirthday" type="password" placeholder="西元生日 (例: 20130514)" required :disabled="isLoading" />
        </div>

        <div class="form-group">
          <label>🪪 學生身分證後五碼</label>
          <input v-model="studentIdLast5" type="password" maxlength="5" placeholder="請輸入身分證後五碼" required :disabled="isLoading" />
        </div>

        <hr class="divider" />

        <div class="form-group">
          <label>🤝 您與學生的關係</label>
          <select v-model="parentRelationship" required :disabled="isLoading">
            <option value="" disabled selected>請選擇關係...</option>
            <option value="爸爸">爸爸</option>
            <option value="媽媽">媽媽</option>
            <option value="爺爺">爺爺</option>
            <option value="奶奶">奶奶</option>
            <option value="外公">外公</option>
            <option value="外婆">外婆</option>
            <option value="其他">其他 (自行填寫)</option>
          </select>
          <input 
            v-if="parentRelationship === '其他'" 
            v-model="customRelationship" 
            type="text" 
            placeholder="請填寫關係 (例如: 姑姑、伯父)" 
            required 
            class="custom-input"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label>📱 您的聯絡手機號碼</label>
          <input v-model="parentPhone" type="tel" placeholder="例如: 0912345678" required :disabled="isLoading" />
        </div>

        <div class="form-group">
          <label>✉️ 您的 Email 常用信箱（綁定可收到班級重要事項公告）</label>
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

      <div class="footer-note">
        * 註：每位學生最多可綁定 3 位家長聯絡資訊。若需修改，請透過私訊聯繫導師。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

// 學生資料
const students = ref([]); const selectedStudentId = ref('')
const studentBirthday = ref(''); const studentIdLast5 = ref('')

// 家長填寫資料
const parentRelationship = ref('')
const customRelationship = ref('')
const parentPhone = ref('')
const parentEmail = ref('')

const isLoading = ref(false); const sysMessage = ref({ type: '', text: '' })

const showMessage = (type, text) => {
  sysMessage.value = { type, text }
  if (type === 'success') setTimeout(() => { sysMessage.value = { type: '', text: '' } }, 5000)
}

const fetchStudents = async () => {
  const { data } = await supabase.from('students').select('id, seat_number, hidden_name').order('seat_number')
  if (data) students.value = data
}

const submitBinding = async () => {
  if (!selectedStudentId.value || !parentEmail.value || !studentBirthday.value || !studentIdLast5.value || !parentRelationship.value || !parentPhone.value) return
  
  // 決定最終存入資料庫的關係文字
  const finalRelationship = parentRelationship.value === '其他' ? customRelationship.value.trim() : parentRelationship.value
  if (!finalRelationship) return showMessage('error', '請填寫您與學生的關係！')

  isLoading.value = true; sysMessage.value = { type: '', text: '' } 

  try {
    // 💡 雙重身分驗證！
    const { data: verifyData, error: verifyError } = await supabase
      .from('students').select('id')
      .eq('id', selectedStudentId.value)
      .eq('birthday', studentBirthday.value)
      .eq('id_last_5', studentIdLast5.value)
      .single()

    if (verifyError || !verifyData) {
      showMessage('error', '❌ 身分驗證失敗：生日或身分證後五碼輸入錯誤！')
      isLoading.value = false; return
    }

    // 檢查綁定數量 (放寬至 3 人)
    const { data: existingParents } = await supabase.from('parents').select('id').eq('student_id', selectedStudentId.value)
    if (existingParents.length >= 3) { 
      showMessage('error', '❌ 此學生已達綁定上限 (3位)。')
      isLoading.value = false; return 
    }

    // 檢查 Email 是否重複
    const { data: duplicateEmail } = await supabase.from('parents').select('id').eq('student_id', selectedStudentId.value).eq('email', parentEmail.value)
    if (duplicateEmail.length > 0) { 
      showMessage('error', '⚠️ 此 Email 已綁定過這位學生囉！')
      isLoading.value = false; return 
    }

    // 寫入資料庫 (新增 relationship 與 phone)
    await supabase.from('parents').insert({ 
      student_id: selectedStudentId.value, 
      email: parentEmail.value,
      relationship: finalRelationship,
      phone: parentPhone.value
    })

    showMessage('success', '🎉 雙重驗證通過！綁定成功！')
    
    // 清空表單
    parentEmail.value = ''; studentBirthday.value = ''; studentIdLast5.value = ''; selectedStudentId.value = ''
    parentRelationship.value = ''; customRelationship.value = ''; parentPhone.value = ''

  } catch (error) { 
    showMessage('error', '系統錯誤，請稍後再試。') 
  } finally { 
    isLoading.value = false 
  }
}
onMounted(() => fetchStudents())
</script>

<style scoped>
/* 基礎排版 */
.bind-container { min-height: 100vh; display: flex; justify-content: center; align-items: center; background-color: #fdf6e3; padding: 20px; font-family: 'sans-serif'; }
.bind-card { background: white; width: 100%; max-width: 480px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); padding: 30px; border-top: 8px solid #f59e0b; }
.card-header { text-align: center; margin-bottom: 20px; }
.card-header h2 { color: #b45309; margin-bottom: 10px; font-size: 1.6rem; }
.card-header p { color: #78716c; font-size: 0.95rem; line-height: 1.5; }

.divider { border: 0; border-top: 2px dashed #fcd34d; margin: 25px 0; opacity: 0.6; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #444; }
select, input { width: 100%; padding: 12px 15px; border: 1px solid #d6d3d1; border-radius: 8px; font-size: 1.1rem; background-color: #fafaf9; box-sizing: border-box; transition: border-color 0.2s; font-family: inherit; }
select:focus, input:focus { outline: none; border-color: #f59e0b; background-color: white; }

.custom-input { margin-top: 10px; background-color: #fffbeb; border-color: #fcd34d; }
.custom-input:focus { background-color: white; }

.submit-btn { width: 100%; padding: 14px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-size: 1.2rem; font-weight: bold; cursor: pointer; margin-top: 10px; transition: 0.2s; }
.submit-btn:hover:not(:disabled) { background-color: #059669; }
.submit-btn:disabled { background-color: #9ca3af; cursor: not-allowed; }

.message-box { padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: bold; }
.message-box.error { background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
.message-box.success { background-color: #d1fae5; color: #059669; border: 1px solid #a7f3d0; }
.back-link { color: #f59e0b; text-decoration: none; font-weight: bold; font-size: 0.95rem; }
.footer-note { margin-top: 25px; font-size: 0.85rem; color: #a8a29e; text-align: center; line-height: 1.4; }
</style>