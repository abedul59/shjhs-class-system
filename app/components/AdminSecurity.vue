<template>
  <div class="admin-security-container">
    <div class="table-header"><h3>🛡️ 安全與 IP 存取限制</h3></div>
    <div class="security-section">
      
      <div class="add-rule-box">
        <!-- 💡 升級：使用 input + datalist，既有下拉選單，也可自由輸入新名單 -->
        <div class="input-wrapper type-col">
          <input 
            v-model="newR.rule_type" 
            list="rule-types" 
            placeholder="選擇或輸入名單種類..." 
            class="edit-input full-w" 
          />
          <datalist id="rule-types">
            <option value="白名單"></option>
            <option value="褐名單"></option>
            <option value="黑名單"></option>
            <option v-for="t in existingTypes" :key="t" :value="t"></option>
          </datalist>
        </div>

        <div class="input-wrapper ip-col">
          <input v-model="newR.ip_range" placeholder="輸入 IP (例 163.26.)" class="edit-input full-w" />
        </div>
        
        <div class="input-wrapper desc-col">
          <input v-model="newR.description" placeholder="備註 (例: 輔導室網路)" class="edit-input full-w" />
        </div>
        
        <button @click="add" class="add-btn">➕ 新增</button>
      </div>

      <!-- 💡 升級：響應式表格 (手機版自動轉為卡片式排列) -->
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th width="20%">名單類型</th>
              <th width="30%">IP 範圍</th>
              <th width="35%">備註</th>
              <th width="15%">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rules.length === 0"><td colspan="4" class="empty-text">尚無任何 IP 規則</td></tr>
            <tr v-for="r in rules" :key="r.id">
              <td data-label="名單類型">
                <span class="badge" :class="getBadgeClass(r.rule_type)">{{ r.rule_type }}</span>
              </td>
              <td data-label="IP 範圍" class="mono">{{ r.ip_range }}</td>
              <td data-label="備註">{{ r.description }}</td>
              <td data-label="操作">
                <button @click="del(r.id)" class="del-btn">🗑️ 刪除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
const supabase = useSupabaseClient()

const rules = ref([])
const newR = ref({ rule_type: '白名單', ip_range: '', description: '' })

// 💡 動態抓取資料庫中「不重複」的新名單種類，餵給下拉選單
const existingTypes = computed(() => {
  const types = rules.value.map(r => r.rule_type).filter(Boolean)
  return [...new Set(types)].filter(t => !['白名單', '褐名單', '黑名單'].includes(t))
})

const fetchRules = async () => { 
  const { data } = await supabase.from('ip_rules').select('*').order('created_at', { ascending: false })
  rules.value = data || [] 
}

onMounted(() => fetchRules())

const add = async () => { 
  if (!newR.value.rule_type || !newR.value.ip_range) {
    return alert('請填寫「名單類型」與「IP 範圍」！')
  }
  await supabase.from('ip_rules').insert([newR.value])
  newR.value.ip_range = ''
  newR.value.description = ''
  await fetchRules() 
}

const del = async (id) => { 
  if(confirm('確定要刪除這筆 IP 規則嗎？')) {
    await supabase.from('ip_rules').delete().eq('id', id)
    await fetchRules() 
  }
}

// 替常見名單加上不同顏色標籤
const getBadgeClass = (type) => {
  if (type === '白名單') return 'badge-white'
  if (type === '黑名單') return 'badge-black'
  if (type === '褐名單') return 'badge-brown'
  return 'badge-custom'
}
</script>

<style scoped>
.admin-security-container { font-family: sans-serif; }
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; } 
.table-header h3 { margin: 0; color: #334155; font-size: 1.3rem;}

.security-section { background: white; padding: 25px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.02);}

/* 新增輸入區排版 */
.add-rule-box { display: flex; gap: 15px; margin-bottom: 25px; align-items: stretch; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #94a3b8;}
.input-wrapper { display: flex; flex-direction: column; }
.type-col { flex: 2; }
.ip-col { flex: 3; }
.desc-col { flex: 4; }

.full-w { width: 100%; box-sizing: border-box; }
.edit-input { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.05rem; }
.edit-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }

.add-btn { background: #10b981; color: white; border: none; padding: 10px 25px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; white-space: nowrap; font-size: 1.05rem;}
.add-btn:hover { background: #059669; }

/* 響應式表格設計 */
.table-responsive { width: 100%; overflow-x: auto; }
.custom-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 1.05rem; }
.custom-table th, .custom-table td { padding: 15px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
.custom-table th { background: #f1f5f9; color: #475569; font-weight: bold; }
.custom-table tbody tr:hover { background: #f8fafc; }
.mono { font-family: monospace; font-size: 1.1rem; color: #0f766e; font-weight: bold;}
.empty-text { text-align: center; color: #94a3b8; font-style: italic; padding: 30px !important; }

/* 標籤視覺 */
.badge { padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9rem; border: 1px solid transparent;}
.badge-white { background: #ecfdf5; color: #0f766e; border-color: #a7f3d0; }
.badge-brown { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.badge-black { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; }
.badge-custom { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }

.del-btn { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 0.95rem;}
.del-btn:hover { background: #fecaca; }

/* =======================================
   💡 手機端 RWD 排版 (Card 模式)
   ======================================= */
@media (max-width: 768px) {
  .security-section { padding: 15px; }
  
  /* 新增區塊變垂直排列 */
  .add-rule-box { flex-direction: column; gap: 10px; padding: 12px; }
  .add-btn { width: 100%; padding: 12px; margin-top: 5px; }

  /* 表頭隱藏 */
  .custom-table thead { display: none; }
  
  /* 將每一列 (tr) 變成獨立的卡片 */
  .custom-table tbody tr { 
    display: block; 
    border: 1px solid #cbd5e1; 
    border-radius: 8px; 
    margin-bottom: 15px; 
    background: white; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  }
  
  /* 將每一個儲存格 (td) 變成垂直鍵值對 */
  .custom-table td { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 12px 15px; 
    border-bottom: 1px dashed #e2e8f0; 
    text-align: right; 
  }
  .custom-table td:last-child { border-bottom: none; }
  
  /* 利用 data-label 產生假表頭 */
  .custom-table td::before { 
    content: attr(data-label); 
    font-weight: bold; 
    color: #64748b; 
    margin-right: 15px; 
  }
  
  /* 長文字斷行防溢出 */
  .mono, .badge { text-align: right; word-break: break-all; }
  .del-btn { padding: 8px 20px; }
}
</style>
