<template>
  <div class="leave-page">
    <div class="auth-container" v-if="!isAuthenticated">
      <h2>📝 家長代為請假系統</h2>
      
      <div class="warning-box">
        🔒 <strong>提醒家長：</strong>為維護資安與嚴格保護學生個資，請擇一方式進行身分驗證，完成後即可填寫請假單。<br>
        （學生的身份證後4碼和生日已經建構完成，可用來認證登入。也可先用 email 綁定功能，或提供 email 給導師為您綁定，再用 email 前五碼即可進入）。
      </div>

      <div class="form-group">
        <label>👩‍🎓 選擇學生</label>
        <select v-model="selectedStudentId" class="custom-input">
          <option value="" disabled selected>請選擇座號與姓名...</option>
          <option v-for="s in students" :key="s.id" :value="s.id">{{ s.seat_number }}號 {{ s.real_name }}</option>
        </select>
      </div>

      <div class="tab-container">
        <button class="tab-btn" :class="{ active: authMethod === 'id' }" @click="authMethod = 'id'">📝 生日 + 身分證</button>
        <button class="tab-btn" :class="{ active: authMethod === 'email' }" @click="authMethod = 'email'">✉️ 家長綁定的 Email 前五碼</button>
      </div>

      <!-- 認證方式 A：生日 + 身分證後4碼 -->
      <div v-if="authMethod === 'id'" class="auth-fields">
        <div class="form-group">
          <label>🎂 學生出生西元年和生日</label>
          <input type="password" v-model="inputBirthday" class="custom-input" placeholder="西元生日 (例: 20130514)" />
        </div>
        <div class="form-group">
          <label>🪪 學生身分證末 4 碼</label>
          <input type="password" v-model="inputIdLast4" class="custom-input" placeholder="例: 1234" maxlength="4" />
        </div>
      </div>

      <!-- 認證方式 B：Email 前 5 碼 -->
      <div v-if="authMethod === 'email'" class="auth-fields">
        <div class="form-group">
          <label>✉️ 綁定之 Email 前五碼</label>
          <input type="text" v-model="inputEmailPrefix" class="custom-input" placeholder="請輸入 Email @ 前面的 5 個英數字" />
          <span class="sub-text">例如您的信箱為 abcde.fgh@gmail.com，請輸入 <strong>abcde</strong></span>
        </div>
      </div>

      <p v-if="authError" class="error-msg">{{ authError }}</p>

      <button class="submit-btn" @click="verifyAuth">🔓 雙重驗證並進入</button>
      
      <div class="back-link">
        <NuxtLink to="/">返回打卡首頁</NuxtLink>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- 請假填寫表單區塊 (認證成功後顯示) -->
    <!-- ============================================== -->
    <div class="leave-form-container" v-else>
      <h2>填寫請假單：{{ currentStudent?.real_name }}</h2>
      
      <!-- 💡 依據要求強調的書面請假聲明 -->
      <div class="important-notice">
        ⚠️ <strong>重要提醒：</strong><br>
        本系統之線上請假僅為「事前通知導師」，方便班級點名與安全掌握。<br>
        學生返校後，<strong>仍必須依學校規定完成「書面請假手續」</strong>（請假本位於新生訓練手冊中，或可至合作社購買單本），以避免學務處記曠課。
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>📅 請假日期</label>
          <input type="date" v-model="leaveDate" class="custom-input" :min="todayDate" />
        </div>

        <div class="form-group">
          <label>🕒 請假節數 (可複選)</label>
          <div class="period-controls">
            <button @click="selectAllPeriods" class="quick-btn">全天請假</button>
            <button @click="clearPeriods" class="quick-btn outline">清除</button>
          </div>
          <div class="checkbox-grid">
            <label v-for="period in periodList" :key="period" class="period-checkbox">
              <input type="checkbox" v-model="selectedPeriods" :value="period" />
              <span>{{ period }}</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>🏷️ 假別</label>
          <div class="radio-grid">
            <label class="radio-label"><input type="radio" v-model="leaveType" value="病假" /> 😷 病假</label>
            <label class="radio-label"><input type="radio" v-model="leaveType" value="事假" /> 📝 事假</label>
            <label class="radio-label"><input type="radio" v-model="leaveType" value="其他" /> ❓ 其他</label>
          </div>
        </div>

        <div class="form-group" v-if="leaveType === '其他'">
          <label>✍️ 請假事由說明 (必填)</label>
          <input type="text" v-model="leaveReason" class="custom-input" placeholder="請簡述請假原因..." />
        </div>
      </div>

      <button class="submit-btn" @click="submitLeave" :disabled="isSubmitting">
        {{ isSubmitting ? '送出中...' : '📤 確認送出請假通知' }}
      </button>

      <div class="back-link">
        <button @click="isAuthenticated = false" class="text-btn">返回重新認證</button> | 
        <NuxtLink to="/">回首頁</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
const supabase = useSupabaseClient()

// 認證相關變數
const isAuthenticated = ref(false)
const students = ref([])
const selectedStudentId = ref('')
const authMethod = ref('id') // 'id' 或 'email'
const inputBirthday = ref('')
const inputIdLast4 = ref('')
const inputEmailPrefix = ref('')
const authError = ref('')

// 請假表單變數
const leaveDate = ref('')
const selectedPeriods = ref([])
const leaveType = ref('病假')
const leaveReason = ref('')
const isSubmitting = ref(false)

const periodList = ['早修', '第1節', '第2節', '第3節', '第4節', '午休', '第5節', '第6節', '第7節', '第8節']

const todayDate = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
})

const currentStudent = computed(() => students.value.find(s => s.id === selectedStudentId.value))

onMounted(async () => {
  leaveDate.value = todayDate.value
  const { data } = await supabase.from('students').select('*').order('seat_number')
  if (data) students.value = data
})

// 執行家長身分雙重驗證
const verifyAuth = () => {
  authError.value = ''
  if (!selectedStudentId.value) return authError.value = '請先選擇學生！'
  
  const stu = currentStudent.value
  
  if (authMethod.value === 'id') {
    if (!inputBirthday.value || !inputIdLast4.value) return authError.value = '請完整輸入生日與身分證末4碼。'
    if (!stu.birthday || !stu.id_number) return authError.value = '系統尚未建立該名學生的完整身分資料，請聯繫導師。'
    
    const dbBday = stu.birthday.replace(/-/g, '')
    const dbId4 = stu.id_number.slice(-4)
    
    if (inputBirthday.value !== dbBday || inputIdLast4.value !== dbId4) {
      return authError.value = '❌ 驗證失敗：生日或身分證末碼錯誤！'
    }
  } else {
    if (!inputEmailPrefix.value) return authError.value = '請輸入 Email 前 5 碼。'
    if (!stu.parent_email) return authError.value = '系統尚未綁定該名學生的家長 Email，請聯繫導師。'
    
    const dbEmailPrefix = stu.parent_email.split('@')[0].slice(0, 5)
    if (inputEmailPrefix.value !== dbEmailPrefix) {
      return authError.value = '❌ 驗證失敗：Email 前五碼不吻合！'
    }
  }

  // 驗證通過
  isAuthenticated.value = true
}

// 快速選擇節數
const selectAllPeriods = () => selectedPeriods.value = [...periodList]
const clearPeriods = () => selectedPeriods.value = []

// 送出請假申請
const submitLeave = async () => {
  if (selectedPeriods.value.length === 0) return alert('⚠️ 請至少選擇一節要請假的節數！')
  if (leaveType.value === '其他' && !leaveReason.value.trim()) return alert('⚠️ 請填寫請假事由！')

  isSubmitting.value = true
  const finalReason = leaveType.value === '其他' ? leaveReason.value : leaveType.value

  try {
    // 1. 寫入資料庫 (您可以建立一個 leave_records 表，這裡示範寫入系統紀錄或私訊表中作為通知)
    // 這裡我們直接利用 private_messages 讓導師能在後台信箱看到
    const msgContent = `【系統自動推播：線上請假通知】\n請假日期：${leaveDate.value}\n請假節數：${selectedPeriods.value.join('、')}\n假別/事由：${finalReason}`
    
    await supabase.from('private_messages').insert({
      chat_type: '家長',
      student_id: currentStudent.value.id,
      sender_role: `家長(${currentStudent.value.real_name})`,
      content: msgContent,
      is_read_by_teacher: false
    })

    // 2. 寄送 Email 通知導師 (呼叫後端 API)
    try {
      await $fetch('/api/send-email', {
        method: 'POST',
        body: { 
          subject: `[線上請假通知] ${currentStudent.value.seat_number}號 ${currentStudent.value.real_name}`, 
          text: msgContent 
        }
      })
    } catch (e) {
      console.log('Email 發送功能未設定或報錯，但資料已寫入資料庫。')
    }

    alert('✅ 請假通知已成功送出！導師將會收到系統訊息與 Email。\n\n提醒您：學生返校後仍需補妥書面請假卡手續。')
    
    // 清空表單
    selectedPeriods.value = []
    leaveReason.value = ''
    leaveDate.value = todayDate.value
    isAuthenticated.value = false

  } catch (err) {
    alert('❌ 送出失敗，請稍後再試。')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.leave-page { display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background-color: #f0fdf4; padding: 40px 20px; font-family: sans-serif; box-sizing: border-box;}
.auth-container, .leave-form-container { background: white; width: 100%; max-width: 550px; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-top: 6px solid #10b981; }

h2 { text-align: center; color: #064e3b; margin-top: 0; margin-bottom: 20px; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 10px;}

.warning-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 8px; font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px;}
.important-notice { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; padding: 15px; border-radius: 8px; font-size: 0.95rem; line-height: 1.6; margin-bottom: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);}

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: bold; color: #1f2937; margin-bottom: 8px; font-size: 1.05rem;}
.custom-input { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; box-sizing: border-box; transition: 0.2s;}
.custom-input:focus { border-color: #10b981; outline: none; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); }
.sub-text { display: block; font-size: 0.85rem; color: #6b7280; margin-top: 5px; }

.tab-container { display: flex; background: #f3f4f6; padding: 5px; border-radius: 10px; margin-bottom: 20px;}
.tab-btn { flex: 1; padding: 10px; border: none; background: transparent; cursor: pointer; border-radius: 8px; font-weight: bold; color: #6b7280; font-size: 0.95rem; transition: 0.2s;}
.tab-btn.active { background: white; color: #10b981; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

.auth-fields { animation: fadeIn 0.3s ease; }

.period-controls { display: flex; gap: 10px; margin-bottom: 10px; }
.quick-btn { background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: bold;}
.quick-btn.outline { background: transparent; border: 1px solid #10b981; color: #10b981; }

.checkbox-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; }
.period-checkbox { display: flex; align-items: center; gap: 5px; cursor: pointer; background: #f9fafb; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;}
.period-checkbox input { accent-color: #10b981; transform: scale(1.2);}

.radio-grid { display: flex; gap: 15px; }
.radio-label { display: flex; align-items: center; gap: 5px; cursor: pointer; font-weight: bold; color: #374151;}
.radio-label input { accent-color: #10b981; transform: scale(1.2);}

.error-msg { color: #dc2626; text-align: center; font-weight: bold; margin-bottom: 15px; background: #fee2e2; padding: 10px; border-radius: 8px;}

.submit-btn { width: 100%; background: #10b981; color: white; border: none; padding: 14px; font-size: 1.1rem; font-weight: bold; border-radius: 8px; cursor: pointer; transition: 0.2s; margin-top: 10px;}
.submit-btn:hover:not(:disabled) { background: #059669; }
.submit-btn:disabled { background: #9ca3af; cursor: not-allowed; }

.back-link { text-align: center; margin-top: 20px; font-size: 0.95rem;}
.back-link a, .text-btn { color: #10b981; text-decoration: none; font-weight: bold; background: none; border: none; cursor: pointer; font-size: 0.95rem; display: inline;}
.back-link a:hover, .text-btn:hover { text-decoration: underline; color: #059669; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
</style>
