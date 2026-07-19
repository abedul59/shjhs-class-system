<template>
  <div class="assign-container">
    <!-- 鎖定畫面：雙密碼支援 (科任老師 或 小老師) -->
    <div v-if="!isUnlocked" class="lock-screen">
      <div class="lock-box">
        <h2>📚 各科作業登記系統</h2>
        <select v-model="selectedSubject" class="subject-select">
          <option value="" disabled selected>請選擇科目...</option>
          <option v-for="t in teachersList" :key="t.id" :value="t.subject_name">{{ t.subject_name }}</option>
        </select>
        <input v-model="passwordInput" type="password" placeholder="請輸入老師或小老師密碼..." @keyup.enter="verifyPassword"/>
        <button @click="verifyPassword" :disabled="!selectedSubject">解鎖進入</button>
        <NuxtLink to="/" class="back-link">返回首頁</NuxtLink>
      </div>
    </div>

    <!-- 作業專屬後台 -->
    <div v-else class="dashboard">
      <header class="assign-header">
        <div class="header-title">
          <h2>🧑‍🏫 {{ selectedSubject }} 專屬作業中心</h2>
          <span :class="['role-badge', activeRole === '科任老師' ? 'teacher-badge' : 'assistant-badge']">
            目前身分：{{ activeRole }}
          </span>
        </div>
        <NuxtLink to="/" class="back-btn">⬅️ 登出返回</NuxtLink>
      </header>

      <div class="main-layout">
        <!-- 左側：作業清單與新增作業 -->
        <div class="left-panel data-panel">
          <h3>📝 新增作業項目</h3>
          <div class="add-form">
            <input v-model="newAssignment.title" type="text" placeholder="作業名稱 (例：數學習作 P.10-12)" class="edit-input" />
            <input v-model="newAssignment.deadline" type="date" class="edit-input" />
            <button @click="addAssignment" class="submit-btn" :disabled="!newAssignment.title">➕ 新增作業</button>
          </div>

          <hr class="divider"/>

          <h3>📋 {{ selectedSubject }} 的作業清單</h3>
          <div class="assignment-list">
            <div v-if="assignments.length === 0" class="empty">目前尚無作業項目</div>
            <div v-for="assign in assignments" :key="assign.id" 
                 :class="['assign-item', { active: currentAssignment?.id === assign.id }]"
                 @click="selectAssignment(assign)">
              <div class="assign-info">
                <strong>{{ assign.title }}</strong>
                <span class="deadline">期限: {{ assign.deadline || '無' }}</span>
              </div>
              <button @click.stop="deleteAssignment(assign.id, assign.title)" class="del-btn">🗑️</button>
            </div>
          </div>
        </div>

        <!-- 右側：座號登記表 -->
        <div class="right-panel data-panel">
          <div v-if="!currentAssignment" class="empty-prompt">
            👈 請從左側選擇或新增一項作業，開始登記繳交狀況。
          </div>
          <div v-else>
            <div class="grid-header">
              <h3>批閱項目：{{ currentAssignment.title }}</h3>
              <div class="stats">
                <span class="submitted-stat">已交：{{ currentSubmissions.length }} 人</span>
                <span class="missing-stat">缺交：{{ students.length - currentSubmissions.length }} 人</span>
              </div>
            </div>
            <p class="help-text">💡 點擊學生方塊可切換狀態，所有變更皆會記錄於資料庫稽核系統中。</p>
            
            <div class="seat-grid">
              <div v-for="student in students" :key="student.id"
                   :class="['seat-btn', isSubmitted(student.id) ? 'is-submitted' : 'is-missing']"
                   @click="toggleSubmission(student.id, student.seat_number, student.real_name)">
                <span class="seat-num">{{ student.seat_number }}</span>
                <span class="stu-name">{{ student.real_name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
const supabase = useSupabaseClient()

const teachersList = ref([]); const selectedSubject = ref(''); const passwordInput = ref('')
const isUnlocked = ref(false); const activeRole = ref('') // 紀錄是老師還是小老師

const students = ref([]); const assignments = ref([]); const allSubmissions = ref([])
const currentAssignment = ref(null)
const newAssignment = ref({ title: '', deadline: '' })

// === 嚴格紀錄到資料庫的稽核功能 ===
const logAction = async (actionType, details) => {
  await supabase.from('assignment_audit_logs').insert({
    subject_name: selectedSubject.value,
    action_type: actionType,
    operator_role: activeRole.value,
    details: details
  })
}

// 載入老師清單
const fetchTeachers = async () => {
  const { data } = await supabase.from('subject_teachers').select('*').order('subject_name')
  if (data) teachersList.value = data
}

// 雙重密碼驗證
const verifyPassword = async () => {
  if (!selectedSubject.value || !passwordInput.value) return
  const teacherInfo = teachersList.value.find(t => t.subject_name === selectedSubject.value)
  
  if (teacherInfo && passwordInput.value === teacherInfo.password) {
    activeRole.value = '科任老師'
    isUnlocked.value = true; await fetchDashboardData(); logAction('系統登入', '科任老師登入成功')
  } else if (teacherInfo && teacherInfo.assistant_password && passwordInput.value === teacherInfo.assistant_password) {
    activeRole.value = '小老師'
    isUnlocked.value = true; await fetchDashboardData(); logAction('系統登入', '小老師登入成功')
  } else {
    alert('❌ 密碼錯誤！'); passwordInput.value = ''
  }
}

const fetchDashboardData = async () => {
  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  if (sData) students.value = sData

  const { data: aData } = await supabase.from('assignments').select('*').eq('subject_name', selectedSubject.value).order('created_at', { ascending: false })
  if (aData) assignments.value = aData

  const { data: subData } = await supabase.from('assignment_submissions').select('*')
  if (subData) allSubmissions.value = subData
}

// === 作業操作與稽核 ===
const addAssignment = async () => {
  if (!newAssignment.value.title) return
  const { data, error } = await supabase.from('assignments').insert({
    subject_name: selectedSubject.value, title: newAssignment.value.title, deadline: newAssignment.value.deadline || null
  }).select().single()
  if (!error && data) { 
    assignments.value.unshift(data)
    logAction('新增作業', `新增了項目：${newAssignment.value.title}`)
    newAssignment.value = { title: '', deadline: '' } 
  }
}

const deleteAssignment = async (id, title) => {
  if (!window.confirm(`⚠️ 確定刪除【${title}】？(相關的繳交紀錄也會一併刪除)`)) return
  await supabase.from('assignments').delete().eq('id', id)
  assignments.value = assignments.value.filter(a => a.id !== id)
  if (currentAssignment.value?.id === id) currentAssignment.value = null
  logAction('刪除作業', `刪除了項目：${title}`)
}

const selectAssignment = (assign) => { currentAssignment.value = assign }

// === 繳交狀態切換與稽核 ===
const currentSubmissions = computed(() => {
  if (!currentAssignment.value) return []
  return allSubmissions.value.filter(sub => sub.assignment_id === currentAssignment.value.id)
})

const isSubmitted = (studentId) => currentSubmissions.value.some(sub => sub.student_id === studentId)

const toggleSubmission = async (studentId, seatNumber, realName) => {
  if (!currentAssignment.value) return
  const submitted = isSubmitted(studentId)
  
  if (submitted) {
    // 變更為缺交
    await supabase.from('assignment_submissions').delete().eq('assignment_id', currentAssignment.value.id).eq('student_id', studentId)
    allSubmissions.value = allSubmissions.value.filter(sub => !(sub.assignment_id === currentAssignment.value.id && sub.student_id === studentId))
    logAction('變更繳交狀態', `將 ${seatNumber}號 ${realName} 的【${currentAssignment.value.title}】狀態改為：❌ 缺交`)
  } else {
    // 變更為已交
    const { data } = await supabase.from('assignment_submissions').insert({ assignment_id: currentAssignment.value.id, student_id: studentId }).select().single()
    if (data) allSubmissions.value.push(data)
    logAction('變更繳交狀態', `將 ${seatNumber}號 ${realName} 的【${currentAssignment.value.title}】狀態改為：✅ 已交`)
  }
}

onMounted(() => fetchTeachers())
</script>

<style scoped>
/* 包含您的介面樣式 */
.assign-container { min-height: 100vh; background-color: #f1f5f9; font-family: sans-serif; }
.lock-screen { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #3b0764; }
.lock-box { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 400px; }
.lock-box h2 { color: #581c87; margin-bottom: 20px; }
.subject-select, .lock-box input { width: 100%; padding: 12px; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.1rem; box-sizing: border-box; }
.lock-box button { width: 100%; padding: 12px; background-color: #7e22ce; color: white; border: none; border-radius: 6px; font-size: 1.1rem; cursor: pointer; font-weight: bold; }
.lock-box button:disabled { background: #d8b4fe; cursor: not-allowed; }
.back-link { display: block; margin-top: 15px; color: #64748b; text-decoration: none; }

.dashboard { max-width: 1300px; margin: 0 auto; padding: 20px; }
.assign-header { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px 25px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px; }
.header-title { display: flex; align-items: center; gap: 15px; }
.assign-header h2 { margin: 0; color: #4c1d95; }
.role-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.9rem; font-weight: bold; }
.teacher-badge { background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
.assistant-badge { background-color: #fef08a; color: #854d0e; border: 1px solid #fde047; }
.back-btn { text-decoration: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; background: #ef4444; color: white; }

.main-layout { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
.data-panel { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.left-panel { flex: 1; min-width: 300px; }
.right-panel { flex: 2; min-width: 600px; }

h3 { color: #334155; margin-top: 0; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
.edit-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 10px; box-sizing: border-box; }
.submit-btn { background: #10b981; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; width: 100%; cursor: pointer; }
.submit-btn:disabled { background: #9ca3af; cursor: not-allowed; }
.divider { border: 0; border-top: 2px dashed #cbd5e1; margin: 20px 0; }

.assignment-list { display: flex; flex-direction: column; gap: 10px; max-height: 500px; overflow-y: auto; }
.assign-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: 0.2s; }
.assign-item:hover { border-color: #8b5cf6; }
.assign-item.active { background: #f3e8ff; border-color: #9333ea; box-shadow: 0 0 0 2px rgba(147, 51, 234, 0.2); }
.assign-info { display: flex; flex-direction: column; gap: 5px; }
.deadline { font-size: 0.85rem; color: #64748b; }
.del-btn { background: transparent; border: none; cursor: pointer; font-size: 1.2rem; opacity: 0.5; }
.del-btn:hover { opacity: 1; }

.empty-prompt { text-align: center; padding: 50px; color: #64748b; font-size: 1.2rem; background: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1; }
.grid-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.stats { font-weight: bold; display: flex; gap: 15px; }
.submitted-stat { color: #16a34a; } .missing-stat { color: #dc2626; }
.help-text { font-size: 0.9rem; color: #64748b; margin-bottom: 20px; }

/* 神奇的座號方格表 */
.seat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 10px; }
.seat-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 15px 5px; border-radius: 8px; cursor: pointer; border: 2px solid transparent; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: 0.1s transform; user-select: none; }
.seat-btn:active { transform: scale(0.95); }
.seat-num { font-size: 1.3rem; font-weight: bold; margin-bottom: 5px; }
.stu-name { font-size: 0.95rem; font-weight: bold; }

.is-submitted { background: #dcfce7; border-color: #22c55e; color: #166534; }
.is-missing { background: #fee2e2; border-color: #ef4444; color: #991b1b; }

@media (max-width: 1024px) { .right-panel { min-width: 100%; } }
</style>
