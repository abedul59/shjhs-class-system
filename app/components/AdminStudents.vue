<template>
  <div>
    <div class="table-header">
      <h3>👩‍🎓 學生名單與資料維護</h3>
      
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
          <!-- 若剛按了新增，空白列會有獨特的標示背景色 -->
          <tr v-for="student in adminStudents" :key="student.id" :class="{'new-row-highlight': String(student.id).startsWith('temp_')}">
            <td><input type="number" v-model="student.seat_number" class="edit-input num-input"/></td>
            <td><input type="text" v-model="student.student_number" class="edit-input" placeholder="例: 1150175"/></td>
            <td><input type="text" v-model="student.real_name" class="edit-input" placeholder="姓名"/></td>
            <td><input type="text" v-model="student.hidden_name" class="edit-input" placeholder="隱藏名"/></td>
            <td><input type="text" v-model="student.elementary_school" class="edit-input" placeholder="例: 大新"/></td>
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
              <button @click="saveStudent(student)" class="save-row-btn" title="儲存">💾</button>
              <button @click="deleteStudent(student.id, student.real_name)" class="del-row-btn" title="刪除">🗑️</button>
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

const sortBy = ref('seat_number') 

const fetchData = async () => {
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

const applySort = () => {
  fetchData()
}

// 產生空白列讓使用者填寫
const addNewStudent = () => {
  const maxSeat = adminStudents.value.length > 0 
    ? Math.max(...adminStudents.value.map(s => parseInt(s.seat_number) || 0)) 
    : 0

  adminStudents.value.unshift({
    id: 'temp_' + Date.now(),
    seat_number: maxSeat + 1,
    student_number: '',
    real_name: '',
    hidden_name: '',
    elementary_school: '',
    elementary_class: null,
    birthday: '',
    id_last_5: '',
    p1_rel: '', p1_tel: '', p1_mail: '',
    p2_rel: '', p2_tel: '', p2_mail: '',
    p3_rel: '', p3_tel: '', p3_mail: ''
  })

  alert('✨ 已在清單最上方新增一筆空白列，請填妥學號、座號等資料後點擊「💾」進行儲存！')
}

// 💡 徹底修復版的儲存邏輯
const saveStudent = async (student, showAlert = true) => {
  // 1. 基礎防呆：學號與座號絕對不可為空
  const sNum = String(student.student_number || '').trim()
  if (!sNum) {
    if (showAlert) alert('❌ 學號為必填欄位！請填寫學號後再儲存。')
    throw new Error('缺少學號')
  }
  if (!student.seat_number) {
    if (showAlert) alert('❌ 座號為必填欄位！請填寫座號後再儲存。')
    throw new Error('缺少座號')
  }

  try {
    const isNew = String(student.id).startsWith('temp_')
    
    // 2. 嚴謹建構 Payload，絕不遺漏任何 DB required 欄位
    const studentPayload = {
      seat_number: parseInt(student.seat_number, 10), 
      student_number: sNum,
      student_id: sNum,  // 🚀 關鍵修復：這裡補回了 student_id，不再報錯
      real_name: String(student.real_name || '').trim(), 
      hidden_name: String(student.hidden_name || '').trim(), 
      elementary_school: String(student.elementary_school || '').trim(),
      elementary_class: student.elementary_class ? parseInt(student.elementary_class, 10) : null,
      birthday: String(student.birthday || '').trim(),
      id_last_5: String(student.id_last_5 || '').trim()
    }

    // 3. 全新學生補足預設的系統必填欄位
    if (isNew) {
      studentPayload.school_name = '新化國中'
      studentPayload.enroll_year = 115
      studentPayload.class_name = '7'
    }

    let currentStudentId = student.id

    // 4. 寫入或更新 Students 表格
    if (isNew) {
      const { data, error } = await supabase.from('students').insert(studentPayload).select().single()
      if (error) throw error
      currentStudentId = data.id 
      student.id = currentStudentId // 更新畫面 ID
    } else {
      const { error } = await supabase.from('students').update(studentPayload).eq('id', currentStudentId)
      if (error) throw error
    }
    
    // 5. 處理 Parents 表格綁定
    await supabase.from('parents').delete().eq('student_id', currentStudentId)
    const parentsToInsert = []
    if (student.p1_rel || student.p1_tel || student.p1_mail) parentsToInsert.push({ student_id: currentStudentId, relationship: student.p1_rel, phone: student.p1_tel, email: student.p1_mail })
    if (student.p2_rel || student.p2_tel || student.p2_mail) parentsToInsert.push({ student_id: currentStudentId, relationship: student.p2_rel, phone: student.p2_tel, email: student.p2_mail })
    if (student.p3_rel || student.p3_tel || student.p3_mail) parentsToInsert.push({ student_id: currentStudentId, relationship: student.p3_rel, phone: student.p3_tel, email: student.p3_mail })
    
    if (parentsToInsert.length > 0) {
      const { error: pErr } = await supabase.from('parents').insert(parentsToInsert)
      if (pErr) throw pErr
    }
    
    if (showAlert) alert(`✅ ${student.real_name || student.student_number} 資料儲存成功！`)
      
  } catch(e) { 
    if (showAlert) alert(`❌ 儲存失敗 (${student.real_name || student.student_number})：${e.message}`) 
    throw e 
  }
}

// 💡 強化版的全體儲存機制 (收集錯誤，不中斷成功者)
const saveAllStudents = async () => {
  if (!confirm('⚠️ 確定要儲存畫面上所有的修改嗎？這將會更新全體資料。')) return
  isSavingAll.value = true
  let errorMessages = []
  
  try {
    for (const student of adminStudents.value) {
      // 略過完全沒填學號的新增空白列
      if (String(student.id).startsWith('temp_') && (!student.student_number || String(student.student_number).trim() === '')) {
        continue;
      }
      
      try {
        await saveStudent(student, false)
      } catch (err) {
        errorMessages.push(`[${student.real_name || student.student_number || '未知名稱'}] ${err.message}`)
      }
    }
    
    if (errorMessages.length === 0) {
      alert('✅ 全體資料儲存成功！')
    } else {
      alert(`⚠️ 儲存完畢，但有 ${errorMessages.length} 筆資料異常：\n\n${errorMessages.join('\n')}\n\n請檢查這些學生是否有遺漏必填欄位。`)
    }
    
    await fetchData()
  } finally {
    isSavingAll.value = false
  }
}

// 刪除邏輯
const deleteStudent = async (id, name) => { 
  if (String(id).startsWith('temp_')) {
    adminStudents.value = adminStudents.value.filter(s => s.id !== id)
    return
  }

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

const deleteAllStudents = async () => {
  const confirmText = window.prompt('⚠️ 警告：這將會清空「所有學生」包含其「家長綁定」與「聯絡紀錄」！\n\n此動作無法復原。如果確定要執行，請在下方輸入「確認刪除」四個字：')
  
  if (confirmText === '確認刪除') {
    try {
      await supabase.from('communication_logs').delete().neq('id', '0'); 
      await supabase.from('parents').delete().neq('id', '0');            
      await supabase.from('assignment_submissions').delete().neq('id', '0'); 
      await supabase.from('attendances').delete().neq('id', '0');        
      await supabase.from('discipline_records').delete().neq('id', '0'); 
      
      const { error } = await supabase.from('students').delete().neq('id', '0'); 
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

// 匯出 JSON & CSV 功能
const exportStudents = (type) => {
  if (adminStudents.value.length === 0) {
    alert('⚠️ 目前沒有學生資料可供匯出。')
    return
  }

  // 匯出時略過未儲存的暫存空白列
  const dataToExport = adminStudents.value.filter(s => !String(s.id).startsWith('temp_'))

  if (type === 'json') {
    const dataStr = JSON.stringify(dataToExport, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'students_export.json'
    link.click()
    URL.revokeObjectURL(url)
  } else if (type === 'csv') {
    if(dataToExport.length === 0) return;
    const headers = Object.keys(dataToExport[0]).filter(k => k !== 'id') 
    
    let csvContent = '\uFEFF' + headers.join(',') + '\n'
    
    dataToExport.forEach(student => {
      const row = headers.map(header => {
        let val = student[header]
        if (val === null || val === undefined) val = ''
        val = String(val).replace(/"/g, '""')
        return `"${val}"`
      })
      csvContent += row.join(',') + '\n'
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'students_export.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
}

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

/* 💡 新增的空白列會有淺黃色背景提示 */
.new-row-highlight td { background-color: #fefce8; }

.edit-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; width: 100%; transition: border-color 0.2s;}
.edit-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
.num-input { width: 100%; min-width: 60px; text-align: center; } 
.small-input { width: 100%; }
.email-input { font-family: monospace; font-size: 0.8rem; }
.action-cell { display: flex; gap: 5px; justify-content: center; }
.save-row-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 1rem;}
.save-row-btn:hover { background: #2563eb; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 1rem;}
.del-row-btn:hover { background: #dc2626; }
</style>
