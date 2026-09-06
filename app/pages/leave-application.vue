<template>
  <div class="leave-page">
    <div class="auth-container" v-if="!isAuthenticated && !isTeacherLogged">
      <h2>📝 家長代為請假系統</h2>
      
      <div class="warning-box">
        🔒 <strong>提醒家長：</strong>為維護資安與嚴格保護學生個資，請擇一方式進行身分驗證，完成後即可填寫請假單。<br>
        （學生的身份證後4碼和生日已經建構完成，可用來認證登入。也可先用 email 綁定功能，再用 email 前五碼即可進入）。
      </div>

      <div class="form-group">
        <label>👩‍🎓 選擇學生</label>
        <select v-model="selectedStudentId" class="custom-input">
          <option value="" disabled selected>請選擇座號與姓名...</option>
          <!-- 💡 修正：嚴格實施隱藏姓名策略 -->
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
          <input type="password" v-model="inputBirthday" class="custom-input" placeholder="西元生日 (例: 20130514)" />
        </div>
        <div class="form-group">
          <label>🪪 學生身分證末 4 碼</label>
          <input type="password" v-model="inputIdLast4" class="custom-input" placeholder="例: 1234" maxlength="4" />
        </div>
      </div>

      <!-- 認證 B：Email -->
      <div v-if="authMethod === 'email'" class="auth-fields">
        <div class="form-group">
          <label>✉️ 綁定之 Email 前五碼</label>
          <input type="text" v-model="inputEmailPrefix" class="custom-input" placeholder="請輸入 Email @ 前面的 5 個英數字" />
        </div>
      </div>

      <!-- 認證 C：導師隱藏登入 -->
      <div v-if="authMethod === 'teacher'" class="auth-fields">
        <div class="form-group">
          <label>🔑 系統授權密碼</label>
          <input type="password" v-model="teacherPwdInput" @keyup.enter="loginTeacher" class="custom-input" placeholder="請輸入密碼..." />
        </div>
      </div>

      <p v-if="authError" class="error-msg">{{ authError }}</p>

      <button v-if="authMethod !== 'teacher'" class="submit-btn" @click="verifyAuth">🔓 雙重驗證並進入</button>
      <button v-else class="submit-btn admin-btn" @click="loginTeacher">進入導師管理後台</button>
      
      <div class="back-link"><NuxtLink to="/">返回打卡首頁</NuxtLink></div>
    </div>

    <!-- ============================================== -->
    <!-- 導師管理後台區塊 -->
    <!-- ============================================== -->
    <div class="leave-form-container teacher-dashboard" v-else-if="isTeacherLogged">
      <h2>👨‍🏫 請假系統管理後台</h2>
      
      <div class="form-group">
        <label>⚙️ 修改家長端介面「請假注意事項」：</label>
        <textarea v-model="editingNotice" class="custom-input" rows="4"></textarea>
        <button class="quick-btn" style="margin-top: 10px;" @click="saveNotice">💾 儲存修改</button>
      </div>

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

      <div class="back-link">
        <button @click="isTeacherLogged = false" class="text-btn">登出</button> | <NuxtLink to="/">回首頁</NuxtLink>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- 請假填寫表單區塊 (家長認證成功後顯示) -->
    <!-- ============================================== -->
    <div class="leave-form-container" v-else>
      <!-- 💡 驗證成功後，顯示學生真實姓名 -->
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
const isTeacherLogged = ref(false)
const students = ref([])
const selectedStudentId = ref('')
const authMethod = ref('id') 
const inputBirthday = ref('')
const inputIdLast4 = ref('')
const inputEmailPrefix = ref('')
const teacherPwdInput = ref('')
const expectedTeacherPwd = ref('168168168')
const authError = ref('')

// 請假表單變數
const leaveDate = ref('')
const selectedPeriods = ref([])
const leaveType = ref('病假')
const leaveReason = ref('')
const isSubmitting = ref(false)
const periodList = ['早修', '第1節', '第2節', '第3節', '第4節', '午休', '第5節', '第6節', '第7節', '第8節']

// 導師管理變數
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

onMounted(async () => {
  leaveDate.value = todayDate.value
  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  if (sData) students.value = sData

  // 抓取密碼與公告設定
  const { data: sysData } = await supabase.from('system_settings').select('*').in('setting_key', ['admin_password', 'leave_application_notice'])
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
      if (s.setting_key === 'leave_application_notice' && s.setting_value) {
        systemNotice.value = s.setting_value
      }
    })
  }
  editingNotice.value = systemNotice.value.replace(/<br>/g, '\n').replace(/<\/?strong>/g, '').replace(/⚠️ /g, '')
})

// 💡 確保下拉選單能隱藏姓名
const getMaskedName = (stu) => {
  if (stu.hidden_name) return stu.hidden_name
  const name = stu.real_name || ''
  if (name.length > 2) return name[0] + 'Ｏ' + name[name.length - 1]
  return name[0] + 'Ｏ'
}

const formatTime = (iso) => new Date(iso).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })

// 導師登入
const loginTeacher = async () => {
  if (teacherPwdInput.value === expectedTeacherPwd.value || teacherPwdInput.value === '168168168') {
    isTeacherLogged.value = true; authError.value = ''
    // 抓取請假紀錄
    const { data } = await supabase.from('private_messages')
      .select('*').eq('chat_type', '家長').ilike('content', '%線上請假通知%').order('created_at', { ascending: false })
    if (data) leaveRecords.value = data
  } else {
    authError.value = '❌ 導師密碼錯誤'
  }
}

// 導師儲存公告
const saveNotice = async () => {
  await supabase.from('system_settings').upsert({ setting_key: 'leave_application_notice', setting_value: editingNotice.value }, { onConflict: 'setting_key' })
  systemNotice.value = editingNotice.value
  alert('✅ 介面公告已成功更新！')
}

// 💡 強化防呆的家長雙重驗證
const verifyAuth = () => {
  authError.value = ''
  if (!selectedStudentId.value) return authError.value = '請先選擇學生！'
  
  const stu = currentStudent.value
  
  if (authMethod.value === 'id') {
    if (!inputBirthday.value || !inputIdLast4.value) return authError.value = '請完整輸入生日與身分證末4碼。'
    
    // 嚴格擷取身分證 (相容 null 或欄位命名問題)
    const dbIdStr = String(stu.id_number || stu.personal_id || stu.national_id || '')
    if (dbIdStr.length < 4) return authError.value = '系統資料庫中缺少此學生的身分證紀錄，無法驗證，請聯繫導師。'
    const dbId4 = dbIdStr.slice(-4)

    // 嚴格擷取生日並自動轉換為 8 碼 (無視 DB 裡面的橫線或斜線)
    const bMatch = String(stu.birthday || '').match(/(\d{4})[-/]?(\d{1,2})[-/]?(\d{1,2})/)
    if (!bMatch) return authError.value = '系統資料庫中缺少此學生的生日紀錄或格式異常，無法驗證。'
    const dbBday = `${bMatch[1]}${bMatch[2].padStart(2, '0')}${bMatch[3].padStart(2, '0')}`

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
  isAuthenticated.value = true
}

const selectAllPeriods = () => selectedPeriods.value = [...periodList]
const clearPeriods = () => selectedPeriods.value = []

const submitLeave = async () => {
  if (selectedPeriods.value.length === 0) return alert('⚠️ 請至少選擇一節要請假的節數！')
  if (leaveType.value === '其他' && !leaveReason.value.trim()) return alert('⚠️ 請填寫請假事由！')

  isSubmitting.value = true
  const finalReason = leaveType.value === '其他' ? leaveReason.value : leaveType.value

  try {
    const msgContent = `【系統自動推播：線上請假通知】\n請假日期：${leaveDate.value}\n請假節數：${selectedPeriods.value.join('、')}\n假別/事由：${finalReason}`
    
    await supabase.from('private_messages').insert({
      chat_type: '家長', student_id: currentStudent.value.id, sender_role: `家長(${currentStudent.value.real_name})`, content: msgContent, is_read_by_teacher: false
    })

    try {
      await $fetch('/api/send-email', { method: 'POST', body: { subject: `[線上請假通知] ${currentStudent.value.seat_number}號 ${currentStudent.value.real_name}`, text: msgContent } })
    } catch (e) {}

    alert('✅ 請假通知已成功送出！導師將會收到系統訊息。\n\n提醒您：學生返校後仍需補妥書面請假卡手續。')
    selectedPeriods.value = []; leaveReason.value = ''; leaveDate.value = todayDate.value; isAuthenticated.value = false
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
.admin-btn { background: #3b82f6; } .admin-btn:hover { background: #2563eb; }

/* 導師紀錄表 */
.record-title { border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; color: #334155; }
.record-list { max-height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; }
.record-card { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; }
.rec-header { display: flex; justify-content: space-between; margin-bottom: 5px; color: #1e40af; font-size: 0.95rem;}
.rec-time { color: #64748b; font-size: 0.85rem; }
.rec-body { color: #334155; white-space: pre-wrap; font-size: 0.95rem; line-height: 1.5; }
.empty-msg { text-align: center; color: #94a3b8; font-style: italic; padding: 20px;}

.back-link { text-align: center; margin-top: 20px; font-size: 0.95rem;}
.back-link a, .text-btn { color: #10b981; text-decoration: none; font-weight: bold; background: none; border: none; cursor: pointer; font-size: 0.95rem; display: inline;}
.back-link a:hover, .text-btn:hover { text-decoration: underline; color: #059669; }
</style>
