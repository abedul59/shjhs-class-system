<template>
  <div>
    <div class="table-header">
      <h3>👩‍🎓 學生名單與資料維護</h3>
      <div class="export-actions">
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
            <th width="50">座號</th><th width="80">姓名</th><th width="80">隱藏名</th><th width="90">生日</th><th width="60">後5碼</th>
            <th width="90">稱謂1</th><th width="110">電話1</th><th width="160">信箱1</th>
            <th width="90">稱謂2</th><th width="110">電話2</th><th width="160">信箱2</th>
            <th width="90">稱謂3</th><th width="110">電話3</th><th width="160">信箱3</th>
            <th width="80">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="student in adminStudents" :key="student.id">
            <td><input type="number" v-model="student.seat_number" class="edit-input num-input"/></td>
            <td><input type="text" v-model="student.real_name" class="edit-input"/></td>
            <td><input type="text" v-model="student.hidden_name" class="edit-input"/></td>
            <td><input type="text" v-model="student.birthday" class="edit-input" placeholder="YYYYMMDD"/></td>
            <td><input type="text" v-model="student.id_last_5" maxlength="5" class="edit-input"/></td>
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
const adminStudents = ref([]); const selectedFile = ref(null); const isImporting = ref(false)

const fetchData = async () => {
  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  const { data: pData } = await supabase.from('parents').select('*')
  if (sData) adminStudents.value = sData.map(student => {
    const parents = pData ? pData.filter(p => p.student_id === student.id) : []
    return { ...student, p1_rel: parents[0]?.relationship || '', p1_tel: parents[0]?.phone || '', p1_mail: parents[0]?.email || '', p2_rel: parents[1]?.relationship || '', p2_tel: parents[1]?.phone || '', p2_mail: parents[1]?.email || '', p3_rel: parents[2]?.relationship || '', p3_tel: parents[2]?.phone || '', p3_mail: parents[2]?.email || '' }
  })
}
onMounted(() => fetchData())

const saveStudent = async (student) => {
  try {
    await supabase.from('students').update({ seat_number: student.seat_number, real_name: student.real_name, hidden_name: student.hidden_name, birthday: student.birthday, id_last_5: student.id_last_5 }).eq('id', student.id)
    await supabase.from('parents').delete().eq('student_id', student.id)
    const parentsToInsert = []
    if (student.p1_rel || student.p1_tel || student.p1_mail) parentsToInsert.push({ student_id: student.id, relationship: student.p1_rel, phone: student.p1_tel, email: student.p1_mail })
    if (student.p2_rel || student.p2_tel || student.p2_mail) parentsToInsert.push({ student_id: student.id, relationship: student.p2_rel, phone: student.p2_tel, email: student.p2_mail })
    if (student.p3_rel || student.p3_tel || student.p3_mail) parentsToInsert.push({ student_id: student.id, relationship: student.p3_rel, phone: student.p3_tel, email: student.p3_mail })
    if (parentsToInsert.length > 0) await supabase.from('parents').insert(parentsToInsert)
    alert(`✅ ${student.real_name} 資料儲存成功！`); await fetchData()
  } catch(e) { alert('❌ 儲存失敗') }
}
const deleteStudent = async (id, name) => { if (confirm(`⚠️ 確定要刪除學生 ${name} 嗎？`)) { await supabase.from('students').delete().eq('id', id); await fetchData() } }
const exportStudents = (type) => { alert(`📂 準備匯出 ${type.toUpperCase()} 格式名單...`) }
const handleFileUpload = (e) => { const file = e.target.files[0]; if (file) selectedFile.value = file }
const processImport = async () => { alert('🚀 開始解析檔案並匯入資料庫...') }
</script>

<style scoped>
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.table-header h3 { margin: 0; color: #334155; }
.export-actions { display: flex; gap: 10px; }
.export-btn { background-color: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.json-btn { background-color: #8b5cf6; }
.import-section { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
.import-btn { background: #3b82f6; color: white; font-weight: bold; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.table-responsive { overflow-x: auto; padding-bottom: 15px; }
.student-edit-table { min-width: 1600px; border-collapse: separate; border-spacing: 0; background: white; font-size: 0.95rem; }
.student-edit-table th, .student-edit-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.student-edit-table th { background-color: #f8fafc; color: #64748b; font-weight: bold; position: sticky; top: 0; z-index: 10; text-align: left; }
.edit-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; width: 100%; }
.num-input { width: 50px; text-align: center; }
.small-input { width: 100%; }
.email-input { font-family: monospace; font-size: 0.8rem; }
.action-cell { display: flex; gap: 5px; justify-content: center; }
.save-row-btn { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
</style>