<template>
  <div class="discipline-page">
    <!-- ================= 登入介面 ================= -->
    <div v-if="!isLoggedIn" class="login-container">
      <div class="login-card">
        <h2 class="title">🚨 秩序管理系統</h2>
        <p class="subtitle">請選擇您的身分並輸入對應密碼</p>
        
        <div class="form-group">
          <label>登入身分：</label>
          <select v-model="loginForm.role" class="form-control">
            <option value="discipline">風紀股長</option>
            <option value="subject_teacher">任課老師</option>
            <option value="teacher">導師 (最高權限)</option>
          </select>
        </div>

        <!-- 💡 若選擇任課老師，動態顯示科目輸入框 (沿用作業管理的邏輯) -->
        <div v-if="loginForm.role === 'subject_teacher'" class="form-group">
          <label>任課科目 (必填)：</label>
          <input v-model="loginForm.subject" type="text" placeholder="例如：國文、英文、理化..." class="form-control" />
        </div>

        <div class="form-group">
          <label>登入密碼：</label>
          <input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="請輸入密碼" 
            class="form-control" 
            @keyup.enter="handleLogin" 
          />
        </div>

        <button @click="handleLogin" class="btn-submit" :disabled="isLoggingIn">
          {{ isLoggingIn ? '驗證中...' : '登入系統' }}
        </button>
        
        <div class="back-link">
          <NuxtLink to="/">⬅️ 返回首頁</NuxtLink>
        </div>
      </div>
    </div>

    <!-- ================= 主操作介面 ================= -->
    <div v-else class="main-container">
      <header class="page-header">
        <div class="header-left">
          <h2>📋 班級秩序與違規登記</h2>
          <span class="role-badge">
            目前身分：{{ displayRoleName }}
          </span>
        </div>
        <div class="header-right">
          <button @click="handleLogout" class="btn-logout">登出</button>
          <NuxtLink to="/" class="btn-home">回首頁</NuxtLink>
        </div>
      </header>

      <div class="content-grid">
        <!-- 左側：登記違規表單 -->
        <div class="card form-card">
          <h3>➕ 新增違規紀錄</h3>
          
          <div class="form-group">
            <label>違規學生：</label>
            <select v-model="recordForm.student_id" class="form-control">
              <option value="" disabled>請選擇學生...</option>
              <option v-for="student in studentList" :key="student.id" :value="student.id">
                {{ student.number }}號 - {{ student.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>違規事由：</label>
            <select v-model="recordForm.reason" class="form-control">
              <option value="" disabled>請選擇事由...</option>
              <option value="上課吵鬧">上課吵鬧</option>
              <option value="未帶學用品">未帶學用品</option>
              <option value="睡覺/不專心">睡覺 / 不專心</option>
              <option value="遲到/早退">遲到 / 早退</option>
              <option value="服裝儀容違規">服裝儀容違規</option>
              <option value="其他">其他 (請在備註說明)</option>
            </select>
          </div>

          <div class="form-group">
            <label>備註說明 (選填)：</label>
            <textarea v-model="recordForm.note" rows="3" class="form-control" placeholder="輸入詳細情況..."></textarea>
          </div>

          <button @click="submitRecord" class="btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? '儲存中...' : '💾 登記違規' }}
          </button>
        </div>

        <!-- 右側：近期紀錄與統計表 -->
        <div class="card table-card">
          <h3>📊 近期違規紀錄</h3>
          
          <div v-if="isLoadingData" class="loading-text">資料載入中...</div>
          
          <div v-else class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>日期時間</th>
                  <th>座號姓名</th>
                  <th>違規事由</th>
                  <th>登記人</th>
                  <th v-if="currentUser.role === 'teacher'">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in recentRecords" :key="record.id">
                  <td class="time-col">{{ formatTime(record.created_at) }}</td>
                  <td>{{ record.students?.number }}號 {{ record.students?.name }}</td>
                  <td>
                    <span class="reason-tag">{{ record.reason }}</span>
                    <div class="note-text" v-if="record.note">{{ record.note }}</div>
                  </td>
                  <td>{{ record.recorded_by }}</td>
                  <td v-if="currentUser.role === 'teacher'">
                    <button @click="deleteRecord(record.id)" class="btn-sm-delete">刪除</button>
                  </td>
                </tr>
                <tr v-if="recentRecords.length === 0">
                  <td colspan="5" class="empty-state">尚無任何違規紀錄</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
const supabase = useSupabaseClient()

// 登入狀態與資料
const isLoggedIn = ref(false)
const isLoggingIn = ref(false)
const loginForm = ref({ role: 'discipline', subject: '', password: '' })
const currentUser = ref({ role: '', subject: '' })

// 業務資料
const studentList = ref([])
const recentRecords = ref([])
const isLoadingData = ref(false)
const isSubmitting = ref(false)

const recordForm = ref({
  student_id: '',
  reason: '',
  note: ''
})

// 計算顯示的身分名稱
const displayRoleName = computed(() => {
  if (currentUser.value.role === 'teacher') return '導師'
  if (currentUser.value.role === 'subject_teacher') return `任課老師 (${currentUser.value.subject})`
  return '風紀股長'
})

// 初始化檢查登入狀態
onMounted(() => {
  const savedRole = sessionStorage.getItem('discipline_role')
  const savedSubject = sessionStorage.getItem('discipline_subject')
  
  if (savedRole) {
    currentUser.value.role = savedRole
    currentUser.value.subject = savedSubject || ''
    isLoggedIn.value = true
    fetchInitialData()
  }
})

// 處理登入驗證
const handleLogin = async () => {
  if (!loginForm.value.password) {
    alert('請輸入密碼！')
    return
  }
  if (loginForm.value.role === 'subject_teacher' && !loginForm.value.subject.trim()) {
    alert('任課老師請務必填寫「任課科目」！')
    return
  }

  isLoggingIn.value = true
  try {
    // 從資料庫撈取設定的密碼
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'board_officer_passwords')
      .maybeSingle()

    if (error) throw error

    const passwords = data?.setting_value || {}
    const correctPassword = passwords[loginForm.value.role]

    if (!correctPassword) {
      alert(`後台尚未設定此身分(${loginForm.value.role})的密碼，請通知導師！`)
      return
    }

    if (loginForm.value.password === correctPassword) {
      // 登入成功，寫入 sessionStorage
      sessionStorage.setItem('discipline_role', loginForm.value.role)
      if (loginForm.value.role === 'subject_teacher') {
        sessionStorage.setItem('discipline_subject', loginForm.value.subject.trim())
      }
      
      currentUser.value.role = loginForm.value.role
      currentUser.value.subject = loginForm.value.subject.trim()
      isLoggedIn.value = true
      
      // 清空表單並載入資料
      loginForm.value.password = ''
      await fetchInitialData()
    } else {
      alert('密碼錯誤，請重新輸入！')
    }
  } catch (error) {
    console.error('登入驗證發生錯誤:', error)
    alert('系統驗證失敗，請稍後再試。')
  } finally {
    isLoggingIn.value = false
  }
}

// 登出
const handleLogout = () => {
  sessionStorage.removeItem('discipline_role')
  sessionStorage.removeItem('discipline_subject')
  isLoggedIn.value = false
}

// 載入初始資料 (學生名單與近期紀錄)
const fetchInitialData = async () => {
  isLoadingData.value = true
  try {
    // 1. 抓取學生名單 (假設您有 students 資料表)
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, name, number')
      .order('number', { ascending: true })
    
    if (studentsData) studentList.value = studentsData

    // 2. 抓取近期違規紀錄 (假設您有 discipline_records 資料表)
    await fetchRecords()
  } catch (error) {
    console.error('載入資料錯誤:', error)
  } finally {
    isLoadingData.value = false
  }
}

const fetchRecords = async () => {
  const { data: recordsData } = await supabase
    .from('discipline_records')
    .select(`
      id, reason, note, recorded_by, created_at,
      students (number, name)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  if (recordsData) recentRecords.value = recordsData
}

// 提交違規紀錄
const submitRecord = async () => {
  if (!recordForm.value.student_id || !recordForm.value.reason) {
    alert('請確實選擇「違規學生」與「違規事由」！')
    return
  }

  isSubmitting.value = true
  try {
    const { error } = await supabase
      .from('discipline_records')
      .insert({
        student_id: recordForm.value.student_id,
        reason: recordForm.value.reason,
        note: recordForm.value.note,
        // 紀錄是由誰登記的 (例如：風紀股長、導師、任課老師-國文)
        recorded_by: displayRoleName.value
      })

    if (error) throw error

    alert('✅ 違規紀錄已成功儲存！')
    
    // 清空表單並重新載入列表
    recordForm.value.student_id = ''
    recordForm.value.reason = ''
    recordForm.value.note = ''
    await fetchRecords()
  } catch (error) {
    console.error('儲存紀錄錯誤:', error)
    alert('儲存失敗，請檢查網路連線。')
  } finally {
    isSubmitting.value = false
  }
}

// 刪除紀錄 (僅限導師)
const deleteRecord = async (id) => {
  if (confirm('確定要刪除這筆紀錄嗎？這項操作無法復原。')) {
    const { error } = await supabase.from('discipline_records').delete().eq('id', id)
    if (!error) {
      await fetchRecords()
    } else {
      alert('刪除失敗！')
    }
  }
}

// 格式化時間
const formatTime = (isoString) => {
  const date = new Date(isoString)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
/* =========== 基礎設定 =========== */
.discipline-page {
  min-height: 100vh;
  background-color: #f8fafc;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  padding: 20px;
}

/* =========== 登入卡片 =========== */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}
.login-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  width: 100%;
  max-width: 400px;
}
.title { text-align: center; color: #1e293b; margin-bottom: 5px; }
.subtitle { text-align: center; color: #64748b; margin-bottom: 25px; font-size: 0.95rem; }

/* =========== 共用表單元件 =========== */
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #475569; }
.form-control {
  width: 100%;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
}
.form-control:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

/* =========== 按鈕設計 =========== */
.btn-submit, .btn-primary {
  width: 100%;
  padding: 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn-submit:hover, .btn-primary:hover { background-color: #2563eb; }
.btn-submit:disabled, .btn-primary:disabled { background-color: #94a3b8; cursor: not-allowed; }

.back-link { text-align: center; margin-top: 20px; }
.back-link a { color: #64748b; text-decoration: none; font-weight: bold; }

/* =========== 主畫面佈局 =========== */
.main-container { max-width: 1200px; margin: 0 auto; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1e293b;
  color: white;
  padding: 20px 30px;
  border-radius: 12px;
  margin-bottom: 25px;
}
.header-left h2 { margin: 0 0 5px 0; }
.role-badge { background: #3b82f6; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }

.header-right { display: flex; gap: 10px; }
.btn-logout { background: transparent; border: 1px solid #94a3b8; color: white; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.btn-home { background: #475569; color: white; text-decoration: none; padding: 8px 15px; border-radius: 6px; }
.btn-logout:hover, .btn-home:hover { background: #64748b; }

.content-grid {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 25px;
}

@media (max-width: 850px) {
  .content-grid { grid-template-columns: 1fr; }
}

.card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
}
.card h3 { margin-top: 0; color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 20px; }

/* =========== 表格樣式 =========== */
.table-responsive { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { background: #f8fafc; padding: 12px; text-align: left; color: #475569; border-bottom: 2px solid #e2e8f0; }
.data-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
.time-col { color: #64748b; font-size: 0.9rem; }
.reason-tag { display: inline-block; background: #fee2e2; color: #b91c1c; padding: 4px 8px; border-radius: 4px; font-size: 0.9rem; font-weight: bold; }
.note-text { font-size: 0.85rem; color: #64748b; margin-top: 6px; }
.empty-state { text-align: center; padding: 30px !important; color: #94a3b8; }

.btn-sm-delete { background: #fee2e2; color: #b91c1c; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-sm-delete:hover { background: #fecaca; }
.loading-text { text-align: center; padding: 40px; color: #64748b; }
</style>
