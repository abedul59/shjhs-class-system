<template>
  <div class="admin-officers">
    <div class="header-box">
      <h3>🔐 職位密碼與權限管理</h3>
      <p>您可以自由新增股長職位並設定密碼。請注意：系統核心功能綁定的代號將標示對應的「中文標籤」，以供識別。</p>
    </div>

    <div class="table-container">
      <table class="officer-table">
        <thead>
          <tr>
            <th>職位代號 (Role Key)</th>
            <th>登入密碼 (Password)</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in officerList" :key="index">
            <td>
              <div class="role-input-group">
                <!-- 💡 視覺化中文對照標籤 -->
                <span v-if="roleMap[item.key]" class="cn-label">{{ roleMap[item.key] }}</span>
                <input 
                  v-model="item.key" 
                  type="text" 
                  placeholder="輸入英文代號 (如: cleaning)..." 
                  :disabled="isCoreRole(item.key)"
                  :class="{ 'is-core': isCoreRole(item.key) }"
                />
              </div>
            </td>
            <td>
              <input v-model="item.password" type="text" placeholder="請設定密碼..." class="pwd-input" />
            </td>
            <td class="action-cell">
              <span v-if="item.key === 'teacher'" class="lock-text">🔒 核心鎖定</span>
              <button v-else @click="removeRole(index)" class="btn-delete">🗑️ 刪除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="bottom-actions">
      <button @click="addRole" class="btn-add">➕ 新增股長 / 職位</button>
      <button @click="saveChanges" class="btn-save" :disabled="isSaving">
        {{ isSaving ? '儲存中...' : '💾 儲存所有密碼變更' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const officerList = ref([])
const isSaving = ref(false)

// 💡 中文對照表 (僅作視覺呈現，絕對不影響底層英文 Key 邏輯)
const roleMap = {
  'teacher': '導師',
  'academic': '學藝股長',
  'counseling': '輔導股長',
  'discipline': '風紀股長'
}

// 定義系統核心關聯的 Key，不允許修改 Key 名稱 (但允許改密碼)
const coreRoles = ['teacher', 'academic', 'counseling', 'discipline']
const isCoreRole = (key) => coreRoles.includes(key)

onMounted(async () => {
  await fetchData()
})

const fetchData = async () => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'board_officer_passwords')
      .maybeSingle()

    if (error) throw error

    if (data?.setting_value) {
      // 將資料庫的 JSON Object 轉為 Array 方便渲染
      officerList.value = Object.entries(data.setting_value).map(([key, password]) => ({
        key,
        password
      }))
    } else {
      // 若資料庫全空，給予基礎預設值
      officerList.value = [
        { key: 'teacher', password: '168168168' },
        { key: 'academic', password: '' },
        { key: 'counseling', password: '' },
        { key: 'discipline', password: '' }
      ]
    }
  } catch (err) {
    console.error('讀取密碼設定失敗', err)
  }
}

const addRole = () => {
  officerList.value.push({ key: '', password: '' })
}

const removeRole = (index) => {
  if (confirm('確定要刪除此職位的密碼設定嗎？(若有綁定前台按鈕將導致無法登入)')) {
    officerList.value.splice(index, 1)
  }
}

const saveChanges = async () => {
  isSaving.value = true
  try {
    // 過濾掉空白的 key，並轉回 JSON Object 存入資料庫
    const newSettings = {}
    officerList.value.forEach(item => {
      if (item.key.trim()) {
        newSettings[item.key.trim()] = item.password.trim()
      }
    })

    // 終極防呆：確保 teacher 絕對存在，防止您被鎖在外面
    if (!newSettings['teacher']) {
      newSettings['teacher'] = '168168168'
    }

    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert(
        { setting_key: 'board_officer_passwords', setting_value: newSettings }, 
        { onConflict: 'setting_key' }
      )

    if (upsertError) throw upsertError

    alert('✅ 所有密碼與權限變更已成功儲存！')
    await fetchData()
  } catch (err) {
    alert('❌ 儲存失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.admin-officers {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  padding: 25px;
}

.header-box {
  margin-bottom: 20px;
}
.header-box h3 {
  margin-top: 0;
  color: #1e293b;
  margin-bottom: 8px;
}
.header-box p {
  color: #64748b;
  font-size: 0.95rem;
  margin: 0;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.officer-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.officer-table th {
  background: #f8fafc;
  padding: 12px 15px;
  font-weight: bold;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
}
.officer-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

/* 職位輸入框與標籤排版 */
.role-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cn-label {
  background-color: #e0e7ff;
  color: #4338ca;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: bold;
  white-space: nowrap;
}

input {
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;
}
input:focus {
  outline: none;
  border-color: #3b82f6;
}
input.is-core {
  background-color: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}
.pwd-input {
  max-width: 300px;
}

.action-cell {
  text-align: center;
  width: 120px;
}
.lock-text {
  color: #d97706;
  font-weight: bold;
  font-size: 0.95rem;
}
.btn-delete {
  background: #fee2e2;
  color: #b91c1c;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
.btn-delete:hover {
  background: #fecaca;
}

.bottom-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
}
.btn-add {
  background: transparent;
  color: #3b82f6;
  border: 2px dashed #bfdbfe;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
.btn-add:hover {
  background: #eff6ff;
}
.btn-save {
  background: #10b981;
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.05rem;
}
.btn-save:hover {
  background: #059669;
}
.btn-save:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
</style>
