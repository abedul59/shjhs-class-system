<template>
  <div class="admin-panel">
    <div class="table-header">
      <h3>📺 首頁 YouTube 影片輪播排程設定</h3>
      <button @click="saveSchedule" class="save-btn" :disabled="isSaving">
        {{ isSaving ? '儲存中...' : '💾 儲存所有排程' }}
      </button>
    </div>

    <div class="info-box">
      <p>💡 <strong>說明：</strong> 請貼上任何 YouTube 網址。</p>
      <p>系統會根據「星期幾」自動在首頁播放對應的影片，且<strong>只有在「下課時間」才會自動播放，上課鐘響將自動暫停</strong>。</p>
      <p style="color: #ef4444; margin-top: 5px;">※ 留空代表該天不顯示影片區塊。</p>
    </div>

    <!-- 💡 新增：後台專屬的音量與靜音控制權 -->
    <div class="sound-control-box">
      <label class="toggle-label">
        <input type="checkbox" v-model="scheduleData.isMuted" class="large-checkbox" />
        <span style="font-weight: bold; color: #1e293b;">🔇 影片預設靜音 (打勾為無聲，取消打勾則開放聲音)</span>
      </label>
      <p class="warning-text">⚠️ 注意：如果取消靜音 (開啟聲音)，為了遵守各大瀏覽器「防擾民」政策，影片在下課時可能會被瀏覽器強制阻擋自動播放，需由學生手動點擊畫面才能開始播放。</p>
    </div>

    <div class="schedule-grid">
      <div v-for="(dayName, index) in daysMapping" :key="index" class="day-card" :class="{ 'is-today': index === String(currentDayIndex) }">
        
        <div class="day-header">
          <span class="day-badge">{{ dayName }}</span>
          <span v-if="index === String(currentDayIndex)" class="today-tag">👉 今天</span>
        </div>
        
        <div class="input-group">
          <label>YouTube 網址：</label>
          <input 
            type="text" 
            v-model="scheduleData.videos[index]" 
            placeholder="請貼上 YouTube 網址..." 
            class="yt-input"
          />
        </div>
        
        <div class="preview-box">
          <span v-if="extractVideoId(scheduleData.videos[index])" class="status-ok">✅ 網址正確</span>
          <span v-else-if="scheduleData.videos[index]" class="status-err">❌ 格式錯誤</span>
          <span v-else class="status-empty">🈳 不播放</span>
        </div>
        
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const supabase = useSupabaseClient()
const isSaving = ref(false)

const daysMapping = {
  1: '星期一', 2: '星期二', 3: '星期三', 4: '星期四', 5: '星期五', 6: '星期六', 0: '星期日'
}

const currentDayIndex = new Date().getDay()

// 💡 更新資料結構：包含影片網址陣列與靜音設定
const scheduleData = ref({ 
  videos: { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' },
  isMuted: true // 預設靜音
})

const fetchSchedule = async () => {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'youtube_schedule_data').maybeSingle()
  if (data && data.setting_value) {
    if (data.setting_value.videos) {
      scheduleData.value = data.setting_value
    } else {
      // 💡 兼容舊版的純網址資料結構
      scheduleData.value.videos = { ...scheduleData.value.videos, ...data.setting_value }
    }
  }
}

onMounted(() => {
  fetchSchedule()
})

const saveSchedule = async () => {
  isSaving.value = true
  const { error } = await supabase.from('system_settings').upsert(
    { setting_key: 'youtube_schedule_data', setting_value: scheduleData.value },
    { onConflict: 'setting_key' }
  )
  
  if (!error) alert('✅ YouTube 排程與音量設定已成功更新！首頁將自動生效。')
  else alert('❌ 儲存失敗')
  isSaving.value = false
}

const extractVideoId = (url) => {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
}
</script>

<style scoped>
.admin-panel { background: white; border-radius: 8px; padding: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.table-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.table-header h3 { margin: 0; color: #1e293b; font-size: 1.4rem; }

.save-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
.save-btn:hover:not(:disabled) { background: #059669; }
.save-btn:disabled { background: #94a3b8; cursor: not-allowed; }

.info-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 15px; border-radius: 4px; }
.info-box p { margin: 5px 0; color: #166534; font-size: 0.95rem; }

.sound-control-box { background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; margin-bottom: 25px; border-radius: 6px; }
.toggle-label { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.large-checkbox { transform: scale(1.3); cursor: pointer; }
.warning-text { margin: 8px 0 0 28px; color: #b45309; font-size: 0.9rem; font-weight: bold; }

.schedule-grid { display: flex; flex-direction: column; gap: 15px; }
.day-card { display: flex; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; gap: 20px; transition: 0.2s; }
.day-card:hover { border-color: #94a3b8; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.day-card.is-today { border-color: #3b82f6; background: #eff6ff; box-shadow: 0 0 0 1px #3b82f6; }

.day-header { width: 100px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.day-badge { background: #475569; color: white; padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 1rem; }
.is-today .day-badge { background: #3b82f6; }
.today-tag { color: #ef4444; font-size: 0.85rem; font-weight: bold; }

.input-group { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.input-group label { font-size: 0.9rem; color: #64748b; font-weight: bold; }
.yt-input { width: 100%; padding: 10px 15px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; transition: 0.2s; }
.yt-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }

.preview-box { width: 100px; text-align: center; font-weight: bold; font-size: 0.95rem; }
.status-ok { color: #10b981; }
.status-err { color: #ef4444; }
.status-empty { color: #94a3b8; }

@media (max-width: 768px) {
  .day-card { flex-direction: column; align-items: stretch; gap: 10px; }
  .day-header { width: 100%; flex-direction: row; justify-content: space-between; }
  .preview-box { width: 100%; text-align: left; margin-top: 5px; }
}
</style>
