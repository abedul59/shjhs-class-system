<template>
  <div class="seats-page">
    <div v-if="!isLoggedIn" class="login-container">
      <div class="login-card">
        <h2>🪑 學生座位管理系統</h2>
        <p class="subtitle">此區域僅限導師進入</p>
        <div class="form-group">
          <label>請輸入導師後台密碼：</label>
          <input 
            v-model="passwordInput" 
            type="password" 
            placeholder="支援動態密碼..." 
            class="form-control" 
            @keyup.enter="handleLogin"
          />
        </div>
        <button @click="handleLogin" class="btn-submit" :disabled="isLoggingIn">
          {{ isLoggingIn ? '驗證中...' : '解鎖進入' }}
        </button>
        <div class="back-link">
          <NuxtLink to="/">⬅️ 返回首頁</NuxtLink>
        </div>
      </div>
    </div>

    <div v-else class="workspace screen-only">
      <header class="workspace-header">
        
        <div class="header-top-row">
          <h2>🪑 座位排版系統</h2>
          
          <div class="style-controls-wrapper">
            <div class="style-group">
              <span class="group-label">座號：</span>
              <input type="number" v-model="seatSettings.numberSize" min="10" max="40" class="num-input"> px
              <input type="color" v-model="seatSettings.numberColor" class="color-input">
            </div>
            <div class="style-group">
              <span class="group-label">姓名：</span>
              <input type="number" v-model="seatSettings.nameSize" min="10" max="40" class="num-input"> px
              <input type="color" v-model="seatSettings.nameColor" class="color-input">
            </div>
            <div class="style-group">
              <span class="group-label">其他：</span>
              <input type="number" v-model="seatSettings.otherSize" min="10" max="40" class="num-input"> px
              <input type="color" v-model="seatSettings.otherColor" class="color-input">
            </div>
          </div>
        </div>

        <div class="header-actions">
          <button @click="syncFromStudents(true)" class="btn-sync">
            📥 同步學生名單
          </button>
          
          <button @click="toggleRotation" class="btn-rotate">
            🔄 旋轉版面 (目前: {{ isRotated ? '反向' : '正向' }})
          </button>
          <button @click="showPrintModal = true" class="btn-print">
            📄 產生 PDF / 列印
          </button>
          <button @click="saveLayout" class="btn-save" :disabled="isSaving">
            {{ isSaving ? '儲存中...' : '💾 儲存並發布' }}
          </button>
          <button @click="logout" class="btn-logout">登出</button>
        </div>

      </header>

      <div class="tips">
        💡 提示：系統會自動依據「座號」對應資料庫載入「姓名」。拖曳座位可交換位置，點選左上角「取消」可隱藏不需要的空位。
      </div>

      <!-- 教室版面區 -->
      <div class="classroom-wrapper">
        <div :class="['classroom-area', { 'is-rotated': isRotated }]">
          
          <div class="labels-grid">
            <div v-for="n in 6" :key="'label-'+n" class="row-label">
              第{{ n }}排
            </div>
          </div>

          <div class="seats-grid">
            <div 
              v-for="(seat, index) in seatsList" 
              :key="seat.id"
              :class="['seat-card', { 'is-hidden-seat': seat.isHidden }]"
              draggable="true"
              @dragstart="onDragStart($event, index)"
              @dragover.prevent
              @drop="onDrop($event, index)"
            >
              <div class="seat-header">
                <span class="seat-id">{{ seat.id }}</span>
                <button @click="toggleSeatVisibility(seat)" class="btn-toggle-vis">
                  {{ seat.isHidden ? '👁️ 恢復' : '❌ 取消' }}
                </button>
              </div>
              
              <div class="seat-content-inputs">
                <input 
                  type="text" 
                  v-model="seat.seatNum" 
                  class="field-input" 
                  placeholder="座號"
                  :style="{ fontSize: seatSettings.numberSize + 'px', color: seatSettings.numberColor }"
                />
                <input 
                  type="text" 
                  v-model="seat.name" 
                  class="field-input" 
                  placeholder="姓名(自動載入)"
                  :style="{ fontSize: seatSettings.nameSize + 'px', color: seatSettings.nameColor }"
                />
                <input 
                  type="text" 
                  v-model="seat.other" 
                  class="field-input" 
                  placeholder="其他(選填)"
                  :style="{ fontSize: seatSettings.otherSize + 'px', color: seatSettings.otherColor }"
                />
              </div>
            </div>
          </div>

          <div class="teacher-desk-area">
            <div class="teacher-desk">
              <h3>講桌</h3>
              <div class="desk-controls">
                <label class="toggle-label">
                  <input type="checkbox" v-model="isVisibleOnIndex" />
                  顯示於首頁
                </label>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <!-- ========================================== -->
      <!-- 💡 新增：歷史紀錄查詢區塊 -->
      <!-- ========================================== -->
      <div class="history-calendar-container" style="margin-top: 30px;">
        <div class="history-header">
          <h4 class="section-title">📅 歷史紀錄查詢</h4>
          <div class="export-btn-group">
            <button @click="exportHistory('json')" class="btn-export-json">📥 匯出紀錄 (JSON)</button>
            <button @click="exportHistory('csv')" class="btn-export-csv">📤 匯出紀錄 (CSV)</button>
          </div>
        </div>
        
        <div class="calendar-layout">
          <!-- 左側：月曆介面 -->
          <div class="calendar-box">
            <div class="calendar-header">
              <button @click="prevMonth" class="cal-nav-btn">◀</button>
              <strong class="cal-title">{{ calYear }} 年 {{ calMonth + 1 }} 月</strong>
              <button @click="nextMonth" class="cal-nav-btn">▶</button>
            </div>
            <div class="calendar-grid">
              <div class="cal-day-name">日</div><div class="cal-day-name">一</div><div class="cal-day-name">二</div>
              <div class="cal-day-name">三</div><div class="cal-day-name">四</div><div class="cal-day-name">五</div><div class="cal-day-name">六</div>
              
              <div 
                v-for="(day, idx) in calendarDays" 
                :key="idx" 
                :class="['cal-cell', { 'empty': day.empty, 'has-record': day.hasRecord, 'selected': selectedHistoryDate === day.dateStr }]"
                @click="viewHistory(day)"
              >
                <span v-if="!day.empty" class="cal-date-num">{{ day.day }}</span>
                <span v-if="day.hasRecord" class="record-dot"></span>
              </div>
            </div>
          </div>

          <!-- 右側：選定日期的歷史座位預覽 -->
          <div class="history-detail-box">
            <div v-if="!selectedHistoryDate" class="empty-detail">
              👈 請從左側月曆點選日期以查看歷史座位表
            </div>
            <div v-else class="detail-content">
              <h5 class="detail-title">🗓️ {{ selectedHistoryDate }} 查詢結果</h5>
              
              <div class="history-status-badge" :class="{ 'is-fallback': effectiveDate !== selectedHistoryDate }">
                {{ effectiveDate === selectedHistoryDate ? '✅ 當日有專屬紀錄' : (effectiveDate === '無紀錄' ? '⚠️ 過去尚無任何紀錄' : `🔄 當日無變更，沿用 ${effectiveDate} 的座位`) }}
              </div>

              <!-- 唯讀版座位預覽 (縮小比例顯示) -->
              <div class="history-seating-preview" v-if="historyLayoutData">
                <div class="seating-wrapper" style="transform: scale(0.85); transform-origin: top center;">
                  <div :class="['seating-area', { 'is-rotated': historyLayoutData.isRotated }]">
                    <div class="labels-grid-readonly">
                      <div v-for="n in 6" :key="'h-label-'+n" class="row-label-readonly">第{{ n }}排</div>
                    </div>
                    <div class="seats-grid-readonly">
                      <div v-for="seat in historyLayoutData.seats" :key="seat.id" :class="['seat-card-readonly', { 'is-hidden-seat-readonly': seat.isHidden }]">
                        <div class="seat-id-readonly">{{ seat.id }}</div>
                        <div class="seat-text-container">
                          <div :style="{ fontSize: (historyLayoutData.settings?.numberSize || 16) + 'px', color: historyLayoutData.settings?.numberColor || '#64748b' }">{{ seat.seatNum }}</div>
                          <div :style="{ fontSize: (historyLayoutData.settings?.nameSize || 20) + 'px', color: historyLayoutData.settings?.nameColor || '#e11d48' }">{{ seat.name }}</div>
                          <div v-if="seat.other" :style="{ fontSize: (historyLayoutData.settings?.otherSize || 14) + 'px', color: historyLayoutData.settings?.otherColor || '#94a3b8' }">{{ seat.other }}</div>
                        </div>
                      </div>
                    </div>
                    <div class="teacher-desk-readonly"><h3>講桌</h3></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 列印設定彈出視窗 -->
    <div v-if="showPrintModal" class="modal-overlay screen-only">
      <div class="modal-content">
        <h3 class="modal-title">📄 設定匯出內容</h3>
        <div class="form-group">
          <label>標題：</label>
          <input type="text" v-model="printData.title" class="form-control" />
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label>總人數：</label>
            <input type="number" v-model="printData.count" class="form-control" />
          </div>
          <div class="form-group flex-1">
            <label>實施日期：</label>
            <input type="text" v-model="printData.date" class="form-control" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label>幹部名冊 (左側)：</label>
            <textarea v-model="printData.rolesLeft" class="form-control" rows="8"></textarea>
          </div>
          <div class="form-group flex-1">
            <label>小老師名冊 (右側)：</label>
            <textarea v-model="printData.rolesRight" class="form-control" rows="8"></textarea>
          </div>
        </div>
        
        <div class="modal-actions">
          <div class="action-left">
            <button @click="savePrintTemplate" class="btn-save-template" :disabled="isSavingPrint">
              {{ isSavingPrint ? '儲存中...' : '💾 記憶設定' }}
            </button>
          </div>
          <div class="action-right">
            <button @click="showPrintModal = false" class="btn-cancel">取消</button>
            <button @click="triggerPrint" class="btn-print-confirm">🖨️ 確定產生 PDF / 列印</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 純粹用於列印/匯出 PDF 的隱藏版面 -->
    <div class="print-only-layout">
      <div class="print-page-header">
        {{ printData.title }} 共 {{ printData.count }} 人 實施日期：{{ printData.date }}
      </div>
      
      <table class="print-seat-table">
        <tr v-for="rowIndex in 5" :key="'p-row-'+rowIndex">
          <td v-for="colIndex in 6" :key="'p-col-'+colIndex">
            <template v-if="!getPrintSeat(rowIndex, colIndex).isHidden">
              <div class="p-name">{{ getPrintSeat(rowIndex, colIndex).name }}</div>
              <div class="p-other" v-if="getPrintSeat(rowIndex, colIndex).other">({{ getPrintSeat(rowIndex, colIndex).other }})</div>
              <div class="p-other" v-else>&nbsp;</div>
              <div class="p-num">{{ getPrintSeat(rowIndex, colIndex).seatNum }}</div>
            </template>
          </td>
        </tr>
        <tr>
           <td v-for="n in 6" :key="'p-label-'+n" class="p-col-label">{{ n }}</td>
        </tr>
      </table>
      
      <div class="print-desk-wrapper">
        <div class="print-desk">講桌</div>
      </div>

      <div class="print-roles-title">幹部和小老師名冊</div>
      <table class="print-roles-table">
        <tr>
          <td class="role-cell"><pre>{{ printData.rolesLeft }}</pre></td>
          <td class="role-cell"><pre>{{ printData.rolesRight }}</pre></td>
        </tr>
      </table>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
const supabase = useSupabaseClient()

const isLoggedIn = ref(false)
const isLoggingIn = ref(false)
const passwordInput = ref('')
const isSaving = ref(false)

const isRotated = ref(false)
const isVisibleOnIndex = ref(false)
const seatsList = ref([])

const seatSettings = ref({
  numberSize: 16, numberColor: '#64748b',
  nameSize: 20, nameColor: '#e11d48',
  otherSize: 14, otherColor: '#94a3b8'
})

const showPrintModal = ref(false)
const isSavingPrint = ref(false)

const printData = ref({
  title: '7年 4 班 座位表',
  count: 26,
  date: '2024/10/18',
  rolesLeft: '班長：\n副班長：\n風紀股長：\n學藝股長：\n康樂（體育）股長：\n衛生股長：\n副衛生股長：\n輔導股長：\n圖資股長：\n總務股長：',
  rolesRight: '國文小老師：\n英語小老師：\n數學小老師：\n自然小老師：\n社會小老師：\n表演藝術小老師：\n美術小老師：\n音樂小老師：\n綜合小老師：\n生活科技小老師：'
})

// 💡 歷史紀錄月曆變數
const dDate = new Date()
const todayISO = `${dDate.getFullYear()}-${String(dDate.getMonth()+1).padStart(2,'0')}-${String(dDate.getDate()).padStart(2,'0')}`
const calYear = ref(dDate.getFullYear())
const calMonth = ref(dDate.getMonth())
const monthRecords = ref([])
const selectedHistoryDate = ref('')
const effectiveDate = ref('')
const historyLayoutData = ref(null)

const initSeats = () => {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    seatNum: `${i + 1}號`,
    name: '', 
    other: '',
    isHidden: false
  }))
}

onMounted(async () => {
  if (sessionStorage.getItem('seats_admin_logged_in') === 'true') {
    isLoggedIn.value = true
    await fetchLayout()
    await fetchMonthRecords()
  }
})

const handleLogin = async () => {
  if (!passwordInput.value) return
  isLoggingIn.value = true
  
  try {
    const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'admin_password').maybeSingle()
    let expectedPwd = '168168168' 
    if (data?.setting_value) {
      const config = data.setting_value
      if (config.type === 'dynamic') {
        const d = new Date(); const yy = String(d.getFullYear()).slice(2); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0')
        expectedPwd = `${yy}${mm}${dd}59`
      } else if (config.type === 'custom' && config.custom_pwd) { expectedPwd = config.custom_pwd }
    }
    if (passwordInput.value === expectedPwd || passwordInput.value === '168168168') {
      isLoggedIn.value = true
      sessionStorage.setItem('seats_admin_logged_in', 'true')
      await fetchLayout()
      await fetchMonthRecords()
    } else alert('❌ 密碼錯誤！')
  } catch (e) {
    if (passwordInput.value === '168168168') { 
      isLoggedIn.value = true; 
      sessionStorage.setItem('seats_admin_logged_in', 'true'); 
      await fetchLayout();
      await fetchMonthRecords();
    }
    else alert('驗證發生錯誤。')
  } finally { isLoggingIn.value = false; passwordInput.value = '' }
}

const logout = () => { sessionStorage.removeItem('seats_admin_logged_in'); isLoggedIn.value = false; navigateTo('/') }

const syncFromStudents = async (showPrompt = false) => {
  if (showPrompt && !confirm('將從資料庫載入最新學生名單（依座號自動更新姓名），這不會改變您目前的排版位置。確定要執行嗎？')) return;
  try {
    const { data, error } = await supabase.from('students').select('seat_number, real_name')
    if (error) throw error
    
    const studentMap = {}
    data.forEach(s => { studentMap[s.seat_number] = s.real_name })

    seatsList.value.forEach(seat => {
      const numMatch = String(seat.seatNum).match(/\d+/)
      if (numMatch) {
        const num = parseInt(numMatch[0], 10)
        if (studentMap[num]) {
          seat.name = studentMap[num] 
        } else {
          seat.name = '' 
        }
      }
    })
    
    if (showPrompt) alert('✅ 學生名單已成功同步更新！請記得點擊右上角的「儲存並發布」。')
  } catch (err) {
    if (showPrompt) alert('❌ 同步失敗：' + err.message)
  }
}

const fetchLayout = async () => {
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'seating_chart_data').maybeSingle()

  if (data?.setting_value) {
    seatsList.value = (data.setting_value.seats || initSeats()).map(seat => {
      if (seat.content !== undefined) {
        const lines = seat.content.split('\n')
        return {
          id: seat.id,
          isHidden: seat.isHidden,
          seatNum: lines[0] || '',
          name: lines[1] || '',
          other: lines.slice(2).join(' ') || ''
        }
      }
      return seat
    })
    
    isRotated.value = data.setting_value.isRotated || false
    isVisibleOnIndex.value = data.setting_value.isVisible || false
    
    if (data.setting_value.settings) {
      if (data.setting_value.settings.nameSize) {
        seatSettings.value = data.setting_value.settings
      } else if (data.setting_value.settings.fontSize) {
        seatSettings.value.numberSize = data.setting_value.settings.fontSize
        seatSettings.value.nameSize = data.setting_value.settings.fontSize + 4
        seatSettings.value.otherSize = data.setting_value.settings.fontSize - 2
        seatSettings.value.numberColor = data.setting_value.settings.fontColor
        seatSettings.value.nameColor = data.setting_value.settings.fontColor
        seatSettings.value.otherColor = data.setting_value.settings.fontColor
      }
    }
    
    if (data.setting_value.printData) {
      printData.value = { ...printData.value, ...data.setting_value.printData }
    }
  } else {
    seatsList.value = initSeats()
  }

  await syncFromStudents(false)
}

// 💡 更新：儲存設定同時將記錄寫入 seating_records (供日後沿用與查詢)
const saveLayout = async () => {
  isSaving.value = true
  try {
    const payload = { seats: seatsList.value, isRotated: isRotated.value, isVisible: isVisibleOnIndex.value, settings: seatSettings.value, printData: printData.value }
    
    // 1. 儲存最新設定到 system_settings
    await supabase.from('system_settings').upsert({ setting_key: 'seating_chart_data', setting_value: payload }, { onConflict: 'setting_key' })
    
    // 2. 備份到今日的歷史紀錄
    await supabase.from('seating_records').upsert({
      record_date: todayISO,
      layout_data: payload
    }, { onConflict: 'record_date' })

    alert('✅ 座位表設定已成功儲存並發布，並已記錄至今日歷史檔！')
    
    // 重新抓取月曆狀態
    await fetchMonthRecords()
  } catch (error) { 
    alert('❌ 儲存失敗') 
  } finally { 
    isSaving.value = false 
  }
}

// ================= 月曆與歷史紀錄相關邏輯 =================
const fetchMonthRecords = async () => {
  const y = calYear.value; 
  const m = String(calMonth.value + 1).padStart(2, '0')
  const startDate = `${y}-${m}-01`; 
  const endDate = `${y}-${m}-31`
  
  const { data } = await supabase.from('seating_records')
    .select('record_date')
    .gte('record_date', startDate)
    .lte('record_date', endDate)
    
  monthRecords.value = data || []
}

const calendarDays = computed(() => {
  const days = []
  const firstDayOfWeek = new Date(calYear.value, calMonth.value, 1).getDay()
  const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate()
  for (let i = 0; i < firstDayOfWeek; i++) { days.push({ empty: true }) }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const hasRecord = monthRecords.value.some(r => r.record_date === dateStr)
    days.push({
      empty: false, day: i, dateStr: dateStr, hasRecord: hasRecord
    })
  }
  return days
})

const prevMonth = async () => { 
  if (calMonth.value === 0) { calYear.value--; calMonth.value = 11 } else { calMonth.value-- } 
  selectedHistoryDate.value = ''; historyLayoutData.value = null;
  await fetchMonthRecords() 
}
const nextMonth = async () => { 
  if (calMonth.value === 11) { calYear.value++; calMonth.value = 0 } else { calMonth.value++ } 
  selectedHistoryDate.value = ''; historyLayoutData.value = null;
  await fetchMonthRecords() 
}

const viewHistory = async (day) => {
  if (day.empty) return
  selectedHistoryDate.value = day.dateStr
  historyLayoutData.value = null
  
  // 尋找目標日期(含)以前的最近一筆紀錄，實踐「沒有改就沿用」
  const { data } = await supabase.from('seating_records')
    .select('*')
    .lte('record_date', day.dateStr)
    .order('record_date', { ascending: false })
    .limit(1)
    
  if (data && data.length > 0) {
    historyLayoutData.value = data[0].layout_data
    effectiveDate.value = data[0].record_date
  } else {
    // 找不到任何歷史資料時
    effectiveDate.value = '無紀錄'
    historyLayoutData.value = null
  }
}

// 💡 新增匯出歷史紀錄功能
const exportHistory = async (type) => {
  const { data, error } = await supabase.from('seating_records').select('*').order('record_date', { ascending: false })
  if (error || !data || data.length === 0) {
    alert('⚠️ 獲取歷史紀錄失敗或尚無任何紀錄')
    return
  }

  if (type === 'json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'seating_history_export.json'
    link.click()
    URL.revokeObjectURL(url)
  } else if (type === 'csv') {
    let csvContent = '\uFEFF' // BOM
    csvContent += '紀錄日期,網格編號,座號,姓名,其他標註,是否隱藏\n'
    
    data.forEach(record => {
      const layout = record.layout_data
      const seats = layout?.seats || []
      seats.forEach((seat, idx) => {
         const sNum = (seat.seatNum || '').replace(/"/g, '""')
         const sName = (seat.name || '').replace(/"/g, '""')
         const sOther = (seat.other || '').replace(/"/g, '""')
         csvContent += `"${record.record_date}","${idx+1}","${sNum}","${sName}","${sOther}","${seat.isHidden ? '是' : '否'}"\n`
      })
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'seating_history_export.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
}

const savePrintTemplate = async () => {
  isSavingPrint.value = true
  try {
    const payload = { seats: seatsList.value, isRotated: isRotated.value, isVisible: isVisibleOnIndex.value, settings: seatSettings.value, printData: printData.value }
    await supabase.from('system_settings').upsert({ setting_key: 'seating_chart_data', setting_value: payload }, { onConflict: 'setting_key' })
    alert('✅ 列印文字內容已成功記憶！下次開啟將自動載入。')
  } catch (error) {
    alert('❌ 記憶設定失敗：' + error.message)
  } finally {
    isSavingPrint.value = false
  }
}

const toggleSeatVisibility = (seat) => { seat.isHidden = !seat.isHidden }
const draggedIndex = ref(null)
const onDragStart = (event, index) => { draggedIndex.value = index; event.dataTransfer.effectAllowed = 'move' }
const onDrop = (event, dropIndex) => {
  if (draggedIndex.value !== null && draggedIndex.value !== dropIndex) {
    const temp = seatsList.value[draggedIndex.value]
    seatsList.value[draggedIndex.value] = seatsList.value[dropIndex]
    seatsList.value[dropIndex] = temp
  }
  draggedIndex.value = null
}
const toggleRotation = () => { isRotated.value = !isRotated.value }

const getPrintSeat = (row, col) => {
  let index = (row - 1) * 6 + (col - 1)
  if (isRotated.value) {
    index = 29 - index
  }
  return seatsList.value[index] || { isHidden: true }
}

const triggerPrint = () => {
  showPrintModal.value = false
  setTimeout(() => {
    window.print()
  }, 300)
}
</script>

<style scoped>
/* 螢幕顯示樣式 (列印時隱藏) */
@media screen {
  .print-only-layout { display: none; }
}

.seats-page { min-height: 100vh; background: #f1f5f9; font-family: sans-serif; }
.login-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; padding: 20px; }
.login-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
.subtitle { color: #64748b; margin-bottom: 20px; }
.form-group { margin-bottom: 20px; text-align: left; }
.form-control { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; }
.btn-submit { width: 100%; padding: 12px; background: #0f766e; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
.back-link { margin-top: 15px; }

.workspace { padding: 20px; max-width: 1200px; margin: 0 auto; }
.workspace-header { 
  display: flex; flex-direction: column; gap: 15px;
  background: white; padding: 15px 25px; border-radius: 8px; margin-bottom: 15px; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.header-top-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; width: 100%; }
.header-top-row h2 { margin: 0; color: #0f766e; }

.style-controls-wrapper { display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; background: #f8fafc; padding: 10px 15px; border-radius: 6px; border: 1px solid #e2e8f0;}
.style-group { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; font-weight: bold; color: #475569; border-right: 2px solid #e2e8f0; padding-right: 15px; }
.style-group:last-child { border-right: none; padding-right: 0; }
.num-input { width: 55px; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center;}
.color-input { width: 35px; height: 30px; padding: 0; border: none; cursor: pointer; border-radius: 4px;}

.header-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-start; width: 100%; }
.btn-sync { background: #8b5cf6; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-rotate { background: #e2e8f0; color: #334155; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-print { background: #3b82f6; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-save { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-logout { background: #ef4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }

.tips { background: #fffbeb; color: #b45309; padding: 10px 15px; border-radius: 6px; border: 1px dashed #fcd34d; margin-bottom: 20px; font-size: 0.95rem; line-height: 1.5; }

.classroom-wrapper { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow-x: auto; -webkit-overflow-scrolling: touch; }
.classroom-area { width: 100%; min-width: 900px; margin: 0 auto; transition: transform 0.5s ease; }
.classroom-area.is-rotated { transform: rotate(180deg); }
.classroom-area.is-rotated .seat-card, .classroom-area.is-rotated .row-label, .classroom-area.is-rotated .teacher-desk { transform: rotate(-180deg); }

.labels-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 15px; }
.row-label { text-align: center; font-weight: bold; color: #0f766e; font-size: 1.1rem; transition: transform 0.5s ease; }
.seats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 40px; }

.seat-card {
  border: 2px solid #cbd5e1; border-radius: 8px; background: #f8fafc; padding: 8px;
  text-align: center; cursor: grab; transition: all 0.3s ease;
  display: flex; flex-direction: column; min-height: 110px;
}
.seat-card:active { cursor: grabbing; border-color: #0f766e; transform: scale(0.95); }
.seat-card:hover { border-color: #94a3b8; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.is-hidden-seat { opacity: 0.4; background: #e2e8f0; border: 2px dashed #94a3b8; }
.seat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.seat-id { font-size: 0.8rem; color: #94a3b8; font-weight: bold; }
.btn-toggle-vis { background: white; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; }
.btn-toggle-vis:hover { background: #f1f5f9; }

.seat-content-inputs { display: flex; flex-direction: column; gap: 2px; flex: 1; justify-content: center;}
.field-input {
  width: 100%; border: 1px dashed transparent; background: transparent; text-align: center; 
  font-weight: bold; padding: 2px; transition: 0.2s; border-radius: 4px;
}
.field-input:focus, .field-input:hover { border-color: #cbd5e1; background: white; outline: none; }

.teacher-desk-area { display: flex; justify-content: center; margin-bottom: 20px;}
.teacher-desk { border: 3px solid #0f766e; background: #f0fdfa; padding: 15px 30px; border-radius: 8px; text-align: center; width: 250px; transition: transform 0.5s ease; }
.teacher-desk h3 { margin: 0 0 10px 0; color: #0f766e; }
.desk-controls { background: white; padding: 5px 10px; border-radius: 4px; border: 1px solid #cbd5e1; }
.toggle-label { font-weight: bold; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; }

/* 💡 歷史紀錄查詢區塊樣式 */
.history-calendar-container { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.history-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;}
.section-title { margin: 0; color: #1e293b; font-size: 1.3rem; }
.export-btn-group { display: flex; gap: 10px; }
.btn-export-json { background: #8b5cf6; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-export-csv { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }

.calendar-layout { display: flex; gap: 20px; flex-wrap: nowrap; }
.calendar-box { flex: 1; min-width: 0; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
.history-detail-box { flex: 1.5; min-width: 0; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }

.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.cal-nav-btn { background: white; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; color: #475569; }
.cal-title { font-size: 1.2rem; color: #1e293b; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center; }
.cal-day-name { font-weight: bold; color: #64748b; padding-bottom: 10px; }
.cal-cell { height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; background: white; border: 1px solid #e2e8f0; transition: all 0.2s; }
.cal-cell:not(.empty):hover { background: #e0e7ff; border-color: #a5b4fc; }
.cal-cell.empty { background: transparent; border-color: transparent; cursor: default; }
.cal-cell.selected { background: #3b82f6; color: white; border-color: #2563eb; }
.cal-cell.selected .record-dot { background: white; }
.cal-date-num { font-weight: bold; font-size: 1.1rem; }
.record-dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; margin-top: 4px; }

.empty-detail { text-align: center; color: #94a3b8; margin-top: 50px; font-size: 1.1rem; }
.detail-title { margin: 0 0 10px 0; font-size: 1.2rem; color: #1e293b; }
.history-status-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 0.9rem; margin-bottom: 15px; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;}
.history-status-badge.is-fallback { background: #fef3c7; color: #92400e; border: 1px solid #fde68a;}
.history-seating-preview { overflow-x: auto; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;}

/* 唯讀座位表樣式 (複用首頁的展示邏輯) */
.seating-wrapper { width: 100%; -webkit-overflow-scrolling: touch; }
.seating-area { width: 100%; min-width: 900px; margin: 0 auto; transition: transform 0.5s ease; }
.seating-area.is-rotated { transform: rotate(180deg); }
.seating-area.is-rotated .seat-card-readonly, .seating-area.is-rotated .row-label-readonly, .seating-area.is-rotated .teacher-desk-readonly { transform: rotate(-180deg); }
.labels-grid-readonly { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 15px; }
.row-label-readonly { text-align: center; font-weight: bold; color: #0f766e; font-size: 1.1rem; transition: transform 0.5s ease; }
.seats-grid-readonly { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 35px; }
.seat-card-readonly { border: 2px solid #cbd5e1; border-radius: 8px; background: #f8fafc; padding: 10px; text-align: center; min-height: 110px; display: flex; flex-direction: column; transition: transform 0.5s ease; }
.seat-card-readonly.is-hidden-seat-readonly { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
.seat-id-readonly { font-size: 0.8rem; color: #94a3b8; text-align: left; margin-bottom: 5px; font-weight: bold; }
.seat-text-container { display: flex; flex-direction: column; gap: 4px; font-weight: bold; justify-content: center; flex: 1;}
.teacher-desk-readonly { border: 3px solid #0f766e; background: #f0fdfa; padding: 15px 20px; border-radius: 8px; text-align: center; width: 250px; margin: 0 auto; transition: transform 0.5s ease; }
.teacher-desk-readonly h3 { margin: 0; color: #0f766e; font-size: 1.2rem; }

/* 匯出設定視窗樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;}
.modal-content { background: white; padding: 25px; border-radius: 12px; width: 100%; max-width: 600px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
.modal-title { margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; color: #1e293b; }
.form-row { display: flex; gap: 15px; }
.flex-1 { flex: 1; }
textarea.form-control { resize: vertical; line-height: 1.5; font-family: inherit;}
.modal-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
.action-right { display: flex; gap: 10px; }
.btn-save-template { background: #10b981; color: white; border: none; padding: 10px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-save-template:disabled { background: #9ca3af; cursor: not-allowed; }
.btn-cancel { background: #94a3b8; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;}
.btn-print-confirm { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;}

@media (max-width: 900px) {
  .header-top-row { flex-direction: column; align-items: stretch; text-align: center;}
  .style-controls-wrapper { flex-direction: column; gap: 10px; }
  .style-group { border-right: none; padding-right: 0; justify-content: center; }
  .header-actions { justify-content: center; }
  .calendar-layout { flex-direction: column; }
  .export-btn-group { width: 100%; justify-content: space-between;}
  .btn-export-json, .btn-export-csv { flex: 1;}
}

/* =========================================
   列印模式專用樣式 (模仿 Word/PDF 版面)
   ========================================= */
@media print {
  @page { size: A4 portrait; margin: 15mm; }
  
  .screen-only { display: none !important; }
  
  .print-only-layout { display: block !important; width: 100%; color: black; background: white; font-family: "微軟正黑體", sans-serif; }
  
  .print-page-header { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 15px; }
  
  .print-seat-table { width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px; }
  .print-seat-table td { border: 1px solid black; height: 70px; vertical-align: middle; padding: 5px; width: 16.66%; }
  
  .p-name { font-weight: bold; font-size: 14pt; margin-bottom: 2px; }
  .p-other { font-size: 10pt; color: #333; margin-bottom: 4px; min-height: 14px;}
  .p-num { font-size: 11pt; }
  
  .p-col-label { height: 25px !important; background-color: #f3f3f3 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 12pt;}
  
  .print-desk-wrapper { text-align: center; margin-bottom: 30px; }
  .print-desk { display: inline-block; border: 1px solid black; padding: 8px 30px; font-size: 14pt; font-weight: bold; }
  
  .print-roles-title { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 5px; }
  .print-roles-table { width: 100%; border-collapse: collapse; }
  .role-cell { border: 1px solid black; padding: 10px 15px; vertical-align: top; width: 50%; }
  .role-cell pre { margin: 0; white-space: pre-wrap; font-family: "微軟正黑體", sans-serif; font-size: 12pt; line-height: 1.6; }
}
</style>
