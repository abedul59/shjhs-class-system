<template>
  <div class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <h3>🚨 發送緊急通知</h3>
        <button class="close-btn" @click="$emit('close')">✖</button>
      </div>
      
      <div class="form-group">
        <label>👩‍🎓 選擇學生：</label>
        <select v-model="selectedStudent" @change="fetchParentsEmails" :disabled="isSending">
          <option disabled value="">請選擇學生...</option>
          <option v-for="student in studentList" :key="student.id" :value="student">
            {{ student.seat_number }}號 - {{ student.real_name }}
          </option>
        </select>
      </div>

      <div v-if="parentsEmails.length > 0" class="form-group">
        <label>👨‍👩‍👧 收件家長：</label>
        <span v-for="email in parentsEmails" :key="email" class="email-badge">
          ☑️ {{ maskEmail(email) }}
        </span>
      </div>
      <div v-else-if="selectedStudent" class="warning-text">
        ⚠️ 該學生尚未綁定家長信箱，將無法寄送信件。
      </div>

      <div class="template-buttons" v-if="selectedStudent">
        <button @click="applyTemplate('fever')">🌡️ 發燒/生病</button>
        <button @click="applyTemplate('stomach')">🤢 腸胃不適</button>
        <button @click="applyTemplate('injury')">🩹 意外受傷</button>
      </div>

      <div v-if="selectedStudent" class="form-group">
        <textarea v-model="messageContent" rows="8" placeholder="請選擇上方公版或直接輸入通知內容..." :disabled="isSending"></textarea>
      </div>

      <button class="submit-btn" @click="sendNotification" :disabled="isSending || parentsEmails.length === 0">
        {{ isSending ? '發送與寫入中...' : '📤 發送通知並寫入系統紀錄' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()
const emit = defineEmits(['close'])

const studentList = ref([])
const selectedStudent = ref('')
const parentsEmails = ref([])
const messageContent = ref('')
const isSending = ref(false)

// 初始化載入真實學生名單
onMounted(async () => {
  const { data } = await supabase.from('students').select('*').order('seat_number')
  if (data) studentList.value = data
})

// 遮蔽 Email 顯示 (保護隱私)
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email
  const [name, domain] = email.split('@')
  return `${name.substring(0, 2)}***@${domain}`
}

// 根據選擇的學生，動態抓取真實家長 Email
const fetchParentsEmails = async () => {
  parentsEmails.value = []
  if (!selectedStudent.value) return

  const { data, error } = await supabase
    .from('parents')
    .select('email')
    .eq('student_id', selectedStudent.value.id)

  if (data && data.length > 0) {
    parentsEmails.value = data.map(p => p.email).filter(e => e)
  }
}

// 帶入公版文字
const applyTemplate = (type) => {
  const name = selectedStudent.value.real_name 
  let condition = ''
  if (type === 'fever') condition = '【發燒，目前體溫 ___ 度，已在健康中心休息】'
  if (type === 'stomach') condition = '【嚴重腸胃不適/嘔吐，已在健康中心休息】'
  if (type === 'injury') condition = '【發生意外受傷：___，已做初步包紮處理】'

  messageContent.value = `親愛的家長您好：\n\n您的孩子 ${name} 目前在校身體不適。\n狀況為：${condition}。\n\n為求慎重與孩子健康，請您盡速撥冗至學校將孩子接回就醫休息。\n若有任何問題請隨時透過系統私訊或電話聯繫。\n\n導師 敬上`
}

// 驗證密碼、呼叫 API 寄信與寫入資料庫
const sendNotification = async () => {
  if (!selectedStudent.value || !messageContent.value.trim()) {
    alert('請確認已選擇學生並輸入通知內容！')
    return
  }

  // 🔒 加入導師密碼驗證
  const pwd = window.prompt("🔒 確認發送緊急通知，請輸入「導師」密碼：")
  if (pwd !== '168168168') {
    alert("❌ 密碼錯誤！發送已取消。")
    return
  }

  isSending.value = true
  try {
    // 1. 呼叫後端 API 實際寄信
    await $fetch('/api/send-email', {
      method: 'POST',
      body: {
        to: parentsEmails.value,
        subject: `【緊急通知】${selectedStudent.value.real_name} 身體不適聯繫`,
        text: messageContent.value,
        html: messageContent.value.replace(/\n/g, '<br>')
      }
    })

    // 2. 寫入 Supabase 紀錄
    const { error: dbError } = await supabase.from('communication_logs').insert({
      student_id: selectedStudent.value.id,
      notification_type: '生病手動通知',
      sent_by: '導師',
      recipient_emails: parentsEmails.value.join(','),
      message_content: messageContent.value
    })

    if (dbError) throw new Error("寫入紀錄失敗：" + dbError.message)

    alert('✅ 緊急通知已成功發送至家長信箱，並已留下系統紀錄！')
    emit('close') // 發送成功後自動關閉視窗
  } catch (error) {
    alert('❌ 發送失敗：' + error.message)
    console.error(error)
  } finally {
    isSending.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}
.modal-container { 
  border-top: 6px solid #ef4444; 
  padding: 25px; 
  border-radius: 12px; 
  background: #fff; 
  width: 100%;
  max-width: 550px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.modal-header h3 { margin: 0; color: #b91c1c; font-size: 1.4rem; }
.close-btn { 
  background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; 
}
.close-btn:hover { color: #475569; }

.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #334155; }
select, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
}
textarea { resize: vertical; font-family: inherit; line-height: 1.5; }

.template-buttons { margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 8px; }
.template-buttons button { 
  background: #fee2e2; color: #991b1b; font-weight: bold;
  border: 1px solid #fecaca; padding: 8px 12px; border-radius: 6px; cursor: pointer; 
  transition: background 0.2s;
}
.template-buttons button:hover { background: #fecaca; }

.email-badge { background: #e0f7fa; color: #006064; padding: 5px 10px; border-radius: 12px; margin-right: 5px; font-size: 0.9em; display: inline-block; }
.warning-text { color: #ea580c; font-size: 0.9rem; margin-bottom: 15px; font-weight: bold; }

.submit-btn {
  width: 100%;
  padding: 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 10px;
}
.submit-btn:disabled { background: #fca5a5; cursor: not-allowed; }
</style>
