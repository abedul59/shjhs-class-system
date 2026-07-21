<template>
  <div class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <h3>🚨 發送緊急通知</h3>
        <button class="close-btn" @click="$emit('close')">✖</button>
      </div>
      
      <!-- ================= 步驟 1：編輯模式 ================= -->
      <div v-if="!isPreviewMode">
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
            <!-- 💡 根據截圖新增 Checkbox 供導師勾選 -->
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
          <textarea v-model="messageContent" rows="8" placeholder="請選擇上方公版或直接輸入通知內容..." :disabled="isSending"></textarea>
        </div>

        <button class="preview-btn" @click="goToPreview" :disabled="!canPreview">
          👁️ 預覽信件內容
        </button>
      </div>

      <!-- ================= 步驟 2：預覽模式 ================= -->
      <div v-else class="preview-mode">
        <div class="preview-box">
          <div class="preview-item">
            <strong>📧 收件人：</strong> 
            {{ selectedEmails.map(maskEmail).join(', ') }}
          </div>
          <div class="preview-item">
            <strong>📋 主旨：</strong> 
            【緊急通知】{{ selectedStudent.real_name }} 身體不適聯繫
          </div>
          <div class="preview-item"><strong>📝 信件預覽：</strong></div>
          <div class="preview-content" v-html="formattedMessage"></div>
        </div>
        
        <div class="action-group">
          <button class="back-btn" @click="isPreviewMode = false" :disabled="isSending">⬅️ 返回修改</button>
          <button class="submit-btn" @click="sendNotification" :disabled="isSending">
            {{ isSending ? '發送與寫入中...' : '📤 確認發送並寫入系統紀錄' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
const supabase = useSupabaseClient()
const emit = defineEmits(['close'])

// 資料狀態
const studentList = ref([])
const selectedStudent = ref('')
const parentsEmails = ref([])
const selectedEmails = ref([]) // 儲存已勾選的家長信箱
const messageContent = ref('')
const isSending = ref(false)
const isPreviewMode = ref(false)

// 檢查是否可以進入預覽 (需選學生、有勾信箱、有內容)
const canPreview = computed(() => {
  return selectedStudent.value && selectedEmails.value.length > 0 && messageContent.value.trim() !== ''
})

// 將換行符號轉為 HTML 的 <br> 供預覽與信件內文使用
const formattedMessage = computed(() => {
  return messageContent.value.replace(/\n/g, '<br>')
})

// 初始化載入真實學生名單
onMounted(async () => {
  const { data } = await supabase.from('students').select('*').order('seat_number')
  if (data) studentList.value = data
})

// 遮蔽 Email 顯示 (例如: py***@gmail.com)
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email
  const [name, domain] = email.split('@')
  return `${name.substring(0, 2)}***@${domain}`
}

// 當切換學生時，抓取該學生的家長信箱
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
    selectedEmails.value = [...emails] // 預設全部勾選
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

// 切換至預覽模式
const goToPreview = () => {
  if (canPreview.value) {
    isPreviewMode.value = true
  }
}

// 確認發送
const sendNotification = async () => {
  isSending.value = true
  try {
    // 💡 全包覆 Payload：加入多種常見的後端參數名稱 (text, html, content, message)，防止信件無內容的問題
    await $fetch('/api/send-email', {
      method: 'POST',
      body: {
        to: selectedEmails.value,
        subject: `【緊急通知】${selectedStudent.value.real_name} 身體不適聯繫`,
        text: messageContent.value,
        html: formattedMessage.value,
        content: formattedMessage.value, 
        message: formattedMessage.value
      }
    })

    // 寫入 Supabase 紀錄
    const { error: dbError } = await supabase.from('communication_logs').insert({
      student_id: selectedStudent.value.id,
      notification_type: '生病手動通知',
      sent_by: '導師',
      recipient_emails: selectedEmails.value.join(','),
      message_content: messageContent.value
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
.modal-header h3 { margin: 0; color: #b91c1c; font-size: 1.4rem; display: flex; align-items: center; gap: 8px;}
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

/* 信箱 Checkbox 樣式 */
.checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
.email-badge { 
  background: #e0f7fa; 
  color: #006064; 
  padding: 6px 12px; 
  border-radius: 6px; 
  font-size: 0.95em; 
}

.template-buttons { margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 8px; }
.template-buttons button { 
  background: #fee2e2; color: #991b1b; font-weight: bold;
  border: 1px solid #fecaca; padding: 8px 12px; border-radius: 6px; cursor: pointer; 
  transition: background 0.2s;
}
.template-buttons button:hover { background: #fecaca; }
.warning-text { color: #ea580c; font-size: 0.9rem; margin-bottom: 15px; font-weight: bold; }

/* 預覽模式專屬樣式 */
.preview-box {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}
.preview-item { margin-bottom: 12px; color: #334155; font-size: 0.95rem;}
.preview-content {
  background: white;
  padding: 15px;
  border: 1px dashed #94a3b8;
  border-radius: 6px;
  min-height: 150px;
  line-height: 1.6;
  margin-top: 5px;
  color: #1e293b;
}

/* 按鈕區域 */
.preview-btn {
  width: 100%;
  padding: 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 10px;
}
.preview-btn:disabled { background: #93c5fd; cursor: not-allowed; }

.action-group { display: flex; gap: 10px; }
.back-btn { background: #64748b; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; flex: 1; }
.submit-btn { background: #ef4444; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; flex: 2;}
.submit-btn:disabled { background: #fca5a5; cursor: not-allowed; }
</style>
