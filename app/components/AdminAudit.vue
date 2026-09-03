<template>
  <div>
    <div class="table-header"><h3>🕵️ 系統稽核中心</h3></div>
    
    <div class="section">
      <h4>📝 系統綜合操作紀錄 (含作業與首頁黑板)</h4>
      <p style="color: #64748b; font-size: 0.9rem; margin-top: -10px; margin-bottom: 15px;">
        💡 紀錄包含導師、科任老師、小老師、股長等角色的操作軌跡與實際修改內容。
      </p>
      
      <table class="t">
        <tr class="h">
          <th width="200">時間</th>
          <th width="120">操作區塊</th>
          <th width="100">身分</th>
          <th width="120">動作</th>
          <th>詳細內容</th>
        </tr>
        <tr v-for="l in aLogs" :key="l.id" class="r">
          <td>{{ new Date(l.created_at).toLocaleString('zh-TW') }}</td>
          <td>
            <span :class="['tag', l.subject_name === '首頁黑板' ? 'tag-board' : 'tag-subject']">
              {{ l.subject_name }}
            </span>
          </td>
          <td><strong>{{ l.operator_role }}</strong></td>
          <td :class="getActionColor(l.action_type)">{{ l.action_type }}</td>
          <td class="details-cell">{{ l.details || '-' }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; 
const supabase = useSupabaseClient()

const aLogs = ref([])

onMounted(async () => {
  // 將抓取筆數稍微放大到 50 筆，因為現在黑板跟作業都統一紀錄在這裡了
  const { data: a } = await supabase.from('assignment_audit_logs').select('*').order('created_at', { ascending: false }).limit(50)
  aLogs.value = a || []
})

// 💡 讓不同的動作顯示不同的顏色，方便導師快速掃視
const getActionColor = (action) => {
  if (!action) return ''
  if (action.includes('刪除') || action.includes('缺交')) return 'text-danger'
  if (action.includes('新增') || action.includes('已交')) return 'text-success'
  if (action.includes('修改') || action.includes('編輯')) return 'text-warning'
  return 'text-primary'
}
</script>

<style scoped>
.table-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.section { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
.t { width: 100%; text-align: left; border-collapse: collapse; font-size: 0.95rem; }
.h th { padding: 12px; background: #e2e8f0; color: #334155; font-weight: bold; }
.r td { padding: 12px; border-bottom: 1px dashed #cbd5e1; vertical-align: middle; line-height: 1.5; }
.r:hover td { background: #f1f5f9; }

/* 💡 新增排版與顏色輔助 */
.details-cell { color: #475569; word-break: break-all; }
.tag { padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; }
.tag-board { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
.tag-subject { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }

.text-danger { color: #dc2626; font-weight: bold; }
.text-success { color: #16a34a; font-weight: bold; }
.text-warning { color: #d97706; font-weight: bold; }
.text-primary { color: #2563eb; font-weight: bold; }
</style>
