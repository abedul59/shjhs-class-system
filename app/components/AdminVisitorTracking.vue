<template>
  <div class="tracking-container">
    <div class="table-header">
      <h3>👣 訪客足跡與行為追蹤系統</h3>
      <button @click="fetchLogs" class="refresh-btn" :disabled="isLoading">
        {{ isLoading ? '🔄 載入中...' : '🔄 重新整理' }}
      </button>
    </div>
    
    <p class="help-text">系統會根據訪客的「IP 位置」與「設備特徵」自動生成唯一的「訪客編號」，方便您追蹤特定人士的網站瀏覽動線。</p>

    <div class="main-layout">
      <!-- 左側：獨立訪客清單 -->
      <div class="visitor-list-panel">
        <div class="panel-header">👥 獨立訪客清單 (依最新活動排序)</div>
        
        <div v-if="isLoading" class="loading-state">載入足跡中...</div>
        <div v-else-if="sortedVisitors.length === 0" class="empty-state">目前無任何訪客紀錄</div>
        
        <div v-else class="list-wrapper">
          <div v-for="v in sortedVisitors" :key="v.id" 
               class="visitor-card" 
               :class="{ active: selectedVisitor?.id === v.id }"
               @click="selectedVisitor = v">
            <div class="v-header">
              <span class="v-id">{{ v.id }}</span>
              <span class="v-time">{{ formatTime(v.latestTime, true) }}</span>
            </div>
            <div class="v-info">📍 IP: {{ maskIP(v.ip) }}</div>
            <div class="v-info">💻 {{ v.deviceSummary }}</div>
            <div class="v-count">共 {{ v.logs.length }} 筆動作</div>
          </div>
        </div>
      </div>

      <!-- 右側：活動時間軸 -->
      <div class="timeline-panel">
        <div v-if="!selectedVisitor" class="empty-prompt">
          👈 請從左側選擇一位訪客以查看他的詳細活動軌跡
        </div>
        
        <div v-else class="timeline-wrapper">
          <div class="timeline-header">
            <h4>訪客 {{ selectedVisitor.id }} 的活動軌跡</h4>
            <div class="v-details">
              <span><strong>完整 IP：</strong> {{ selectedVisitor.ip }}</span>
              <span><strong>設備資訊：</strong> {{ selectedVisitor.device }}</span>
            </div>
          </div>
          
          <div class="timeline-content">
            <div v-for="(log, idx) in selectedVisitor.logs" :key="idx" class="timeline-item">
              <div class="time-col">
                <div class="t-date">{{ formatDateOnly(log.created_at) }}</div>
                <div class="t-time">{{ formatTimeOnly(log.created_at) }}</div>
              </div>
              <div class="dot-col">
                <div class="dot"></div>
                <div class="line" v-if="idx !== selectedVisitor.logs.length - 1"></div>
              </div>
              <div class="action-col">
                <span class="action-tag" :class="getActionClass(log.action)">{{ getActionCategory(log.action) }}</span>
                <span class="action-text">{{ log.action }}</span>
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
const selectedVisitor = ref(null)

// 💡 解析 User-Agent 取得易讀的設備名稱
const parseUserAgent = (ua) => {
  if (!ua) return '未知設備'
  let os = '未知系統'; let browser = '未知瀏覽器'
  
  if (ua.includes('Win')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'Mac / iOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('Linux')) os = 'Linux'

  if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Edge')) browser = 'Edge'

  const isMobile = ua.includes('Mobile') ? '📱 手機' : '💻 電腦'
  return `${isMobile} (${os} - ${browser})`
}

// 💡 雜湊演算法：將 IP + UA 轉換為獨一無二的 5 碼英數編號
const generateVisitorId = (ip, ua) => {
  const str = `${ip}|${ua}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0 
  }
  return 'V-' + Math.abs(hash).toString(16).toUpperCase().padStart(5, '0').substring(0, 5)
}

const fetchLogs = async () => {
  isLoading.value = true
  selectedVisitor.value = null
  
  // 假設您的資料表 visitor_logs 已經新增了 action_details 欄位
  const { data } = await supabase.from('visitor_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000) // 抓取最近 1000 筆紀錄
    
  rawLogs.value = data || []
  isLoading.value = false
}

onMounted(() => fetchLogs())

// 💡 資料分群邏輯：將散落的 Log 依據「IP+設備」組成獨立訪客陣列
const sortedVisitors = computed(() => {
  const visitorsMap = {}
  
  rawLogs.value.forEach(log => {
    const key = `${log.ip_address}|${log.device_info}`
    
    if (!visitorsMap[key]) {
      visitorsMap[key] = {
        id: generateVisitorId(log.ip_address, log.device_info),
        ip: log.ip_address || '未知 IP',
        device: log.device_info || '未知設備',
        deviceSummary: parseUserAgent(log.device_info),
        latestTime: log.created_at,
        logs: []
      }
    }
    
    // 如果資料庫還沒新增 action_details 欄位，暫時拿 role 來顯示
    const actionDesc = log.action_details || log.role || '造訪網站'
    
    visitorsMap[key].logs.push({
      created_at: log.created_at,
      action: actionDesc
    })
    
    // 更新該訪客的最後上線時間
    if (new Date(log.created_at) > new Date(visitorsMap[key].latestTime)) {
      visitorsMap[key].latestTime = log.created_at
    }
  })

  // 將 Object 轉為 Array 並依照最新活動時間排序
  return Object.values(visitorsMap).sort((a, b) => new Date(b.latestTime) - new Date(a.latestTime))
})

// 輔助函式
const maskIP = (ip) => {
  if (!ip || ip.includes('未知')) return '未知 IP'
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`
  return ip.substring(0, 8) + '...'
}

const formatTime = (iso, short = false) => {
  if (!iso) return ''
  const d = new Date(iso)
  return short 
    ? d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    : d.toLocaleString('zh-TW', { hour12: false })
}
const formatDateOnly = (iso) => iso ? new Date(iso).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }) : ''
const formatTimeOnly = (iso) => iso ? new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : ''

// 判斷動作類型給予不同顏色標籤
const getActionCategory = (action) => {
  if (action.includes('點擊') || action.includes('按鈕')) return '🖱️ 點擊'
  if (action.includes('瀏覽') || action.includes('進入')) return '👁️ 瀏覽'
  if (action.includes('登入') || action.includes('解鎖')) return '🔑 驗證'
  return '📌 動作'
}
const getActionClass = (action) => {
  if (action.includes('點擊') || action.includes('按鈕')) return 'tag-click'
  if (action.includes('瀏覽') || action.includes('進入')) return 'tag-view'
  if (action.includes('登入') || action.includes('解鎖')) return 'tag-auth'
  return 'tag-default'
}
</script>

<style scoped>
.tracking-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-family: sans-serif;}
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 10px; }
.table-header h3 { margin: 0; color: #334155; font-size: 1.4rem;}
.refresh-btn { background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;}
.refresh-btn:hover:not(:disabled) { background: #e2e8f0; }
.help-text { color: #64748b; font-size: 0.95rem; margin-bottom: 20px; }

.main-layout { display: flex; gap: 20px; align-items: flex-start; height: 650px;}

/* 左側訪客清單 */
.visitor-list-panel { width: 350px; flex-shrink: 0; display: flex; flex-direction: column; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; height: 100%; overflow: hidden;}
.panel-header { padding: 15px; background: #e2e8f0; font-weight: bold; color: #1e293b; text-align: center; }
.list-wrapper { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
.visitor-card { background: white; padding: 15px; border-radius: 8px; border: 2px solid transparent; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; transition: 0.2s; }
.visitor-card:hover { border-color: #cbd5e1; transform: translateY(-2px); }
.visitor-card.active { border-color: #3b82f6; background: #eff6ff; }
.v-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.v-id { font-weight: bold; font-size: 1.1rem; color: #0f766e; background: #ccfbf1; padding: 2px 8px; border-radius: 4px;}
.v-time { font-size: 0.8rem; color: #64748b; }
.v-info { font-size: 0.9rem; color: #475569; margin-bottom: 4px; }
.v-count { font-size: 0.85rem; color: #3b82f6; font-weight: bold; margin-top: 8px; text-align: right;}

/* 右側時間軸 */
.timeline-panel { flex: 1; min-width: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; height: 100%; display: flex; flex-direction: column; }
.empty-prompt { display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 1.1rem; font-style: italic; background: #f8fafc; border-radius: 8px;}

.timeline-wrapper { display: flex; flex-direction: column; height: 100%; }
.timeline-header { padding: 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px 8px 0 0; }
.timeline-header h4 { margin: 0 0 10px 0; color: #1e293b; font-size: 1.3rem; }
.v-details { display: flex; gap: 20px; font-size: 0.95rem; color: #475569; }

.timeline-content { flex: 1; overflow-y: auto; padding: 20px 30px; }
.timeline-item { display: flex; gap: 20px; }
.time-col { width: 90px; text-align: right; flex-shrink: 0; padding-top: 2px; }
.t-date { font-size: 0.85rem; color: #64748b; }
.t-time { font-size: 1.05rem; font-weight: bold; color: #1e293b; font-family: monospace;}

.dot-col { display: flex; flex-direction: column; align-items: center; width: 20px; flex-shrink: 0; }
.dot { width: 12px; height: 12px; border-radius: 50%; background: #3b82f6; border: 3px solid #bfdbfe; margin-top: 5px; z-index: 2;}
.line { flex: 1; width: 2px; background: #e2e8f0; min-height: 40px; margin-top: 5px; margin-bottom: 5px;}

.action-col { flex: 1; padding-bottom: 30px; }
.action-tag { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; margin-right: 10px; margin-top: 2px;}
.action-text { font-size: 1.1rem; color: #334155; line-height: 1.5; }

.tag-view { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.tag-click { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
.tag-auth { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
.tag-default { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

.loading-state, .empty-state { text-align: center; padding: 50px 20px; color: #64748b; font-style: italic; }
</style>
