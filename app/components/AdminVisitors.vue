<template>
  <div class="visitors-container">
    <div class="table-header">
      <h3>👁️ 網站訪客與登入紀錄</h3>
      <button @click="fetchLogs" class="btn-refresh">🔄 重新整理</button>
    </div>

    <div class="stats-cards">
      <div class="stat-card">總瀏覽人次: <strong>{{ logs.length }}</strong></div>
      <div class="stat-card">今日訪客: <strong>{{ todayCount }}</strong></div>
      <div class="stat-card">管理員/股長登入: <strong>{{ adminCount }}</strong></div>
    </div>

    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>來訪時間</th>
            <th>IP 位址</th>
            <th>身分角色</th>
            <th>設備與瀏覽器資訊</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="4" class="empty-state">⏳ 紀錄載入中...</td>
          </tr>
          <tr v-else-if="logs.length === 0">
            <td colspan="4" class="empty-state">目前尚無任何訪客紀錄。</td>
          </tr>
          <tr v-for="log in paginatedLogs" :key="log.id" :class="{ 'highlight-row': log.role !== '匿名來訪者' }">
            <td class="time-col">{{ formatTime(log.created_at) }}</td>
            <td class="ip-col font-mono">{{ log.ip_address }}</td>
            <td>
              <span :class="['role-badge', getRoleClass(log.role)]">{{ log.role }}</span>
            </td>
            <td class="device-col">
              <div class="device-type">{{ parseDeviceType(log.device_info) }}</div>
              <div class="device-raw">{{ log.device_info }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 簡易分頁 -->
    <div class="pagination" v-if="totalPages > 1">
      <button @click="currentPage--" :disabled="currentPage === 1">◀ 上一頁</button>
      <span>第 {{ currentPage }} 頁 / 共 {{ totalPages }} 頁</span>
      <button @click="currentPage++" :disabled="currentPage === totalPages">下一頁 ▶</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()

const logs = ref([])
const isLoading = ref(true)
const currentPage = ref(1)
const itemsPerPage = 30

const fetchLogs = async () => {
  isLoading.value = true
  const { data, error } = await supabase
    .from('visitor_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500) // 預設撈取最新500筆避免效能問題
  
  if (data) logs.value = data
  isLoading.value = false
}

onMounted(() => {
  fetchLogs()
})

const todayCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return logs.value.filter(log => log.created_at.startsWith(today)).length
})

const adminCount = computed(() => {
  return logs.value.filter(log => log.role !== '匿名來訪者').length
})

const totalPages = computed(() => Math.ceil(logs.value.length / itemsPerPage))

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return logs.value.slice(start, end)
})

const formatTime = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleString('zh-TW', { 
    month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
  })
}

const parseDeviceType = (ua) => {
  if (!ua) return '❓ 未知設備'
  const uaLower = ua.toLowerCase()
  if (uaLower.includes('iphone') || uaLower.includes('ipad')) return '📱 Apple iOS 設備'
  if (uaLower.includes('android') && uaLower.includes('mobile')) return '📱 Android 手機'
  if (uaLower.includes('android')) return '📱 Android 平板'
  if (uaLower.includes('mac os')) return '💻 Mac 電腦'
  if (uaLower.includes('windows')) return '🖥️ Windows 電腦'
  if (uaLower.includes('linux')) return '💻 Linux 電腦'
  return '💻 其他設備'
}

const getRoleClass = (role) => {
  if (role === '導師') return 'role-teacher'
  if (role === '股長') return 'role-officer'
  return 'role-anonymous'
}
</script>

<style scoped>
.visitors-container { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px; }
.table-header h3 { margin: 0; color: #1e293b; font-size: 1.3rem; }
.btn-refresh { background: #3b82f6; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }

.stats-cards { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card { flex: 1; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 1.1rem; color: #475569; text-align: center; }
.stat-card strong { font-size: 1.4rem; color: #0f766e; display: block; margin-top: 5px; }

.table-responsive { width: 100%; overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th, .data-table td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; }
.data-table th { background: #f1f5f9; color: #475569; font-weight: bold; white-space: nowrap; }
.highlight-row { background: #f0fdfa; }

.time-col { color: #64748b; white-space: nowrap; font-size: 0.95rem; }
.ip-col { font-family: monospace; color: #3b82f6; font-weight: bold; }
.font-mono { font-family: monospace; }

.role-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; }
.role-anonymous { background: #e2e8f0; color: #475569; }
.role-teacher { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
.role-officer { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }

.device-col { max-width: 300px; }
.device-type { font-weight: bold; color: #334155; margin-bottom: 4px; }
.device-raw { font-size: 0.8rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.empty-state { text-align: center; padding: 30px; color: #94a3b8; font-style: italic; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 20px; }
.pagination button { padding: 6px 15px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; cursor: pointer; color: #334155; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
