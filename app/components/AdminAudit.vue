<template>
  <div>
    <div class="table-header"><h3>🕵️ 系統稽核中心</h3></div>
    <div class="section">
      <h4>📝 作業操作紀錄</h4>
      <table class="t">
        <tr class="h"><th>時間</th><th>科目</th><th>身分</th><th>動作</th></tr>
        <tr v-for="l in aLogs" :key="l.id" class="r"><td>{{ new Date(l.created_at).toLocaleString() }}</td><td>{{ l.subject_name }}</td><td>{{ l.operator_role }}</td><td>{{ l.action_type }}</td></tr>
      </table>
    </div>
    <div class="section" style="margin-top:20px">
      <h4>✏️ 黑板編輯紀錄</h4>
      <table class="t">
        <tr class="h"><th>時間</th><th>區塊</th><th>身分</th><th>IP</th></tr>
        <tr v-for="l in bLogs" :key="l.id" class="r"><td>{{ new Date(l.edited_at).toLocaleString() }}</td><td>{{ l.board_type }}</td><td>{{ l.editor_role }}</td><td>{{ l.ip_address }}</td></tr>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; const supabase = useSupabaseClient()
const aLogs = ref([]); const bLogs = ref([])
onMounted(async () => {
  const { data: a } = await supabase.from('assignment_audit_logs').select('*').order('created_at', { ascending: false }).limit(30)
  const { data: b } = await supabase.from('board_edit_logs').select('*').order('edited_at', { ascending: false }).limit(30)
  aLogs.value = a || []; bLogs.value = b || []
})
</script>
<style scoped>.table-header{border-bottom:2px solid #e2e8f0;padding-bottom:15px;margin-bottom:20px}.section{background:#f8fafc;padding:20px;border-radius:8px}.t{width:100%;text-align:left;border-collapse:collapse}.h th{padding:10px;background:#f1f5f9}.r td{padding:10px;border-bottom:1px solid #eee}</style>
