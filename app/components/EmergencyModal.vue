<template>
  <div class="modal-overlay">
    <div class="modal-container">
      
      <!-- 標題區 -->
      <div class="modal-header">
        <h3>🚨 發送緊急通知</h3>
        <button class="close-btn" @click="$emit('close')">✖</button>
      </div>
      
      <!-- 內容滾動區 (避免上下合併後視窗太長) -->
      <div class="modal-body">
        
        <!-- ================= 上半部：編輯區 ================= -->
        <div class="edit-section">
          <div class="form-group">
            <label>👩‍🎓 選擇學生：</label>
            <select v-model="selectedStudent" @change="handleStudentChange" :disabled="isSending">
              <option disabled value="">請選擇學生...</option>
              <option v-for="student in studentList" :key="student.id" :value="student">
                {{ student.seat_number }}號 - {{ student.real_name }}
              </option>
            </select>
          </div>

          <div v-if="parentsEmails.length > 0" class="form-group">
            <label>👨‍👩‍👧 收件家長：</label>
            <div class="checkbox-group">
              <label v-for="email in parentsEmails" :key="email" class="email-badge checkbox-label">
                <input type="checkbox" :value="email" v-model="selectedEmails" />
                {{ maskEmail(email) }}
              </label>
            </div>
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
            <textarea v-model="messageContent" rows="6" placeholder="請選擇上方公版或直接輸入通知內容..." :disabled="isSending"></textarea>
          </div>
        </div>

        <!-- ================= 下半部：即時預覽區 ================= -->
        <div v-if="selectedStudent && messageContent.trim()" class="preview-section">
          <div class="divider">
            <span>👇 即時信件預覽 👇</span>
          </div>
          
          <div class="preview-box">
            <div class="preview-item">
              <strong>📧 收件人：</strong> 
              <span v-if="selectedEmails.length > 0">{{ selectedEmails.map(maskEmail).join(', ') }}</span>
              <span v-else class="error-text">尚未勾選收件人！</span>
            </div>
            <div class="preview-item">
              <strong>📋 主旨：</strong> 
              【緊急通知】{{ selectedStudent.real_name }} 身體不適聯繫
            </div>
            <div class="preview-item"><strong>📝 信件內容：</strong></div>
            <!-- 這裡使用 v-html 來正確渲染 <br> -->
            <div class="preview-content" v-html="formattedMessage"></div>
          </div>
        </div>

      </div>

      <!-- 底部按鈕區 -->
      <div class="modal-footer">
        <button class="submit-btn" @click="sendNotification" :disabled="isSending || selectedEmails.length === 0 || !messageContent.trim()">
          {{ isSending ? '發送與寫入中...' : '📤 確認發送並寫入系統紀錄' }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()
const emit = defineEmits(['close'])

const studentList = ref([])
const selectedStudent = ref('')
const parentsEmails = ref([])
const selectedEmails = ref([]) 
const messageContent = ref('')
const isSending = ref(false)

// 專門提供給 HTML 預覽用的變數，將換行符號 \n 轉成 <br>
const formattedMessage = computed(() => {
  return messageContent.value.replace(/\n/g, '<br>')
})

onMounted(async () => {
  const { data } = await supabase.from('students').select('*').order('seat_number')
  if (data) studentList.value = data
})

const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email
  const [name, domain] = email.split('@')
  return `${name.substring(0, 2)}***@${domain}`
}

const handleStudentChange = async () => {
  parentsEmails.value = []
  selectedEmails.value = []
  
  if (!selectedStudent.value) return

  const { data, error } = await supabase
    .from('parents')
    .select('email')
    .eq('student_id', selectedStudent.value.id)

  if (data && data.length > 0) {
    const emails = data.map(p => p.email).filter(e => e)
    parentsEmails.value = emails
    selectedEmails.value = [...emails] 
  }
}

const applyTemplate = (type) => {
  const name = selectedStudent.value.real_name 
  let condition = ''
  if (type === 'fever') condition = '【發燒，目前體溫 ___ 度，已在健康中心休息】'
  if (type === 'stomach') condition = '【嚴重腸胃不適/嘔吐，已在健康中心休息】'
  if (type === 'injury') condition = '【發生意外受傷：___，已做初步包紮處理】'

  messageContent.value = `親愛的家長您好：\n\n您的孩子 ${name} 目前在校身體不適。\n狀況為：${condition}。\n\n為求慎重與孩子健康，請您盡速撥冗至學校將孩子接回就醫休息。\n若有任何問題請隨時透過系統私訊或電話聯繫。\n\n導師 敬上`
}

const sendNotification = async () => {
  isSending.value = true
  try {
    // 💡 修正 <br> 漏出問題：嚴格區分文字(帶 \n) 與 HTML(帶 <br>)
    await $fetch('/api/send-email', {
      method: 'POST',
      body: {
        to: selectedEmails.value,
        subject: `【緊急通知】${selectedStudent.value.real_name} 身體不適聯繫`,
        text: messageContent.value,          // 給純文字寄信器用
        content: messageContent.value,       // 避免後端預設抓 content
        message: messageContent.value,       // 避免後端預設抓 message
        html: formattedMessage.value         // 給支援 HTML 的寄信器用
      }
    })

    const { error: dbError } = await supabase.from('communication_logs').insert({
      student_id: selectedStudent.value.id,
      notification_type: '生病手動通知',
      sent_by: '導師',
      recipient_emails: selectedEmails.value.join(','),
      message_content: messageContent.value // 存入資料庫一律保持原始 \n
    })

    if (dbError) throw new Error("寫入紀錄失敗：" + dbError.message)

    alert('✅ 緊急通知已成功發送至家長信箱，並已留下系統紀錄！')
    emit('close')
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
  padding: 15px;
}

.modal-container { 
  border-top: 6px solid #ef4444; 
  border-radius: 12px; 
  background: #fff; 
  width: 100%;
  max-width: 600px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  /* 設定最大高度以適應同時顯示編輯與預覽 */
  max-height: 90vh; 
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px 10px 25px;
}
.modal-header h3 { margin: 0; color: #b91c1c; font-size: 1.4rem; display: flex; align-items: center; gap: 8px;}
.close-btn { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }
.close-btn:hover { color: #475569; }

/* 加上 overflow 讓內容太多時可以滾動 */
.modal-body {
  padding: 10px 25px;
  overflow-y: auto;
}

.modal-footer {
  padding: 15px 25px 20px 25px;
  border-top: 1px solid #e2e8f0;
}

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

/* 信箱 Checkbox 樣式 */
.checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
.email-badge { background: #e0f7fa; color: #006064; padding: 6px 12px; border-radius: 6px; font-size: 0.95em; }
.warning-text { color: #ea580c; font-size: 0.9rem; margin-bottom: 15px; font-weight: bold; }
.error-text { color: #ef4444; font-weight: bold; }

.template-buttons { margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 8px; }
.template-buttons button { 
  background: #fee2e2; color: #991b1b; font-weight: bold;
  border: 1px solid #fecaca; padding: 6px 10px; border-radius: 6px; cursor: pointer; 
  transition: background 0.2s;
}
.template-buttons button:hover { background: #fecaca; }

/* 預覽模式分隔線與樣式 */
.divider {
  text-align: center;
  margin: 10px 0 20px 0;
  position: relative;
}
.divider::before {
  content: '';
  position: absolute;
  top: 50%; left: 0; right: 0;
  border-top: 1px dashed #cbd5e1;
  z-index: 1;
}
.divider span {
  background: #fff;
  padding: 0 10px;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: bold;
  position: relative;
  z-index: 2;
}

.preview-box {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
}
.preview-item { margin-bottom: 12px; color: #334155; font-size: 0.95rem;}
.preview-content {
  background: white;
  padding: 15px;
  border: 1px dashed #94a3b8;
  border-radius: 6px;
  min-height: 120px;
  line-height: 1.6;
  margin-top: 5px;
  color: #1e293b;
}

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
}
.submit-btn:disabled { background: #fca5a5; cursor: not-allowed; }
</style>
