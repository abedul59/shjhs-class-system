<template>
  <div class="notes-board">
    <div class="board-header">
      <div>
        <h2 class="board-title notes-title">⚡ 今日班級注意事項</h2>
        <p class="board-date">{{ todayDisplay }}</p>
      </div>
      <button v-if="!isEditingClassNotes" @click="$emit('open-pwd')" class="edit-btn">✏️ 編輯</button>
    </div>
    
    <div class="dashed-divider"></div>
    
    <div class="board-content">
      <div v-if="!isEditingClassNotes">
        <div v-if="classNoteItems.length === 0" class="empty-text-italic">目前尚無特別注意事項...</div>
        <ul v-else class="item-list notes-list">
          <li v-for="(item, index) in classNoteItems" :key="'cn-'+index">{{ index + 1 }}. {{ privacyFilter(item) }}</li>
        </ul>
      </div>
      
      <div v-else class="edit-mode">
        <div v-for="(item, index) in editingClassNoteItems" :key="'edit-note-'+index" class="edit-row">
          <span class="row-num">{{ index + 1 }}.</span>
          <input 
            :value="item" 
            @input="$emit('update-item', index, $event.target.value)" 
            type="text" 
            placeholder="輸入注意事項..." 
            class="edit-input"
          />
          <button @click="$emit('remove-item', index)" class="del-row-btn">🗑️</button>
        </div>
        
        <div class="edit-actions">
          <button @click="$emit('add-item')" class="add-btn">➕ 新增事項</button>
          <div class="action-right">
            <button @click="$emit('cancel-edit')" class="cancel-btn">取消</button>
            <button @click="$emit('save-items')" class="save-btn">💾 儲存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  classNoteItems: Array,
  editingClassNoteItems: Array,
  isEditingClassNotes: Boolean,
  todayDisplay: String,
  privacyFilter: Function
})

defineEmits(['open-pwd', 'cancel-edit', 'save-items', 'add-item', 'remove-item', 'update-item'])
</script>

<style scoped>
/* 深海藍色系看板 */
.notes-board { background-color: #1e293b; border: 10px solid #475569; border-radius: 8px; padding: 20px 25px; box-shadow: 0 6px 12px rgba(0,0,0,0.15), inset 0 0 10px rgba(0,0,0,0.3); margin-bottom: 20px;}
.board-title { margin: 0; font-size: 1.4rem; font-weight: bold; }
.notes-title { color: #38bdf8; } /* 天空藍字體 */
.board-date { color: #94a3b8; margin: 8px 0 0 0; font-size: 0.95rem; }
.dashed-divider { border-bottom: 2px dashed #64748b; margin: 15px 0; opacity: 0.6; }
.board-content { color: white; min-height: 40px; }
.empty-text-italic { color: #94a3b8; font-style: italic; font-size: 1.1rem; }
.item-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }

.board-header { display: flex; justify-content: space-between; align-items: flex-start; }
.edit-btn { background: #0ea5e9; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-weight: bold; font-size: 0.95rem; cursor: pointer; transition: 0.2s;}
.edit-btn:hover { background: #0284c7; }

.edit-mode { background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px; }
.edit-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.row-num { font-size: 1.1rem; color: #38bdf8; width: 25px; font-weight: bold; }
.edit-input { flex: 1; padding: 8px 12px; font-size: 1rem; border-radius: 6px; border: none; }
.del-row-btn { background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }

.edit-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
.add-btn { background: transparent; color: white; border: 1px dashed #cbd5e1; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.action-right { display: flex; gap: 10px; }
.cancel-btn { background: #64748b; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
.save-btn { background: #10b981; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }

@media (max-width: 768px) {
  .notes-board { padding: 15px 10px; border-width: 8px; }
  .board-header { flex-direction: column; align-items: stretch; gap: 12px; }
  .board-header > div { text-align: center; }
  .notes-title { font-size: 1.3rem; }
  .board-date { font-size: 0.9rem; margin-top: 5px;}
  .edit-btn { width: 100%; padding: 10px; text-align: center; font-size: 1.05rem;}
  
  .notes-list li { line-height: 1.6; word-break: break-word; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed rgba(255,255,255,0.15); font-size: 1.05rem;}
  .notes-list li:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0;}
  
  .edit-mode { padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px;}
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
