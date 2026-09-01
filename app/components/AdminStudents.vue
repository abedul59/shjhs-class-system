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
          <!-- 頂部保留全體儲存 -->
          <button @click="saveAllStudents" class="export-btn save-all-btn" :disabled="isSavingAll">
            {{ isSavingAll ? '⏳ 儲存中...' : '💾 全體儲存' }}
          </button>
          <button @click="exportStudents('json')" class="export-btn json-btn">📥 匯出 JSON</button>
          <button @click="exportStudents('csv')" class="export-btn">📤 匯出 CSV</button>
          <button @click="deleteAllStudents" class="export-btn danger-btn">🗑️ 清空所有學生資料</button>
        </div>
      </div>
    </div>

    <!-- 💡 資料異動通知信設定區塊 -->
    <div class="notify-settings-section">
      <div class="editor-header">
        <h4 style="margin: 0; color: #1e293b;">📧 學生資料異動通知設定</h4>
        <button @click="saveNotifySettings" class="save-template-btn" :disabled="isSavingNotifySettings">
          {{ isSavingNotifySettings ? '儲存中...' : '💾 儲存設定與範本' }}
        </button>
      </div>
      <p class="help-text" style="margin-top: 5px;">當學生資料發生新增、修改、刪除或批次匯入時，系統會自動寄信通知您。</p>
      
      <div class="form-group" style="margin-bottom: 15px;">
        <label>接收通知信箱：</label>
        <input type="email" v-model="notifyEmail" class="edit-input" placeholder="請輸入您要接收通知的 Email (留空則不發送通知)" />
      </div>
      
      <div class="email-flex-container">
        <div class="email-form-col">
          <p class="help-text" style="margin-bottom: 8px;">💡 可使用變數：<span class="var-tag" v-pre>{{異動類型}}</span>、<span class="var-tag" v-pre>{{學生姓名}}</span>、<span class="var-tag" v-pre>{{當下時間}}</span></p>
          <div class="form-group">
            <label>信件主旨：</label>
            <input type="text" v-model="notifySubject" class="edit-input" />
          </div>
          <div class="form-group">
            <label>信件內容：(系統鎖定為純文字發送)</label>
            <textarea v-model="notifyContent" rows="5" class="edit-input textarea-input"></textarea>
          </div>
        </div>
        
        <div class="email-preview-col">
          <h5 style="margin: 0 0 10px 0; color: #334155; font-size: 1rem;">👀 實際信件預覽</h5>
          <div class="preview-box plain-text-preview">
            <div class="preview-subject"><strong>主旨：</strong> {{ previewSubject }}</div>
            <div class="preview-body">{{ previewContent }}</div>
          </div>
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

    <!-- 💡 分頁與排版優化的學生資料編輯區 -->
    <div class="table-container-wrapper">
      
      <!-- 分頁標籤與儲存列 -->
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: activeTab === 'basic' }" @click="activeTab = 'basic'">🎓 基本與學籍資料</button>
        <button class="tab-btn" :class="{ active: activeTab === 'parents' }" @click="activeTab = 'parents'">👨‍👩‍👦 家長聯絡資訊</button>
        <button class="tab-btn" :class="{ active: activeTab === 'system' }" @click="activeTab = 'system'">⚙️ 系統設定</button>
        
        <div class="tab-spacer"></div>
        <button @click="saveAllStudents" class="export-btn save-all-btn prominent-save-btn" :disabled="isSavingAll">
          {{ isSavingAll ? '⏳ 處理中...' : '💾 全部儲存' }}
        </button>
      </div>

      <div class="table-responsive">
        <table class="student-edit-table" :class="activeTab + '-mode'">
          <thead>
            <tr>
              <!-- 固定的識別欄位 -->
              <th width="60" class="sticky-col">座號</th>
              <th width="100" class="sticky-col-2" v-if="activeTab !== 'basic'">姓名</th>
              
              <!-- 基本與學籍資料 分頁 -->
              <template v-if="activeTab === 'basic'">
                <th width="100">學號</th>
                <th width="80">姓名</th>
                <th width="80">隱藏名</th>
                <th width="120">畢業國小</th>
                <th width="70">國小班級</th>
                <th width="110">生日(YYYYMMDD)</th>
                <th width="100">身分證後五碼</th>
              </template>

              <!-- 家長聯絡資訊 分頁 -->
              <template v-if="activeTab === 'parents'">
                <th width="70" class="group-border">稱謂1</th><th width="110">電話1</th><th width="180">信箱1</th>
                <th width="70" class="group-border">稱謂2</th><th width="110">電話2</th><th width="180">信箱2</th>
                <th width="70" class="group-border">稱謂3</th><th width="110">電話3</th><th width="180">信箱3</th>
              </template>

              <!-- 系統設定 分頁 -->
              <template v-if="activeTab === 'system'">
                <th width="160" style="color: #dc2626; text-align: center;">
                  不列入點名<br><span style="font-size: 0.8rem; font-weight: normal;">(休轉學/假帳號)</span>
                  <div class="micro-btn-group">
                    <button @click="toggleAllAttendance(true)" class="micro-btn">全選</button>
                    <button @click="toggleAllAttendance(false)" class="micro-btn">全不選</button>
                  </div>
                </th>
              </template>

              <!-- 固定的操作欄位 -->
              <th width="90">單筆操作</th>
            </tr>
          </thead>
          
          <tbody>
            <tr v-for="student in adminStudents" :key="student.id" :class="{'new-row-highlight': String(student.id).startsWith('temp_')}">
              
              <!-- 固定的識別欄位 -->
              <td class="sticky-col"><input type="number" v-model="student.seat_number" class="edit-input num-input"/></td>
              <td class="sticky-col-2" v-if="activeTab !== 'basic'">
                <div class="readonly-name">{{ student.real_name || '未命名' }}</div>
              </td>
              
              <!-- 基本與學籍資料 分頁 -->
              <template v-if="activeTab === 'basic'">
                <td><input type="text" v-model="student.student_number" class="edit-input" placeholder="例: 1150175"/></td>
                <td><input type="text" v-model="student.real_name" class="edit-input" placeholder="姓名"/></td>
                <td><input type="text" v-model="student.hidden_name" class="edit-input" placeholder="隱藏名"/></td>
                <td><input type="text" v-model="student.elementary_school" class="edit-input" placeholder="例: 大新"/></td>
                <td><input type="number" v-model="student.elementary_class" class="edit-input num-input" placeholder="班級"/></td>
                <td><input type="text" v-model="student.birthday" class="edit-input" placeholder="YYYYMMDD"/></td>
                <td><input type="text" v-model="student.id_last_5" class="edit-input num-input" placeholder="後五碼"/></td>
              </template>

              <!-- 家長聯絡資訊 分頁 -->
              <template v-if="activeTab === 'parents'">
                <td class="group-border"><input type="text" v-model="student.p1_rel" class="edit-input small-input" placeholder="關係"/></td>
                <td><input type="tel" v-model="student.p1_tel" class="edit-input small-input" placeholder="電話"/></td>
                <td><input type="email" v-model="student.p1_mail" class="edit-input email-input" placeholder="信箱"/></td>
                <td class="group-border"><input type="text" v-model="student.p2_rel" class="edit-input small-input" placeholder="關係"/></td>
                <td><input type="tel" v-model="student.p2_tel" class="edit-input small-input" placeholder="電話"/></td>
                <td><input type="email" v-model="student.p2_mail" class="edit-input email-input" placeholder="信箱"/></td>
                <td class="group-border"><input type="text" v-model="student.p3_rel" class="edit-input small-input" placeholder="關係"/></td>
                <td><input type="tel" v-model="student.p3_tel" class="edit-input small-input" placeholder="電話"/></td>
                <td><input type="email" v-model="student.p3_mail" class="edit-input email-input" placeholder="信箱"/></td>
              </template>

              <!-- 系統設定 分頁 -->
              <template v-if="activeTab === 'system'">
                <td style="text-align: center; background-color: #fef2f2;">
                  <input type="checkbox" v-model="student.hide_attendance" class="block-checkbox" title="打勾後，此學生將不會出現在首頁點名表中" />
                </td>
              </template>

              <!-- 固定的操作欄位 -->
              <td class="action-cell">
                <button @click="saveStudent(student)" class="save-row-btn" title="單筆儲存">💾</button>
                <button @click="deleteStudent(student.id, student.real_name)" class="del-row-btn" title="單筆刪除">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()

const activeTab = ref('basic') // 控制當前顯示的分頁

const adminStudents = ref([])
const selectedFile = ref(null)
const fileInput = ref(null)
const isImporting = ref(false)
const isSavingAll = ref(false)

const sortBy = ref('seat_number') 

// 異動通知設定狀態
const notifyEmail = ref('')
const notifySubject = ref('🔔 班級系統通知：學生資料已{{異動類型}} ({{學生姓名}})')
const notifyContent = ref(`導師您好：\n\n系統於 {{當下時間}} 發生了一筆學生資料變動。\n\n【變動內容】\n- 動作：{{異動類型}}\n- 影響學生：{{學生姓名}}\n\n此致\n系統自動通知`)
const isSavingNotifySettings = ref(false)

const previewSubject = computed(() => {
  const nowStr = new Date().toLocaleString('zh-TW', { hour12: false })
  return notifySubject.value.replace(/{{異動類型}}/g, '更新').replace(/{{學生姓名}}/g, '王小明').replace(/{{當下時間}}/g, nowStr)
})

const previewContent = computed(() => {
  const nowStr = new Date().toLocaleString('zh-TW', { hour12: false })
  return notifyContent.value.replace(/{{異動類型}}/g, '更新').replace(/{{學生姓名}}/g, '王小明').replace(/{{當下時間}}/g, nowStr)
})

// 發送通知信的共用邏輯
const notifyTeacher = async (actionType, studentName) => {
  if (!notifyEmail.value || !notifyEmail.value.includes('@')) return; 
  try {
    const nowStr = new Date().toLocaleString('zh-TW', { hour12: false })
    const subj = notifySubject.value.replace(/{{異動類型}}/g, actionType).replace(/{{學生姓名}}/g, studentName).replace(/{{當下時間}}/g, nowStr)
    const cont = notifyContent.value.replace(/{{異動類型}}/g, actionType).replace(/{{學生姓名}}/g, studentName).replace(/{{當下時間}}/g, nowStr)
    
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: notifyEmail.value,
        subject: subj,
        content: cont
      })
    });
  } catch (err) {
    console.error('發送導師通知信失敗:', err);
  }
}

const fetchData = async () => {
  const { data: emailData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'teacher_notify_email').maybeSingle()
  if (emailData && emailData.setting_value) notifyEmail.value = emailData.setting_value

  const { data: tmplData } = await supabase.from('email_templates').select('*').eq('template_id', 'student_data_change_notice').maybeSingle()
  if (tmplData) {
    notifySubject.value = tmplData.subject
    notifyContent.value = tmplData.content
  }

  const { data: sData } = await supabase.from('students').select('*').order(sortBy.value)
  const { data: pData } = await supabase.from('parents').select('*')
  
  if (sData) adminStudents.value = sData.map(student => {
    const parents = pData ? pData.filter(p => p.student_id === student.id) : []
    return { 
      ...student, 
      hide_attendance: !!student.hide_attendance,
      p1_rel: parents[0]?.relationship || '', p1_tel: parents[0]?.phone || '', p1_mail: parents[0]?.email || '', 
      p2_rel: parents[1]?.relationship || '', p2_tel: parents[1]?.phone || '', p2_mail: parents[1]?.email || '', 
      p3_rel: parents[2]?.relationship || '', p3_tel: parents[2]?.phone || '', p3_mail: parents[2]?.email || '' 
    }
  })
}

onMounted(() => fetchData())

// 儲存通知設定
const saveNotifySettings = async () => {
  isSavingNotifySettings.value = true
  try {
    await supabase.from('system_settings').upsert({ setting_key: 'teacher_notify_email', setting_value: notifyEmail.value }, { onConflict: 'setting_key' })
    await supabase.from('email_templates').upsert({ template_id: 'student_data_change_notice', subject: notifySubject.value, content: notifyContent.value })
    alert('✅ 通知設定與範本已儲存！')
  } catch (error) {
    alert('❌ 儲存失敗：' + error.message)
  } finally {
    isSavingNotifySettings.value = false
  }
}

const applySort = () => { fetchData() }

const addNewStudent = () => {
  const maxSeat = adminStudents.value.length > 0 
    ? Math.max(...adminStudents.value.map(s => parseInt(s.seat_number) || 0)) : 0

  adminStudents.value.unshift({
    id: 'temp_' + Date.now(),
    seat_number: maxSeat + 1,
    student_number: '', real_name: '', hidden_name: '', elementary_school: '',
    elementary_class: null, birthday: '', id_last_5: '', hide_attendance: false,
    p1_rel: '', p1_tel: '', p1_mail: '', p2_rel: '', p2_tel: '', p2_mail: '', p3_rel: '', p3_tel: '', p3_mail: ''
  })

  // 如果新增，自動切換回基本資料分頁方便填寫
  activeTab.value = 'basic'
  alert('✨ 已在清單最上方新增一筆空白列，請填寫完成後點擊「儲存」！')
}

// 💡 快速全選 / 全不選「不列入點名」
const toggleAllAttendance = (status) => {
  adminStudents.value.forEach(s => {
    s.hide_attendance = status
  })
}

const saveStudent = async (student, showAlert = true) => {
  try {
    const isNew = String(student.id).startsWith('temp_')
    const sNum = String(student.student_number || '').trim() || `T${Date.now().toString().slice(-6)}`
    const rName = String(student.real_name || '').trim() || '未命名學生'
    
    const studentPayload = {
      seat_number: parseInt(student.seat_number) || 99, 
      student_number: sNum, student_id: sNum, real_name: rName, 
      hidden_name: String(student.hidden_name || '').trim() || rName,
      elementary_school: String(student.elementary_school || '').trim(),
      elementary_class: parseInt(student.elementary_class) || null,
      birthday: String(student.birthday || '').trim(),
      id_last_5: String(student.id_last_5 || '').trim(),
      hide_attendance: !!student.hide_attendance
    }

    if (isNew) {
      studentPayload.school_name = '新化國中'; studentPayload.enroll_year = 115; studentPayload.class_name = '7'
    }

    let currentStudentId = student.id

    if (isNew) {
      const { data, error } = await supabase.from('students').insert(studentPayload).select().single()
      if (error) throw error
      currentStudentId = data.id 
      student.id = currentStudentId 
    } else {
      const { error } = await supabase.from('students').update(studentPayload).eq('id', currentStudentId)
      if (error) throw error
    }
    
    await supabase.from('parents').delete().eq('student_id', currentStudentId)
    const parentsToInsert = []
    if (student.p1_rel || student.p1_tel || student.p1_mail) parentsToInsert.push({ student_id: currentStudentId, relationship: student.p1_rel, phone: student.p1_tel, email: student.p1_mail })
    if (student.p2_rel || student.p2_tel || student.p2_mail) parentsToInsert.push({ student_id: currentStudentId, relationship: student.p2_rel, phone: student.p2_tel, email: student.p2_mail })
    if (student.p3_rel || student.p3_tel || student.p3_mail) parentsToInsert.push({ student_id: currentStudentId, relationship: student.p3_rel, phone: student.p3_tel, email: student.p3_mail })
    
    if (parentsToInsert.length > 0) {
      const { error: pErr } = await supabase.from('parents').insert(parentsToInsert)
      if (pErr) throw pErr
    }
    
    if (showAlert) alert(`✅ ${rName} 資料儲存成功！`)

    const actionStr = isNew ? '新增' : '更新'
    notifyTeacher(actionStr, rName)
      
  } catch(e) { 
    if (showAlert) alert(`❌ 儲存失敗：${e.message}`) 
    throw e 
  }
}

const saveAllStudents = async () => {
  if (!confirm('⚠️ 確定要將畫面上所有的修改進行儲存嗎？')) return
  isSavingAll.value = true
  
  let successCount = 0;

  try {
    for (const student of adminStudents.value) {
      if (String(student.id).startsWith('temp_') && !student.student_number && !student.real_name) continue;
      await saveStudent(student, false)
      successCount++;
    }
    
    alert('✅ 全體資料儲存成功！')
    if (successCount > 0) notifyTeacher('批次全體儲存', `共更新了 ${successCount} 筆資料`)

    await fetchData()
  } catch (err) {
    alert('❌ 儲存發生錯誤，請重新整理頁面後再試。')
  } finally {
    isSavingAll.value = false
  }
}

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
      notifyTeacher('遭刪除', name || '未知學生')

      await fetchData() 
    } catch (err) { alert(`❌ 刪除失敗：${err.message}`) }
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
      notifyTeacher('極端操作', '全體學生資料已被清空')

      await fetchData() 
    } catch (err) { alert(`❌ 清空失敗：${err.message}`) }
  } else if (confirmText !== null) {
    alert('❌ 輸入的文字不符，已取消刪除動作。')
  }
}

const exportStudents = (type) => {
  if (adminStudents.value.length === 0) return alert('⚠️ 目前沒有學生資料可供匯出。')

  const dataToExport = adminStudents.value.filter(s => !String(s.id).startsWith('temp_'))

  if (type === 'json') {
    const dataStr = JSON.stringify(dataToExport, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'students_export.json'; link.click()
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
    link.href = url; link.download = 'students_export.csv'; link.click()
    URL.revokeObjectURL(url)
  }
}

const handleFileUpload = (e) => { const file = e.target.files[0]; if (file) selectedFile.value = file }

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
            } else if (header === 'hide_attendance') {
              studentObj[header] = (values[index] === 'true' || values[index] === 'TRUE' || values[index] === '1')
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

      const { error } = await supabase.from('students').upsert(studentsToUpsert, { onConflict: 'student_number' })
      if (error) throw error

      alert(`✅ 成功匯入 ${studentsToUpsert.length} 筆學生資料！`)
      notifyTeacher('批次匯入 CSV', `共匯入了 ${studentsToUpsert.length} 筆資料`)
      
      selectedFile.value = null
      if (fileInput.value) fileInput.value.value = ''
      await fetchData()

    } catch (err) { alert(`❌ 匯入發生錯誤：${err.message}`) } 
    finally { isImporting.value = false }
  }
  
  reader.onerror = () => { alert('❌ 讀取檔案失敗。'); isImporting.value = false }
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

/* 通知設定區塊樣式 */
.notify-settings-section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.editor-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 10px; }
.save-template-btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.save-template-btn:hover:not(:disabled) { background: #2563eb; }
.save-template-btn:disabled { background: #94a3b8; cursor: not-allowed; }
.help-text { font-size: 0.95rem; color: #64748b; line-height: 1.5; }
.var-tag { background: #e2e8f0; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #475569; }
.email-flex-container { display: flex; gap: 20px; align-items: stretch; margin-top: 15px; }
.email-form-col { flex: 1; display: flex; flex-direction: column; gap: 15px; }
.email-preview-col { flex: 1; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; }
.plain-text-preview { background: #fefce8; padding: 15px; border-radius: 6px; border: 1px solid #fde047; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); height: 100%; box-sizing: border-box; }
.preview-subject { font-size: 1rem; color: #92400e; border-bottom: 1px dashed #fcd34d; padding-bottom: 10px; margin-bottom: 10px; font-weight: bold; }
.preview-body { font-size: 1rem; color: #451a03; line-height: 1.6; white-space: pre-wrap; font-family: monospace; }

.import-section { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.import-controls { display: flex; gap: 10px; align-items: center;}
.import-btn { background: #3b82f6; color: white; font-weight: bold; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
.import-btn:disabled { background: #94a3b8; cursor: not-allowed; }
.import-tips { font-size: 0.9rem; color: #64748b; margin-left: 10px; }

/* 💡 排版優化：分頁標籤與表格容器 */
.table-container-wrapper { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden; }

.tab-bar { display: flex; gap: 5px; background: #f1f5f9; padding: 10px 15px; border-bottom: 2px solid #cbd5e1; align-items: center; flex-wrap: wrap;}
.tab-btn { padding: 10px 18px; border: none; background: transparent; color: #475569; font-weight: bold; font-size: 1rem; border-radius: 6px; cursor: pointer; transition: 0.2s; }
.tab-btn:hover { background: #e2e8f0; }
.tab-btn.active { background: #3b82f6; color: white; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3); }
.tab-spacer { flex: 1; }

.prominent-save-btn { font-size: 1.05rem; padding: 10px 20px; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4); animation: gentle-pulse 2s infinite;}
@keyframes gentle-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }

.table-responsive { overflow-x: auto; max-height: 700px; }

/* 讓寬度可以根據分頁自適應，不再強制 2100px */
.student-edit-table { width: 100%; border-collapse: separate; border-spacing: 0; background: white; font-size: 0.95rem; }
.student-edit-table th, .student-edit-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.student-edit-table th { background-color: #f8fafc; color: #64748b; font-weight: bold; position: sticky; top: 0; z-index: 10; text-align: center; }

/* 固定左側兩欄 */
.sticky-col { position: sticky; left: 0; background: #fff; z-index: 5; border-right: 1px solid #e2e8f0; text-align: center;}
.sticky-col-2 { position: sticky; left: 60px; background: #fff; z-index: 5; border-right: 2px solid #cbd5e1; text-align: center;}
.student-edit-table th.sticky-col, .student-edit-table th.sticky-col-2 { background-color: #f8fafc; z-index: 15; }

.group-border { border-left: 2px dashed #cbd5e1; }
.readonly-name { font-weight: bold; color: #1e293b; white-space: nowrap;}

.new-row-highlight td { background-color: #fefce8; }

.edit-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; width: 100%; transition: border-color 0.2s;}
.edit-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
.num-input { width: 100%; min-width: 60px; text-align: center; } 
.small-input { width: 100%; }
.email-input { font-family: monospace; font-size: 0.8rem; }
.textarea-input { resize: vertical; font-family: inherit; line-height: 1.5; }

/* 💡 新增的微型按鈕 */
.micro-btn-group { display: flex; justify-content: center; gap: 5px; margin-top: 5px;}
.micro-btn { font-size: 0.75rem; padding: 2px 8px; background: white; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; color: #475569;}
.micro-btn:hover { background: #f1f5f9; border-color: #94a3b8; }

.action-cell { display: flex; gap: 5px; justify-content: center; }
.save-row-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 1rem;}
.save-row-btn:hover { background: #2563eb; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 1rem;}
.del-row-btn:hover { background: #dc2626; }

.block-checkbox { transform: scale(1.5); cursor: pointer; accent-color: #ef4444;}

@media (max-width: 768px) {
  .email-flex-container { flex-direction: column; }
  .tab-bar { flex-direction: column; align-items: stretch; }
  .tab-spacer { display: none; }
}
</style>
