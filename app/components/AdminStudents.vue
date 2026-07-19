<template>
  <div>
    <div class="table-header"><h3>👩‍🎓 學生名單與資料維護</h3></div>
    <div style="overflow-x: auto;">
      <table style="width:100%; min-width: 1400px; border-collapse: collapse;">
        <thead style="background: #f8fafc; text-align: left;">
          <tr><th>座號</th><th>姓名</th><th>隱藏名</th><th>稱謂1</th><th>信箱1</th><th>稱謂2</th><th>信箱2</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in students" :key="s.id" style="border-bottom: 1px solid #eee;">
            <td><input v-model="s.seat_number" class="ip" style="width:50px"/></td>
            <td><input v-model="s.real_name" class="ip"/></td><td><input v-model="s.hidden_name" class="ip"/></td>
            <td><input v-model="s.p1_rel" class="ip" style="width:60px"/></td><td><input v-model="s.p1_mail" class="ip"/></td>
            <td><input v-model="s.p2_rel" class="ip" style="width:60px"/></td><td><input v-model="s.p2_mail" class="ip"/></td>
            <td><button @click="save(s)" class="btn blue">💾</button> <button @click="del(s.id)" class="btn red">🗑️</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient(); const students = ref([])
const fetchStudents = async () => {
  const { data: s } = await supabase.from('students').select('*').order('seat_number')
  const { data: p } = await supabase.from('parents').select('*')
  if(s) students.value = s.map(x => { const pr = p?p.filter(y=>y.student_id===x.id):[]; return {...x, p1_rel:pr[0]?.relationship, p1_mail:pr[0]?.email, p2_rel:pr[1]?.relationship, p2_mail:pr[1]?.email } })
}
onMounted(() => fetchStudents())
const save = async (s) => {
  await supabase.from('students').update({ seat_number: s.seat_number, real_name: s.real_name, hidden_name: s.hidden_name }).eq('id', s.id)
  await supabase.from('parents').delete().eq('student_id', s.id)
  const pList = []
  if(s.p1_mail) pList.push({ student_id: s.id, relationship: s.p1_rel, email: s.p1_mail })
  if(s.p2_mail) pList.push({ student_id: s.id, relationship: s.p2_rel, email: s.p2_mail })
  if(pList.length > 0) await supabase.from('parents').insert(pList)
  alert('✅ 儲存成功'); await fetchStudents()
}
const del = async (id) => { if(confirm('確定刪除？')){ await supabase.from('students').delete().eq('id', id); await fetchStudents() } }
</script>

<style scoped>
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } .table-header h3 { margin: 0; color: #334155; }
th, td { padding: 8px; } .ip { width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; }
.btn { border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; } .blue { background: #3b82f6; color: white; margin-right: 5px; } .red { background: #ef4444; color: white; }
</style>
