<template>
  <div class="data-table">
    <div class="table-header">
      <h3>🛡️ 系統安全與 IP 存取限制</h3>
    </div>
    
    <div class="security-section">
      <h4>🚫 前台私訊登入 IP 黑/白名單設定</h4>
      <p class="help-text">限制學生使用學校或教室平板登入「家長私訊」與「學生私訊」。<br/>
      💡 提示：支援完整 IP (如 192.168.1.100) 或網域前綴 (如 163.26.)，系統在前台登入時會自動阻擋黑名單連線。</p>
      
      <div class="add-rule-box">
        <select v-model="newRule.rule_type" class="edit-input type-select">
          <option value="黑名單">🛑 黑名單 (禁止登入)</option>
          <option value="白名單">✅ 白名單 (允許登入)</option>
        </select>
        <input v-model="newRule.ip_range" type="text" class="edit-input ip-input" placeholder="輸入 IP 或前綴 (例: 163.26.)" />
        <input v-model="newRule.description" type="text" class="edit-input desc-input" placeholder="備註 (例: 三年二班教室平板)" @keyup.enter="addRule"/>
        <button @click="addRule" class="add-btn small-btn">➕ 新增規則</button>
      </div>

      <table class="ip-table">
        <thead>
          <tr><th width="120">類型</th><th width="200">IP / 網域前綴</th><th>備註說明</th><th width="180">建立時間</th><th width="80">操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="rule in ipRules" :key="rule.id">
            <td><span :class="['badge', rule.rule_type === '黑名單' ? 'badge-black' : 'badge-white']">{{ rule.rule_type }}</span></td>
            <td class="ip-text"><strong>{{ rule.ip_range }}</strong></td>
            <td>{{ rule.description }}</td>
            <td class="time-text">{{ formatTime(rule.created_at) }}</td>
            <td><button @click="deleteRule(rule.id)" class="del-row-btn">🗑️</button></td>
          </tr>
          <tr v-if="ipRules.length === 0"><td colspan="5" class="empty">目前無任何 IP 限制規則</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const ipRules = ref([])
const newRule = ref({ rule_type: '黑名單', ip_range: '', description: '' })

const fetchRules = async () => {
  const { data } = await supabase.from('ip_rules').select('*').order('created_at', { ascending: false })
  if (data) ipRules.value = data
}

onMounted(() => { fetchRules() })

const addRule = async () => {
  if (!newRule.value.ip_range) return alert('請輸入 IP 範圍')
  const { data, error } = await supabase.from('ip_rules').insert([newRule.value]).select().single()
  if (!error && data) { 
    ipRules.value.unshift(data)
    newRule.value.ip_range = ''; newRule.value.description = '' 
  }
}

const deleteRule = async (id) => {
  if (!confirm('確定刪除此 IP 規則？')) return
  await supabase.from('ip_rules').delete().eq('id', id)
  ipRules.value = ipRules.value.filter(r => r.id !== id)
}

const formatTime = (isoString) => new Date(isoString).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
</script>

<style scoped>
.data-table { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.table-header h3 { margin: 0; color: #334155; }
.security-section { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; }
.security-section h4 { margin: 0 0 10px 0; color: #1e293b; }
.help-text { font-size: 0.95rem; color: #64748b; margin-bottom: 20px; line-height: 1.5; }
.add-rule-box { display: flex; gap: 10px; margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1; }
.edit-input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 1rem; }
.type-select { width: 150px; } .ip-input { width: 220px; font-family: monospace; font-size: 1.1rem; } .desc-input { flex: 1; }
.add-btn { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; cursor: pointer; }
table.ip-table { width: 100%; border-collapse: collapse; text-align: left; background: white; }
.ip-table th, .ip-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; }
.ip-table th { background-color: #f1f5f9; color: #475569; font-weight: bold; }
.ip-text { font-family: monospace; font-size: 1.1rem; color: #0f172a; }
.time-text { font-size: 0.85rem; color: #64748b; }
.badge { padding: 5px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }
.badge-black { background: #fee2e2; color: #991b1b; } .badge-white { background: #dcfce7; color: #166534; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
.empty { text-align: center; color: #94a3b8; padding: 30px; font-style: italic; }
</style>
