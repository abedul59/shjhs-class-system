<template>
  <div class="admin-officers-container">
    <div class="card-header">
      <h3>🔐 職位密碼與權限管理</h3>
      <p class="subtitle">您可以自由新增股長職位並設定密碼。請注意：系統核心功能綁定的代號為 <strong>teacher (導師)</strong> 與 <strong>discipline (風紀)</strong>。</p>
    </div>

    <div v-if="isLoading" class="loading-state">
      資料載入中...
    </div>

    <div v-else class="table-wrapper">
      <table class="password-table">
        <thead>
          <tr>
            <th>職位代號 (Role Key)</th>
            <th>登入密碼 (Password)</th>
            <th class="action-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in passwordList" :key="index">
            <td>
              <input 
                v-model="item.roleKey" 
                type="text" 
                placeholder="例如: discipline" 
                class="edit-input" 
                :disabled="item.roleKey === 'teacher'" 
                title="teacher 為系統核心代號，不可修改" 
              />
            </td>
            <td>
              <input 
                v-model="item.password" 
                type="text" 
                placeholder="輸入密碼..." 
                class="edit-input" 
              />
            </td>
            <td class="action-col">
              <button v-if="item.roleKey !== 'teacher'" @click="removeRole(index)" class="btn-delete">🗑️ 刪除</button>
              <span v-else class="locked-text">🔒 核心鎖定</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="admin-actions">
        <button @click="addNewRole" class="btn-add">➕ 新增股長 / 職位</button>
        <button @click="savePasswords" class="btn-save" :disabled="isSaving">
          {{ isSaving ? '儲存中...' : '💾 儲存所有密碼變更' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const supabase = useSupabaseClient()

const isLoading = ref(true)
const isSaving = ref(false)

// 用於在畫面上呈現與編輯的陣列格式：[{ roleKey: 'academic', password: '111' }, ...]
const passwordList = ref([])

onMounted(async () => {
  await fetchPasswords()
})

const fetchPasswords = async () => {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'board_officer_passwords')
      .maybeSingle()

    if (error) throw error

    const passwordsJSON = data?.setting_value || {}
    
    // 將 JSON Object 轉換為 Array，方便 Vue 進行 v-model 渲染與列表編輯
    passwordList.value = Object.keys(passwordsJSON).map(key => ({
      roleKey: key,
      password: passwordsJSON[key]
    }))

  } catch (err) {
    console.error(err)
    alert("讀取密碼資料失敗！")
  } finally {
    isLoading.value = false
  }
}

const addNewRole = () => {
  passwordList.value.push({ roleKey: '', password: '' })
}

const removeRole = (index) => {
  if (confirm("確定要刪除這個職位的密碼權限嗎？")) {
    passwordList.value.splice(index, 1)
  }
}

const savePasswords = async () => {
  // 1. 驗證資料，過濾掉空的代號
  const hasEmptyKey = passwordList.value.some(item => !item.roleKey.trim())
  if (hasEmptyKey) {
    alert("❌ 儲存失敗：請確保所有「職位代號」都有填寫內容！")
    return
  }

  isSaving.value = true
  try {
    // 2. 將 Array 轉回 JSON Object 格式
    const newPasswordsJSON = {}
    passwordList.value.forEach(item => {
      newPasswordsJSON[item.roleKey.trim()] = item.password.trim()
    })

    // 3. 寫入資料庫
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'board_officer_passwords',
        setting_value: newPasswordsJSON,
        updated_at: new Date().toISOString()
      }, { onConflict: 'setting_key' })

    if (error) throw error
    
    alert("✅ 所有職位與密碼已成功更新！")
  } catch (err) {
    console.error(err)
    alert("❌ 儲存失敗：" + err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.admin-officers-container {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
}
.card-header { margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; }
.card-header h3 { margin: 0 0 10px 0; color: #334155; font-size: 1.3rem; }
.subtitle { margin: 0; color: #64748b; font-size: 0.95rem; line-height: 1.5; }

.loading-state { text-align: center; padding: 40px; color: #64748b; font-size: 1.1rem; }

.table-wrapper { overflow-x: auto; }
.password-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}
.password-table th {
  background: #f8fafc;
  padding: 12px;
  text-align: left;
  color: #475569;
  font-weight: bold;
  border-bottom: 2px solid #e2e8f0;
}
.password-table td {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
}
.action-col { text-align: center; width: 120px; }

.edit-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
}
.edit-input:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }

.btn-delete { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;}
.btn-delete:hover { background: #fecaca; }
.locked-text { color: #94a3b8; font-size: 0.9rem; font-weight: bold; }

.admin-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
.btn-add { background: transparent; color: #3b82f6; border: 2px dashed #93c5fd; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1rem; }
.btn-add:hover { background: #eff6ff; }
.btn-save { background: #10b981; color: white; border: none; padding: 12px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1.1rem; }
.btn-save:disabled { background: #9ca3af; cursor: not-allowed; }
</style>
