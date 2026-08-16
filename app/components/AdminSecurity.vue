<template>
  <div class="admin-security-container">
    <div class="table-header"><h3>🛡️ 安全與 IP 存取限制</h3></div>
    <div class="security-section">
      
      <div class="add-rule-box">
        <select v-model="newR.rule_type" class="edit-input type-select">
          <option>黑名單</option>
          <option>白名單</option>
          <option>褐名單</option>
        </select>
        <input v-model="newR.ip_range" placeholder="輸入 IP (例 163.26.)" class="edit-input ip-input" />
        <input v-model="newR.description" placeholder="備註" class="edit-input desc-input" />
        <button @click="add" class="add-btn">➕ 新增</button>
      </div>

      <!-- 響應式表格區塊 -->
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th width="15%">名單類型</th>
              <th width="30%">IP 範圍</th>
              <th width="40%">備註</th>
              <th width="15%">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rules.length === 0"><td colspan="4" class="empty-text">尚無任何 IP 規則</td></tr>
            <tr v-for="r in rules" :key="r.id">
              <td data-label="名單類型">
                <!-- 💡 加入顏色標籤 -->
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
import { ref, onMounted } from 'vue'; 
const supabase = useSupabaseClient()

const rules = ref([]); 
const newR = ref({ rule_type: '白名單', ip_range: '', description: '' })

const fetchRules = async () => { 
  const { data } = await supabase.from('ip_rules').select('*').order('created_at', { ascending: false }); 
  rules.value = data || [] 
}

onMounted(() => fetchRules())

const add = async () => { 
  if (!newR.value.ip_range) return alert('請輸入 IP 範圍！')
  await supabase.from('ip_rules').insert([newR.value]); 
  newR.value.ip_range = ''; 
  newR.value.description = ''; 
  await fetchRules() 
}

const del = async (id) => { 
  if(confirm('確定要刪除這筆紀錄嗎？')) {
    await supabase.from('ip_rules').delete().eq('id', id); 
    await fetchRules() 
  }
}

// 根據名單類型給予不同的視覺樣式
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

/* 新增規則區塊 */
.add-rule-box { display: flex; gap: 15px; margin-bottom: 25px; align-items: stretch; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1;}
.edit-input { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1.05rem; }
.edit-input:focus { border-color: #10b981; outline: none; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }
.type-select { flex: 1; min-width: 120px; }
.ip-input { flex: 2; }
.desc-input { flex: 3; }

.add-btn { background: #10b981; color: white; border: none; padding: 10px 25px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; white-space: nowrap; font-size: 1.05rem;}
.add-btn:hover { background: #059669; }

/* 表格樣式 */
.table-responsive { width: 100%; overflow-x: auto; }
.custom-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 1.05rem; }
.custom-table th, .custom-table td { padding: 15px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
.custom-table th { background: #f1f5f9; color: #475569; font-weight: bold; }
.custom-table tbody tr:hover { background: #f8fafc; }
.mono { font-family: monospace; font-size: 1.1rem; color: #0f766e; font-weight: bold;}
.empty-text { text-align: center; color: #94a3b8; font-style: italic; padding: 30px !important; }

/* 名單標籤視覺 */
.badge { padding: 6px 15px; border-radius: 20px; font-weight: bold; font-size: 0.95rem; border: 1px solid transparent; display: inline-block;}
.badge-white { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
.badge-brown { background: #fef3c7; color: #b45309; border-color: #fde68a; }
.badge-black { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

.del-btn { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 0.95rem; white-space: nowrap;}
.del-btn:hover { background: #fecaca; }

/* =======================================
   💡 手機端 RWD 排版 (Card 卡片模式)
   ======================================= */
@media (max-width: 768px) {
  .security-section { padding: 15px; }
  
  /* 輸入框改為垂直排列 */
  .add-rule-box { flex-direction: column; gap: 10px; padding: 15px; }
  .type-select, .ip-input, .desc-input, .add-btn { width: 100%; box-sizing: border-box; }
  .add-btn { padding: 12px; margin-top: 5px; }

  /* 隱藏原生表頭 */
  .custom-table thead { display: none; }
  
  /* 將每一列 (tr) 轉換成獨立卡片 */
  .custom-table tbody tr { 
    display: block; 
    border: 1px solid #cbd5e1; 
    border-radius: 8px; 
    margin-bottom: 15px; 
    background: white; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  }
  
  /* 將每一個儲存格 (td) 轉換成鍵值對排列 */
  .custom-table td { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 12px 15px; 
    border-bottom: 1px dashed #e2e8f0; 
    text-align: right; 
  }
  .custom-table td:last-child { border-bottom: none; }
  
  /* 利用 HTML 模板中的 data-label 產生假表頭標籤 */
  .custom-table td::before { 
    content: attr(data-label); 
    font-weight: bold; 
    color: #64748b; 
    margin-right: 15px; 
  }
  
  /* 長文字斷行處理 */
  .mono { text-align: right; word-break: break-all; }
  .del-btn { padding: 10px 20px; }
}
</style>
