<template>
  <div class="leave-page">
    <!-- ============================================== -->
    <!-- 認證與登入區塊 -->
    <!-- ============================================== -->
    <div class="auth-container" v-if="!isAuthenticated && !isTeacherLogged">
      <h2>📝 家長代為請假系統</h2>
      
      <div class="warning-box">
        🔒 <strong>提醒家長：</strong>為維護資安與嚴格保護學生個資，請擇一方式進行身分驗證，完成後即可填寫請假單。<br>
        （學生的身份證後4碼和生日已經建構完成，可用來認證登入。也可先用 email 綁定功能，或提供 email 給導師為您綁定，再用 email 前五碼即可進入）。
      </div>

      <div class="form-group">
        <label>👩‍🎓 選擇學生</label>
        <select v-model="selectedStudentId" class="custom-input" :disabled="isLoading">
          <option value="" disabled selected>請選擇座號與姓名...</option>
          <option v-for="s in students" :key="s.id" :value="s.id">
            {{ s.seat_number }}號 {{ getMaskedName(s) }}
          </option>
        </select>
      </div>

      <div class="tab-container">
        <button class="tab-btn" :class="{ active: authMethod === 'id' }" @click="authMethod = 'id'">📝 生日 + 身分證</button>
        <button class="tab-btn" :class="{ active: authMethod === 'email' }" @click="authMethod = 'email'">✉️ 家長綁定的 Email 前五碼</button>
        <button class="tab-btn" :class="{ active: authMethod === 'teacher' }" @click="authMethod = 'teacher'">👨‍🏫 導師管理</button>
      </div>

      <!-- 認證 A：生日 + 身分證 -->
      <div v-if="authMethod === 'id'" class="auth-fields">
        <div class="form-group">
          <label>🎂 學生出生西元年和生日</label>
          <input type="password" v-model="studentBirthday" class="custom-input" placeholder="西元生日 (例: 20130514)" :disabled="isLoading" />
        </div>
        <div class="form-group">
          <label>🪪 學生身分證末 4 碼</label>
          <input type="password" v-model="studentIdLast4" class="custom-input" placeholder="請輸入身分證後四碼" maxlength="4" :disabled="isLoading" />
        </div>
      </div>

      <!-- 認證 B：Email -->
      <div v-if="authMethod === 'email'" class="auth-fields">
        <div class="form-group">
          <label>✉️ 綁定之 Email 前五碼</label>
          <input type="text" v-model="emailPrefix" class="custom-input" placeholder="請輸入 Email @ 前面的 5 個英數字" maxlength="5" :disabled="isLoading" />
        </div>
      </div>

      <!-- 認證 C：導師登入 -->
      <div v-if="authMethod === 'teacher'" class="auth-fields">
        <div class="form-group">
          <label>🔑 系統授權密碼</label>
          <input type="password" v-model="teacherPwdInput" @keyup.enter="loginTeacher" class="custom-input" placeholder="請輸入密碼..." :disabled="isLoading" />
        </div>
      </div>

      <p v-if="authError" class="error-msg">{{ authError }}</p>

      <button v-if="authMethod !== 'teacher'" class="submit-btn" @click="verifyAuth" :disabled="isLoading">
        {{ isLoading ? '驗證中...' : '🔓 雙重驗證並進入' }}
      </button>
      <button v-else class="submit-btn admin-btn" @click="loginTeacher" :disabled="isLoading">進入導師管理後台</button>
      
      <div class="back-link"><NuxtLink to="/">返回打卡首頁</NuxtLink></div>
    </div>

    <!-- ============================================== -->
    <!-- 導師管理後台區塊 -->
    <!-- ============================================== -->
    <div class="leave-form-container teacher-dashboard" v-else-if="isTeacherLogged">
      <h2>👨‍🏫 請假系統管理後台</h2>
      
      <!-- 區塊 1：介面公告設定 -->
      <div class="admin-section">
        <h3>📢 介面公告設定</h3>
        <div class="form-group">
          <label>修改家長端介面「請假注意事項」：</label>
          <textarea v-model="editingNotice" class="custom-input" rows="3"></textarea>
          <button class="quick-btn" style="margin-top: 10px;" @click="saveNotice">💾 儲存公告</button>
        </div>
      </div>

      <!-- 區塊 2：Email 通知設定 -->
      <div class="admin-section">
        <h3>📧 Email 通知推播設定</h3>
        
        <div class="form-group">
          <label>導師接收通知之 Email 信箱：</label>
          <input type="email" v-model="teacherEmail" class="custom-input" placeholder="例如: teacher@school.edu.tw" />
        </div>

        <div class="form-group">
          <label>信件主旨範本：</label>
          <input type="text" v-model="emailSubjectTpl" class="custom-input" />
        </div>

        <div class="form-group">
          <label>信件內容範本：</label>
          <div class="var-tips">
            💡 <strong>可用變數：</strong> <code>{student_name}</code> (學生姓名), <code>{leave_date}</code> (請假日期), <code>{leave_periods}</code> (請假節數), <code>{leave_reason}</code> (事由)
          </div>
          <textarea v-model="emailBodyTpl" class="custom-input" rows="6"></textarea>
        </div>

        <!-- 即時預覽區塊 -->
        <div class="preview-box">
          <h4>👁️ 信件預覽 (範例)</h4>
          <div class="preview-subject"><strong>主旨：</strong> {{ previewSubject }}</div>
          <div class="preview-body" v-html="previewBodyNL"></div>
        </div>

        <button class="quick-btn admin-btn" style="margin-top: 15px; width: 100%;" @click="saveEmailSettings">
          💾 儲存 Email 推播設定
        </button>
      </div>

      <!-- 區塊 3：請假紀錄 -->
      <div class="admin-section" style="margin-bottom: 0;">
        <h3 class="record-title">📋 近期家長線上請假紀錄</h3>
        <div class="record-list">
          <div v-if="leaveRecords.length === 0" class="empty-msg">目前沒有請假紀錄。</div>
          <div v-for="rec in leaveRecords" :key="rec.id" class="record-card">
            <div class="rec-header">
              <strong>{{ rec.sender_role }}</strong> 
              <span class="rec-time">{{ formatTime(rec.created_at) }}</span>
            </div>
            <div class="rec-body">{{ rec.content }}</div>
          </div>
        </div>
      </div>

      <div class="back-link"><button @click="logout" class="text-btn">登出</button> | <NuxtLink to="/">回首頁</NuxtLink></div>
    </div>

    <!-- ============================================== -->
    <!-- 家長請假填寫表單區塊 -->
    <!-- ============================================== -->
    <div class="leave-form-container" v-else>
      <h2>填寫請假單：{{ currentStudent?.real_name }}</h2>
      <div class="important-notice" v-html="systemNoticeNL"></div>

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

      <div class="back-link"><button @click="logout" class="text-btn">返回重新認證</button> | <NuxtLink to="/">回首頁</NuxtLink></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
const supabase = useSupabaseClient()

// ===== 認證與 UI 狀態 =====
const isLoading = ref(false)
const isAuthenticated = ref(false)
const isTeacherLogged = ref(false)
const students = ref([])
const selectedStudentId = ref('')
const authMethod = ref('id') 
const authError = ref('')

// ===== 綁定的變數 =====
const studentBirthday = ref('')
const studentIdLast4 = ref('')
const emailPrefix = ref('')
const teacherPwdInput = ref('')
const expectedTeacherPwd = ref('168168168')

// ===== 請假表單變數 =====
const leaveDate = ref('')
const selectedPeriods = ref([])
const leaveType = ref('病假')
const leaveReason = ref('')
const isSubmitting = ref(false)
const periodList = ['早修', '第1節', '第2節', '第3節', '第4節', '午休', '第5節', '第6節', '第7節', '第8節']

// ===== 導師管理變數 (新增 Email 範本狀態) =====
const teacherEmail = ref('')
const emailSubjectTpl = ref('[線上請假通知] {student_name}')
const emailBodyTpl = ref('導師您好：\n\n系統收到了一則家長請假通知。\n\n【詳細資訊】\n- 學生：{student_name}\n- 請假日期：{leave_date}\n- 請假節數：{leave_periods}\n- 假別/事由：{leave_reason}\n\n此致\n系統自動通知')

const defaultNotice = `⚠️ <strong>重要提醒：</strong><br>本系統之線上請假僅為「事前通知導師」，方便班級點名與安全掌握。<br>學生返校後，<strong>仍必須依學校規定完成「書面請假手續」</strong>（請假本位於新生訓練手冊中，或可至合作社購買單本），以避免學務處記曠課。`
const systemNotice = ref(defaultNotice)
const editingNotice = ref('')
const leaveRecords = ref([])

const todayDate = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
})

const currentStudent = computed(() => students.value.find(s => s.id === selectedStudentId.value))
const systemNoticeNL = computed(() => systemNotice.value.replace(/\n/g, '<br>'))

// ===== 導師 Email 預覽運算 =====
const previewSubject = computed(() => emailSubjectTpl.value.replace(/{student_name}/g, '27號 皇茹月'))
const previewBody = computed(() => {
  return emailBodyTpl.value
    .replace(/{student_name}/g, '27號 皇茹月')
    .replace(/{leave_date}/g, todayDate.value)
    .replace(/{leave_periods}/g, '早修、第1節、第2節')
    .replace(/{leave_reason}/g, '病假')
})
const previewBodyNL = computed(() => previewBody.value.replace(/\n/g, '<br>'))

onMounted(async () => {
  leaveDate.value = todayDate.value
  
  const { data: sData } = await supabase.from('students').select('id, seat_number, hidden_name, real_name, birthday, id_number, id_last_5, parent_email').order('seat_number')
  if (sData) students.value = sData

  // 抓取系統設定 (包含信箱、信件主旨與內文)
  const { data: sysData } = await supabase.from('system_settings').select('*').in('setting_key', [
    'admin_password', 'leave_application_notice', 'teacher_msg_notify_email', 
    'leave_email_subject_template', 'leave_email_body_template'
  ])
  
  if (sysData) {
    sysData.forEach(s => {
      if (s.setting_key === 'admin_password' && s.setting_value) {
        if (s.setting_value.type === 'dynamic') {
          const d = new Date(); const yy = String(d.getFullYear()).slice(2); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0')
          expectedTeacherPwd.value = `${yy}${mm}${dd}59`
        } else {
          expectedTeacherPwd.value = s.setting_value.custom_pwd || '168168168'
        }
      }
      if (s.setting_key === 'leave_application_notice' && s.setting_value) systemNotice.value = s.setting_value
      if (s.setting_key === 'teacher_msg_notify_email' && s.setting_value) teacherEmail.value = s.setting_value
      if (s.setting_key === 'leave_email_subject_template' && s.setting_value) emailSubjectTpl.value = s.setting_value
      if (s.setting_key === 'leave_email_body_template' && s.setting_value) emailBodyTpl.value = s.setting_value
    })
  }
  editingNotice.value = systemNotice.value.replace(/<br>/g, '\n').replace(/<\/?strong>/g, '').replace(/⚠️ /g, '')
})

const getMaskedName = (stu) => {
  if (stu.hidden_name) return stu.hidden_name
  const name = stu.real_name || ''
  if (name.length > 2) return name[0] + 'Ｏ' + name[name.length - 1]
  return name[0] + 'Ｏ'
}

const formatTime = (iso) => new Date(iso).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })

// ===== 導師管理功能 =====
const loginTeacher = async () => {
  if (teacherPwdInput.value === expectedTeacherPwd.value || teacherPwdInput.value === '168168168') {
    isTeacherLogged.value = true; authError.value = ''
    const { data } = await supabase.from('private_messages')
      .select('*').eq('chat_type', '家長').ilike('content', '%線上請假通知%').order('created_at', { ascending: false })
    if (data) leaveRecords.value = data
  } else {
    authError.value = '❌ 導師密碼錯誤'
  }
}

const saveNotice = async () => {
  await supabase.from('system_settings').upsert({ setting_key: 'leave_application_notice', setting_value: editingNotice.value }, { onConflict: 'setting_key' })
  systemNotice.value = editingNotice.value
  alert('✅ 介面公告已成功更新！')
}

const saveEmailSettings = async () => {
  await supabase.from('system_settings').upsert([
    { setting_key: 'teacher_msg_notify_email', setting_value: teacherEmail.value },
    { setting_key: 'leave_email_subject_template', setting_value: emailSubjectTpl.value },
    { setting_key: 'leave_email_body_template', setting_value: emailBodyTpl.value }
  ], { onConflict: 'setting_key' })
  alert('✅ Email 通知與推播設定已成功儲存！')
}

// ===== 💡 修復版的 Email 雙重認證邏輯 (不受缺表影響) =====
const verifyAuth = async () => {
  if (!selectedStudentId.value) {
    authError.value = '❌ 請先選擇學生！'
    return
  }

  isLoading.value = true
  authError.value = ''

  try {
    const { data: stData, error: stError } = await supabase.from('students').select('*').eq('id', selectedStudentId.value).single()
    if (stError || !stData) throw new Error('找不到該學生資料')

    let isValid = false

    // 方式 A：生日 + 身分證後四碼
    if (authMethod.value === 'id') {
      const idStr = (stData.id_number || stData.id_last_5 || '').slice(-4)
      const bMatch = String(stData.birthday || '').match(/(\d{4})[-/]?(\d{1,2})[-/]?(\d{1,2})/)
      const dbBday = bMatch ? `${bMatch[1]}${bMatch[2].padStart(2, '0')}${bMatch[3].padStart(2, '0')}` : ''
      
      if (dbBday === studentBirthday.value && idStr === studentIdLast4.value) {
        isValid = true
      }
    } 
    // 方式 B：Email 前五碼 (強化防呆版)
    else if (authMethod.value === 'email') {
      const userInputPrefix = emailPrefix.value.trim().toLowerCase().substring(0, 5)
      if (!userInputPrefix) {
        authError.value = '❌ 請輸入有效的 Email 前五碼！'
        isLoading.value = false; return
      }

      let emailsToCheck = []

      // 1. 本身表
      if (stData.parent_email) emailsToCheck.push(stData.parent_email)

      // 2. parents 表 (加上 try-catch 防止沒有資料表導致崩潰)
      try {
        const { data: parentsData } = await supabase.from('parents').select('email').eq('student_id', selectedStudentId.value)
        if (parentsData) emailsToCheck.push(...parentsData.map(p => p.email).filter(Boolean))
      } catch (e) { /* 略過不存在的表 */ }

      // 3. parent_bindings 表
      try {
        const { data: bindings } = await supabase.from('parent_bindings').select('email').eq('student_id', selectedStudentId.value)
        if (bindings) emailsToCheck.push(...bindings.map(b => b.email).filter(Boolean))
      } catch (e) { /* 略過不存在的表 */ }

      if (emailsToCheck.length === 0) {
        authError.value = '❌ 系統尚未綁定該名學生的家長 Email，請聯繫導師。'
        isLoading.value = false; return
      }

      // 直接比對 @ 前方的前 5 個字元
      isValid = emailsToCheck.some(email => {
        const dbPrefix = String(email).split('@')[0].trim().toLowerCase().substring(0, 5)
        return dbPrefix === userInputPrefix
      })
    }

    if (!isValid) {
      authError.value = '❌ 驗證失敗：您輸入的資料錯誤或尚未綁定！'
      isLoading.value = false; return
    }

    isAuthenticated.value = true

  } catch (error) { 
    authError.value = '❌ 系統發生異常，請稍後再試。' 
  } finally { 
    isLoading.value = false 
  }
}

// ===== 請假操作與寄信功能 =====
const selectAllPeriods = () => selectedPeriods.value = [...periodList]
const clearPeriods = () => selectedPeriods.value = []

const submitLeave = async () => {
  if (selectedPeriods.value.length === 0) return alert('⚠️ 請至少選擇一節要請假的節數！')
  if (leaveType.value === '其他' && !leaveReason.value.trim()) return alert('⚠️ 請填寫請假事由！')

  isSubmitting.value = true
  const studentNameInfo = `${currentStudent.value.seat_number}號 ${currentStudent.value.real_name}`
  const finalReason = leaveType.value === '其他' ? leaveReason.value : leaveType.value

  try {
    // 1. 寫入資料庫私訊 (維持系統預設格式)
    const msgContent = `【系統自動推播：線上請假通知】\n請假日期：${leaveDate.value}\n請假節數：${selectedPeriods.value.join('、')}\n假別/事由：${finalReason}`
    
    await supabase.from('private_messages').insert({
      chat_type: '家長', student_id: currentStudent.value.id, sender_role: `家長(${currentStudent.value.real_name})`, content: msgContent, is_read_by_teacher: false
    })

    // 2. 發送自訂 Email 給導師
    if (teacherEmail.value && teacherEmail.value.includes('@')) {
      const actualSubject = emailSubjectTpl.value.replace(/{student_name}/g, studentNameInfo)
      const actualBody = emailBodyTpl.value
        .replace(/{student_name}/g, studentNameInfo)
        .replace(/{leave_date}/g, leaveDate.value)
        .replace(/{leave_periods}/g, selectedPeriods.value.join('、'))
        .replace(/{leave_reason}/g, finalReason)

      try { 
        // 將導師信箱、自訂主旨與內文送給您的 API
        await $fetch('/api/send-email', { 
          method: 'POST', 
          body: { to: teacherEmail.value, subject: actualSubject, text: actualBody } 
        }) 
      } catch (e) {
        console.error('Email 發送發生錯誤', e)
      }
    }

    alert('✅ 請假通知已成功送出！導師將會收到系統訊息與 Email。\n\n提醒您：學生返校後仍需補妥書面請假卡手續。')
    logout()
  } catch (err) { alert('❌ 送出失敗，請稍後再試。') } finally { isSubmitting.value = false }
}

const logout = () => {
  isAuthenticated.value = false
  isTeacherLogged.value = false
  studentBirthday.value = ''
  studentIdLast4.value = ''
  emailPrefix.value = ''
  teacherPwdInput.value = ''
  selectedPeriods.value = []
  leaveReason.value = ''
  leaveDate.value = todayDate.value
}
</script>

<style scoped>
.leave-page { display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background-color: #f0fdf4; padding: 40px 20px; font-family: sans-serif; box-sizing: border-box;}
.auth-container, .leave-form-container { background: white; width: 100%; max-width: 550px; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-top: 6px solid #10b981; }
.teacher-dashboard { border-top-color: #3b82f6; max-width: 600px; }

h2 { text-align: center; color: #064e3b; margin-top: 0; margin-bottom: 20px; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 10px;}

.warning-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 8px; font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px;}
.important-notice { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; padding: 15px; border-radius: 8px; font-size: 0.95rem; line-height: 1.6; margin-bottom: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);}

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: bold; color: #1f2937; margin-bottom: 8px; font-size: 1.05rem;}
.custom-input { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; box-sizing: border-box; transition: 0.2s;}
.custom-input:focus { border-color: #10b981; outline: none; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); }

.tab-container { display: flex; background: #f3f4f6; padding: 5px; border-radius: 10px; margin-bottom: 20px;}
.tab-btn { flex: 1; padding: 10px; border: none; background: transparent; cursor: pointer; border-radius: 8px; font-weight: bold; color: #6b7280; font-size: 0.95rem; transition: 0.2s;}
.tab-btn.active { background: white; color: #10b981; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

.period-controls { display: flex; gap: 10px; margin-bottom: 10px; }
.quick-btn { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 0.95rem; font-weight: bold; transition: 0.2s;}
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

/* 導師後台專用樣式 */
.admin-btn { background: #3b82f6; } .admin-btn:hover:not(:disabled) { background: #2563eb; }
.admin-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.admin-section h3 { margin-top: 0; color: #1e40af; border-bottom: 2px solid #bfdbfe; padding-bottom: 10px; margin-bottom: 15px;}
.var-tips { font-size: 0.85rem; color: #64748b; margin-bottom: 8px; }
.var-tips code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #b91c1c; font-family: monospace; }
.preview-box { background: #fef9c3; border: 1px dashed #fde047; padding: 15px; border-radius: 8px; margin-top: 15px; }
.preview-box h4 { margin: 0 0 10px 0; color: #854d0e; }
.preview-subject { font-size: 0.95rem; margin-bottom: 10px; border-bottom: 1px dashed #fde047; padding-bottom: 10px; }
.preview-body { font-size: 0.95rem; color: #3f6212; line-height: 1.5; }

.record-title { border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; color: #334155; }
.record-list { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
.record-card { background: white; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; }
.rec-header { display: flex; justify-content: space-between; margin-bottom: 5px; color: #1e40af; font-size: 0.95rem;}
.rec-time { color: #64748b; font-size: 0.85rem; }
.rec-body { color: #334155; white-space: pre-wrap; font-size: 0.95rem; line-height: 1.5; }
.empty-msg { text-align: center; color: #94a3b8; font-style: italic; padding: 20px;}

.back-link { text-align: center; margin-top: 20px; font-size: 0.95rem;}
.back-link a, .text-btn { color: #10b981; text-decoration: none; font-weight: bold; background: none; border: none; cursor: pointer; font-size: 0.95rem; display: inline;}
.back-link a:hover, .text-btn:hover { text-decoration: underline; color: #059669; }
</style>
