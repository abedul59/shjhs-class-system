<template>
  <div class="discipline-page">
    <header class="page-header">
      <h2>⚖️ 班級秩序與違規管理系統</h2>
      <div class="header-right">
        <span class="role-badge">目前身分：{{ userRole }}</span>
        <button @click="logout" class="btn-logout">登出返回</button>
      </div>
    </header>

    <div class="main-content">
      
      <!-- ================= 左側：登記違規 ================= -->
      <div class="left-col">
        <div class="card form-card">
          <h3>📝 登記違規行為</h3>
          <div class="form-group">
            <label>👩‍🎓 選擇學生：</label>
            <select v-model="form.studentId">
              <option disabled value="">請選擇學生...</option>
              <option v-for="s in students" :key="s.id" :value="s.id">
                {{ s.seat_number }}號 - {{ s.real_name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>⚠️ 違規項目：</label>
            <select v-model="form.violationName">
              <option disabled value="">請選擇違規項目...</option>
              <option v-for="v in violationTypes" :key="v.id" :value="v.name">
                {{ v.name }}
              </option>
            </select>
          </div>

          <button @click="submitRecord" class="btn-submit" :disabled="!form.studentId || !form.violationName || isSubmitting">
            {{ isSubmitting ? '登記中...' : '送出登記' }}
          </button>
        </div>

        <!-- 導師專屬：管理違規種類 -->
        <div v-if="userRole === '導師'" class="card manage-card">
          <h3>⚙️ 管理違規種類 (僅導師可見)</h3>
          <div class="add-type">
            <input v-model="newTypeName" type="text" placeholder="輸入新違規項目名稱...">
            <button @click="addViolationType" class="btn-add">新增</button>
          </div>
          <ul class="type-list">
            <li v-for="v in violationTypes" :key="v.id">
              <span>{{ v.name }}</span>
              <button @click="deleteViolationType(v.id)" class="btn-del-type">刪除</button>
            </li>
          </ul>
        </div>
      </div>

      <!-- ================= 右側：違規統計與紀錄 ================= -->
      <div class="right-col">
        <div class="card history-card">
          <h3>📊 違規次數統計與紀錄</h3>
          
          <div v-if="groupedRecords.length === 0" class="empty-state">
            目前班上表現優良，尚無違規紀錄！🎉
          </div>
          
          <div class="table-container" v-else>
            <table class="history-table">
              <thead>
                <tr>
                  <th>座號姓名</th>
                  <th>違規項目 (累計次數)</th>
                  <th>詳細發生時間</th>
                  <th>登記人</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="group in groupedRecords" :key="group.student_id + group.violation_name">
                  <td class="student-cell">
                    <span class="seat">{{ getStudentSeat(group.student_id) }}</span>
                    {{ getStudentName(group.student_id) }}
                  </td>
                  <td class="violation-cell">
                    {{ group.violation_name }} 
                    <span class="count-badge">共 {{ group.records.length }} 次</span>
                  </td>
                  <td class="time-cell">
                    <ul class="time-list">
                      <li v-for="rec in group.records" :key="rec.id">
                        {{ formatTime(rec.created_at) }}
                      </li>
                    </ul>
                  </td>
                  <td>{{ group.records[0].recorded_by }}</td>
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
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()

const userRole = ref('')
const students = ref([])
const violationTypes = ref([])
const disciplineRecords = ref([])

const form = ref({ studentId: '', violationName: '' })
const newTypeName = ref('')
const isSubmitting = ref(false)

// 進入頁面時檢查權限與抓取資料
onMounted(async () => {
  const role = sessionStorage.getItem('discipline_role')
  if (!role) {
    alert("請先登入！")
    return navigateTo('/')
  }
  userRole.value = role

  await Promise.all([
    fetchStudents(),
    fetchViolationTypes(),
    fetchRecords()
  ])
})

const logout = () => {
  sessionStorage.removeItem('discipline_role')
  navigateTo('/')
}

const fetchStudents = async () => {
  const { data } = await supabase.from('students').select('*').order('seat_number')
  if (data) students.value = data
}

const fetchViolationTypes = async () => {
  const { data } = await supabase.from('violation_types').select('*').order('created_at')
  if (data) violationTypes.value = data
}

const fetchRecords = async () => {
  const { data } = await supabase.from('discipline_records').select('*').order('created_at', { ascending: false })
  if (data) disciplineRecords.value = data
}

// 提交違規紀錄
const submitRecord = async () => {
  isSubmitting.value = true
  try {
    const { error } = await supabase.from('discipline_records').insert({
      student_id: form.value.studentId,
      violation_name: form.value.violationName,
      recorded_by: userRole.value
    })
    
    if (error) throw error
    alert('✅ 違規登記成功！')
    
    // 清空表單並重新抓取紀錄
    form.value.studentId = ''
    form.value.violationName = ''
    await fetchRecords()
  } catch (error) {
    alert('❌ 登記失敗：' + error.message)
  } finally {
    isSubmitting.value = false
  }
}

// --- 導師專屬管理功能 ---
const addViolationType = async () => {
  if (!newTypeName.value.trim()) return
  const { error } = await supabase.from('violation_types').insert({ name: newTypeName.value.trim() })
  if (!error) {
    newTypeName.value = ''
    await fetchViolationTypes()
  } else {
    alert('新增失敗：' + error.message)
  }
}

const deleteViolationType = async (id) => {
  if (confirm("確定要刪除這個違規項目嗎？")) {
    const { error } = await supabase.from('violation_types').delete().eq('id', id)
    if (!error) await fetchViolationTypes()
  }
}

// --- 報表轉換與格式化 ---
const getStudentName = (id) => students.value.find(s => s.id === id)?.real_name || '未知'
const getStudentSeat = (id) => students.value.find(s => s.id === id)?.seat_number || '?'

const formatTime = (isoString) => {
  const date = new Date(isoString)
  return `${date.getMonth()+1}/${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
}

// 將平坦的紀錄陣列，根據「學生」與「違規項目」分組統計次數
const groupedRecords = computed(() => {
  const groups = {}
  disciplineRecords.value.forEach(record => {
    const key = `${record.student_id}_${record.violation_name}`
    if (!groups[key]) {
      groups[key] = {
        student_id: record.student_id,
        violation_name: record.violation_name,
        records: []
      }
    }
    groups[key].records.push(record)
  })
  
  // 轉為陣列並依照座號排序
  return Object.values(groups).sort((a, b) => {
    return getStudentSeat(a.student_id) - getStudentSeat(b.student_id)
  })
})
</script>

<style scoped>
.discipline-page {
  min-height: 100vh;
  background-color: #f1f5f9;
  padding: 20px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1e293b;
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.page-header h2 { margin: 0; }
.header-right { display: flex; align-items: center; gap: 15px; }
.role-badge { background: #3b82f6; padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9rem;}
.btn-logout { background: #ef4444; color: white; border: none; padding: 6px 15px; border-radius: 6px; cursor: pointer; font-weight: bold;}

.main-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.left-col { flex: 1; display: flex; flex-direction: column; gap: 20px; min-width: 350px;}
.right-col { flex: 2; }

.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
}
.card h3 { margin-top: 0; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;}

.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #475569; }
select, input[type="text"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 1rem;
}
.btn-submit { width: 100%; background: #10b981; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 1.05rem; margin-top: 10px;}
.btn-submit:disabled { background: #9ca3af; cursor: not-allowed; }

.manage-card .add-type { display: flex; gap: 10px; margin-bottom: 15px; }
.btn-add { background: #3b82f6; color: white; border: none; padding: 0 15px; border-radius: 6px; cursor: pointer; font-weight: bold;}
.type-list { list-style: none; padding: 0; margin: 0; }
.type-list li { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 8px; border-radius: 6px;}
.btn-del-type { background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;}

.empty-state { text-align: center; padding: 40px; color: #10b981; font-weight: bold; font-size: 1.2rem; background: #ecfdf5; border-radius: 8px; }

.table-container { overflow-x: auto; }
.history-table { width: 100%; border-collapse: collapse; text-align: left; }
.history-table th { background: #f1f5f9; padding: 12px; font-weight: bold; color: #475569; border-bottom: 2px solid #cbd5e1; }
.history-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top;}
.student-cell { font-weight: bold; color: #1e293b; }
.seat { background: #cbd5e1; padding: 2px 8px; border-radius: 12px; font-size: 0.85rem; margin-right: 5px;}
.violation-cell { color: #b91c1c; font-weight: bold; }
.count-badge { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-size: 0.85rem; margin-left: 8px; }
.time-list { margin: 0; padding-left: 15px; font-size: 0.9rem; color: #64748b;}

@media (max-width: 1024px) {
  .main-content { flex-direction: column; }
  .left-col { width: 100%; }
}
</style>
