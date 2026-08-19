<template>
  <div class="backup-container">
    <div class="table-header">
      <h3>📦 系統資料備份與還原</h3>
      <p class="subtitle">您可以將整個班級網站的資料（包含學生、聯絡簿、座位、衛生設定、密碼等）完整匯出保存，並在需要時一鍵還原。</p>
    </div>

    <div class="action-cards">
      <!-- 匯出區塊 -->
      <div class="card export-card">
        <div class="card-icon">📥</div>
        <h4>匯出全部資料</h4>
        <p>將目前資料庫中的所有表格打包成一個 JSON 備份檔下載至您的電腦。</p>
        <button @click="exportAllData" class="btn-primary btn-export" :disabled="isProcessing">
          {{ isProcessing && processingType === 'export' ? '打包匯出中...' : '📥 點擊匯出 (JSON)' }}
        </button>
      </div>

      <!-- 匯入區塊 -->
      <div class="card import-card">
        <div class="card-icon">📤</div>
        <h4>匯入全部資料</h4>
        <p>上傳您先前備份的 JSON 檔案，系統將會覆蓋並還原所有資料。</p>
        
        <input 
          type="file" 
          accept=".json" 
          ref="fileInput" 
          @change="handleFileSelect" 
          class="hidden-input" 
          id="backup-upload"
        />
        <label for="backup-upload" class="btn-primary btn-import" :class="{ 'disabled': isProcessing }">
          {{ isProcessing && processingType === 'import' ? '資料還原中...' : '📤 選擇檔案並匯入' }}
        </label>
        <div v-if="selectedFileName" class="selected-file">
          已選擇：{{ selectedFileName }}
          <button @click="executeImport" class="btn-execute">⚠️ 確認執行還原</button>
        </div>
      </div>
    </div>

    <!-- 處理進度提示 -->
    <div v-if="processMessage" :class="['status-message', processStatus]">
      {{ processMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const supabase = useSupabaseClient()

const fileInput = ref(null)
const selectedFile = ref(null)
const selectedFileName = ref('')
const isProcessing = ref(false)
const processingType = ref('') // 'export' 或 'import'
const processMessage = ref('')
const processStatus = ref('') // 'success' 或 'error'

// 定義系統中所有需要備份的核心資料表
// 定義系統中所有需要備份的核心資料表
const coreTables = [
  'students', 
  'parents', 
  'contact_books', 
  'attendances', 
  'discipline_records', 
  'system_settings', 
  'assignments',
  'private_messages',
  'ip_rules',
  // 👇 以下是近期擴充功能所新增的資料表，請補上：
  'email_templates',
  'visitor_logs',
  'communication_logs'
]

const showMessage = (msg, status = 'success') => {
  processMessage.value = msg
  processStatus.value = status
  if (status === 'success') {
    setTimeout(() => { processMessage.value = '' }, 5000)
  }
}

// ================= 匯出邏輯 =================
const exportAllData = async () => {
  if (!confirm('準備匯出全站資料，這可能需要幾秒鐘的時間，確定執行？')) return
  
  isProcessing.value = true
  processingType.value = 'export'
  processMessage.value = '正在從資料庫讀取各項資料...'
  processStatus.value = 'info'

  try {
    const backupData = {
      backup_date: new Date().toISOString(),
      version: '1.0',
      data: {}
    }

    // 逐一抓取每個資料表的資料
    for (const table of coreTables) {
      const { data, error } = await supabase.from(table).select('*')
      if (!error && data) {
        backupData.data[table] = data
      }
    }

    // 將物件轉為 JSON 字串
    const jsonString = JSON.stringify(backupData, null, 2)
    
    // 建立 Blob 並觸發下載
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // 設定預設檔名包含日期
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    link.download = `ClassSystem_Backup_${dateStr}.json`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showMessage('✅ 全站資料匯出成功！已下載至您的電腦。')
  } catch (error) {
    console.error(error)
    showMessage(`❌ 匯出失敗：${error.message}`, 'error')
  } finally {
    isProcessing.value = false
    processingType.value = ''
  }
}

// ================= 匯入邏輯 =================
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      alert('請選擇 JSON 格式的備份檔案！')
      return
    }
    selectedFile.value = file
    selectedFileName.value = file.name
  }
}

const executeImport = async () => {
  if (!selectedFile.value) return
  
  const doubleCheck = confirm('⚠️ 嚴重警告：匯入資料將會「覆寫」目前系統上的現有資料！\n\n強烈建議您在匯入前，先執行一次「匯出」當作保險。您確定要繼續匯入嗎？')
  if (!doubleCheck) return

  isProcessing.value = true
  processingType.value = 'import'
  processMessage.value = '正在解析備份檔案...'
  processStatus.value = 'info'

  try {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const importedJson = JSON.parse(e.target.result)
        
        // 簡單驗證檔案格式
        if (!importedJson.data || !importedJson.backup_date) {
          throw new Error('無效的備份檔案格式。')
        }

        processMessage.value = '檔案解析成功，開始寫入資料庫 (請勿關閉視窗)...'

        const dbData = importedJson.data
        
        // 逐一將資料表寫回 (使用 upsert 進行覆寫/新增)
        for (const table of coreTables) {
          if (dbData[table] && dbData[table].length > 0) {
            const { error } = await supabase
              .from(table)
              .upsert(dbData[table]) // upsert 會根據 Primary Key 自動判斷是新增還是更新
              
            if (error) throw error
          }
        }

        showMessage('🎉 全站資料還原成功！建議您重新整理網頁以套用最新設定。')
        selectedFile.value = null
        selectedFileName.value = ''
        if(fileInput.value) fileInput.value.value = ''

      } catch (err) {
        showMessage(`❌ 匯入過程發生錯誤：${err.message}`, 'error')
      } finally {
        isProcessing.value = false
        processingType.value = ''
      }
    }

    reader.onerror = () => {
      throw new Error('讀取檔案失敗')
    }

    reader.readAsText(selectedFile.value)

  } catch (error) {
    showMessage(`❌ 系統錯誤：${error.message}`, 'error')
    isProcessing.value = false
    processingType.value = ''
  }
}
</script>

<style scoped>
.backup-container { padding: 10px; }
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 25px; }
.table-header h3 { margin: 0 0 10px 0; color: #334155; font-size: 1.5rem;}
.subtitle { color: #64748b; margin: 0; line-height: 1.5; font-size: 1.05rem;}

.action-cards { display: flex; gap: 20px; flex-wrap: wrap; }
.card { flex: 1; min-width: 300px; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: center; transition: 0.3s; }
.card:hover { box-shadow: 0 10px 15px rgba(0,0,0,0.08); transform: translateY(-2px); }
.card-icon { font-size: 3.5rem; margin-bottom: 15px; }
.card h4 { margin: 0 0 15px 0; font-size: 1.3rem; color: #1e293b; }
.card p { color: #64748b; margin-bottom: 25px; font-size: 0.95rem; line-height: 1.5; min-height: 45px;}

.btn-primary { display: inline-block; width: 80%; padding: 12px 20px; border-radius: 8px; font-size: 1.1rem; font-weight: bold; color: white; border: none; cursor: pointer; transition: 0.2s; box-sizing: border-box;}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled, .btn-primary.disabled { opacity: 0.5; cursor: not-allowed; }

.btn-export { background-color: #3b82f6; }
.btn-import { background-color: #10b981; }

.hidden-input { display: none; }

.selected-file { margin-top: 15px; font-size: 0.95rem; color: #047857; background: #ecfdf5; padding: 12px; border-radius: 6px; border: 1px dashed #34d399; font-weight: bold;}
.btn-execute { display: block; width: 100%; margin-top: 10px; background: #ef4444; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.btn-execute:hover { background: #dc2626; }

.status-message { margin-top: 25px; padding: 15px; border-radius: 8px; font-weight: bold; text-align: center; font-size: 1.1rem;}
.status-message.info { background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.status-message.success { background-color: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.status-message.error { background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

@media (max-width: 768px) {
  .action-cards { flex-direction: column; }
  .btn-primary { width: 100%; }
}
</style>
