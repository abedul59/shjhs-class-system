<template>
  <div class="page-container">
    <div class="chat-wrapper">
      <!-- 頂部標題與返回按鈕 -->
      <div class="chat-header">
        <h2 class="title">💬 學生私訊專區</h2>
        <button @click="goBack" class="btn btn-dark">⬅️ 返回首頁</button>
      </div>

      <!-- 訊息顯示區 -->
      <div class="messages-container">
        <div v-if="isLoading" class="system-msg">檢查網路環境與載入訊息中...</div>
        <div v-else-if="messages.length === 0" class="system-msg">目前沒有訊息，來打個招呼吧！</div>
        
        <div v-else class="message-list">
          <div 
            v-for="(msg, index) in messages" 
            :key="index" 
            :class="['message-bubble', msg.sender === 'student' ? 'my-message' : 'teacher-message']"
          >
            <div class="message-info">
              <span class="sender-name">{{ msg.sender === 'student' ? '我' : '導師' }}</span>
              <span class="message-time">{{ msg.time }}</span>
            </div>
            <div class="message-text">{{ msg.content }}</div>
          </div>
        </div>
      </div>

      <!-- 輸入區 -->
      <div class="input-area">
        <input 
          v-model="newMessage" 
          @keyup.enter="sendMessage"
          type="text" 
          placeholder="輸入訊息..." 
          class="chat-input"
          :disabled="isLoading"
        />
        <button @click="sendMessage" class="btn btn-blue send-btn" :disabled="isLoading || !newMessage.trim()">
          發送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const messages = ref([])
const newMessage = ref('')
const isLoading = ref(true)

// 返回首頁
const goBack = () => {
  navigateTo('/')
}

// --- 🛡️ 核心防護：學校網域 IP 攔截 ---
const checkSecurityAndLoad = async () => {
  isLoading.value = true
  try {
    // 1. 取得使用者真實 IP
    const res = await fetch('https://api.ipify.org?format=json')
    const ipData = await res.json()
    const clientIp = ipData.ip

    // 2. 從資料庫抓取安全與 IP 限制設定 (黑名單)
    const { data: blacklists } = await supabase
      .from('ip_restrictions') // 假設您的資料表名稱，請依實際情況調整
      .select('ip_address')
      .eq('type', '黑名單')

    // 3. 檢查是否在黑名單網段內 (使用 startsWith 涵蓋 120.116. 這種寫法)
    if (blacklists && blacklists.length > 0) {
      const isBlocked = blacklists.some(rule => {
        return rule.ip_address && clientIp.startsWith(rule.ip_address.trim())
      })
      
      if (isBlocked) {
        alert('🚫 學校網域限制：為維護上課專注度，校內網路禁止使用私訊功能。請回家或使用個人手機網路再進行操作！')
        navigateTo('/') // 強制踢回首頁
        return // 終止後續載入
      }
    }

    // 4. 若通過檢查，則載入歷史訊息 (此處為模擬資料，請替換為您的實際查詢)
    await fetchMessages()
    
  } catch (error) {
    console.error('IP 驗證或載入失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 載入訊息邏輯 (需替換為您的 Supabase 邏輯)
const fetchMessages = async () => {
  // 模擬載入
  messages.value = [
    { sender: 'teacher', content: '各位同學，有任何問題都可以在這裡私訊老師喔！', time: '08:00' }
  ]
}

// 發送訊息邏輯
const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  
  const now = new Date()
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  
  messages.value.push({
    sender: 'student',
    content: newMessage.value,
    time: timeString
  })
  
  // TODO: 將訊息寫入 Supabase 資料庫
  newMessage.value = ''
}

onMounted(() => {
  checkSecurityAndLoad()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: #f3f4f6;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
.chat-wrapper {
  background: white;
  width: 100%;
  max-width: 800px;
  height: 85vh;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.chat-header {
  background: #3b82f6;
  color: white;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title { margin: 0; font-size: 1.2rem; }
.btn {
  padding: 8px 15px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: bold;
}
.btn-dark { background: #1e293b; color: white; }
.btn-blue { background: #2563eb; color: white; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.messages-container {
  flex: 1;
  padding: 20px;
  background: #f8fafc;
  overflow-y: auto;
}
.system-msg {
  text-align: center;
  color: #64748b;
  margin-top: 20px;
  font-style: italic;
}
.message-list { display: flex; flex-direction: column; gap: 15px; }
.message-bubble {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 8px;
}
.my-message {
  align-self: flex-end;
  background: #dbeafe;
  border: 1px solid #bfdbfe;
}
.teacher-message {
  align-self: flex-start;
  background: white;
  border: 1px solid #e2e8f0;
}
.message-info {
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 5px;
  display: flex;
  gap: 10px;
}
.message-text { font-size: 1rem; color: #1e293b; line-height: 1.4; }

.input-area {
  padding: 15px;
  background: white;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 10px;
}
.chat-input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 1rem;
}
.send-btn { width: 80px; }
</style>
