<template>
  <div>
    <div class="table-header">
      <h3>👩‍🎓 學生名單與資料維護</h3>
      
      <!-- 💡 新增：排序切換與操作按鈕區 -->
      <div class="header-controls">
        <div class="sort-control">
          <label>排序方式：</label>
          <select v-model="sortBy" @change="applySort" class="sort-select">
            <option value="student_number">依學號</option>
            <option value="seat_number">依座號</option>
          </select>
        </div>

        <div class="export-actions">
          <button @click="addNewStudent" class="export-btn add-btn">➕ 新增一位學生資料</button>
          <button @click="saveAllStudents" class="export-btn save-all-btn" :disabled="isSavingAll">
            {{ isSavingAll ? '⏳ 儲存中...' : '💾 全體儲存' }}
          </button>
          <button @click="exportStudents('json')" class="export-btn json-btn">📥 匯出 JSON</button>
          <button @click="exportStudents('csv')" class="export-btn">📤 匯出 CSV</button>
          <!-- 💡 新增：危險的全部刪除按鈕 -->
          <button @click="deleteAllStudents" class="export-btn danger-btn">🗑️ 清空所有學生資料</button>
        </div>
      </div>
    </div>
    
    <div class="import-section">
      <div class="import-controls">
        <input type="file" accept=".csv" @change="handleFileUpload" ref="fileInput" />
        <button @click="processImport" class="import-btn" :disabled="!selectedFile || isImporting">
          {{ isImporting ? '⏳ 匯入中...' : '🚀 執行匯入 (CSV)' }}
        </button>
      </div>
      <div class="import-tips">
        💡 請上傳包含 student_number 等英文標題的 CSV 檔案。
      </div>
    </div>

    <div class="table-responsive">
      <table class="student-edit-table">
        <thead>
          <tr>
            <th width="60">座號</th>
            <th width="100">學號</th>
            <th width="80">姓名</th>
            <th width="80">隱藏名</th>
            <th width="120">畢業國小</th>
            <th width="70">國小班級</th>
            <th width="90">生日(YYYYMMDD)</th>
            <th width="100">身分證後五碼</th>
            <th width="90">稱謂1</th><th width="110">電話1</th><th width="160">信箱1</th>
            <th width="90">稱謂2</th><th width="110">電話2</th><th width="160">信箱2</th>
            <th width="90">稱謂3</th><th width="110">電話3</th><th width="160">信箱3</th>
            <th width="80">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="student in adminStudents" :key="student.id">
            <td><input type="number" v-model="student.seat_number" class="edit-input num-input"/></td>
            <td><input type="text" v-model="student.student_number" class="edit-input" placeholder="例: 1150175"/></td>
            <td><input type="text" v-model="student.real_name" class="edit-input"/></td>
            <td><input type="text" v-model="student.hidden_name" class="edit-input"/></td>
            <td><input type="text" v-model="student.elementary_school" class="edit-input" placeholder="例: 臺南市大新"/></td>
            <td><input type="number" v-model="student.elementary_class" class="edit-input num-input" placeholder="班級"/></td>
            <td><input type="text" v-model="student.birthday" class="edit-input" placeholder="YYYYMMDD"/></td>
            <td><input type="text" v-model="student.id_last_5" class="edit-input num-input" placeholder="後五碼"/></td>
            
            <td><input type="text" v-model="student.p1_rel" class="edit-input small-input" placeholder="關係"/></td>
            <td><input type="tel" v-model="student.p1_tel" class="edit-input small-input" placeholder="電話"/></td>
            <td><input type="email" v-model="student.p1_mail" class="edit-input email-input" placeholder="信箱"/></td>
            <td><input type="text" v-model="student.p2_rel" class="edit-input small-input" placeholder="關係"/></td>
            <td><input type="tel" v-model="student.p2_tel" class="edit-input small-input" placeholder="電話"/></td>
            <td><input type="email" v-model="student.p2_mail" class="edit-input email-input" placeholder="信箱"/></td>
            <td><input type="text" v-model="student.p3_rel" class="edit-input small-input" placeholder="關係"/></td>
            <td><input type="tel" v-model="student.p3_tel" class="edit-input small-input" placeholder="電話"/></td>
            <td><input type="email" v-model="student.p3_mail" class="edit-input email-input" placeholder="信箱"/></td>
            <td class="action-cell">
              <button @click="saveStudent(student)" class="save-row-btn">💾</button>
              <button @click="deleteStudent(student.id, student.real_name)" class="del-row-btn">🗑️</button>
            </td>
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
const fileInput = ref(null)
const isImporting = ref(false)
const isSavingAll = ref(false)

// 💡 排序變數
const sortBy = ref('seat_number') 

const fetchData = async () => {
  // 💡 依據選定的排序方式向資料庫請求資料
  const { data: sData } = await supabase.from('students').select('*').order(sortBy.value)
  const { data: pData } = await supabase.from('parents').select('*')
  
  if (sData) adminStudents.value = sData.map(student => {
    const parents = pData ? pData.filter(p => p.student_id === student.id) : []
    return { 
      ...student, 
      p1_rel: parents[0]?.relationship || '', p1_tel: parents[0]?.phone || '', p1_mail: parents[0]?.email || '', 
      p2_rel: parents[1]?.relationship || '', p2_tel: parents[1]?.phone || '', p2_mail: parents[1]?.email || '', 
      p3_rel: parents[2]?.relationship || '', p3_tel: parents[2]?.phone || '', p3_mail: parents[2]?.email || '' 
    }
  })
}
onMounted(() => fetchData())

// 💡 當使用者切換選單時觸發重新排序
const applySort = () => {
  fetchData()
}

const addNewStudent = async () => {
  const tempNum = `T${Math.floor(Math.random() * 10000)}` 
  try {
    const { error } = await supabase.from('students').insert({
      student_number: tempNum,
      student_id: tempNum, 
      school_name: '新化國中',
      enroll_year: 115,
      class_name: '7',
      real_name: '新學生'
    })
    
    if (error) throw error
    alert('✅ 已新增一筆空白學生資料，請修改完成後點擊儲存！')
    await fetchData()
  } catch (err) {
    alert(`❌ 新增失敗：${err.message}`)
  }
}

const saveStudent = async (student, showAlert = true) => {
  try {
    await supabase.from('students').update({ 
      seat_number: student.seat_number, 
      student_number: student.student_number,
      real_name: student.real_name, 
      hidden_name: student.hidden_name, 
      elementary_school: student.elementary_school,
      elementary_class: student.elementary_class,
      birthday: student.birthday,
      id_last_5: student.id_last_5 
    }).eq('id', student.id)
    
    await supabase.from('parents').delete().eq('student_id', student.id)
    const parentsToInsert = []
    if (student.p1_rel || student.p1_tel || student.p1_mail) parentsToInsert.push({ student_id: student.id, relationship: student.p1_rel, phone: student.p1_tel, email: student.p1_mail })
    if (student.p2_rel || student.p2_tel || student.p2_mail) parentsToInsert.push({ student_id: student.id, relationship: student.p2_rel, phone: student.p2_tel, email: student.p2_mail })
    if (student.p3_rel || student.p3_tel || student.p3_mail) parentsToInsert.push({ student_id: student.id, relationship: student.p3_rel, phone: student.p3_tel, email: student.p3_mail })
    if (parentsToInsert.length > 0) await supabase.from('parents').insert(parentsToInsert)
    
    if (showAlert) {
      alert(`✅ ${student.real_name || student.student_number} 資料儲存成功！`)
      await fetchData()
    }
  } catch(e) { 
    if (showAlert) alert('❌ 儲存失敗，請檢查資料是否有誤。') 
    throw e 
  }
}

const saveAllStudents = async () => {
  if (!confirm('⚠️ 確定要儲存畫面上所有的修改嗎？這將會更新全體資料。')) return
  isSavingAll.value = true
  try {
    for (const student of adminStudents.value) {
      await saveStudent(student, false)
    }
    alert('✅ 全體資料儲存成功！')
    await fetchData()
  } catch (err) {
    alert('❌ 全體儲存過程中發生部分錯誤，請檢查。')
  } finally {
    isSavingAll.value = false
  }
}

const deleteStudent = async (id, name) => { 
  if (confirm(`⚠️ 確定要刪除學生 ${name || '此學生'} 嗎？這將會一併刪除他的家長綁定與聯絡紀錄！`)) { 
    try {
      await supabase.from('communication_logs').delete().eq('student_id', id); 
      await supabase.from('parents').delete().eq('student_id', id); 
      const { error } = await supabase.from('students').delete().eq('id', id); 
      if (error) throw error

      alert(`✅ 學生 ${name || ''} 刪除成功。`)
      await fetchData() 
    } catch (err) {
      alert(`❌ 刪除失敗：${err.message}`)
    }
  } 
}

// 💡 新增：危險的清空全班資料功能 (加入嚴格的防呆機制)
const deleteAllStudents = async () => {
  const confirmText = window.prompt('⚠️ 警告：這將會清空「所有學生」包含其「家長綁定」與「聯絡紀錄」！\n\n此動作無法復原。如果確定要執行，請在下方輸入「確認刪除」四個字：')
  
  if (confirmText === '確認刪除') {
    try {
      // 由於外鍵關聯，必須從最末端的資料表開始刪除
      await supabase.from('communication_logs').delete().neq('id', '0'); // 刪除所有聯絡紀錄 (neq 0 是一種刪除全表的安全寫法)
      await supabase.from('parents').delete().neq('id', '0');            // 刪除所有家長綁定
      await supabase.from('assignment_submissions').delete().neq('id', '0'); // 刪除所有作業繳交紀錄
      await supabase.from('attendances').delete().neq('id', '0');        // 刪除所有出缺席紀錄
      await supabase.from('discipline_records').delete().neq('id', '0'); // 刪除所有秩序違規紀錄
      
      const { error } = await supabase.from('students').delete().neq('id', '0'); // 最後清空學生表
      if (error) throw error

      alert('✅ 所有學生資料已徹底清空。')
      await fetchData() 
    } catch (err) {
      alert(`❌ 清空失敗：${err.message}`)
    }
  } else if (confirmText !== null) {
    alert('❌ 輸入的文字不符，已取消刪除動作。')
  }
}

const exportStudents = (type) => { alert(`📂 準備匯出 ${type.toUpperCase()} 格式名單... (待實作)`) }

const handleFileUpload = (e) => { 
  const file = e.target.files[0]; 
  if (file) selectedFile.value = file 
}

const processImport = async () => {
  if (!selectedFile.value) return
  if (!confirm('即將匯入學生名單。若學號已存在將會自動更新資料，確定要執行嗎？')) return

  isImporting.value = true

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const text = e.target.result
      const rows = text.split(/\r?\n/).filter(row => row.trim() !== '')
      if (rows.length < 2) throw new Error('檔案內容為空或缺少標題列')

      const headers = rows[0].split(',').map(h => h.trim())
      const studentsToUpsert = []

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(',').map(v => v.trim())
        const studentObj = {}
        
        headers.forEach((header, index) => {
          if (values[index] !== undefined && values[index] !== '') {
            if (header === 'seat_number' || header === 'elementary_class') {
              studentObj[header] = parseInt(values[index], 10)
            } else {
              studentObj[header] = values[index]
            }
          }
        })

        if (studentObj.student_number) {
          if (!studentObj.school_name) studentObj.school_name = '新化國中'
          if (!studentObj.enroll_year) studentObj.enroll_year = 115
          if (!studentObj.class_name) studentObj.class_name = '7'
          if (!studentObj.student_id) studentObj.student_id = studentObj.student_number 
          
          studentsToUpsert.push(studentObj)
        }
      }

      if (studentsToUpsert.length === 0) throw new Error('沒有找到有效的學生資料 (可能缺少 student_number 欄位)')

      const { error } = await supabase
        .from('students')
        .upsert(studentsToUpsert, { onConflict: 'student_number' })

      if (error) throw error

      alert(`✅ 成功匯入 ${studentsToUpsert.length} 筆學生資料！`)
      
      selectedFile.value = null
      if (fileInput.value) fileInput.value.value = ''
      await fetchData()

    } catch (err) {
      console.error(err)
      alert(`❌ 匯入發生錯誤：${err.message}`)
    } finally {
      isImporting.value = false
    }
  }
  
  reader.onerror = () => {
    alert('❌ 讀取檔案失敗。')
    isImporting.value = false
  }

  reader.readAsText(selectedFile.value, 'utf-8')
}
</script>

<style scoped>
/* 💡 新增：整理 header 排版的樣式 */
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;}
.table-header h3 { margin: 0; color: #334155; }
.header-controls { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.sort-control { display: flex; align-items: center; gap: 8px; font-weight: bold; color: #475569; }
.sort-select { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; }

.export-actions { display: flex; gap: 10px; flex-wrap: wrap;}
.export-btn { background-color: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.json-btn { background-color: #8b5cf6; }

.add-btn { background-color: #f59e0b; }
.add-btn:hover { background-color: #d97706; }

.save-all-btn { background-color: #2563eb; }
.save-all-btn:hover:not(:disabled) { background-color: #1d4ed8; }
.save-all-btn:disabled { background-color: #94a3b8; cursor: not-allowed; }

/* 💡 新增：危險按鈕樣式 */
.danger-btn { background-color: #ef4444; }
.danger-btn:hover { background-color: #dc2626; }

.import-section { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.import-controls { display: flex; gap: 10px; align-items: center;}
.import-btn { background: #3b82f6; color: white; font-weight: bold; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
.import-btn:disabled { background: #94a3b8; cursor: not-allowed; }
.import-tips { font-size: 0.9rem; color: #64748b; margin-left: 10px; }
.table-responsive { overflow-x: auto; padding-bottom: 15px; }

.student-edit-table { min-width: 2100px; border-collapse: separate; border-spacing: 0; background: white; font-size: 0.95rem; }
.student-edit-table th, .student-edit-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.student-edit-table th { background-color: #f8fafc; color: #64748b; font-weight: bold; position: sticky; top: 0; z-index: 10; text-align: left; }
.edit-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; width: 100%; }
.num-input { width: 100%; min-width: 60px; text-align: center; } 
.small-input { width: 100%; }
.email-input { font-family: monospace; font-size: 0.8rem; }
.action-cell { display: flex; gap: 5px; justify-content: center; }
.save-row-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
</style>
