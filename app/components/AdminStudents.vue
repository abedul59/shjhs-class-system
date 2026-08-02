<template>
  <div>
    <div class="table-header">
      <h3>👩‍🎓 學生名單與資料維護</h3>
      <div class="export-actions">
        <!-- 💡 新增：新增資料按鈕 -->
        <button @click="addNewStudent" class="export-btn add-btn">➕ 新增資料</button>
        <button @click="exportStudents('json')" class="export-btn json-btn">📥 匯出 JSON</button>
        <button @click="exportStudents('csv')" class="export-btn">📤 匯出 CSV</button>
      </div>
    </div>
    
    <div class="import-section">
      <div class="import-controls">
        <input type="file" accept=".json, .csv" @change="handleFileUpload" ref="fileInput" />
        <button @click="processImport" class="import-btn" :disabled="!selectedFile || isImporting">🚀 執行匯入</button>
      </div>
    </div>

    <div class="table-responsive">
      <table class="student-edit-table">
        <thead>
          <tr>
            <th width="50">座號</th>
            <th width="80">姓名</th>
            <th width="80">隱藏名</th>
            <th width="100">生日</th>
            <th width="70">後5碼</th>
            <th width="70">稱謂1</th>
            <th width="110">電話1</th>
            <th width="150">信箱1</th>
            <th width="70">稱謂2</th>
            <th width="110">電話2</th>
            <th width="150">信箱2</th>
            <th width="70">稱謂3</th>
            <th width="110">電話3</th>
            <th width="150">信箱3</th>
            <th width="150" class="text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(student, index) in adminStudents" :key="student.id || 'new-'+index">
            
            <!-- 座號 -->
            <td>
              <input v-if="student.isEditing" type="number" v-model="student.seat_number" class="edit-input num-input"/>
              <span v-else>{{ student.seat_number }}</span>
            </td>
            
            <!-- 姓名 -->
            <td>
              <input v-if="student.isEditing" type="text" v-model="student.real_name" class="edit-input"/>
              <span v-else>{{ student.real_name }}</span>
            </td>
            
            <!-- 隱藏名 -->
            <td>
              <input v-if="student.isEditing" type="text" v-model="student.hidden_name" class="edit-input"/>
              <span v-else>{{ student.hidden_name }}</span>
            </td>
            
            <!-- 生日 -->
            <td>
              <input v-if="student.isEditing" type="text" v-model="student.birthday" class="edit-input" placeholder="YYYYMMDD"/>
              <span v-else>{{ student.birthday }}</span>
            </td>
            
            <!-- 後四/五碼 -->
            <td>
              <input v-if="student.isEditing" type="text" v-model="student.id_last_5" maxlength="5" class="edit-input"/>
              <span v-else>{{ student.id_last_5 }}</span>
            </td>
            
            <!-- 聯絡人 1 -->
            <td>
              <input v-if="student.isEditing" type="text" v-model="student.p1_rel" class="edit-input small-input" placeholder="關係"/>
              <span v-else>{{ student.p1_rel }}</span>
            </td>
            <td>
              <input v-if="student.isEditing" type="tel" v-model="student.p1_tel" class="edit-input small-input" placeholder="電話"/>
              <span v-else>{{ student.p1_tel }}</span>
            </td>
            <td>
              <input v-if="student.isEditing" type="email" v-model="student.p1_mail" class="edit-input email-input" placeholder="信箱"/>
              <span v-else class="text-sm">{{ student.p1_mail }}</span>
            </td>
            
            <!-- 聯絡人 2 -->
            <td>
              <input v-if="student.isEditing" type="text" v-model="student.p2_rel" class="edit-input small-input" placeholder="關係"/>
              <span v-else>{{ student.p2_rel }}</span>
            </td>
            <td>
              <input v-if="student.isEditing" type="tel" v-model="student.p2_tel" class="edit-input small-input" placeholder="電話"/>
              <span v-else>{{ student.p2_tel }}</span>
            </td>
            <td>
              <input v-if="student.isEditing" type="email" v-model="student.p2_mail" class="edit-input email-input" placeholder="信箱"/>
              <span v-else class="text-sm">{{ student.p2_mail }}</span>
            </td>
            
            <!-- 聯絡人 3 -->
            <td>
              <input v-if="student.isEditing" type="text" v-model="student.p3_rel" class="edit-input small-input" placeholder="關係"/>
              <span v-else>{{ student.p3_rel }}</span>
            </td>
            <td>
              <input v-if="student.isEditing" type="tel" v-model="student.p3_tel" class="edit-input small-input" placeholder="電話"/>
              <span v-else>{{ student.p3_tel }}</span>
            </td>
            <td>
              <input v-if="student.isEditing" type="email" v-model="student.p3_mail" class="edit-input email-input" placeholder="信箱"/>
              <span v-else class="text-sm">{{ student.p3_mail }}</span>
            </td>
            
            <!-- 操作按鈕區 -->
            <td class="action-cell">
              <template v-if="student.isEditing">
                <button @click="saveStudent(student)" class="btn-action btn-save">💾 儲存</button>
                <button @click="cancelEdit(student, index)" class="btn-action btn-cancel">❌ 取消</button>
              </template>
              <template v-else>
                <button @click="toggleEdit(student)" class="btn-action btn-edit">✏️ 編輯</button>
                <button @click="deleteStudent(student.id, student.real_name)" class="btn-action btn-delete">🗑️ 刪除</button>
              </template>
            </td>
          </tr>
          
          <!-- 無資料狀態 -->
          <tr v-if="adminStudents.length === 0">
            <td colspan="15" class="empty-state">尚無學生資料，請點擊右上方「➕ 新增資料」開始建立。</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()
const adminStudents = ref([])
const selectedFile = ref(null)
const isImporting = ref(false)

// 載入資料並加上 isEditing 屬性
const fetchData = async () => {
  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  const { data: pData } = await supabase.from('parents').select('*')
  
  if (sData) {
    adminStudents.value = sData.map(student => {
      const parents = pData ? pData.filter(p => p.student_id === student.id) : []
      return { 
        ...student, 
        p1_rel: parents[0]?.relationship || '', p1_tel: parents[0]?.phone || '', p1_mail: parents[0]?.email || '', 
        p2_rel: parents[1]?.relationship || '', p2_tel: parents[1]?.phone || '', p2_mail: parents[1]?.email || '', 
        p3_rel: parents[2]?.relationship || '', p3_tel: parents[2]?.phone || '', p3_mail: parents[2]?.email || '',
        isEditing: false, // 預設為非編輯模式
        isNew: false
      }
    })
  }
}

onMounted(() => fetchData())

// 💡 觸發新增一筆空白資料
const addNewStudent = () => {
  const newSeat = adminStudents.value.length > 0 
    ? Math.max(...adminStudents.value.map(s => s.seat_number || 0)) + 1 
    : 1

  adminStudents.value.push({
    id: `temp_${Date.now()}`,
    seat_number: newSeat,
    real_name: '', hidden_name: '', birthday: '', id_last_5: '',
    p1_rel: '', p1_tel: '', p1_mail: '',
    p2_rel: '', p2_tel: '', p2_mail: '',
    p3_rel: '', p3_tel: '', p3_mail: '',
    isEditing: true, // 新增資料預設為編輯模式
    isNew: true      // 標記為尚未進入資料庫的新資料
  })
}

// 切換為編輯模式
const toggleEdit = (student) => {
  student._original = { ...student } // 備份原始資料供取消時還原
  student.isEditing = true
}

// 取消編輯
const cancelEdit = (student, index) => {
  if (student.isNew) {
    // 如果是新建立且尚未存檔的資料，直接從畫面上移除
    adminStudents.value.splice(index, 1)
  } else {
    // 若為既有資料，還原為編輯前的狀態
    Object.assign(student, student._original)
    student.isEditing = false
  }
}

// 儲存邏輯 (包含 Insert 與 Update 雙邏輯)
const saveStudent = async (student) => {
  try {
    let currentStudentId = student.id
    
    // 準備要寫入 students 表格的資料
    const studentData = {
      seat_number: student.seat_number, 
      real_name: student.real_name, 
      hidden_name: student.hidden_name, 
      birthday: student.birthday, 
      id_last_5: student.id_last_5 
    }

    if (student.isNew) {
      // 🟢 新增資料 (Insert)
      const { data, error } = await supabase
        .from('students')
        .insert(studentData)
        .select()
        .single()
        
      if (error) throw error
      currentStudentId = data.id // 獲取資料庫配發的真實 UUID
    } else {
      // 🔵 更新資料 (Update)
      const { error } = await supabase
        .from('students')
        .update(studentData)
        .eq('id', currentStudentId)
        
      if (error) throw error
    }

    // 處理家長資料 (先刪除舊關聯，再重新插入)
    await supabase.from('parents').delete().eq('student_id', currentStudentId)
    
    const parentsToInsert = []
    if (student.p1_rel || student.p1_tel || student.p1_mail) parentsToInsert.push({ student_id: currentStudentId, relationship: student.p1_rel, phone: student.p1_tel, email: student.p1_mail })
    if (student.p2_rel || student.p2_tel || student.p2_mail) parentsToInsert.push({ student_id: currentStudentId, relationship: student.p2_rel, phone: student.p2_tel, email: student.p2_mail })
    if (student.p3_rel || student.p3_tel || student.p3_mail) parentsToInsert.push({ student_id: currentStudentId, relationship: student.p3_rel, phone: student.p3_tel, email: student.p3_mail })
    
    if (parentsToInsert.length > 0) {
      await supabase.from('parents').insert(parentsToInsert)
    }

    alert(`✅ ${student.real_name || '新學生'} 資料儲存成功！`)
    await fetchData() // 重新整理畫面抓取最新狀態
  } catch(e) { 
    alert(`❌ 儲存失敗：${e.message}`) 
  }
}

// 刪除邏輯
const deleteStudent = async (id, name) => { 
  if (confirm(`⚠️ 確定要刪除學生 ${name} 嗎？（與此學生相關的所有資料皆會同步刪除）`)) { 
    try {
      await supabase.from('students').delete().eq('id', id)
      await fetchData() 
    } catch (e) {
      alert(`❌ 刪除失敗：${e.message}`)
    }
  } 
}

const exportStudents = (type) => { alert(`📂 準備匯出 ${type.toUpperCase()} 格式名單...`) }
const handleFileUpload = (e) => { const file = e.target.files[0]; if (file) selectedFile.value = file }
const processImport = async () => { alert('🚀 開始解析檔案並匯入資料庫...') }
</script>

<style scoped>
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;}
.table-header h3 { margin: 0; color: #334155; }
.export-actions { display: flex; gap: 10px; flex-wrap: wrap;}
.export-btn { color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.export-btn:hover { opacity: 0.9; }

.add-btn { background-color: #3b82f6; } /* 新增資料按鈕藍色 */
.json-btn { background-color: #8b5cf6; }
.export-btn:not(.add-btn):not(.json-btn) { background-color: #10b981; }

.import-section { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
.import-btn { background: #64748b; color: white; font-weight: bold; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.import-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.table-responsive { overflow-x: auto; padding-bottom: 15px; }
.student-edit-table { min-width: 1700px; border-collapse: separate; border-spacing: 0; background: white; font-size: 0.95rem; }
.student-edit-table th, .student-edit-table td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
.student-edit-table th { background-color: #f8fafc; color: #475569; font-weight: bold; position: sticky; top: 0; z-index: 10; text-align: left; border-bottom: 2px solid #cbd5e1;}

.text-center { text-align: center !important; }
.text-sm { font-size: 0.85rem; color: #64748b; }

.edit-input { padding: 8px; border: 1px solid #94a3b8; border-radius: 4px; box-sizing: border-box; width: 100%; font-size: 0.95rem; background: #fff;}
.edit-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
.num-input { width: 60px; text-align: center; }
.small-input { width: 100%; }
.email-input { font-family: monospace; font-size: 0.85rem; }

/* 💡 操作按鈕樣式美化 */
.action-cell { display: flex; gap: 6px; justify-content: center; }
.btn-action { border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: bold; transition: 0.15s; white-space: nowrap; }
.btn-action:hover { transform: scale(1.05); }

.btn-edit { background: #f59e0b; color: white; }
.btn-delete { background: #ef4444; color: white; }
.btn-save { background: #10b981; color: white; }
.btn-cancel { background: #64748b; color: white; }

.empty-state { text-align: center; padding: 30px !important; color: #94a3b8; font-size: 1.1rem; }
</style>
