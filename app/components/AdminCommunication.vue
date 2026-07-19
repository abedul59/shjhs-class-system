<template>
  <div>
    <div class="table-header"><h3>📨 通知紀錄</h3></div>
    <table class="t">
      <tr class="h"><th>發送時間</th><th>收件者</th><th>類型</th><th>信箱</th></tr>
      <tr v-for="l in logs" :key="l.id" class="r">
        <td>{{ new Date(l.sent_at).toLocaleString('zh-TW') }}</td><td>{{ l.student_id ? '學生' : '全班群發' }}</td>
        <td>{{ l.notification_type }}</td><td>{{ l.recipient_emails }}</td>
      </tr>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; const supabase = useSupabaseClient(); const logs = ref([])
onMounted(async () => { const { data } = await supabase.from('communication_logs').select('*').order('sent_at', { ascending: false }).limit(50); logs.value = data || [] })
</script>
<style scoped>.table-header{border-bottom:2px solid #e2e8f0;padding-bottom:15px;margin-bottom:20px}.t{width:100%;text-align:left;border-collapse:collapse}.h th{padding:10px;background:#f1f5f9}.r td{padding:10px;border-bottom:1px solid #eee}</style>
