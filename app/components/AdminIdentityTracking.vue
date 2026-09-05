<template>
  <div class="tracking-container">
    <div class="table-header">
      <h3>🕵️ 實名身分與足跡追蹤中心</h3>
      <button @click="fetchLogs" class="refresh-btn" :disabled="isLoading">
        {{ isLoading ? '🔄 載入中...' : '🔄 重新整理' }}
      </button>
    </div>
    
    <p class="help-text">
      此系統會自動過濾匿名訪客，專注追蹤「已通過身分驗證」的家長、學生與老師。<br>
      💡 若同一位家長使用多台設備（例如手機與家中電腦）登入，系統會自動歸戶合併其足跡。
    </p>

    <div class="main-layout">
      <!-- 左側：已驗證身分清單 -->
      <div class="identity-list-panel">
        <div class="panel-header">👥 已驗證身分 (依最新活動排序)</div>
        
        <div class="search-bar">
          <input type="text" v-model="searchQuery" placeholder="🔍 搜尋姓名、座號或身分..." class="search-input" />
        </div>

        <div v-if="isLoading" class="loading-state">載入足跡中...</div>
        <div v-else-if="filteredIdentities.length === 0" class="empty-state">目前無符合條件的實名紀錄</div>
        
        <div v-else class="list-wrapper">
          <div v-for="user in filteredIdentities" :key="user.role" 
               class="identity-card" 
               :class="{ active: selectedIdentity?.role === user.role }"
               @click="selectedIdentity = user">
            
            <div class="v-header">
              <!-- 依據身分給予不同的視覺標籤 -->
              <span class="role-badge" :class="getRoleBadgeClass(user.role)">
                {{ getRoleIcon(user.role) }} {{ extractRoleType(user.role) }}
              </span>
              <span class="v-time">{{ formatTime(user.latestTime, true) }}</span>
            </div>
            
            <div class="v-name">{{ extractName(user.role) }}</div>
            
            <div class="v-footer">
              <span class="v-devices">📱 {{ user.devices.size }} 台設備</span>
              <span class="v-count">共 {{ user.logs.length }} 筆動作</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：詳細設備與時間軸 -->
      <div class="timeline-panel">
        <div v-if="!selectedIdentity" class="empty-prompt">
          👈 請從左側選擇一位實名用戶以查看其詳細足跡
        </div>
        
        <div v-else class="timeline-wrapper">
          <div class="timeline-header">
            <h4 class="detail-title">{{ selectedIdentity.role }} 的活動分析</h4>
            
            <!-- 綁定的設備與 IP 清單 -->
            <div class="device-box">
              <div class="device-box-title">📍 該身分曾經使用過的設備與 IP：</div>
              <ul class="device-list">
                <li v-for="(dev, idx) in Array.from(selectedIdentity.devices)" :key="idx">
                  <strong>{{ dev.split('|')[0] }}</strong> - {{ parseUserAgent(dev.split('|')[1]) }}
                </li>
              </ul>
            </div>
          </div>
          
          <div class="timeline-content">
            <div v-for="(log, idx) in selectedIdentity.logs" :key="log.id || idx" class="timeline-item">
              <div class="time-col">
                <div class="t-date">{{ formatDateOnly(log.created_at) }}</div>
                <div class="t-time">{{ formatTimeOnly(log.created_at) }}</div>
              </div>
              
              <div class="dot-col">
                <div class="dot"></div>
                <div class="line" v-if="idx !== selectedIdentity.logs.length - 1"></div>
              </div>
              
              <div class="action-col">
                <div class="action-header">
                  <span class="action-tag" :class="getActionClass(log.action_details)">
                    {{ getActionCategory(log.action_details) }}
                  </span>
                  <span class="action-text">{{ log.action_details || '造訪網站' }}</span>
                </div>
                <div class="action-meta">
                  由 IP: {{ log.ip_address }} 操作
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()

const rawLogs = ref([])
const isLoading = ref(false)
const selectedIdentity = ref(null)
const searchQuery = ref('')

const fetchLogs = async () => {
  isLoading.value = true
  selectedIdentity.value = null
  
  // 抓取近 3000 筆紀錄，並且排除尚未驗證的匿名來訪者
  const { data } = await supabase.from('visitor_logs')
    .select('*')
    .neq('role', '匿名來訪者')
    .not('role', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3000)
    
  rawLogs.value = data || []
  isLoading.value = false
}

onMounted(() => fetchLogs())

// 💡 核心邏輯：將資料「以身分(Role)」為單位進行群組歸戶
const groupedIdentities = computed(() => {
  const map = {}
  
  rawLogs.value.forEach(log => {
    // 略過空值或無效身分
    if (!log.role || log.role.trim() === '') return
    
    if (!map[log.role]) {
      map[log.role] = {
        role: log.role,
        latestTime: log.created_at,
        devices: new Set(), // 使用 Set 確保設備清單不重複
        logs: []
      }
    }
    
    map[log.role].logs.push(log)
    // 組合 IP 與 UA 以辨識不同設備
    map[log.role].devices.add(`${log.ip_address || '未知IP'}|${log.device_info || '未知設備'}`)
    
    // 更新最後活動時間
    if (new Date(log.created_at) > new Date(map[log.role].latestTime)) {
      map[log.role].latestTime = log.created_at
    }
  })

  return Object.values(map).sort((a, b) => new Date(b.latestTime) - new Date(a.latestTime))
})

// 搜尋過濾器
const filteredIdentities = computed(() => {
  if (!searchQuery.value) return groupedIdentities.value
  const q = searchQuery.value.toLowerCase()
  return groupedIdentities.value.filter(u => u.role.toLowerCase().includes(q))
})

// ================= 輔助解析函式 =================

const extractName = (roleStr) => {
  if (roleStr.includes('家長')) return roleStr.split('家長')[0].trim()
  if (roleStr.includes('學生')) return roleStr.split('學生')[0].trim()
  return roleStr
}

const extractRoleType = (roleStr) => {
  if (roleStr.includes('家長')) return '家長'
  if (roleStr.includes('學生')) return '學生'
  if (roleStr.includes('導師')) return '導師'
  if (roleStr.includes('任課老師')) return '科任'
  return '幹部'
}

const getRoleIcon = (roleStr) => {
  if (roleStr.includes('家長')) return '👨‍👩‍👦'
  if (roleStr.includes('學生')) return '🎒'
  if (roleStr.includes('老師') || roleStr.includes('導師')) return '👨‍🏫'
  return '🛡️'
}

const getRoleBadgeClass = (roleStr) => {
  if (roleStr.includes('家長')) return 'badge-parent'
  if (roleStr.includes('學生')) return 'badge-student'
  if (roleStr.includes('老師') || roleStr.includes('導師')) return 'badge-teacher'
  return 'badge-admin'
}

const parseUserAgent = (ua) => {
  if (!ua || ua === '未知設備') return '未知設備'
  let os = '未知系統'; let browser = '未知瀏覽器'
  
  if (ua.includes('Win')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'Mac / iOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('Linux')) os = 'Linux'

  if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Edge')) browser = 'Edge'

  const isMobile = ua.includes('Mobile') ? '📱手機' : '💻電腦'
  return `${isMobile} (${os} - ${browser})`
}

const formatTime = (iso, short = false) => {
  if (!iso) return ''
  const d = new Date(iso)
  return short 
    ? `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    : d.toLocaleString('zh-TW', { hour12: false })
}
const formatDateOnly = (iso) => iso ? new Date(iso).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }) : ''
const formatTimeOnly = (iso) => iso ? new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : ''

const getActionCategory = (action) => {
  if (!action) return '📌 動作'
  if (action.includes('點擊') || action.includes('按鈕')) return '🖱️ 點擊'
  if (action.includes('瀏覽') || action.includes('進入')) return '👁️ 瀏覽'
  if (action.includes('登入') || action.includes('綁定') || action.includes('解鎖')) return '🔑 驗證'
  return '📌 動作'
}

const getActionClass = (action) => {
  if (!action) return 'tag-default'
  if (action.includes('點擊') || action.includes('按鈕')) return 'tag-click'
  if (action.includes('瀏覽') || action.includes('進入')) return 'tag-view'
  if (action.includes('登入') || action.includes('綁定') || action.includes('解鎖')) return 'tag-auth'
  return 'tag-default'
}
</script>

<style scoped>
.tracking-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-family: sans-serif;}
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 10px; }
.table-header h3 { margin: 0; color: #334155; font-size: 1.4rem;}
.refresh-btn { background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;}
.refresh-btn:hover:not(:disabled) { background: #e2e8f0; }
.help-text { color: #64748b; font-size: 0.95rem; margin-bottom: 20px; line-height: 1.5; }

.main-layout { display: flex; gap: 20px; align-items: flex-start; height: 750px;}

/* 左側身分清單 */
.identity-list-panel { width: 380px; flex-shrink: 0; display: flex; flex-direction: column; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; height: 100%; overflow: hidden;}
.panel-header { padding: 15px; background: #e2e8f0; font-weight: bold; color: #1e293b; text-align: center; font-size: 1.05rem;}
.search-bar { padding: 10px 15px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }
.search-input { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; box-sizing: border-box; }
.search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }

.list-wrapper { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
.identity-card { background: white; padding: 15px; border-radius: 8px; border: 2px solid transparent; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; transition: 0.2s; }
.identity-card:hover { border-color: #cbd5e1; transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.identity-card.active { border-color: #8b5cf6; background: #faf5ff; }

.v-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.role-badge { padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: bold; }
.badge-parent { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.badge-student { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.badge-teacher { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
.badge-admin { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }

.v-time { font-size: 0.85rem; color: #64748b; }
.v-name { font-size: 1.1rem; font-weight: bold; color: #1e293b; margin-bottom: 10px; line-height: 1.4;}
.v-footer { display: flex; justify-content: space-between; font-size: 0.85rem; color: #475569; border-top: 1px dashed #e2e8f0; padding-top: 8px;}
.v-devices { color: #8b5cf6; font-weight: bold; }

/* 右側時間軸 */
.timeline-panel { flex: 1; min-width: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; height: 100%; display: flex; flex-direction: column; }
.empty-prompt { display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 1.1rem; font-style: italic; background: #f8fafc; border-radius: 8px;}

.timeline-wrapper { display: flex; flex-direction: column; height: 100%; }
.timeline-header { padding: 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px 8px 0 0; }
.detail-title { margin: 0 0 15px 0; color: #1e293b; font-size: 1.3rem; }

.device-box { background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 15px; }
.device-box-title { font-weight: bold; color: #475569; font-size: 0.95rem; margin-bottom: 8px;}
.device-list { margin: 0; padding-left: 20px; font-size: 0.9rem; color: #334155; }
.device-list li { margin-bottom: 4px; }

.timeline-content { flex: 1; overflow-y: auto; padding: 20px 30px; }
.timeline-item { display: flex; gap: 20px; }
.time-col { width: 90px; text-align: right; flex-shrink: 0; padding-top: 2px; }
.t-date { font-size: 0.85rem; color: #64748b; }
.t-time { font-size: 1.05rem; font-weight: bold; color: #1e293b; font-family: monospace;}

.dot-col { display: flex; flex-direction: column; align-items: center; width: 20px; flex-shrink: 0; }
.dot { width: 12px; height: 12px; border-radius: 50%; background: #8b5cf6; border: 3px solid #ddd6fe; margin-top: 5px; z-index: 2;}
.line { flex: 1; width: 2px; background: #e2e8f0; min-height: 45px; margin-top: 5px; margin-bottom: 5px;}

.action-col { flex: 1; padding-bottom: 30px; }
.action-header { margin-bottom: 6px; display: flex; align-items: flex-start; gap: 10px;}
.action-tag { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; flex-shrink: 0; margin-top: 2px;}
.action-text { font-size: 1.1rem; color: #334155; line-height: 1.5; font-weight: bold;}
.action-meta { font-size: 0.85rem; color: #94a3b8; margin-top: 4px;}

.tag-view { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.tag-click { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
.tag-auth { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
.tag-default { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

.loading-state, .empty-state { text-align: center; padding: 50px 20px; color: #64748b; font-style: italic; }
</style>
