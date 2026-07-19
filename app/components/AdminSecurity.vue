<template>
  <div>
    <div class="table-header"><h3>🛡️ 安全與 IP 存取限制</h3></div>
    <div class="security-section">
      <div class="add-rule-box">
        <select v-model="newR.rule_type" class="edit-input"><option>黑名單</option><option>白名單</option></select>
        <input v-model="newR.ip_range" placeholder="輸入 IP (例 163.26.)" class="edit-input" />
        <input v-model="newR.description" placeholder="備註" class="edit-input" />
        <button @click="add" class="add-btn">➕ 新增</button>
      </div>
      <table style="width:100%; border-collapse:collapse; text-align:left;">
        <tr style="background:#f1f5f9"><th style="padding:10px">類型</th><th style="padding:10px">IP</th><th style="padding:10px">備註</th><th style="padding:10px">操作</th></tr>
        <tr v-for="r in rules" :key="r.id" style="border-bottom:1px solid #eee">
          <td style="padding:10px">{{ r.rule_type }}</td><td style="padding:10px; font-family:monospace">{{ r.ip_range }}</td><td style="padding:10px">{{ r.description }}</td>
          <td style="padding:10px"><button @click="del(r.id)" class="del-btn">🗑️</button></td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; const supabase = useSupabaseClient()
const rules = ref([]); const newR = ref({ rule_type: '黑名單', ip_range: '', description: '' })
const fetchRules = async () => { const { data } = await supabase.from('ip_rules').select('*').order('created_at', { ascending: false }); rules.value = data || [] }
onMounted(() => fetchRules())
const add = async () => { await supabase.from('ip_rules').insert([newR.value]); newR.value.ip_range = ''; await fetchRules() }
const del = async (id) => { await supabase.from('ip_rules').delete().eq('id', id); await fetchRules() }
</script>

<style scoped>
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } .table-header h3 { margin: 0; color: #334155; }
.security-section { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; }
.add-rule-box { display: flex; gap: 10px; margin-bottom: 20px; } .edit-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; }
.add-btn { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; cursor: pointer; }
.del-btn { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
</style>
