<template>
  <div class="page-container">
    <div class="blackboard top-board">
      <h2 class="board-title notice-title">📢 家長須知事項</h2>
      <div class="dashed-divider"></div>
      <div class="board-content">
        <div v-if="parentNotices.length === 0" class="empty-text-italic">目前無特別須知事項</div>
        <ul v-else class="item-list">
          <li v-for="(notice, index) in parentNotices" :key="'n-'+index"><span class="bullet">📌</span> {{ notice }}</li>
        </ul>
      </div>
    </div>

    <div class="main-split">
      <div class="left-panel">
        <div class="control-card">
          <div class="clock-display">🕒 {{ currentTime }}</div>
          
          <div class="button-group">
            <NuxtLink to="/parent-bind" class="btn btn-orange">👨‍👩‍👧 綁定</NuxtLink>
            <NuxtLink to="/parent-message" class="btn btn-green">💬 家長私訊</NuxtLink>
            <NuxtLink to="/student-message" class="btn btn-blue">💬 學生私訊</NuxtLink>
            <NuxtLink to="/assignments" class="btn btn-purple">📚 作業管理</NuxtLink>
            <button @click="openDiscipline" class="btn btn-dark-blue">⚖️ 秩序管理</button>
            <NuxtLink to="/hygiene" class="btn btn-cyan">🧹 衛生管理</NuxtLink>            
            <NuxtLink to="/seats" class="btn btn-teal">🪑 座位管理</NuxtLink>
            <button @click="openEmergencyModal" class="btn btn-red">🚨 緊急通知</button>
            <NuxtLink to="/admin" class="btn btn-dark">⚙️ 後台</NuxtLink>
            
            <button 
              v-if="seatingChart.isVisible" 
              @click="showSeatingChartLocal = !showSeatingChartLocal" 
              class="btn btn-indigo"
            >
              {{ showSeatingChartLocal ? '🙈 隱藏教室座位表' : '👀 顯示教室座位表' }}
            </button>

            <button 
              v-if="hygieneData.isVisibleOnIndex"
              @click="showHygieneLocal = !showHygieneLocal" 
              class="btn btn-sky"
            >
              {{ showHygieneLocal ? '🙈 隱藏衛生工作' : '🧹 顯示衛生工作' }}
            </button>

            <!-- 💡 新增：查詢聯絡簿歷史按鈕 -->
            <button 
              v-if="isHistoryVisibleOnIndex" 
              @click="openContactHistory" 
              class="btn btn-pink"
            >
              📅 查詢近期聯絡簿
            </button>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-box stat-expected">應到: <strong>{{ expectedCount }}</strong></div>
          <div class="stat-box stat-present">已到: <strong>{{ presentCount }}</strong></div>
          <div class="stat-box stat-absent">未到: <strong>{{ absentCount }}</strong></div>
        </div>

        <div class="student-grid">
          <div v-for="student in absentStudentsList" :key="student.id" class="student-card absent-card">
            <div class="student-seat">{{ student.seat_number }}</div>
            <div class="student-name">{{ student.real_name }}</div>
            <div class="student-status">未到</div>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="blackboard contact-board">
          <div class="board-header">
            <div>
              <h2 class="board-title contact-title">⭐ 今日聯絡簿</h2>
              <p class="board-date">{{ todayDisplay }}</p>
            </div>
            <button v-if="!isEditingContact" @click="unlockContactEdit" class="edit-btn">✏️ 編輯</button>
          </div>
          <div class="dashed-divider"></div>
          <div class="board-content">
            <div v-if="!isEditingContact">
              <div v-if="contactBookItems.length === 0" class="empty-text-italic">目前尚無聯絡簿事項...</div>
              <ul v-else class="item-list contact-list">
                <li v-for="(item, index) in contactBookItems" :key="'c-'+index">{{ index + 1 }}. {{ item }}</li>
              </ul>
            </div>
            <div v-else class="edit-mode">
              <div v-for="(item, index) in editingContactItems" :key="'edit-'+index" class="edit-row">
                <span class="row-num">{{ index + 1 }}.</span>
                <input v-model="editingContactItems[index]" type="text" placeholder="輸入事項..." class="edit-input"/>
                <button @click="removeContactItem(index)" class="del-btn">🗑️</button>
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

    <!-- 班級座位表顯示區 -->
    <div v-if="seatingChart.isVisible && showSeatingChartLocal" class="seating-display-board">
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
                <div :style="{ fontSize: (seatingChart.settings?.nameSize || 20) + 'px', color: seatingChart.settings?.nameColor || '#e11d48' }">{{ seat.name }}</div>
                <div v-if="seat.other" :style="{ fontSize: (seatingChart.settings?.otherSize || 14) + 'px', color: seatingChart.settings?.otherColor || '#94a3b8' }">{{ seat.other }}</div>
              </div>
            </div>
          </div>
          <div class="teacher-desk-readonly"><h3>講桌</h3></div>
        </div>
      </div>
    </div>

    <!-- 班級衛生工作顯示區 -->
    <div v-if="hygieneData.isVisibleOnIndex && showHygieneLocal" class="hygiene-display-board">
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
            <thead>
              <tr>
                <th colspan="2" width="20%">教室</th><th width="30%">成員名單（14人）</th><th width="50%">工作內容</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colspan="2" v-html="formatNL(hygieneData.morning.in_hygiene)"></td><td v-html="formatNL(hygieneData.morning.in_hygiene_names)"></td><td v-html="formatNL(hygieneData.morning.in_hygiene_work)"></td></tr>
              <tr><td colspan="2" v-html="formatNL(hygieneData.morning.board)"></td><td v-html="formatNL(hygieneData.morning.board_names)"></td><td v-html="formatNL(hygieneData.morning.board_work)"></td></tr>
              <tr>
                <td colspan="2" v-html="formatNL(hygieneData.morning.sweep)"></td><td v-html="formatNL(hygieneData.morning.sweep_names)"></td>
                <td rowspan="2" v-html="formatNL(hygieneData.morning.sweep_mop_work)"></td>
              </tr>
              <tr><td colspan="2" v-html="formatNL(hygieneData.morning.mop)"></td><td v-html="formatNL(hygieneData.morning.mop_names)"></td></tr>
              <tr><td colspan="2" v-html="formatNL(hygieneData.morning.window)"></td><td v-html="formatNL(hygieneData.morning.window_names)"></td><td v-html="formatNL(hygieneData.morning.window_work)"></td></tr>
              <tr><td colspan="2" v-html="formatNL(hygieneData.morning.hallway)"></td><td v-html="formatNL(hygieneData.morning.hallway_names)"></td><td v-html="formatNL(hygieneData.morning.hallway_work)"></td></tr>
              <tr><td colspan="2" v-html="formatNL(hygieneData.morning.trash)"></td><td v-html="formatNL(hygieneData.morning.trash_names)"></td><td v-html="formatNL(hygieneData.morning.trash_work)"></td></tr>
              
              <tr class="header-row"><th>外掃區</th><th>打掃區域</th><th>成員名單（12人）</th><th>工作內容</th></tr>
              <tr>
                <td rowspan="4" v-html="formatNL(hygieneData.morning.out_area)"></td><td v-html="formatNL(hygieneData.morning.out_hygiene)"></td>
                <td v-html="formatNL(hygieneData.morning.out_hygiene_names)"></td><td v-html="formatNL(hygieneData.morning.out_hygiene_work)"></td>
              </tr>
              <tr>
                <td rowspan="3" v-html="formatNL(hygieneData.morning.out_sweep1)"></td><td v-html="formatNL(hygieneData.morning.out_sweep1_names)"></td>
                <td rowspan="3" v-html="formatNL(hygieneData.morning.out_sweep_work)"></td>
              </tr>
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

    <!-- 💡 新增：歷史聯絡簿查詢的彈出視窗 -->
    <div v-if="showContactHistoryModal" class="modal-overlay" @click.self="showContactHistoryModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>📅 近七日聯絡簿紀錄</h3>
          <button @click="showContactHistoryModal = false" class="close-btn">✖</button>
        </div>
        <div class="modal-body">
          <div v-if="isLoadingHistory" class="loading-state">⏳ 載入中...</div>
          <div v-else-if="contactHistoryList.length === 0" class="empty-state">近七日無聯絡簿紀錄</div>
          <div v-else class="history-timeline">
            <div v-for="hist in contactHistoryList" :key="hist.record_date" class="history-card">
              <div class="history-date">{{ formatHistDate(hist.record_date) }}</div>
              <ul class="item-list contact-list-dark">
                <li v-for="(item, idx) in hist.contact_items" :key="idx">{{ idx + 1 }}. {{ item }}</li>
              </ul>
            </div>
          </div>
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

// 💡 新增歷史查詢相關變數
const isHistoryVisibleOnIndex = ref(false)
const showContactHistoryModal = ref(false)
const isLoadingHistory = ref(false)
const contactHistoryList = ref([])

const defaultHygieneData = {
  isVisibleOnIndex: false,
  morning: {
    title: '704 班 教室和外掃區 早上掃地工作分配表 2021/10/18 開始',
    note: '請先做好垃圾分類。每天早上和週五下午都要倒資源回收垃圾。\n每天早上和週五下午打掃時間視情況倒一般垃圾，超過八分滿時得立刻倒。週五下午和例假日前一天下午一定得倒光。',
    in_hygiene: '內衛生', in_hygiene_names: '季昀苓', in_hygiene_work: '',
    board: '講台掃拖、講桌\n黑板清潔\n整理置物櫃等\n教室內雜項物\n品並且擦拭', board_names: '葉柏妍、許壹淳', board_work: '整理黑板、粉筆槽、打板擦、擦講桌和整理抽屜\n講台掃地和拖地\n擦沒有使用的桌椅、書櫃和後面的置物櫃',
    sweep: '教室地板掃地', sweep_names: '呂有陞\n田孟任\n林珈媗', 
    sweep_mop_work: '<span style="color:red; font-weight:bold;">負責掃地的人請 8:00 後開始後立刻開始打掃。</span>拖地的人在掃完後立刻拖地，並開電扇讓地板吹乾。',
    mop: '教室地板拖地', mop_names: '張歆悅\n葉佳妤',
    window: '擦窗戶\n清理洗手台和\n小陽台', window_names: '楊佩綺、王翊潔', window_work: '擦靠走廊的窗戶\n掃小陽台，清理洗手台上垃圾污垢',
    hallway: '教室走廊\n掃拖地', hallway_names: '林科甫、徐亦佐', hallway_work: '<span style="color:red; font-weight:bold;">負責掃地的人請 7:20 後開始後立刻開始打掃，先掃走人工垃圾，8:00 後再掃細節部分。</span>8:20 上課鐘響前五分鐘開始掃地，鐘響後開始拖地，並隨時保持乾淨',
    trash: '倒垃圾、資源回\n收、整理使用後\n的掃地用具', trash_names: '王聰文\n王麟賢', trash_work: '整理並分類垃圾，將垃圾壓下去，換垃圾袋，將垃圾桶排好',
    out_area: '北側人行道\n\n下雨時，學校會\n宣佈是否打掃',
    out_hygiene: '外衛生', out_hygiene_names: '', out_hygiene_work: '',
    out_sweep1: '撿拾人工垃圾(拿必須用具)', out_sweep1_names: '', out_sweep_work: '',
    out_sweep2_names: '', out_sweep3_names: ''
  },
  lunch: {
    title: '704 午餐搬運、中午打掃輪值表 實施日期：2021/10/18 開始',
    sub: '數字為午餐排隊順序，請按照順序排隊，請勿插隊 (請帶口罩，注意衛生，避免傳染)。',
    clean_header: '清潔組 (中\n午打掃)', clean_h1: '講台、講\n桌、黑板、\n餐桌\n2-2', clean_h2: '教室掃地\n2-1', clean_h3: '座位拖地\n2-3', clean_h4: '走廊掃拖\n(掃地打鐘\n前 3 分鐘開\n始，拖地打\n鐘後開始)\n2-5', clean_h5: '洗公用餐\n具，整理洗\n手台\n2-4', clean_h6: '幫老師拿東\n西回辦公室\n2-4',
    clean_n1: '葉柏妍、許\n壹淳', clean_n2: '林珈媗、田\n孟任、呂有\n陞', clean_n3: '張歆悅 (座\n位)、葉佳妤\n(走道)', clean_n4: '徐亦佐 (掃\n地)、陳宏勛\n(拖地)', clean_n5: '沈沂宣', clean_n6: '(林科甫)',
    move_header: '搬餐組', move_h1: '飯盒\n3-1', move_h2: '大菜盒 A\n3-3', move_h3: '大菜盒 B\n3-3', move_h4: '小菜盒\n3-4', move_h5: '湯桶\n3-2', move_h6: '水 or 飲料\nor 候補 3-5',
    move_n1: '鄭人閤、王\n聰文', move_n2: '劉子涵、楊\n佩綺', move_n3: '王翊潔、周\n宥芸', move_n4: '楊元豪', move_n5: '王麟賢、\n劉沅翰', move_n6: '林科甫',
    serve_header: '配膳組 (先打菜，\n全部同學分配\n完，再用餐)', serve_h1: '飯盒\n1-1', serve_h2: '大菜盒 A\n1-2', serve_h3: '大菜盒 B\n1-3', serve_h4: '小菜盒\n1-4', serve_h5: '湯桶\n1-5', serve_h6: '清潔消毒餐\n桌且移動桌\n子並歸位\n1-6',
    serve_n1: '黃鈺淳', serve_n2: '林毓庭', serve_n3: '黃芊樺', serve_n4: '許珮萱', serve_n5: '副衛生股長', serve_n6: '衛生股長',
    note1: '1. 1200-1215 為用餐時間，用餐時請勿聊天，活動範圍為教室、陽台和走廊，要上廁所或外出請詢問導師。\n2. 最晚 1215 用餐結束（老師會看用餐狀況調整），每個人請將廚餘丟至「一般垃圾桶」，並用衛生紙將餐盤整理收好，整理抽屜和書櫃，最後自己搬上椅子，沒有工作者請退到掃地區域以外等候，<span style="color:blue">拖地完、地板吹乾後</span>，方可進入。整理組搬椅子的同學請在 1225 前按照導師指示搬下，勿亂跑。\n3. <span style="background:black; color:white; font-weight:bold;">副衛生股長</span>監督「飯菜的搬送」；<span style="background:black; color:white; font-weight:bold;">正衛生股長</span>監督「中午掃地情況」，一遇有缺人則請詢問導師。\n4. <span style="font-weight:bold; text-decoration:underline;">正副衛生股長</span>負責午休鐘響之後<span style="text-decoration:underline;">檢查室內外地板垃圾</span>。(每天輪流)\n5. <span style="font-weight:bold; text-decoration:underline;">禁止私下更換搬運之飯菜，違者下個階段續搬</span>。除非第四節上課老師延後下課，全班之飯菜需於<span style="font-weight:bold; text-decoration:underline;">每天 1200 前</span>搬至教室。\n6. 導師未到教室前不得私自打菜。<span style="font-weight:bold;">若導師在 1205 尚未到教室，由班長宣佈開始打菜。</span>\n7. <span style="text-decoration:underline;">每週不定期</span>有水果或點心，同學記得去廚房搬運<span style="font-weight:bold; text-decoration:underline;">全部搬運回來</span>。(或由老師指派)\n若餐盒配置不太相同時，整組 8 人必須負責全部搬回來，先到者先選擇搬運東西。',
    note2: '----------------------------清潔組（中午打掃）工作守則----------------------------\n1. 清潔組負責「講台桌黑板、餐桌」者，請用抹布擦餐桌，處理廚餘（第一優先），然後擦粉筆槽，請勿在午休時間教室內板擦，然後擦黑板，將粉筆排好，<span style="color:blue">然後掃和拖</span>講台，講桌也要擦，上面的東西請擺好。請將垃圾桶周圍垃圾清理乾淨，將必要垃圾分類。\n2. 清潔組負責「教室掃地」和「座位拖地」者，請於大部分的同學吃完飯後，開始打掃。先掃，後拖。「座位拖地」代表只拖桌子和椅子下方地板。\n3. 清潔組負責「走廊掃拖」者，請「最慢」在 12:20 開始掃地。<span style="font-weight:bold;">唯有拖地的人，必須在 12:25 打鐘後，才開始拖，一共兩次。<span style="text-decoration:underline;">正副衛生股長請在教室內最後進行善後補強工作。</span></span>\n4. 清潔組負責「整理垃圾、用具、洗手臺」者，請將洗手臺廚餘清理乾淨，抹布擺好。然後將垃圾桶旁垃圾整理，垃圾壓好。'
  },
  squad: {
    title: '704 各項小隊成員工作 20210901',
    leader_desc: '監督小隊員，提醒各項事物，登記其他小隊違規行為。每天第 3,7 節下課到辦公室登記違規行為。',
    leaders: ['王聰文', '田孟任', '許壹淳', '沈沂宣', '葉柏妍', '季昀苓'],
    duty_desc: ['負責第 1,2 節上下課擦黑板', '負責第 3,4 節上下課擦黑板', '負責第 5,6 節上下課擦黑板', '負責第 7,8 節上下課擦黑板', '負責每節課老師要求的講桌或設備移動事項', '負責每節課老師要求的講桌或設備移動事項'],
    duties: ['林毓庭', '呂有陞', '徐亦佐', '陳宏勛', '王麟賢', '林科甫'],
    helper_desc: ['每節上課前，撿乾淨<span style="color:blue">第 1,2 小隊</span>每排附近的垃圾', '每節上課前，撿乾淨<span style="color:blue">第 3,4 小隊</span>每排附近的垃圾', '每節上課前，撿乾淨<span style="color:blue">第 5,6 小隊</span>每排附近的垃圾', '每節上課前，撿乾淨講台和講桌附近的垃圾', '每節上課前，撿乾淨教室後面空地附近的垃圾'],
    helpers: ['楊元豪', '劉沅翰', '鄭人閤', '王翊潔', '周宥芸'],
    errand_desc: ['8:20 前，搬聯絡簿到辦公室', '12:00 前，搬聯絡簿到教室的講桌旁', '<span style="color:red">13:05</span> 一打鐘，便搬聯絡簿到辦公室', '第七節下課，搬聯絡簿到教室'],
    errands: ['林珈媗', '黃芊樺', '葉佳妤', '朱佳晟'],
    minion_desc: '每天第 3,7 節下課到辦公室向導師報告十件上課時同學們的行為。', minions: ['許珮萱', '張歆悅'],
    other_desc: '每天第 1,6 節下課到辦公室詢問老師要做的事', others: ['劉子涵', '黃鈺淳', '楊佩綺']
  }
}

const hygieneData = ref(JSON.parse(JSON.stringify(defaultHygieneData)))

const formatNL = (txt) => String(txt || '').replace(/\n/g, '<br>')

const openEmergencyModal = () => {
  const pwd = window.prompt("🔒 進入緊急通知系統，請輸入「導師」密碼：")
  const teacherPwd = officerPasswords.value.teacher || '168168168'
  if (pwd === teacherPwd) {
    showEmergencyModal.value = true
  } else if (pwd !== null) { 
    alert("❌ 密碼錯誤！無法使用此功能。")
  }
}

const openDiscipline = () => { navigateTo('/discipline') }

const dDate = new Date()
const todayISO = `${dDate.getFullYear()}-${String(dDate.getMonth()+1).padStart(2,'0')}-${String(dDate.getDate()).padStart(2,'0')}`
const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const todayDisplay = `${dDate.getFullYear()}年${dDate.getMonth()+1}月${dDate.getDate()}日${days[dDate.getDay()]}`

const currentTime = ref('')
let timer = null
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-TW', { hour12: false })
}

const parentNotices = ref([])
const contactBookItems = ref([])
const officerPasswords = ref({ academic: '', counseling: '', discipline: '', teacher: '168168168' })

const seatingChart = ref({ isVisible: false, isRotated: false, seats: [], settings: {} })

const isEditingContact = ref(false)
const editingContactItems = ref([])
const currentEditorRole = ref('') 

const allStudents = ref([])
const todayAttendances = ref([])

const expectedCount = computed(() => allStudents.value.length)
const presentCount = computed(() => todayAttendances.value.filter(a => a.status === '已到').length)
const absentStudentsList = computed(() => {
  return allStudents.value.filter(s => {
    const record = todayAttendances.value.find(a => a.student_id === s.id)
    return !record || record.status === '未到' || record.status === '請假'
  })
})
const absentCount = computed(() => absentStudentsList.value.length)

const fetchData = async () => {
  const { data: boardData } = await supabase.from('contact_books').select('notices, contact_items').eq('record_date', todayISO).maybeSingle()
  parentNotices.value = boardData?.notices || []
  contactBookItems.value = boardData?.contact_items || []

  // 💡 確保讀取 contact_history_visible 開關設定
  const { data: sysData } = await supabase.from('system_settings').select('*')
    .in('setting_key', ['board_officer_passwords', 'seating_chart_data', 'hygiene_management_data', 'contact_history_visible'])
  
  if (sysData) {
    const pwdSetting = sysData.find(s => s.setting_key === 'board_officer_passwords')
    if (pwdSetting) officerPasswords.value = { ...officerPasswords.value, ...pwdSetting.setting_value }
    
    const histSetting = sysData.find(s => s.setting_key === 'contact_history_visible')
    if (histSetting) isHistoryVisibleOnIndex.value = histSetting.setting_value

    const seatSetting = sysData.find(s => s.setting_key === 'seating_chart_data')
    if (seatSetting) {
      const rawValue = seatSetting.setting_value || {}
      const normalizedSeats = (rawValue.seats || []).map(seat => {
        if (seat.content !== undefined) {
          const contentStr = seat.content || ''
          const lines = String(contentStr).split('\n')
          return { id: seat.id, isHidden: seat.isHidden, seatNum: lines[0] || '', name: lines[1] || '', other: lines.slice(2).join(' ') || '' }
        }
        return seat
      })
      let normalizedSettings = rawValue.settings || {}
      if (normalizedSettings.fontSize) {
        normalizedSettings = {
          numberSize: normalizedSettings.fontSize, nameSize: normalizedSettings.fontSize + 4, otherSize: normalizedSettings.fontSize - 2,
          numberColor: normalizedSettings.fontColor, nameColor: normalizedSettings.fontColor, otherColor: normalizedSettings.fontColor
        }
      }
      seatingChart.value = { isVisible: rawValue.isVisible || false, isRotated: rawValue.isRotated || false, seats: normalizedSeats, settings: normalizedSettings }
    }

    const hygieneSetting = sysData.find(s => s.setting_key === 'hygiene_management_data')
    if (hygieneSetting && hygieneSetting.setting_value) {
      hygieneData.value = { ...JSON.parse(JSON.stringify(defaultHygieneData)), ...hygieneSetting.setting_value }
    }
  }

  const { data: sData } = await supabase.from('students').select('*').order('seat_number')
  if (sData) allStudents.value = sData

  const { data: attData } = await supabase.from('attendances').select('*').eq('record_date', todayISO)
  if (attData) todayAttendances.value = attData
}

onMounted(() => { updateTime(); timer = setInterval(updateTime, 1000); fetchData() })
onUnmounted(() => { if (timer) clearInterval(timer) })

const unlockContactEdit = () => {
  const pwd = window.prompt("🔒 進入編輯模式，請輸入「學藝股長」或「輔導股長」密碼：")
  if (!pwd) return
  const teacherPwd = officerPasswords.value.teacher || '168168168'
  if ((officerPasswords.value.academic && pwd === officerPasswords.value.academic) || (officerPasswords.value.counseling && pwd === officerPasswords.value.counseling)) {
    currentEditorRole.value = '股長'; isEditingContact.value = true; editingContactItems.value = [...contactBookItems.value] 
  } else if (pwd === teacherPwd) {
    currentEditorRole.value = '導師'; isEditingContact.value = true; editingContactItems.value = [...contactBookItems.value] 
  } else { alert("❌ 密碼錯誤！請確認密碼是否正確。") }
}

const addContactItem = () => editingContactItems.value.push('')
const removeContactItem = (i) => editingContactItems.value.splice(i, 1)

const saveContactItems = async () => {
  try {
    const { error: upsertError } = await supabase.from('contact_books').upsert({ record_date: todayISO, notices: parentNotices.value, contact_items: editingContactItems.value }, { onConflict: 'record_date' })
    if (upsertError) throw upsertError
    alert("✅ 聯絡簿已成功更新發布！")
    contactBookItems.value = [...editingContactItems.value]; isEditingContact.value = false
  } catch (error) { alert("❌ 聯絡簿儲存失敗：" + error.message) }
}

// 💡 新增：處理開啟歷史查詢與撈取過去 7 天資料的邏輯
const openContactHistory = async () => {
  showContactHistoryModal.value = true
  isLoadingHistory.value = true
  
  const dObj = new Date()
  const endStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`
  
  dObj.setDate(dObj.getDate() - 7)
  const startStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`

  const { data } = await supabase.from('contact_books')
    .select('record_date, contact_items')
    .gte('record_date', startStr)
    .lte('record_date', endStr)
    .order('record_date', { ascending: false })

  if (data) {
    contactHistoryList.value = data.filter(r => r.contact_items && r.contact_items.length > 0)
  } else {
    contactHistoryList.value = []
  }
  isLoadingHistory.value = false
}

const formatHistDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-')
  const dt = new Date(y, m - 1, d)
  const daysOfWeek = ['日', '一', '二', '三', '四', '五', '六']
  return `${m}月${d}日 (星期${daysOfWeek[dt.getDay()]})`
}
</script>

<style scoped>
.page-container { min-height: 100vh; background-color: #f3f4f6; padding: 20px; font-family: sans-serif; display: flex; flex-direction: column; gap: 20px; }
.blackboard { background-color: #315243; border: 10px solid #754d29; border-radius: 8px; padding: 20px 25px; box-shadow: 0 6px 12px rgba(0,0,0,0.15), inset 0 0 10px rgba(0,0,0,0.3); }
.board-title { margin: 0; font-size: 1.4rem; font-weight: bold; }
.notice-title { color: #fca5a5; }
.contact-title { color: #f59e0b; }
.board-date { color: #cbd5e1; margin: 8px 0 0 0; font-size: 0.95rem; }
.dashed-divider { border-bottom: 2px dashed #94a3b8; margin: 15px 0; opacity: 0.6; }
.board-content { color: white; min-height: 80px; }
.empty-text-italic { color: #94a3b8; font-style: italic; font-size: 1.1rem; }
.item-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.item-list li { font-size: 1.15rem; letter-spacing: 0.5px; }

.main-split { display: flex; gap: 20px; align-items: flex-start; }
.left-panel { flex: 1; display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.control-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: center; }
.clock-display { font-size: 2.2rem; font-weight: bold; color: #1e293b; margin-bottom: 20px; }

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
.btn-pink { background: #ec4899; } /* 💡 歷史紀錄按鈕的顏色 */

.stats-row { display: flex; gap: 15px; }
.stat-box { flex: 1; padding: 12px; border-radius: 6px; text-align: center; font-size: 1.05rem; font-weight: bold; }
.stat-expected { background: #fef3c7; color: #92400e; }
.stat-present { background: #dcfce7; color: #166534; }
.stat-absent { background: #ffe4e6; color: #be123c; }

.student-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.student-card { background: #ffe4e6; border-radius: 6px; padding: 15px 10px; text-align: center; color: #e11d48; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.student-seat { font-size: 1.2rem; margin-bottom: 5px; }
.student-name { font-size: 1.1rem; margin-bottom: 5px; color: #be123c; }
.student-status { font-size: 0.9rem; opacity: 0.9; }

.right-panel { flex: 1; min-width: 0; }
.board-header { display: flex; justify-content: space-between; align-items: flex-start; }
.edit-btn { background-color: #f59e0b; color: #1e293b; border: none; padding: 6px 16px; border-radius: 6px; font-weight: bold; font-size: 0.95rem; cursor: pointer; }

.edit-mode { background: rgba(0, 0, 0, 0.2); padding: 15px; border-radius: 8px; }
.edit-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.row-num { font-size: 1.1rem; color: #f59e0b; width: 25px; font-weight: bold; }
.edit-input { flex: 1; padding: 8px 12px; font-size: 1rem; border-radius: 6px; border: none; }
.del-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }

.edit-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
.add-btn { background: transparent; color: white; border: 1px dashed #cbd5e1; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.action-right { display: flex; gap: 10px; }
.cancel-btn { background: #64748b; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.save-btn { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }

/* 💡 新增：歷史聯絡簿視窗樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 20px; box-sizing: border-box; }
.modal-content { background: white; width: 100%; max-width: 500px; border-radius: 12px; display: flex; flex-direction: column; max-height: 85vh; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.modal-header h3 { margin: 0; color: #1e293b; font-size: 1.2rem; }
.close-btn { background: none; border: none; font-size: 1.3rem; cursor: pointer; color: #64748b; }
.modal-body { padding: 20px; overflow-y: auto; background: #f1f5f9; }
.history-card { background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
.history-date { font-weight: bold; color: #f59e0b; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 10px; font-size: 1.1rem; }
.loading-state, .empty-state { text-align: center; padding: 30px; color: #64748b; font-size: 1.1rem; }
.contact-list-dark li { color: #334155; } /* 強制在白底的彈出視窗中顯示深色文字 */

/* 座位表顯示區 */
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

/* 衛生工作顯示區 */
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
.custom-table th { background-color: #f1f5f9; font-weight: bold; }
.header-row th { background-color: #e2e8f0; }
.morning-table td:nth-child(1), .morning-table td:nth-child(2) { font-weight: bold; }
.lunch-table th { background: #f8fafc; font-weight: bold;}

.footer-note { margin-top: 15px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #334155; line-height: 1.6; text-align: left;}
.mt-10 { margin-top: 10px; }
.mt-15 { margin-top: 15px; }
.text-sm { font-size: 0.9rem; }
.text-xs { font-size: 0.75rem; color: #64748b; font-weight: normal;}

@media (max-width: 1024px) { .main-split { flex-direction: column; } .student-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) {
  .student-grid { grid-template-columns: repeat(2, 1fr); }
  .seats-grid-readonly, .labels-grid-readonly { gap: 5px; }
  .seat-card-readonly { padding: 5px; min-height: 90px; }
  .tabs-container-readonly { justify-content: flex-start; padding-bottom: 10px; }
}
</style>
