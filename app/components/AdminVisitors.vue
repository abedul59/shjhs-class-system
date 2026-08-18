<template>
  <div class="visitors-container">
    <div class="table-header">
      <h3>👁️ 網站訪客與登入紀錄</h3>
      <button @click="fetchData" class="refresh-btn">🔄 重新整理</button>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-title">總瀏覽人次:</div>
        <div class="stat-value">{{ totalVisits }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">今日訪客:</div>
        <div class="stat-value">{{ todayVisits }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">管理員/幹部登入:</div>
        <div class="stat-value">{{ adminLogins }}</div>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">⏳ 載入紀錄中...</div>
    <div v-else-if="visitors.length === 0" class="empty-state">目前無任何訪客紀錄</div>
    <div v-else class="table-responsive">
      <table class="custom-table">
        <thead>
          <tr>
            <th width="15%">來訪時間</th>
            <th width="20%">IP 位址</th>
            <th width="15%">身分角色</th>
            <th width="40%">設備與瀏覽器資訊</th>
            <th width="10%">操作 (封鎖)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="visitor in visitors" :key="visitor.id" :class="{'highlight-row': visitor.role !== '匿名來訪者'}">
            <td class="time-cell">{{ formatTime(visitor.created_at) }}</td>
            <td class="ip-cell">{{ visitor.ip_address }}</td>
            <td>
              <span class="role-badge" :class="getRoleClass(visitor.role)">{{ visitor.role }}</span>
            </td>
            <td>
              <div class="device-info">
                <span class="device-icon">{{ getDeviceIcon(visitor.device_info) }}</span>
                <span class="device-name">{{ getDeviceName(visitor.device_info) }}</span>
              </div>
              <div class="ua-text" :title="visitor.device_info">{{ visitor.device_info }}</div>
            </td>
            <td style="text-align: center;">
              <!-- 💡 封鎖 IP 的打勾按鈕 -->
              <label class="block-checkbox">
                <input 
                  type="checkbox" 
                  :checked="isBlocked(visitor.ip_address)" 
                  @change="toggleBlock(visitor.ip_address, $event.target.checked)"
                />
                封鎖
              </label>
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

const visitors = ref([])
const totalVisits = ref(0)
const todayVisits = ref(0)
const adminLogins = ref(0)
const isLoading = ref(true)

// 💡 儲存目前在資料庫中被標記為「黑名單」的 IP 清單
const blockedIps = ref([])

const formatTime = (isoString) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const getRoleClass = (role) => {
  if (role === '導師') return 'role-teacher'
  if (role === '匿名來訪者') return 'role-anonymous'
  return 'role-officer'
}

const getDeviceIcon = (ua) => {
  if (!ua) return '📱'
  const lowerUA = ua.toLowerCase()
  if (lowerUA.includes('windows')) return '💻'
  if (lowerUA.includes('macintosh') || lowerUA.includes('mac os')) return '🍏'
  if (lowerUA.includes('linux') && !lowerUA.includes('android')) return '🐧'
  if (lowerUA.includes('ipad') || lowerUA.includes('tablet')) return '💊'
  return '📱'
}

const getDeviceName = (ua) => {
  if (!ua) return '未知設備'
  const lowerUA = ua.toLowerCase()
  if (lowerUA.includes('windows')) return 'Windows 電腦'
  if (lowerUA.includes('macintosh')) return 'Mac 電腦'
  if (lowerUA.includes('android')) return 'Android 手機/平板'
  if (lowerUA.includes('iphone')) return 'iPhone 手機'
  if (lowerUA.includes('ipad')) return 'iPad 平板'
  if (lowerUA.includes('linux')) return 'Linux 電腦'
  return '行動裝置'
}

// 💡 取得目前的黑名單 IP
const fetchBlockedIps = async () => {
  try {
    const { data } = await supabase.from('ip_rules').select('ip_range').eq('rule_type', '黑名單')
    if (data) {
      blockedIps.value = data.map(d => d.ip_range)
    }
  } catch(e) { console.error('無法取得封鎖清單', e) }
}

const isBlocked = (ip) => {
  if(!ip) return false
  return blockedIps.value.includes(ip)
}

// 💡 執行封鎖或解除封鎖的邏輯
const toggleBlock = async (ip, shouldBlock) => {
  if(!ip) return
  
  if (shouldBlock) {
    if (!confirm(`確定要封鎖 IP: ${ip} 嗎？\n此 IP 將被加入黑名單，無法再訪問本網站。`)) {
      await fetchBlockedIps() // 取消時恢復勾選狀態
      return
    }
    
    try {
      await supabase.from('ip_rules').insert({
        ip_range: ip,
        rule_type: '黑名單',
        description: '從訪客紀錄封鎖'
      })
      alert(`✅ 已成功封鎖 IP: ${ip}`)
    } catch(e) { alert('❌ 封鎖失敗：' + e.message) }
  } else {
    if (!confirm(`確定要解除封鎖 IP: ${ip} 嗎？`)) {
      await fetchBlockedIps()
      return
    }
    
    try {
      await supabase.from('ip_rules').delete().eq('ip_range', ip).eq('rule_type', '黑名單')
      alert(`✅ 已解除封鎖 IP: ${ip}`)
    } catch(e) { alert('❌ 解除封鎖失敗：' + e.message) }
  }
  
  await fetchBlockedIps() // 更新封鎖名單
}

const fetchData = async () => {
  isLoading.value = true
  try {
    // 獲取黑名單列表，確保畫面上能正確顯示封鎖狀態
    await fetchBlockedIps()

    const { data } = await supabase.from('visitor_logs').select('*').order('created_at', { ascending: false }).limit(200)
    if (data) {
      visitors.value = data
      totalVisits.value = data.length
      
      const d = new Date()
      const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      
      let tCount = 0
      let aCount = 0
      
      data.forEach(v => {
        if (v.created_at && v.created_at.startsWith(todayStr)) tCount++
        if (v.role !== '匿名來訪者') aCount++
      })
      
      todayVisits.value = tCount
      adminLogins.value = aCount
    }
  } catch (err) {
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.visitors-container { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; font-family: sans-serif;}

.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;}
.table-header h3 { margin: 0; color: #334155; font-size: 1.4rem; }
.refresh-btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.refresh-btn:hover { background: #2563eb; }

.stats-row { display: flex; gap: 15px; margin-bottom: 25px; flex-wrap: wrap; }
.stat-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; min-width: 150px;}
.stat-title { color: #64748b; font-size: 1.05rem; margin-bottom: 10px; }
.stat-value { color: #0f766e; font-size: 2rem; font-weight: bold; }

.loading-state, .empty-state { text-align: center; padding: 50px; color: #94a3b8; font-size: 1.1rem; font-style: italic; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;}

.table-responsive { overflow-x: auto; }
.custom-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem; min-width: 800px;}
.custom-table th { background: #f1f5f9; color: #475569; padding: 12px 15px; font-weight: bold; border-bottom: 2px solid #e2e8f0; white-space: nowrap;}
.custom-table td { padding: 15px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.custom-table tbody tr:hover { background: #f8fafc; }
.highlight-row { background: #f0fdf4 !important; }

.time-cell { color: #64748b; }
.ip-cell { color: #3b82f6; font-weight: bold; font-family: monospace; font-size: 1.05rem;}

.role-badge { padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9rem; display: inline-block; white-space: nowrap;}
.role-anonymous { background: #f1f5f9; color: #64748b; }
.role-teacher { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;}
.role-officer { background: #e0e7ff; color: #4f46e5; }

.device-info { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-weight: bold; color: #1e293b;}
.device-icon { font-size: 1.2rem; }
.ua-text { color: #94a3b8; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; font-family: monospace;}

/* 💡 封鎖按鈕的樣式 */
.block-checkbox { display: inline-flex; align-items: center; gap: 5px; cursor: pointer; color: #dc2626; font-weight: bold; font-size: 0.9rem; padding: 6px 10px; background: #fee2e2; border-radius: 6px; border: 1px solid #fca5a5; transition: 0.2s;}
.block-checkbox:hover { background: #fecaca; }
.block-checkbox input { cursor: pointer; transform: scale(1.2); }

@media (max-width: 768px) {
  .visitors-container { padding: 15px; }
  .stats-row { flex-direction: column; }
  .stat-card { width: 100%; }
}
</style>
