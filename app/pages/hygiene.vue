<template>
  <div class="admin-container">
    <div class="header-section">
      <div class="header-title">
        <h2>🧹 班級衛生工作管理</h2>
        <p class="subtitle">在此設定早修、午餐及小隊的衛生工作分配</p>
      </div>
      <div class="header-actions">
        <label class="visibility-toggle">
          <input type="checkbox" v-model="localData.isVisibleOnIndex">
          <span class="toggle-text">於首頁顯示衛生工作板</span>
        </label>
        <button @click="saveSettings" class="save-btn" :disabled="isSaving">
          {{ isSaving ? '儲存中...' : '💾 儲存變更' }}
        </button>
        <NuxtLink to="/admin" class="back-btn">⬅️ 返回後台</NuxtLink>
      </div>
    </div>

    <div class="tabs-container">
      <button :class="['tab-btn', { active: activeTab === 'morning' }]" @click="activeTab = 'morning'">🌅 早上掃地</button>
      <button :class="['tab-btn', { active: activeTab === 'lunch' }]" @click="activeTab = 'lunch'">🍱 中午搬餐</button>
      <button :class="['tab-btn', { active: activeTab === 'squad' }]" @click="activeTab = 'squad'">🛡️ 小隊工作</button>
    </div>

    <div v-if="isLoading" class="loading-state">⏳ 載入資料中...</div>
    
    <div v-else class="tab-content">
      
      <!-- ==========================================
           🌅 早上掃地設定
      ========================================== -->
      <div v-show="activeTab === 'morning'" class="editor-panel">
        <div class="form-group full-width">
          <label>大標題</label>
          <input type="text" v-model="localData.morning.title" class="form-input" placeholder="例如：704 班 教室和外掃區 早上掃地工作分配表">
        </div>

        <div class="split-grid">
          <!-- 內掃區固定欄位 -->
          <div class="grid-section">
            <h4 class="section-subtitle">🏫 內掃區設定</h4>
            
            <div class="task-row">
              <div class="task-label"><input type="text" v-model="localData.morning.in_hygiene" class="form-input" placeholder="內衛生標題"></div>
              <div class="task-names"><textarea v-model="localData.morning.in_hygiene_names" class="form-input" rows="2" placeholder="成員名單"></textarea></div>
              <div class="task-work"><textarea v-model="localData.morning.in_hygiene_work" class="form-input" rows="2" placeholder="工作內容"></textarea></div>
            </div>

            <div class="task-row">
              <div class="task-label"><input type="text" v-model="localData.morning.board" class="form-input" placeholder="黑板標題"></div>
              <div class="task-names"><textarea v-model="localData.morning.board_names" class="form-input" rows="2" placeholder="成員名單"></textarea></div>
              <div class="task-work"><textarea v-model="localData.morning.board_work" class="form-input" rows="2" placeholder="工作內容"></textarea></div>
            </div>

            <div class="task-row">
              <div class="task-label"><input type="text" v-model="localData.morning.sweep" class="form-input" placeholder="掃地標題"></div>
              <div class="task-names"><textarea v-model="localData.morning.sweep_names" class="form-input" rows="2" placeholder="成員名單"></textarea></div>
              <div class="task-work"><textarea v-model="localData.morning.sweep_mop_work" class="form-input" rows="2" placeholder="掃拖共同工作內容"></textarea></div>
            </div>

            <div class="task-row">
              <div class="task-label"><input type="text" v-model="localData.morning.mop" class="form-input" placeholder="拖地標題"></div>
              <div class="task-names"><textarea v-model="localData.morning.mop_names" class="form-input" rows="2" placeholder="成員名單"></textarea></div>
              <div class="task-work"><span class="hint-text">（同上掃拖共同工作）</span></div>
            </div>

            <div class="task-row">
              <div class="task-label"><input type="text" v-model="localData.morning.window" class="form-input" placeholder="窗戶標題"></div>
              <div class="task-names"><textarea v-model="localData.morning.window_names" class="form-input" rows="2" placeholder="成員名單"></textarea></div>
              <div class="task-work"><textarea v-model="localData.morning.window_work" class="form-input" rows="2" placeholder="工作內容"></textarea></div>
            </div>

            <div class="task-row">
              <div class="task-label"><input type="text" v-model="localData.morning.hallway" class="form-input" placeholder="走廊標題"></div>
              <div class="task-names"><textarea v-model="localData.morning.hallway_names" class="form-input" rows="2" placeholder="成員名單"></textarea></div>
              <div class="task-work"><textarea v-model="localData.morning.hallway_work" class="form-input" rows="2" placeholder="工作內容"></textarea></div>
            </div>

            <div class="task-row">
              <div class="task-label"><input type="text" v-model="localData.morning.trash" class="form-input" placeholder="垃圾標題"></div>
              <div class="task-names"><textarea v-model="localData.morning.trash_names" class="form-input" rows="2" placeholder="成員名單"></textarea></div>
              <div class="task-work"><textarea v-model="localData.morning.trash_work" class="form-input" rows="2" placeholder="工作內容"></textarea></div>
            </div>
          </div>
        </div>

        <hr class="section-divider">

        <!-- 💡 全新動態表格：外掃區 -->
        <div class="dynamic-out-area-section">
          <h4 class="section-subtitle">🌲 外掃區設定 (可無限新增)</h4>
          
          <div class="form-group full-width">
            <label>外掃區大標題 / 共同備註</label>
            <input type="text" v-model="localData.morning.out_area" class="form-input" placeholder="例如：北側人行道">
          </div>

          <table class="dynamic-table">
            <thead>
              <tr>
                <th width="20%">打掃區域</th>
                <th width="30%">成員名單</th>
                <th width="40%">工作內容</th>
                <th width="10%">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in localData.morning.out_dynamic_areas" :key="'out-'+idx">
                <td><input type="text" v-model="item.area" class="form-input table-input" placeholder="如：人工垃圾區" /></td>
                <td><textarea v-model="item.names" class="form-input table-input" rows="2" placeholder="成員名字 (可換行)"></textarea></td>
                <td><textarea v-model="item.work" class="form-input table-input" rows="2" placeholder="工作細節..."></textarea></td>
                <td style="text-align: center;">
                  <button @click="removeOutAreaRow(idx)" class="del-row-btn">🗑️</button>
                </td>
              </tr>
              <tr v-if="localData.morning.out_dynamic_areas.length === 0">
                <td colspan="4" class="empty-table-text">目前沒有設定任何外掃區，請點擊下方按鈕新增。</td>
              </tr>
            </tbody>
          </table>
          
          <button @click="addOutAreaRow" class="add-btn mt-10">➕ 新增一列外掃區域</button>
        </div>

        <div class="form-group full-width mt-20">
          <label>底部備註事項</label>
          <textarea v-model="localData.morning.note" class="form-input" rows="3" placeholder="打掃完畢請導師檢查..."></textarea>
        </div>
      </div>

      <!-- ==========================================
           🍱 中午搬餐設定
      ========================================== -->
      <div v-show="activeTab === 'lunch'" class="editor-panel">
        <div class="form-group full-width">
          <label>大標題</label>
          <input type="text" v-model="localData.lunch.title" class="form-input" placeholder="例如：午餐搬運、中午打掃輪值表">
        </div>
        <div class="form-group full-width">
          <label>副標題 / 說明</label>
          <input type="text" v-model="localData.lunch.sub" class="form-input" placeholder="說明文字...">
        </div>

        <div class="lunch-grid-container">
          <!-- 清潔組 -->
          <div class="lunch-group-card">
            <h4 class="lunch-group-title"><input type="text" v-model="localData.lunch.clean_header" class="form-input" placeholder="組別名稱(如: 清潔組)"></h4>
            <div v-for="i in 6" :key="'clean-'+i" class="lunch-item-row">
              <input type="text" v-model="localData.lunch['clean_h'+i]" class="form-input half-input" placeholder="職務(如: 擦桌子)">
              <input type="text" v-model="localData.lunch['clean_n'+i]" class="form-input half-input" placeholder="名單">
            </div>
          </div>

          <!-- 搬餐組 -->
          <div class="lunch-group-card">
            <h4 class="lunch-group-title"><input type="text" v-model="localData.lunch.move_header" class="form-input" placeholder="組別名稱(如: 搬餐組)"></h4>
            <div v-for="i in 6" :key="'move-'+i" class="lunch-item-row">
              <input type="text" v-model="localData.lunch['move_h'+i]" class="form-input half-input" placeholder="職務(如: 飯桶)">
              <input type="text" v-model="localData.lunch['move_n'+i]" class="form-input half-input" placeholder="名單">
            </div>
          </div>

          <!-- 配膳組 -->
          <div class="lunch-group-card">
            <h4 class="lunch-group-title"><input type="text" v-model="localData.lunch.serve_header" class="form-input" placeholder="組別名稱(如: 配膳組)"></h4>
            <div v-for="i in 6" :key="'serve-'+i" class="lunch-item-row">
              <input type="text" v-model="localData.lunch['serve_h'+i]" class="form-input half-input" placeholder="職務(如: 打飯)">
              <input type="text" v-model="localData.lunch['serve_n'+i]" class="form-input half-input" placeholder="名單">
            </div>
          </div>
        </div>

        <div class="form-group full-width mt-20">
          <label>底部備註 1</label>
          <textarea v-model="localData.lunch.note1" class="form-input" rows="2"></textarea>
        </div>
        <div class="form-group full-width">
          <label>底部備註 2</label>
          <textarea v-model="localData.lunch.note2" class="form-input" rows="2"></textarea>
        </div>
      </div>

      <!-- ==========================================
           🛡️ 小隊工作設定
      ========================================== -->
      <div v-show="activeTab === 'squad'" class="editor-panel">
        <div class="form-group full-width">
          <label>大標題</label>
          <input type="text" v-model="localData.squad.title" class="form-input" placeholder="例如：各項小隊成員工作">
        </div>

        <!-- 小隊長 -->
        <div class="squad-section">
          <h4>👑 小隊長</h4>
          <div class="squad-grid">
            <div class="squad-desc-col">
              <label>共同工作內容</label>
              <textarea v-model="localData.squad.leader_desc" class="form-input full-height" placeholder="工作細節..."></textarea>
            </div>
            <div class="squad-members-col">
              <div v-for="i in 6" :key="'leader-'+i" class="member-input-row">
                <span class="member-label">小隊長 {{i}}</span>
                <input type="text" v-model="localData.squad.leaders[i-1]" class="form-input" placeholder="名單">
              </div>
            </div>
          </div>
        </div>

        <!-- 值日生 -->
        <div class="squad-section">
          <h4>🧹 值日生</h4>
          <div v-for="i in 6" :key="'duty-'+i" class="squad-member-detail-row">
            <span class="member-label">值日生 {{i}}</span>
            <input type="text" v-model="localData.squad.duties[i-1]" class="form-input flex-1" placeholder="名單">
            <input type="text" v-model="localData.squad.duty_desc[i-1]" class="form-input flex-2" placeholder="專屬工作內容...">
          </div>
        </div>

        <!-- 小幫手 -->
        <div class="squad-section">
          <h4>🤝 小幫手</h4>
          <div v-for="i in 5" :key="'helper-'+i" class="squad-member-detail-row">
            <span class="member-label">小幫手 {{i}}</span>
            <input type="text" v-model="localData.squad.helpers[i-1]" class="form-input flex-1" placeholder="名單">
            <input type="text" v-model="localData.squad.helper_desc[i-1]" class="form-input flex-2" placeholder="專屬工作內容...">
          </div>
        </div>

        <!-- 公差 -->
        <div class="squad-section">
          <h4>🏃 公差</h4>
          <div v-for="i in 4" :key="'errand-'+i" class="squad-member-detail-row">
            <span class="member-label">公差 {{i}}</span>
            <input type="text" v-model="localData.squad.errands[i-1]" class="form-input flex-1" placeholder="名單">
            <input type="text" v-model="localData.squad.errand_desc[i-1]" class="form-input flex-2" placeholder="專屬工作內容...">
          </div>
        </div>

        <!-- 小小兵 -->
        <div class="squad-section">
          <h4>🚶 小小兵</h4>
          <div class="squad-grid">
            <div class="squad-desc-col">
              <label>共同工作內容</label>
              <textarea v-model="localData.squad.minion_desc" class="form-input full-height" placeholder="工作細節..."></textarea>
            </div>
            <div class="squad-members-col">
              <div v-for="i in 2" :key="'minion-'+i" class="member-input-row">
                <span class="member-label">小小兵 {{i}}</span>
                <input type="text" v-model="localData.squad.minions[i-1]" class="form-input" placeholder="名單">
              </div>
            </div>
          </div>
        </div>

        <!-- 其他 -->
        <div class="squad-section">
          <h4>✨ 其他特別助理</h4>
          <div class="squad-grid">
            <div class="squad-desc-col">
              <label>共同工作內容</label>
              <textarea v-model="localData.squad.other_desc" class="form-input full-height" placeholder="工作細節..."></textarea>
            </div>
            <div class="squad-members-col">
              <div v-for="i in 3" :key="'other-'+i" class="member-input-row">
                <span class="member-label">助理 {{i}}</span>
                <input type="text" v-model="localData.squad.others[i-1]" class="form-input" placeholder="名單">
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const activeTab = ref('morning')
const isLoading = ref(true)
const isSaving = ref(false)

const defaultHygieneData = {
  isVisibleOnIndex: false,
  morning: {
    title: '704 班 教室和外掃區 早上掃地工作分配表', note: '',
    in_hygiene: '內衛生', in_hygiene_names: '', in_hygiene_work: '',
    board: '講台掃拖、講桌', board_names: '', board_work: '整理黑板',
    sweep: '教室地板掃地', sweep_names: '', sweep_mop_work: '',
    mop: '教室地板拖地', mop_names: '',
    window: '擦窗戶', window_names: '', window_work: '',
    hallway: '教室走廊', hallway_names: '', hallway_work: '',
    trash: '倒垃圾', trash_names: '', trash_work: '',
    out_area: '北側人行道',
    out_dynamic_areas: [] // 💡 確保動態陣列預設存在
  },
  lunch: {
    title: '午餐搬運、中午打掃輪值表', sub: '',
    clean_header: '清潔組', clean_h1: '', clean_h2: '', clean_h3: '', clean_h4: '', clean_h5: '', clean_h6: '', clean_n1: '', clean_n2: '', clean_n3: '', clean_n4: '', clean_n5: '', clean_n6: '',
    move_header: '搬餐組', move_h1: '', move_h2: '', move_h3: '', move_h4: '', move_h5: '', move_h6: '', move_n1: '', move_n2: '', move_n3: '', move_n4: '', move_n5: '', move_n6: '',
    serve_header: '配膳組', serve_h1: '', serve_h2: '', serve_h3: '', serve_h4: '', serve_h5: '', serve_h6: '', serve_n1: '', serve_n2: '', serve_n3: '', serve_n4: '', serve_n5: '', serve_n6: '',
    note1: '', note2: ''
  },
  squad: { 
    title: '各項小隊成員工作', 
    leader_desc: '', leaders: ['', '', '', '', '', ''], 
    duty_desc: ['', '', '', '', '', ''], duties: ['', '', '', '', '', ''], 
    helper_desc: ['', '', '', '', ''], helpers: ['', '', '', '', ''], 
    errand_desc: ['', '', '', ''], errands: ['', '', '', ''], 
    minion_desc: '', minions: ['', ''], 
    other_desc: '', others: ['', '', ''] 
  }
}

const localData = ref(JSON.parse(JSON.stringify(defaultHygieneData)))

const fetchData = async () => {
  isLoading.value = true
  const { data } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'hygiene_management_data').maybeSingle()
  
  if (data && data.setting_value) {
    // 深度合併確保屬性不會遺失
    localData.value = { ...defaultHygieneData, ...data.setting_value }
    localData.value.morning = { ...defaultHygieneData.morning, ...(data.setting_value.morning || {}) }
    localData.value.lunch = { ...defaultHygieneData.lunch, ...(data.setting_value.lunch || {}) }
    localData.value.squad = { ...defaultHygieneData.squad, ...(data.setting_value.squad || {}) }
    
    // 💡 確保動態外掃陣列存在
    if (!localData.value.morning.out_dynamic_areas) {
       localData.value.morning.out_dynamic_areas = []
    }
  }
  isLoading.value = false
}

onMounted(() => fetchData())

// 💡 無限新增與刪除外掃區的邏輯
const addOutAreaRow = () => {
  localData.value.morning.out_dynamic_areas.push({ area: '', names: '', work: '' })
}
const removeOutAreaRow = (idx) => {
  localData.value.morning.out_dynamic_areas.splice(idx, 1)
}

const saveSettings = async () => {
  isSaving.value = true
  try {
    await supabase.from('system_settings').upsert({
      setting_key: 'hygiene_management_data',
      setting_value: localData.value
    }, { onConflict: 'setting_key' })
    alert('✅ 班級衛生工作設定已成功儲存發布！')
  } catch (err) {
    alert('❌ 儲存失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.admin-container { padding: 20px; max-width: 1200px; margin: 0 auto; font-family: sans-serif; background: #f8fafc; min-height: 100vh;}
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); flex-wrap: wrap; gap: 15px;}
.header-title h2 { margin: 0 0 5px 0; color: #0f172a; font-size: 1.6rem;}
.subtitle { margin: 0; color: #64748b; font-size: 1rem;}
.header-actions { display: flex; align-items: center; gap: 15px; flex-wrap: wrap;}

.visibility-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; background: #f1f5f9; padding: 10px 15px; border-radius: 8px; border: 1px dashed #cbd5e1;}
.visibility-toggle input { width: 18px; height: 18px; cursor: pointer; }
.toggle-text { font-weight: bold; color: #334155; }

.save-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 1.05rem; cursor: pointer; transition: 0.2s;}
.save-btn:hover:not(:disabled) { background: #059669; }
.save-btn:disabled { background: #9ca3af; cursor: not-allowed; }
.back-btn { background: #e2e8f0; color: #475569; padding: 10px 20px; border-radius: 8px; font-weight: bold; text-decoration: none; transition: 0.2s; display: inline-block;}
.back-btn:hover { background: #cbd5e1; }

.tabs-container { display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto;}
.tab-btn { background: white; border: 1px solid #cbd5e1; padding: 12px 25px; border-radius: 8px; font-weight: bold; font-size: 1.1rem; color: #64748b; cursor: pointer; transition: 0.2s; white-space: nowrap;}
.tab-btn.active { background: #0ea5e9; color: white; border-color: #0ea5e9;}

.loading-state { text-align: center; padding: 50px; color: #94a3b8; font-size: 1.2rem; font-style: italic;}

.editor-panel { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;}

.form-group { margin-bottom: 15px;}
.form-group label { display: block; font-weight: bold; color: #334155; margin-bottom: 8px;}
.form-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; box-sizing: border-box; font-family: inherit;}
.form-input:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);}
.full-width { width: 100%; }

.section-divider { border: 0; height: 1px; background: #e2e8f0; margin: 30px 0; }
.section-subtitle { margin: 0 0 15px 0; color: #0f766e; font-size: 1.25rem; font-weight: bold;}

/* 早上掃地排版 */
.task-row { display: flex; gap: 15px; margin-bottom: 10px; align-items: flex-start;}
.task-label { flex: 0 0 150px; }
.task-names { flex: 1; min-width: 150px; }
.task-work { flex: 2; min-width: 250px; }
.hint-text { color: #94a3b8; font-style: italic; display: inline-block; padding-top: 10px;}

/* 動態外掃區表格 */
.dynamic-out-area-section { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px dashed #cbd5e1;}
.dynamic-table { width: 100%; border-collapse: collapse; margin-top: 15px;}
.dynamic-table th { background: #e2e8f0; color: #334155; padding: 10px; text-align: left; font-weight: bold;}
.dynamic-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top;}
.table-input { margin-bottom: 0; }
.del-row-btn { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;}
.del-row-btn:hover { background: #fecaca; }
.add-btn { background: white; color: #0ea5e9; border: 2px dashed #0ea5e9; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.add-btn:hover { background: #f0f9ff; }
.empty-table-text { text-align: center; color: #94a3b8; font-style: italic; padding: 20px !important;}

/* 中午搬餐排版 */
.lunch-grid-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;}
.lunch-group-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;}
.lunch-group-title { margin: 0 0 15px 0;}
.lunch-item-row { display: flex; gap: 8px; margin-bottom: 8px;}
.half-input { flex: 1; }

/* 小隊工作排版 */
.squad-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;}
.squad-section h4 { margin: 0 0 15px 0; color: #4f46e5; font-size: 1.1rem; border-bottom: 2px solid #e0e7ff; padding-bottom: 8px;}
.squad-grid { display: flex; gap: 20px; }
.squad-desc-col { flex: 1; }
.squad-members-col { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;}
.full-height { height: calc(100% - 30px); resize: vertical;}
.member-input-row { display: flex; flex-direction: column; gap: 5px;}
.member-label { font-size: 0.9rem; font-weight: bold; color: #64748b;}
.squad-member-detail-row { display: flex; gap: 15px; margin-bottom: 10px; align-items: center;}
.squad-member-detail-row .member-label { flex: 0 0 80px; }
.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

.mt-10 { margin-top: 10px; }
.mt-20 { margin-top: 20px; }

/* RWD */
@media (max-width: 1024px) {
  .lunch-grid-container { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .header-section { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; flex-direction: column; align-items: stretch;}
  .save-btn, .back-btn { width: 100%; text-align: center; }
  
  .task-row { flex-direction: column; gap: 5px; margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;}
  .task-label { flex: auto; width: 100%; }
  
  .dynamic-table th:nth-child(3) { display: none; } /* 手機隱藏部分標題簡化畫面 */
  .dynamic-table td { display: block; width: 100%; border-bottom: none; padding: 5px 0;}
  .dynamic-table tr { border-bottom: 2px solid #e2e8f0; display: block; margin-bottom: 15px;}
  .del-row-btn { width: 100%; margin-top: 5px;}
  
  .squad-grid { flex-direction: column; }
  .squad-members-col { grid-template-columns: 1fr; }
  .squad-member-detail-row { flex-direction: column; align-items: stretch; gap: 5px; background: white; padding: 10px; border-radius: 8px;}
  .squad-member-detail-row .member-label { flex: auto; }
}
</style>
