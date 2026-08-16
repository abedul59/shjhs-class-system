<template>
  <div class="page-container" :class="{ 'is-exam-mode': isExamModeView }">
    
    <!-- 🎓 大考模式全螢幕投影畫面 (原始碼直接放入，不使用組件) -->
    <div v-if="isExamModeView && isIpBrownlisted" class="exam-dashboard" :style="currentThemeStyles">
      <button @click="isExamModeView = false" class="exit-exam-btn">✖ 結束大考模式</button>
      <h1 class="exam-main-title">{{ examData.title }}</h1>
      <div class="exam-split-layout">
        <div class="exam-left-panel">
          <table class="exam-table">
            <thead>
              <tr>
                <th width="120">節次</th><th>考科</th><th>開始時間</th><th>結束時間</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in examStatus.periods" :key="i" :class="{ 'active-row': p.isActive }">
                <td>第 {{ i + 1 }} 節</td>
                <td class="font-bold">{{ p.subject }}</td>
                <td class="font-mono">{{ p.startTime }}</td>
                <td class="font-mono">{{ p.endTime }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="exam-right-panel">
          <div class="clock-label">目前時間</div>
          <div class="exam-clock">{{ currentTime }}</div>
          <div class="exam-status-display">
            <div v-if="examStatus.state === 'WAITING'" class="status-text waiting">⏳ 準備中...</div>
            <div v-else-if="examStatus.state === 'FINISHED'" class="status-text finished">🎉 今日全數結束</div>
            <div v-else-if="examStatus.state === 'TESTING'" class="status-text testing">
              <div class="status-label">✏️ 目前進行</div>
              <div class="status-subject">{{ examStatus.current.subject }}</div>
              <div v-if="examStatus.current.isExam" class="countdown-wrapper">
                <div class="countdown-label">距離本節結束還有</div>
                <div class="exam-countdown" :class="{ 'text-danger': countdownMinutes < 5 }">{{ countdownText }}</div>
              </div>
              <div v-else class="study-mode-text">📖 溫書自習中</div>
            </div>
            <div v-else-if="examStatus.state === 'BREAK'" class="status-text break">
              <div class="status-label">☕ 休息時間</div>
              <div class="status-next" v-if="examStatus.next">
                下一節：<span class="highlight">{{ examStatus.next.subject }}</span> 
                <br><span class="next-time">({{ examStatus.next.startTime }} 開始)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 🌟 原本的常規首頁內容 -->
    <div v-if="!isExamModeView" class="normal-home-content">
      
      <!-- 📌 軟木塞公佈欄 -->
      <div v-if="isAnnouncementVisibleOnIndex && announcements.length > 0 && !isIpBrownlisted" class="corkboard announcement-board">
        <h2 class="board-title cork-title">📌 班級公佈欄</h2>
        <div class="cork-divider"></div>
        <div class="cork-cards-container">
          <div v-for="ann in announcements" :key="ann.id" class="cork-card">
            <div class="pin">📍</div>
            <div class="cork-card-header">
              <h3 class="cork-card-title">{{ privacyFilter(ann.title) }}</h3>
              <span class="cork-card-date">{{ formatDateTime(ann.date) }}</span>
            </div>
            <div class="cork-card-content" v-html="formatNL(ann.content)"></div>
            <div v-if="ann.links && ann.links.length > 0" class="cork-card-links">
               <a v-for="(link, i) in ann.links" :key="i" :href="link.url" target="_blank" class="cork-link">
                 🔗 {{ privacyFilter(link.name) }}
               </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 📢 家長須知 -->
      <div v-if="isNoticeBoardVisibleOnIndex" class="blackboard top-board">
        <h2 class="board-title notice-title">📢 家長須知事項</h2>
        <div class="dashed-divider"></div>
        <div class="board-content-wrapper" :class="{ 'is-collapsed': !isNoticeExpanded }">
          <div class="board-content">
            <div v-if="parentNotices.length === 0" class="empty-text-italic">目前無特別須知事項</div>
            <ul v-else class="item-list">
              <li v-for="(notice, index) in parentNotices" :key="'n-'+index" class="rich-notice-item">
                <span class="bullet">📌</span>
                <div class="rich-notice-content" v-html="privacyFilter(notice)"></div>
              </li>
            </ul>
          </div>
          <div v-if="!isNoticeExpanded" class="fade-mask"></div>
        </div>
        <div class="expand-action desktop-only" v-if="parentNotices.length > 0">
          <button @click="isNoticeExpanded = !isNoticeExpanded" class="btn-expand">
            {{ isNoticeExpanded ? '▲ 收起內容' : '▼ 展開完整須知' }}
          </button>
        </div>
      </div>

      <div class="main-split">
        <!-- ⬅️ 左半邊 (控制面板 + 點名網格) -->
        <div class="left-panel">
          <div class="control-card">
            <div class="clock-display">🕒 {{ currentTime }}</div>
            
            <div v-if="scheduleDisplay" class="schedule-ticker">
              <div class="current-class">
                <span class="pulse-dot" v-if="scheduleDisplay.current.status === '上課中'"></span>
                <strong>{{ scheduleDisplay.current.label }}：</strong>
                <span class="subject-text">{{ scheduleDisplay.current.subject }}</span>
                <span class="teacher-text" v-if="scheduleDisplay.current.teacher">({{ scheduleDisplay.current.teacher }})</span>
              </div>
              <div class="next-class" v-if="scheduleDisplay.next">
                <strong>下節課：</strong>
                <span>{{ scheduleDisplay.next.subject }}</span>
              </div>
            </div>

            <button v-if="isIpBrownlisted && examData.isExamModeEnabled && examData.periods && examData.periods.length > 0" @click="isExamModeView = true" class="btn-enter-exam">
              🎓 切換至大考看板模式
            </button>

            <div class="button-group">
              <NuxtLink v-if="indexButtonSettings.parentBind" to="/parent-bind" class="btn btn-orange">👨‍👩‍👧 綁定</NuxtLink>
              <NuxtLink v-if="indexButtonSettings.parentMsg" to="/parent-message" class="btn btn-green">💬 家長私訊</NuxtLink>
              <NuxtLink v-if="indexButtonSettings.studentMsg" to="/student-message" class="btn btn-blue">💬 學生私訊</NuxtLink>
              <NuxtLink v-if="indexButtonSettings.assignments" to="/assignments" class="btn btn-purple">📚 作業管理</NuxtLink>
              <NuxtLink v-if="indexButtonSettings.discipline" to="/discipline" class="btn btn-dark-blue">⚖️ 秩序管理</NuxtLink>
              <NuxtLink v-if="indexButtonSettings.hygiene" to="/hygiene" class="btn btn-cyan">🧹 衛生管理</NuxtLink>            
              <NuxtLink v-if="indexButtonSettings.seats" to="/seats" class="btn btn-teal">🪑 座位管理</NuxtLink>
              <NuxtLink v-if="indexButtonSettings.schedule" to="/schedule" class="btn btn-amber">🗓️ 課表管理</NuxtLink>
              <NuxtLink v-if="indexButtonSettings.exams" to="/exams" class="btn btn-rose">📝 大考管理</NuxtLink>
              <button v-if="indexButtonSettings.emergency" @click="openPwdModal('emergency')" class="btn btn-red">🚨 緊急通知</button>
              <NuxtLink v-if="indexButtonSettings.admin" to="/admin" class="btn btn-dark">⚙️ 後台</NuxtLink>
              
              <button v-if="seatingChart.isVisible && indexButtonSettings.seats" @click="showSeatingChartLocal = !showSeatingChartLocal" class="btn btn-indigo">
                {{ showSeatingChartLocal ? '🙈 隱藏教室座位表' : '👀 顯示教室座位表' }}
              </button>
              <button v-if="hygieneData.isVisibleOnIndex && indexButtonSettings.hygiene" @click="showHygieneLocal = !showHygieneLocal" class="btn btn-sky">
                {{ showHygieneLocal ? '🙈 隱藏衛生工作' : '🧹 顯示衛生工作' }}
              </button>
              <NuxtLink v-if="isHistoryVisibleOnIndex" to="/history" class="btn btn-pink">📅 查詢近期聯絡簿</NuxtLink>
            </div>
          </div>

          <!-- 👦 學生出缺席網格 (原始碼直接放入) -->
          <div class="attendance-wrapper">
            <div class="stats-row">
              <div class="stat-box stat-expected">應到: <strong>{{ expectedCount }}</strong></div>
              <div class="stat-box stat-present">已到: <strong>{{ presentCount }}</strong></div>
              <div class="stat-box stat-leave">請假: <strong>{{ leaveCount }}</strong></div>
              <div class="stat-box stat-late">遲到: <strong>{{ lateCount }}</strong></div>
              <div class="stat-box stat-absent">未到: <strong>{{ absentCount }}</strong></div>
            </div>

            <div class="student-grid">
              <div v-for="student in allStudents" :key="student.id" class="student-card" :class="getAttendanceClass(student.id)" @click="toggleAttendance(student)">
                <div class="student-seat">{{ student.seat_number }}</div>
                <div class="student-name">{{ privacyFilter(student.real_name) }}</div>
                <div class="student-status">{{ getAttendanceStatus(student.id) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ➡️ 右半邊 (注意事項 + 聯絡簿) -->
        <div class="right-panel">
          
          <!-- ⚡ 今日班級注意事項 (深海藍) -->
          <div class="blackboard notes-board">
            <div class="board-header">
              <div><h2 class="board-title notes-title">⚡ 今日班級注意事項</h2><p class="board-date">{{ todayDisplay }}</p></div>
              <button v-if="!isEditingClassNotes" @click="openPwdModal('classNotes')" class="edit-btn btn-blue-theme">✏️ 編輯</button>
            </div>
            <div class="dashed-divider divider-blue"></div>
            <div class="board-content">
              <div v-if="!isEditingClassNotes">
                <div v-if="classNoteItems.length === 0" class="empty-text-italic">目前尚無特別注意事項...</div>
                <ul v-else class="item-list notes-list">
                  <li v-for="(item, index) in classNoteItems" :key="'cn-'+index">{{ index + 1 }}. {{ privacyFilter(item) }}</li>
                </ul>
              </div>
              <div v-else class="edit-mode mode-blue">
                <div v-for="(item, index) in editingClassNoteItems" :key="'edit-note-'+index" class="edit-row">
                  <span class="row-num num-blue">{{ index + 1 }}.</span>
                  <input v-model="editingClassNoteItems[index]" type="text" placeholder="輸入注意事項..." class="edit-input input-blue"/>
                  <button @click="removeClassNoteItem(index)" class="del-row-btn">🗑️</button>
                </div>
                <div class="edit-actions">
                  <button @click="addClassNoteItem" class="add-btn btn-outline-blue">➕ 新增事項</button>
                  <div class="action-right">
                    <button @click="isEditingClassNotes = false" class="cancel-btn">取消</button>
                    <button @click="saveClassNoteItems" class="save-btn btn-solid-blue">💾 儲存</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ⭐ 今日聯絡簿 (黑板綠) -->
          <div class="blackboard contact-board">
            <div class="board-header">
              <div><h2 class="board-title contact-title">⭐ 今日聯絡簿</h2><p class="board-date">{{ todayDisplay }}</p></div>
              <button v-if="!isEditingContact" @click="openPwdModal('contact')" class="edit-btn">✏️ 編輯</button>
            </div>
            <div class="dashed-divider"></div>
            <div class="board-content">
              <div v-if="!isEditingContact">
                <div v-if="contactBookItems.length === 0" class="empty-text-italic">目前尚無聯絡簿事項...</div>
                <ul v-else class="item-list contact-list">
                  <li v-for="(item, index) in contactBookItems" :key="'c-'+index">{{ index + 1 }}. {{ privacyFilter(item) }}</li>
                </ul>
              </div>
              <div v-else class="edit-mode">
                <div v-for="(item, index) in editingContactItems" :key="'edit-'+index" class="edit-row">
                  <span class="row-num">{{ index + 1 }}.</span>
                  <input v-model="editingContactItems[index]" type="text" placeholder="輸入事項..." class="edit-input"/>
                  <button @click="removeContactItem(index)" class="del-row-btn">🗑️</button>
                </div>
                <div class="edit-actions">
                  <button @click="addContactItem" class="add-btn">➕ 新增事項</button>
                  <div class="action-right">
                    <button @click="isEditingContact = false" class="cancel-btn">取消</button>
                    <button @click="saveContactItems" class="save-btn">💾 儲存</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 🪑 座位與衛生組件 (原始碼直接放入) -->
      <div class="extra-modules">
        <div v-if="seatingChart.isVisible && showSeatingChartLocal && indexButtonSettings.seats" class="seating-display-board">
          <h3 class="seating-title">🪑 班級座位表</h3>
          <div class="seating-wrapper">
            <div :class="['seating-area', { 'is-rotated': seatingChart.isRotated }]">
              <div class="labels-grid-readonly">
                <div v-for="n in 6" :key="'readonly-label-'+n" class="row-label-readonly">第{{ n }}排</div>
              </div>
              <div class="seats-grid-readonly">
                <div v-for="seat in seatingChart.seats" :key="seat.id" :class="['seat-card-readonly', { 'is-hidden-seat-readonly': seat.isHidden }]">
                  <div class="seat-id-readonly">{{ seat.id }}</div>
                  <div class="seat-text-container">
                    <div :style="{ fontSize: (seatingChart.settings?.numberSize || 16) + 'px', color: seatingChart.settings?.numberColor || '#64748b' }">{{ seat.seatNum }}</div>
                    <div :style="{ fontSize: (seatingChart.settings?.nameSize || 20) + 'px', color: seatingChart.settings?.nameColor || '#e11d48' }">{{ privacyFilter(seat.name) }}</div>
                    <div v-if="seat.other" :style="{ fontSize: (seatingChart.settings?.otherSize || 14) + 'px', color: seatingChart.settings?.otherColor || '#94a3b8' }">{{ privacyFilter(seat.other) }}</div>
                  </div>
                </div>
              </div>
              <div class="teacher-desk-readonly"><h3>講桌</h3></div>
            </div>
          </div>
        </div>

        <div v-if="hygieneData.isVisibleOnIndex && showHygieneLocal && indexButtonSettings.hygiene" class="hygiene-display-board">
          <h3 class="hygiene-main-title">🧹 班級衛生工作管理</h3>
          <div class="tabs-container-readonly">
            <button class="tab-btn" :class="{ active: activeHygieneTab === 'morning' }" @click="activeHygieneTab = 'morning'">🌅 早上掃地</button>
            <button class="tab-btn" :class="{ active: activeHygieneTab === 'lunch' }" @click="activeHygieneTab = 'lunch'">🍱 中午搬餐</button>
            <button class="tab-btn" :class="{ active: activeHygieneTab === 'squad' }" @click="activeHygieneTab = 'squad'">🛡️ 小隊工作</button>
          </div>
          
          <div class="hygiene-wrapper">
            <div v-show="activeHygieneTab === 'morning'" class="hygiene-content">
              <h3 class="hygiene-content-title" v-html="formatNL(hygieneData.morning.title)"></h3>
              <table class="custom-table morning-table">
                <thead><tr><th colspan="2" width="20%">教室</th><th width="30%">成員名單</th><th width="50%">工作內容</th></tr></thead>
                <tbody>
                  <tr><td colspan="2" v-html="formatNL(hygieneData.morning.in_hygiene)"></td><td v-html="formatNL(hygieneData.morning.in_hygiene_names)"></td><td v-html="formatNL(hygieneData.morning.in_hygiene_work)"></td></tr>
                  <tr><td colspan="2" v-html="formatNL(hygieneData.morning.board)"></td><td v-html="formatNL(hygieneData.morning.board_names)"></td><td v-html="formatNL(hygieneData.morning.board_work)"></td></tr>
                  <tr><td colspan="2" v-html="formatNL(hygieneData.morning.sweep)"></td><td v-html="formatNL(hygieneData.morning.sweep_names)"></td><td rowspan="2" v-html="formatNL(hygieneData.morning.sweep_mop_work)"></td></tr>
                  <tr><td colspan="2" v-html="formatNL(hygieneData.morning.mop)"></td><td v-html="formatNL(hygieneData.morning.mop_names)"></td></tr>
                  <tr><td colspan="2" v-html="formatNL(hygieneData.morning.window)"></td><td v-html="formatNL(hygieneData.morning.window_names)"></td><td v-html="formatNL(hygieneData.morning.window_work)"></td></tr>
                  <tr><td colspan="2" v-html="formatNL(hygieneData.morning.hallway)"></td><td v-html="formatNL(hygieneData.morning.hallway_names)"></td><td v-html="formatNL(hygieneData.morning.hallway_work)"></td></tr>
                  <tr><td colspan="2" v-html="formatNL(hygieneData.morning.trash)"></td><td v-html="formatNL(hygieneData.morning.trash_names)"></td><td v-html="formatNL(hygieneData.morning.trash_work)"></td></tr>
                  <tr class="header-row"><th>外掃區</th><th>打掃區域</th><th>成員名單</th><th>工作內容</th></tr>
                  <tr><td rowspan="4" v-html="formatNL(hygieneData.morning.out_area)"></td><td v-html="formatNL(hygieneData.morning.out_hygiene)"></td><td v-html="formatNL(hygieneData.morning.out_hygiene_names)"></td><td v-html="formatNL(hygieneData.morning.out_hygiene_work)"></td></tr>
                  <tr><td rowspan="3" v-html="formatNL(hygieneData.morning.out_sweep1)"></td><td v-html="formatNL(hygieneData.morning.out_sweep1_names)"></td><td rowspan="3" v-html="formatNL(hygieneData.morning.out_sweep_work)"></td></tr>
                  <tr><td v-html="formatNL(hygieneData.morning.out_sweep2_names)"></td></tr>
                  <tr><td v-html="formatNL(hygieneData.morning.out_sweep3_names)"></td></tr>
                </tbody>
              </table>
              <div class="footer-note" v-html="formatNL(hygieneData.morning.note)"></div>
            </div>

            <div v-show="activeHygieneTab === 'lunch'" class="hygiene-content">
              <h3 class="hygiene-content-title" v-html="formatNL(hygieneData.lunch.title)"></h3>
              <div class="hygiene-sub-title" v-html="formatNL(hygieneData.lunch.sub)"></div>
              <table class="custom-table lunch-table">
                <tbody>
                  <tr>
                    <th rowspan="2" width="10%" v-html="formatNL(hygieneData.lunch.clean_header)"></th>
                    <th width="15%" v-html="formatNL(hygieneData.lunch.clean_h1)"></th><th width="15%" v-html="formatNL(hygieneData.lunch.clean_h2)"></th>
                    <th width="15%" v-html="formatNL(hygieneData.lunch.clean_h3)"></th><th width="15%" v-html="formatNL(hygieneData.lunch.clean_h4)"></th>
                    <th width="15%" v-html="formatNL(hygieneData.lunch.clean_h5)"></th><th width="15%" v-html="formatNL(hygieneData.lunch.clean_h6)"></th>
                  </tr>
                  <tr>
                    <td v-html="formatNL(hygieneData.lunch.clean_n1)"></td><td v-html="formatNL(hygieneData.lunch.clean_n2)"></td><td v-html="formatNL(hygieneData.lunch.clean_n3)"></td>
                    <td v-html="formatNL(hygieneData.lunch.clean_n4)"></td><td v-html="formatNL(hygieneData.lunch.clean_n5)"></td><td v-html="formatNL(hygieneData.lunch.clean_n6)"></td>
                  </tr>
                  <tr>
                    <th rowspan="2" v-html="formatNL(hygieneData.lunch.move_header)"></th>
                    <th v-html="formatNL(hygieneData.lunch.move_h1)"></th><th v-html="formatNL(hygieneData.lunch.move_h2)"></th><th v-html="formatNL(hygieneData.lunch.move_h3)"></th>
                    <th v-html="formatNL(hygieneData.lunch.move_h4)"></th><th v-html="formatNL(hygieneData.lunch.move_h5)"></th><th v-html="formatNL(hygieneData.lunch.move_h6)"></th>
                  </tr>
                  <tr>
                    <td v-html="formatNL(hygieneData.lunch.move_n1)"></td><td v-html="formatNL(hygieneData.lunch.move_n2)"></td><td v-html="formatNL(hygieneData.lunch.move_n3)"></td>
                    <td v-html="formatNL(hygieneData.lunch.move_n4)"></td><td v-html="formatNL(hygieneData.lunch.move_n5)"></td><td v-html="formatNL(hygieneData.lunch.move_n6)"></td>
                  </tr>
                  <tr>
                    <th rowspan="2" v-html="formatNL(hygieneData.lunch.serve_header)"></th>
                    <th v-html="formatNL(hygieneData.lunch.serve_h1)"></th><th v-html="formatNL(hygieneData.lunch.serve_h2)"></th><th v-html="formatNL(hygieneData.lunch.serve_h3)"></th>
                    <th v-html="formatNL(hygieneData.lunch.serve_h4)"></th><th v-html="formatNL(hygieneData.lunch.serve_h5)"></th><th v-html="formatNL(hygieneData.lunch.serve_h6)"></th>
                  </tr>
                  <tr>
                    <td v-html="formatNL(hygieneData.lunch.serve_n1)"></td><td v-html="formatNL(hygieneData.lunch.serve_n2)"></td><td v-html="formatNL(hygieneData.lunch.serve_n3)"></td>
                    <td v-html="formatNL(hygieneData.lunch.serve_n4)"></td><td v-html="formatNL(hygieneData.lunch.serve_n5)"></td><td v-html="formatNL(hygieneData.lunch.serve_n6)"></td>
                  </tr>
                </tbody>
              </table>
              <div class="footer-note mt-15 text-sm" v-html="formatNL(hygieneData.lunch.note1)"></div>
              <div class="footer-note mt-10 text-sm" v-html="formatNL(hygieneData.lunch.note2)"></div>
            </div>

            <div v-show="activeHygieneTab === 'squad'" class="hygiene-content">
              <h3 class="hygiene-content-title" v-html="formatNL(hygieneData.squad.title)"></h3>
              <table class="custom-table squad-table">
                <thead>
                  <tr><th width="15%">小隊職務</th><th width="20%">細項</th><th width="20%">姓名 或 座號</th><th width="45%">工作內容</th></tr>
                </thead>
                <tbody>
                  <tr v-for="n in 6" :key="'ld-'+n">
                    <td v-if="n===1" rowspan="6">小隊長</td><td>小隊長 {{n}}</td>
                    <td v-html="formatNL(hygieneData.squad.leaders[n-1])"></td>
                    <td v-if="n===1" rowspan="6" v-html="formatNL(hygieneData.squad.leader_desc)"></td>
                  </tr>
                  <tr v-for="n in 6" :key="'dy-'+n">
                    <td v-if="n===1" rowspan="6">值日生<br><span class="text-xs">(每天第 7 節下課到辦公室簽到)</span></td><td>值日生 {{n}}</td>
                    <td v-html="formatNL(hygieneData.squad.duties[n-1])"></td><td v-html="formatNL(hygieneData.squad.duty_desc[n-1])"></td>
                  </tr>
                  <tr v-for="n in 5" :key="'hp-'+n">
                    <td v-if="n===1" rowspan="5">小幫手<br><span class="text-xs">(每天第 1 節下課到辦公室簽到)</span></td><td>小幫手 {{n}}</td>
                    <td v-html="formatNL(hygieneData.squad.helpers[n-1])"></td><td v-html="formatNL(hygieneData.squad.helper_desc[n-1])"></td>
                  </tr>
                  <tr v-for="n in 4" :key="'er-'+n">
                    <td v-if="n===1" rowspan="4">公差<br><span class="text-xs">(每天第 2 節下課到辦公室簽到...)</span></td><td>公差 {{n}}</td>
                    <td v-html="formatNL(hygieneData.squad.errands[n-1])"></td><td v-html="formatNL(hygieneData.squad.errand_desc[n-1])"></td>
                  </tr>
                  <tr v-for="n in 2" :key="'mn-'+n">
                    <td v-if="n===1" rowspan="2">小小兵<br><span class="text-xs">(每天第 3 節下課到辦公室簽到)</span></td><td>小小兵 {{n}}</td>
                    <td v-html="formatNL(hygieneData.squad.minions[n-1])"></td><td v-if="n===1" rowspan="2" v-html="formatNL(hygieneData.squad.minion_desc)"></td>
                  </tr>
                  <tr v-for="n in 3" :key="'ot-'+n">
                    <td v-if="n===1" rowspan="3">其他</td><td>特別小助理 {{n}}</td>
                    <td v-html="formatNL(hygieneData.squad.others[n-1])"></td><td v-if="n===1" rowspan="3" v-html="formatNL(hygieneData.squad.other_desc)"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div> 

    <!-- 密碼彈窗 -->
    <div v-if="showPwdModal" class="modal-overlay" @click.self="closePwdModal">
      <div class="pwd-modal-content">
        <h3>{{ pwdModalTitle }}</h3>
        <p class="pwd-desc">{{ pwdModalDesc }}</p>
        <input type="password" v-model="pwdInput" @keyup.enter="submitPwd" class="pwd-input" placeholder="請輸入密碼..." autofocus />
        <div class="pwd-actions">
          <button @click="closePwdModal" class="cancel-btn">取消</button>
          <button @click="submitPwd" class="confirm-btn">解鎖</button>
        </div>
      </div>
    </div>

    <EmergencyModal v-if="showEmergencyModal" @close="showEmergencyModal = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const supabase = useSupabaseClient()

const showEmergencyModal = ref(false)
const showSeatingChartLocal = ref(false)
const showHygieneLocal = ref(false)
const activeHygieneTab = ref('morning')
const isNoticeExpanded = ref(false)
const isHistoryVisibleOnIndex = ref(false)

// 💡 顯示開關變數
const isAnnouncementVisibleOnIndex = ref(true)
const isNoticeBoardVisibleOnIndex = ref(true) 

const isIpWhitelisted = ref(false)
const isIpBrownlisted = ref(false)
const currentIpStr = ref('')

const announcements = ref([])
const scheduleData = ref(null)

const isExamModeView = ref(false)
const examData = ref({ isExamModeEnabled: true, theme: 'midnight', title: '', periods: [] })
const indexButtonSettings = ref({
  parentBind: true, parentMsg: true, studentMsg: true, assignments: true, discipline: true, hygiene: true, seats: true, emergency: true, admin: true, schedule: true, exams: true
})

const examThemes = {
  midnight: { name: '午夜藍 (Midnight)', bg: '#0f172a', border: '#334155', title: '#f8fafc', clock: '#fbbf24', text: '#cbd5e1', accent: '#3b82f6', success: '#10b981', danger: '#ef4444', panelBg: '#1e293b' },
  blackboard: { name: '經典黑板 (Blackboard)', bg: '#1a3627', border: '#5b3a1a', title: '#ffffff', clock: '#fbbf24', text: '#e2e8f0', accent: '#fca5a5', success: '#a7f3d0', danger: '#f87171', panelBg: '#234a36' }
}

const defaultHygieneData = {
  isVisibleOnIndex: false,
  morning: { title: '', note: '', in_hygiene: '', in_hygiene_names: '', in_hygiene_work: '', board: '', board_names: '', board_work: '', sweep: '', sweep_names: '', sweep_mop_work: '', mop: '', mop_names: '', window: '', window_names: '', window_work: '', hallway: '', hallway_names: '', hallway_work: '', trash: '', trash_names: '', trash_work: '', out_area: '', out_hygiene: '', out_hygiene_names: '', out_hygiene_work: '', out_sweep1: '', out_sweep1_names: '', out_sweep_work: '', out_sweep2_names: '', out_sweep3_names: '' },
  lunch: { title: '', sub: '', clean_header: '', clean_h1: '', clean_h2: '', clean_h3: '', clean_h4: '', clean_h5: '', clean_h6: '', clean_n1: '', clean_n2: '', clean_n3: '', clean_n4: '', clean_n5: '', clean_n6: '', move_header: '', move_h1: '', move_h2: '', move_h3: '', move_h4: '', move_h5: '', move_h6: '', move_n1: '', move_n2: '', move_n3: '', move_n4: '', move_n5: '', move_n6: '', serve_header: '', serve_h1: '', serve_h2: '', serve_h3: '', serve_h4: '', serve_h5: '', serve_h6: '', serve_n1: '', serve_n2: '', serve_n3: '', serve_n4: '', serve_n5: '', serve_n6: '', note1: '', note2: '' },
  squad: { title: '', leader_desc: '', leaders: ['', '', '', '', '', ''], duty_desc: ['', '', '', '', '', ''], duties: ['', '', '', '', '', ''], helper_desc: ['', '', '', '', ''], helpers: ['', '', '', '', ''], errand_desc: ['', '', '', ''], errands: ['', '', '', ''], minion_desc: '', minions: ['', ''], other_desc: '', others: ['', '', ''] }
}
const hygieneData = ref(JSON.parse(JSON.stringify(defaultHygieneData)))

const currentThemeStyles = computed(() => {
  const t = examThemes[examData.value.theme] || examThemes.midnight
  return { '--ex-bg': t.bg, '--ex-border': t.border, '--ex-title': t.title, '--ex-clock': t.clock, '--ex-text': t.text, '--ex-accent': t.accent, '--ex-success': t.success, '--ex-danger': t.danger, '--ex-panel-bg': t.panelBg }
})

const checkIpRules = async () => {
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json')
    const { ip } = await ipRes.json()
    currentIpStr.value = ip 
    const { data: rules } = await supabase.from('ip_rules').select('ip_range, rule_type')
    if (rules && rules.length > 0) {
      isIpWhitelisted.value = rules.filter(r => r.rule_type === '白名單').some(r => ip.startsWith(r.ip_range))
      isIpBrownlisted.value = rules.filter(r => r.rule_type === '褐名單').some(r => ip.startsWith(r.ip_range))
    }
  } catch (e) { console.error('IP check failed', e) }
}

const logVisit = async () => {
  if (sessionStorage.getItem('visit_logged')) return
  try {
    const ua = navigator.userAgent
    let role = '匿名來訪者'
    if (sessionStorage.getItem('schedule_admin_logged_in') === 'true' || sessionStorage.getItem('exams_admin_logged_in') === 'true') role = '導師'
    await supabase.from('visitor_logs').insert([{ ip_address: currentIpStr.value || '未知IP', device_info: ua, role: role }])
    sessionStorage.setItem('visit_logged', 'true')
  } catch (e) {}
}

const logRoleVisit = async (roleName) => {
  try { await supabase.from('visitor_logs').insert([{ ip_address: currentIpStr.value || '未知IP', device_info: navigator.userAgent, role: roleName }]) } catch (e) {}
}

const privacyFilter = (txt) => {
  let result = String(txt || '')
  if (!isIpWhitelisted.value && allStudents.value.length > 0) {
    const sortedStudents = [...allStudents.value].sort((a, b) => (b.real_name || '').length - (a.real_name || '').length)
    sortedStudents.forEach(stu => {
      if (stu.real_name && stu.hidden_name && stu.real_name.trim() !== '') { result = result.split(stu.real_name).join(stu.hidden_name) }
    })
  }
  return result
}

const formatNL = (txt) => privacyFilter(txt).replace(/\n/g, '<br>')
const formatDateTime = (dtStr) => {
  if (!dtStr) return ''
  return new Date(dtStr).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

const dDate = new Date()
const todayISO = `${dDate.getFullYear()}-${String(dDate.getMonth()+1).padStart(2,'0')}-${String(dDate.getDate()).padStart(2,'0')}`
const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const todayDisplay = `${dDate.getFullYear()}年${dDate.getMonth()+1}月${dDate.getDate()}日${days[dDate.getDay()]}`

const currentTime = ref('')
const nowTick = ref(Date.now())
let timer = null

const updateTime = () => {
  const now = new Date()
  nowTick.value = now.getTime()
  currentTime.value = now.toLocaleTimeString('zh-TW', { hour12: false })
}

const scheduleDisplay = computed(() => {
  if (!scheduleData.value || !scheduleData.value.periods) return null
  const currentDayIndex = new Date(nowTick.value).getDay() - 1 
  if (currentDayIndex < 0 || currentDayIndex > 4) return null 
  
  const now = new Date(nowTick.value)
  const nowMins = now.getHours() * 60 + now.getMinutes()
  let currentClass = { status: '下課中', label: '目前', subject: '休息時間', teacher: '' }
  let nextClass = null
  
  for (let i = 0; i < scheduleData.value.periods.length; i++) {
    const p = scheduleData.value.periods[i]
    if (!p.startTime || !p.endTime) continue
    const [sh, sm] = p.startTime.split(':').map(Number)
    const [eh, em] = p.endTime.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    
    const dayData = p.days[currentDayIndex]
    if (!dayData || !dayData.subject) continue
    
    if (nowMins >= startMins && nowMins <= endMins) {
      currentClass = { status: '上課中', label: p.name, subject: dayData.subject, teacher: dayData.teacher }
      for (let j = i + 1; j < scheduleData.value.periods.length; j++) {
        const nextP = scheduleData.value.periods[j]
        const nextDayData = nextP.days[currentDayIndex]
        if (nextDayData && nextDayData.subject) { nextClass = { subject: nextDayData.subject }; break }
      }
      break
    }
    if (nowMins < startMins && !nextClass) { nextClass = { subject: dayData.subject } }
  }
  return { current: currentClass, next: nextClass }
})

const examStatus = computed(() => {
  if (!examData.value || !examData.value.periods || examData.value.periods.length === 0) return { state: 'WAITING', periods: [] }
  const now = new Date(nowTick.value)
  const nowMins = now.getHours() * 60 + now.getMinutes()

  let current = null; let next = null; let state = 'WAITING'
  const periods = JSON.parse(JSON.stringify(examData.value.periods))

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i]
    if (!p.startTime || !p.endTime) continue
    const [sh, sm] = p.startTime.split(':').map(Number)
    const [eh, em] = p.endTime.split(':').map(Number)
    const startMins = sh * 60 + sm; const endMins = eh * 60 + em
    p.isActive = false

    if (nowMins >= startMins && nowMins <= endMins) {
      state = 'TESTING'; current = p; p.isActive = true
      if (i + 1 < periods.length) next = periods[i + 1]
      break
    }
    if (nowMins < startMins) {
      if (state !== 'TESTING') { state = i === 0 ? 'WAITING' : 'BREAK'; next = p }
      break
    }
  }

  const lastP = periods[periods.length - 1]
  if (lastP && lastP.endTime) {
    const [lsh, lsm] = lastP.endTime.split(':').map(Number)
    if (!current && !next && nowMins >= (lsh * 60 + lsm)) { state = 'FINISHED' }
  }
  return { state, current, next, periods }
})

const countdownMinutes = computed(() => {
  if (examStatus.value.state !== 'TESTING' || !examStatus.value.current) return 999;
  const currentTick = nowTick.value; const now = new Date(currentTick);
  const [eh, em] = examStatus.value.current.endTime.split(':').map(Number);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em, 0);
  return Math.floor((end.getTime() - currentTick) / 60000);
})

const countdownText = computed(() => {
  if (examStatus.value.state !== 'TESTING' || !examStatus.value.current) return '';
  const currentTick = nowTick.value; const now = new Date(currentTick);
  const [eh, em] = examStatus.value.current.endTime.split(':').map(Number);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em, 0);
  
  const diffMs = end.getTime() - currentTick;
  if (diffMs <= 0) return '00:00';
  const diffMins = Math.floor(diffMs / 60000); const diffSecs = Math.floor((diffMs % 60000) / 1000);
  return `${String(diffMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`;
})

const parentNotices = ref([])
const officerPasswords = ref({ academic: '', counseling: '', discipline: '', teacher: '168168168' })
const seatingChart = ref({ isVisible: false, isRotated: false, seats: [], settings: {} })

const contactBookItems = ref([])
const isEditingContact = ref(false)
const editingContactItems = ref([])

// 💡 班級注意事項變數
const classNoteItems = ref([])
const isEditingClassNotes = ref(false)
const editingClassNoteItems = ref([])

const currentEditorRole = ref('') 

const showPwdModal = ref(false)
const pwdTarget = ref('')
const pwdModalTitle = ref('')
const pwdModalDesc = ref('')
const pwdInput = ref('')

const openPwdModal = (target) => {
  pwdTarget.value = target
  pwdInput.value = ''
  if (target === 'emergency') { 
    pwdModalTitle.value = '🚨 緊急通知系統解鎖'; pwdModalDesc.value = '請輸入「導師」密碼：' 
  } else if (target === 'contact') { 
    pwdModalTitle.value = '✏️ 編輯聯絡簿解鎖'; pwdModalDesc.value = '請輸入「學藝股長」、「輔導股長」或「導師」密碼：' 
  } else if (target === 'classNotes') { 
    pwdModalTitle.value = '⚡ 編輯注意事項解鎖'; pwdModalDesc.value = '請輸入「學藝股長」、「輔導股長」或「導師」密碼：' 
  }
  showPwdModal.value = true
}

const closePwdModal = () => { showPwdModal.value = false }

const submitPwd = async () => {
  const pwd = pwdInput.value
  const teacherPwd = officerPasswords.value.teacher || '168168168'

  if (pwdTarget.value === 'emergency') {
    if (pwd === teacherPwd) { showPwdModal.value = false; showEmergencyModal.value = true; await logRoleVisit('導師') } else { alert("❌ 密碼錯誤！") }
  } 
  else if (pwdTarget.value === 'contact') {
    if (officerPasswords.value.academic && pwd === officerPasswords.value.academic) { currentEditorRole.value = '學藝股長'; isEditingContact.value = true; editingContactItems.value = [...contactBookItems.value]; showPwdModal.value = false; await logRoleVisit('學藝股長') } 
    else if (officerPasswords.value.counseling && pwd === officerPasswords.value.counseling) { currentEditorRole.value = '輔導股長'; isEditingContact.value = true; editingContactItems.value = [...contactBookItems.value]; showPwdModal.value = false; await logRoleVisit('輔導股長') } 
    else if (pwd === teacherPwd) { currentEditorRole.value = '導師'; isEditingContact.value = true; editingContactItems.value = [...contactBookItems.value]; showPwdModal.value = false; await logRoleVisit('導師') } 
    else { alert("❌ 密碼錯誤！請確認密碼是否正確。") }
  }
  else if (pwdTarget.value === 'classNotes') {
    if (officerPasswords.value.academic && pwd === officerPasswords.value.academic) { currentEditorRole.value = '學藝股長'; isEditingClassNotes.value = true; editingClassNoteItems.value = [...classNoteItems.value]; showPwdModal.value = false; await logRoleVisit('學藝股長') } 
    else if (officerPasswords.value.counseling && pwd === officerPasswords.value.counseling) { currentEditorRole.value = '輔導股長'; isEditingClassNotes.value = true; editingClassNoteItems.value = [...classNoteItems.value]; showPwdModal.value = false; await logRoleVisit('輔導股長') } 
    else if (pwd === teacherPwd) { currentEditorRole.value = '導師'; isEditingClassNotes.value = true; editingClassNoteItems.value = [...classNoteItems.value]; showPwdModal.value = false; await logRoleVisit('導師') } 
    else { alert("❌ 密碼錯誤！請確認密碼是否正確。") }
  }
}

const allStudents = ref([])
const todayAttendances = ref([])

const expectedCount = computed(() => allStudents.value.length)
const presentCount = computed(() => todayAttendances.value.filter(a => a.status === '已到').length)
const leaveCount = computed(() => todayAttendances.value.filter(a => a.status === '請假').length)
const lateCount = computed(() => todayAttendances.value.filter(a => a.status === '遲到').length)
const absentCount = computed(() => expectedCount.value - presentCount.value - leaveCount.value - lateCount.value)

const toggleAttendance = async (student) => {
  const currentStatus = todayAttendances.value.find(a => a.student_id === student.id)?.status || '未到'
  let nextStatus = '已到'
  if (currentStatus === '未到') nextStatus = '已到'; else if (currentStatus === '已到') nextStatus = '請假'; else if (currentStatus === '請假') nextStatus = '遲到'; else if (currentStatus === '遲到') nextStatus = '未到'

  let record = todayAttendances.value.find(a => a.student_id === student.id)
  if (record) { record.status = nextStatus } else { todayAttendances.value.push({ student_id: student.id, record_date: todayISO, status: nextStatus }) }

  try {
    const { data: existing } = await supabase.from('attendances').select('id').eq('student_id', student.id).eq('record_date', todayISO).maybeSingle()
    if (existing) { await supabase.from('attendances').update({ status: nextStatus }).eq('id', existing.id) } 
    else { await supabase.from('attendances').insert({ student_id: student.id, record_date: todayISO, status: nextStatus }) }
  } catch (err) { console.error(err) }
}

const fetchData = async () => {
  const { data: boardData } = await supabase.from('contact_books').select('contact_items').eq('record_date', todayISO).maybeSingle()
  contactBookItems.value = boardData?.contact_items || []

  // 💡 讀取所有開關與資料
  const { data: sysData } = await supabase.from('system_settings').select('*')
    .in('setting_key', [
      'board_officer_passwords', 
      'seating_chart_data', 
      'hygiene_management_data', 
      'contact_history_visible', 
      'index_button_settings', 
      'announcements_data', 
      'class_schedule_data', 
      'exam_schedule_data', 
      'parent_notices_data', 
      'class_notes_data', 
      'announcement_board_visible',
      'parent_notices_board_visible'
    ])
  
  if (sysData) {
    const pwdSetting = sysData.find(s => s.setting_key === 'board_officer_passwords')
    if (pwdSetting) officerPasswords.value = { ...officerPasswords.value, ...pwdSetting.setting_value }
    
    const histSetting = sysData.find(s => s.setting_key === 'contact_history_visible')
    if (histSetting) isHistoryVisibleOnIndex.value = histSetting.setting_value

    const btnSetting = sysData.find(s => s.setting_key === 'index_button_settings')
    if (btnSetting && btnSetting.setting_value) { indexButtonSettings.value = { ...indexButtonSettings.value, ...btnSetting.setting_value } }

    const annSetting = sysData.find(s => s.setting_key === 'announcements_data')
    if (annSetting && annSetting.setting_value) { announcements.value = (annSetting.setting_value || []).sort((a, b) => new Date(b.date) - new Date(a.date)) }

    const annVisSetting = sysData.find(s => s.setting_key === 'announcement_board_visible')
    if (annVisSetting !== undefined && annVisSetting.setting_value !== null) {
      isAnnouncementVisibleOnIndex.value = annVisSetting.setting_value
    }

    const schSetting = sysData.find(s => s.setting_key === 'class_schedule_data')
    if (schSetting && schSetting.setting_value) { scheduleData.value = schSetting.setting_value }

    const exSetting = sysData.find(s => s.setting_key === 'exam_schedule_data')
    if (exSetting && exSetting.setting_value) { examData.value = { ...examData.value, ...exSetting.setting_value } }

    const noticesSetting = sysData.find(s => s.setting_key === 'parent_notices_data')
    if (noticesSetting && noticesSetting.setting_value) {
      const allNotices = (noticesSetting.setting_value || []).sort((a, b) => Number(a.id) - Number(b.id))
      parentNotices.value = allNotices.filter(n => {
        const startOk = !n.startDate || n.startDate <= todayISO
        const endOk = !n.endDate || n.endDate >= todayISO
        return startOk && endOk
      }).map(n => n.content) 
    } else { parentNotices.value = [] }

    // 💡 獲取家長須知首頁顯示狀態
    const noticeVisSetting = sysData.find(s => s.setting_key === 'parent_notices_board_visible')
    if (noticeVisSetting !== undefined && noticeVisSetting.setting_value !== null) {
      isNoticeBoardVisibleOnIndex.value = noticeVisSetting.setting_value
    }

    const classNotesSetting = sysData.find(s => s.setting_key === 'class_notes_data')
    if (classNotesSetting && classNotesSetting.setting_value) {
      classNoteItems.value = classNotesSetting.setting_value[todayISO] || []
    } else {
      classNoteItems.value = []
    }

    const seatSetting = sysData.find(s => s.setting_key === 'seating_chart_data')
    if (seatSetting) {
      const rawValue = seatSetting.setting_value || {}
      const normalizedSeats = (rawValue.seats || []).map(seat => {
        if (seat.content !== undefined) {
          const lines = String(seat.content || '').split('\n')
          return { id: seat.id, isHidden: seat.isHidden, seatNum: lines[0] || '', name: lines[1] || '', other: lines.slice(2).join(' ') || '' }
        }
        return seat
      })
      seatingChart.value = { isVisible: rawValue.isVisible || false, isRotated: rawValue.isRotated || false, seats: normalizedSeats, settings: rawValue.settings || {} }
    }
    
    const hygieneSetting = sysData.find(s => s.setting_key === 'hygiene_management_data')
    if (hygieneSetting && hygieneSetting.setting_value) { hygieneData.value = { ...JSON.parse(JSON.stringify(defaultHygieneData)), ...hygieneSetting.setting_value } }
  }

  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  if (sData) allStudents.value = sData

  const { data: attData } = await supabase.from('attendances').select('*').eq('record_date', todayISO)
  if (attData) todayAttendances.value = attData
}

onMounted(() => { 
  updateTime(); timer = setInterval(updateTime, 1000); 
  checkIpRules().then(() => { logVisit(); fetchData() }) 
})
onUnmounted(() => { if (timer) clearInterval(timer) })

const addContactItem = () => { editingContactItems.value.push('') }
const removeContactItem = (idx) => { editingContactItems.value.splice(idx, 1) }

const saveContactItems = async () => {
  try {
    await supabase.from('contact_books').upsert({ record_date: todayISO, contact_items: editingContactItems.value }, { onConflict: 'record_date' })
    alert("✅ 聯絡簿已成功更新發布！")
    contactBookItems.value = [...editingContactItems.value]; isEditingContact.value = false
  } catch (error) { alert("❌ 聯絡簿儲存失敗：" + error.message) }
}

const addClassNoteItem = () => { editingClassNoteItems.value.push('') }
const removeClassNoteItem = (idx) => { editingClassNoteItems.value.splice(idx, 1) }

const saveClassNoteItems = async () => {
  try {
    const { data: currentSettings } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'class_notes_data').maybeSingle()
    
    let updatedData = currentSettings?.setting_value || {}
    updatedData[todayISO] = editingClassNoteItems.value

    await supabase.from('system_settings').upsert({
      setting_key: 'class_notes_data',
      setting_value: updatedData
    }, { onConflict: 'setting_key' })

    alert("✅ 注意事項已成功更新發布！")
    classNoteItems.value = [...editingClassNoteItems.value]
    isEditingClassNotes.value = false
  } catch (error) { alert("❌ 儲存失敗：" + error.message) }
}
</script>

<style scoped>
.page-container { min-height: 100vh; background-color: #f3f4f6; padding: 20px; font-family: sans-serif; display: flex; flex-direction: column; gap: 20px; transition: 0.3s; }
.is-exam-mode { padding: 0; background: var(--ex-bg); overflow: hidden; }

/* 大考看板模式 */
.exam-dashboard { background-color: var(--ex-bg); color: var(--ex-text); min-height: 100vh; padding: 40px 60px; display: flex; flex-direction: column; position: relative; align-items: stretch; transition: background-color 0.5s ease;}
.exit-exam-btn { position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: var(--ex-text); padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 1.1rem; transition: 0.2s; z-index: 10;}
.exit-exam-btn:hover { background: rgba(255,255,255,0.2); color: var(--ex-title); }
.exam-main-title { font-size: 3.5rem; margin: 0 0 40px 0; color: var(--ex-title); letter-spacing: 2px; text-align: center; border-bottom: 2px solid var(--ex-border); padding-bottom: 20px;}
.exam-split-layout { display: flex; gap: 60px; flex: 1; align-items: flex-start; justify-content: center; }
.exam-left-panel { flex: 1; max-width: 900px; }
.exam-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 1.8rem; background: var(--ex-panel-bg); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.2);}
.exam-table th, .exam-table td { padding: 22px; text-align: center; border-bottom: 1px solid var(--ex-border); }
.exam-table th { background: var(--ex-border); color: var(--ex-title); font-weight: normal; font-size: 1.4rem; }
.exam-table tr:last-child td { border-bottom: none; }
.active-row { background: rgba(255,255,255,0.1); border-left: 5px solid var(--ex-accent);}
.active-row td { color: var(--ex-accent); font-weight: bold; border-bottom-color: transparent;}
.font-mono { font-family: monospace; }
.font-bold { font-weight: bold; letter-spacing: 1px; }

.exam-right-panel { flex: 1; max-width: 800px; background: var(--ex-panel-bg); border-radius: 20px; padding: 50px; text-align: center; border: 1px solid var(--ex-border); box-shadow: 0 10px 30px rgba(0,0,0,0.3); display: flex; flex-direction: column; justify-content: center; align-items: center;}
.clock-label { font-size: 1.5rem; color: var(--ex-text); margin-bottom: 10px; opacity: 0.8;}
.exam-clock { font-size: 7.5rem; font-weight: bold; font-family: monospace; color: var(--ex-clock); margin-bottom: 40px; line-height: 1; text-shadow: 0 0 15px rgba(0,0,0,0.3);}
.exam-status-display { width: 100%; border-top: 1px solid var(--ex-border); padding-top: 40px;}
.status-text { font-size: 2.5rem; font-weight: bold; }
.status-text.waiting { color: var(--ex-text); opacity: 0.7;}
.status-text.finished { color: var(--ex-success); }
.status-label { font-size: 1.5rem; color: var(--ex-text); margin-bottom: 10px; opacity: 0.8;}
.status-subject { font-size: 5.5rem; color: var(--ex-accent); letter-spacing: 5px; line-height: 1.2; margin: 10px 0 40px 0; text-shadow: 0 0 15px rgba(0,0,0,0.3);}
.countdown-wrapper { background: rgba(0,0,0,0.2); padding: 30px; border-radius: 16px; border: 1px solid var(--ex-border);}
.countdown-label { font-size: 1.5rem; color: var(--ex-text); margin-bottom: 10px; }
.exam-countdown { font-size: 6.5rem; color: var(--ex-success); font-family: monospace; line-height: 1; text-shadow: 0 0 15px rgba(0,0,0,0.3);}
.text-danger { color: var(--ex-danger) !important; animation: blink 1s infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
.study-mode-text { font-size: 4rem; color: var(--ex-success); letter-spacing: 2px; margin-top: 20px; padding: 30px; border: 2px dashed var(--ex-success); border-radius: 16px; background: rgba(255,255,255, 0.05);}
.status-text.break .status-next { margin-top: 20px; font-size: 2rem; color: var(--ex-text); }
.status-text.break .highlight { color: var(--ex-success); font-size: 3.5rem; margin: 15px 0; display: block;}
.next-time { font-size: 1.8rem; color: var(--ex-text); font-family: monospace; opacity: 0.8;}

/* 軟木塞公佈欄 */
.corkboard { background-color: #d1a36a; background-image: url('data:image/svg+xml;utf8,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.12"/></svg>'); border: 10px solid #754d29; border-radius: 8px; padding: 20px 25px; box-shadow: 0 6px 12px rgba(0,0,0,0.15), inset 0 0 10px rgba(0,0,0,0.3); }
.cork-title { color: #4a2b18; text-shadow: 1px 1px 0px rgba(255,255,255,0.3); font-size: 1.4rem; }
.cork-divider { border-bottom: 2px dashed #92400e; margin: 15px 0; opacity: 0.5; }
.cork-cards-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.cork-card { background: #fef9c3; border-radius: 2px 2px 10px 2px; padding: 15px 20px; box-shadow: 2px 4px 6px rgba(0,0,0,0.15); position: relative; }
.pin { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); font-size: 1.8rem; z-index: 2; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
.cork-card-header { border-bottom: 1px solid #fcd34d; padding-bottom: 10px; margin-bottom: 10px; }
.cork-card-title { margin: 0 0 5px 0; color: #92400e; font-size: 1.2rem; }
.cork-card-date { color: #b45309; font-size: 0.85rem; font-weight: bold; }
.cork-card-content { color: #451a03; line-height: 1.5; font-size: 1rem; margin-bottom: 15px; word-wrap: break-word;}
.cork-card-links { display: flex; flex-direction: column; gap: 8px; }
.cork-link { display: inline-block; background: #fbbf24; color: #92400e; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 0.95rem; border: 1px dashed #d97706; transition: 0.2s; text-align: center;}
.cork-link:hover { background: #f59e0b; color: white; }

/* 黑板樣式 */
.blackboard { background-color: #315243; border: 10px solid #754d29; border-radius: 8px; padding: 20px 25px; box-shadow: 0 6px 12px rgba(0,0,0,0.15), inset 0 0 10px rgba(0,0,0,0.3); margin-bottom: 20px;}
.board-title { margin: 0; font-size: 1.4rem; font-weight: bold; }
.notice-title { color: #fca5a5; }
.contact-title { color: #f59e0b; }
.board-date { color: #cbd5e1; margin: 8px 0 0 0; font-size: 0.95rem; }
.dashed-divider { border-bottom: 2px dashed #94a3b8; margin: 15px 0; opacity: 0.6; }

/* 💡 深海藍色系看板 (注意事項) */
.notes-board { background-color: #1e293b; border-color: #475569; }
.notes-title { color: #38bdf8; }
.divider-blue { border-bottom-color: #64748b; }
.notes-list li { border-bottom-color: rgba(255,255,255,0.15); }
.btn-blue-theme { background: #0ea5e9 !important; color: white !important; }
.btn-blue-theme:hover { background: #0284c7 !important; }
.mode-blue { background: rgba(0, 0, 0, 0.3) !important; }
.num-blue { color: #38bdf8 !important; }
.input-blue { border-color: transparent !important; }
.input-blue:focus { border-color: #0ea5e9 !important; box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2) !important; }
.btn-outline-blue { border-color: #cbd5e1 !important; color: white !important; }
.btn-solid-blue { background: #0ea5e9 !important; color: white !important; }

.board-content-wrapper { position: relative; transition: max-height 0.3s ease; }
.board-content { color: white; min-height: 40px; }
.is-collapsed { max-height: 140px; overflow: hidden; }
.fade-mask { position: absolute; bottom: 0; left: 0; width: 100%; height: 60px; background: linear-gradient(to bottom, rgba(49, 82, 67, 0), rgba(49, 82, 67, 1)); pointer-events: none; }
.expand-action { text-align: center; margin-top: 5px; }
.btn-expand { background: transparent; border: 1px dashed #fca5a5; color: #fca5a5; padding: 6px 20px; border-radius: 20px; cursor: pointer; font-size: 0.95rem; transition: 0.2s; font-weight: bold;}
.btn-expand:hover { background: rgba(252, 165, 165, 0.15); }
.desktop-only { display: block; }

.empty-text-italic { color: #94a3b8; font-style: italic; font-size: 1.1rem; }
.item-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.rich-notice-item { display: flex; align-items: flex-start; gap: 8px; width: 100%; font-size: 1.15rem; letter-spacing: 0.5px; }
.rich-notice-content { flex: 1; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.5; }
.rich-notice-content :deep(p) { margin: 0 0 5px 0; }
.rich-notice-content :deep(a) { color: #fbbf24; text-decoration: underline; }
.rich-notice-content :deep(ol), .rich-notice-content :deep(ul) { margin: 5px 0; padding-left: 20px; }

.main-split { display: flex; gap: 20px; align-items: flex-start; }
.left-panel { flex: 1; display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.control-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: center; }
.clock-display { font-size: 2.2rem; font-weight: bold; color: #1e293b; margin-bottom: 10px; }

.schedule-ticker { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px 15px; margin-bottom: 20px; display: flex; justify-content: center; gap: 20px; align-items: center; flex-wrap: wrap; }
.subject-text { font-weight: bold; color: #047857;}
.teacher-text { font-size: 0.95rem; color: #475569; }
.next-class { color: #64748b; font-size: 1rem; border-left: 2px solid #cbd5e1; padding-left: 20px; }

.button-group { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.btn { padding: 8px 12px; border-radius: 6px; font-size: 0.95rem; font-weight: bold; color: white; border: none; cursor: pointer; display: inline-block; text-decoration: none;}
.btn-orange { background: #f59e0b; }
.btn-green { background: #10b981; }
.btn-blue { background: #3b82f6; }
.btn-dark { background: #64748b; }
.btn-purple { background: #8b5cf6; }
.btn-red { background: #ef4444; }
.btn-dark-blue { background: #1e3a8a; } 
.btn-teal { background: #0f766e; } 
.btn-cyan { background: #06b6d4; }
.btn-indigo { background: #6366f1; } 
.btn-sky { background: #0ea5e9; }
.btn-pink { background: #ec4899; } 
.btn-amber { background: #d97706; }
.btn-rose { background: #be123c; }

.btn-enter-exam { width: 100%; padding: 12px; background: #991b1b; color: white; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(153, 27, 27, 0.3); animation: subtle-pulse 2s infinite;}

/* 出缺席網格 */
.attendance-wrapper { width: 100%; }
.stats-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;}
.stat-box { flex: 1; padding: 12px; border-radius: 6px; text-align: center; font-size: 1.05rem; font-weight: bold; min-width: 80px; }
.stat-expected { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.stat-present { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.stat-leave { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.stat-late { background: #e0e7ff; color: #3730a3; border: 1px solid #a5b4fc; }
.stat-absent { background: #ffe4e6; color: #e11d48; border: 1px solid #fca5a5; }

.student-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.student-card { border-radius: 6px; padding: 15px 10px; text-align: center; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; user-select: none; transition: 0.1s transform, 0.3s background-color; }
.student-card:active { transform: scale(0.95); }
.student-seat { font-size: 1.2rem; margin-bottom: 5px; }
.student-name { font-size: 1.1rem; margin-bottom: 5px; }
.student-status { font-size: 0.9rem; opacity: 0.9; }

.absent-card { background: #ffe4e6; color: #e11d48; border: 2px solid transparent; }
.absent-card .student-name { color: #be123c; }
.present-card { background: #dcfce7; color: #166534; border: 2px solid transparent; }
.present-card .student-name { color: #14532d; }
.leave-card { background: #fef3c7; color: #92400e; border: 2px solid transparent; }
.leave-card .student-name { color: #78350f; }
.late-card { background: #e0e7ff; color: #3730a3; border: 2px solid transparent; }
.late-card .student-name { color: #312e81; }

.right-panel { flex: 1; min-width: 0; }
.board-header { display: flex; justify-content: space-between; align-items: flex-start; }
.edit-btn { background: #f59e0b; color: #1e293b; border: none; padding: 6px 16px; border-radius: 6px; font-weight: bold; font-size: 0.95rem; cursor: pointer; }

.edit-mode { background: rgba(0, 0, 0, 0.2); padding: 15px; border-radius: 8px; }
.edit-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.row-num { font-size: 1.1rem; color: #f59e0b; width: 25px; font-weight: bold; }
.edit-input { flex: 1; padding: 8px 12px; font-size: 1rem; border-radius: 6px; border: none; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }

.edit-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
.add-btn { background: transparent; color: white; border: 1px dashed #cbd5e1; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.action-right { display: flex; gap: 10px; }
.cancel-btn { background: #64748b; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.save-btn { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 20px; box-sizing: border-box; }
.pwd-modal-content { background: white; padding: 25px 30px; border-radius: 12px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center;}
.pwd-modal-content h3 { margin: 0 0 15px 0; color: #1e293b; font-size: 1.4rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
.pwd-desc { color: #64748b; font-size: 1.05rem; margin-bottom: 20px; }
.pwd-input { width: 100%; padding: 12px 15px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 25px; font-size: 1.2rem; text-align: center; box-sizing: border-box;}
.pwd-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
.pwd-actions { display: flex; justify-content: center; gap: 15px; }
.pwd-actions button { padding: 10px 25px; border-radius: 8px; font-weight: bold; font-size: 1.05rem; cursor: pointer; border: none;}
.confirm-btn { background: #3b82f6; color: white; }
.cancel-btn { background: #e2e8f0; color: #475569; }

/* 座位表與衛生表 */
.extra-modules { width: 100%; }
.seating-display-board { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; margin-top: 10px; }
.seating-title { margin-top: 0; color: #0f766e; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 25px; text-align: center; font-size: 1.4rem; }
.seating-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 15px; }
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

.hygiene-display-board { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; margin-top: 10px; }
.hygiene-main-title { margin-top: 0; color: #0891b2; text-align: center; font-size: 1.4rem; margin-bottom: 15px; }
.tabs-container-readonly { display: flex; gap: 10px; overflow-x: auto; white-space: nowrap; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; justify-content: center;}
.tab-btn { padding: 8px 16px; border: none; background: #f1f5f9; color: #64748b; font-weight: bold; font-size: 1.05rem; cursor: pointer; border-radius: 6px; transition: 0.2s;}
.tab-btn:hover { background: #e2e8f0; }
.tab-btn.active { background: #0891b2; color: white; }

.hygiene-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.hygiene-content { min-width: 800px; padding-bottom: 15px; }
.hygiene-content-title { text-align: center; margin-bottom: 10px; font-size: 1.3rem; color: #1e293b; }
.hygiene-sub-title { text-align: center; margin-bottom: 15px; color: #475569; font-size: 0.95rem; }

.custom-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 0.95rem; background: white;}
.custom-table th, .custom-table td { border: 1px solid #94a3b8; padding: 8px; vertical-align: middle; line-height: 1.4; word-break: break-word;}
.custom-table th { background: #f1f5f9; font-weight: bold; }
.header-row th { background: #e2e8f0; }
.morning-table td:nth-child(1), .morning-table td:nth-child(2) { font-weight: bold; }
.lunch-table th { background: #f8fafc; font-weight: bold;}

.footer-note { margin-top: 15px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #334155; line-height: 1.6; text-align: left;}
.mt-10 { margin-top: 10px; }
.mt-15 { margin-top: 15px; }
.text-sm { font-size: 0.9rem; }
.text-xs { font-size: 0.75rem; color: #64748b; font-weight: normal;}

@media (max-width: 1024px) { .main-split { flex-direction: column; } .student-grid { grid-template-columns: repeat(3, 1fr); } }

@media (max-width: 768px) {
  .page-container { padding: 10px; }
  .corkboard, .blackboard { padding: 15px 10px; border-width: 8px; }
  .cork-cards-container { grid-template-columns: 1fr; gap: 15px; }
  .cork-card { padding: 15px; }
  .student-grid { grid-template-columns: repeat(2, 1fr); }
  .seats-grid-readonly, .labels-grid-readonly { gap: 5px; }
  .seat-card-readonly { padding: 5px; min-height: 90px; }
  .tabs-container-readonly { justify-content: flex-start; padding-bottom: 10px; }
  .schedule-ticker { flex-direction: column; gap: 10px; text-align: center; }
  .next-class { border-left: none; padding-left: 0; border-top: 1px dashed #cbd5e1; padding-top: 10px; width: 100%;}
  .is-collapsed { max-height: none; overflow: visible; }
  .fade-mask { display: none; }
  .desktop-only { display: none; }

  /* 💡 RWD 排版修復 */
  .board-header { flex-direction: column; align-items: stretch; gap: 12px; }
  .board-header > div { text-align: center; }
  .contact-title, .notes-title { font-size: 1.3rem; }
  .board-date { font-size: 0.9rem; margin-top: 5px;}
  .edit-btn { width: 100%; padding: 10px; text-align: center; font-size: 1.05rem;}
  
  .contact-list li, .notes-list li { line-height: 1.6; word-break: break-word; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed rgba(255,255,255,0.15); font-size: 1.05rem;}
  .contact-list li:last-child, .notes-list li:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0;}
  
  .edit-mode { padding: 12px; border-radius: 8px;}
  .edit-row { display: flex; align-items: stretch; gap: 8px; flex-wrap: nowrap; margin-bottom: 12px; }
  .row-num { width: 25px; flex-shrink: 0; display: flex; align-items: center; font-size: 1.05rem; }
  .edit-input { flex: 1; min-width: 0; padding: 10px; font-size: 1rem; border-radius: 6px; }
  .del-row-btn { flex-shrink: 0; padding: 0 15px; display: flex; align-items: center; justify-content: center; }
  
  .edit-actions { flex-direction: column; align-items: stretch; gap: 15px; margin-top: 15px;}
  .add-btn { width: 100%; padding: 12px; font-size: 1.05rem; }
  .action-right { display: flex; width: 100%; gap: 10px; }
  .cancel-btn, .save-btn { flex: 1; text-align: center; padding: 12px; font-size: 1.05rem; justify-content: center;}
}
</style>
