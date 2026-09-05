<template>
  <div class="identity-banner">
    <span v-if="currentIdentity !== '匿名來訪者'">✅ 目前驗證身分：{{ currentIdentity }}</span>
    <span v-else>⚠️ 尚未驗證身分</span>
    <button @click="$emit('change-identity')" class="change-id-btn">切換/綁定身分</button>
  </div>
</template>

<script setup>
defineProps({ currentIdentity: String })
defineEmits(['change-identity'])
</script>

<style scoped>
.identity-banner { background: #e0f2fe; color: #0369a1; padding: 12px 20px; text-align: center; font-weight: bold; border-radius: 8px; display: flex; justify-content: center; align-items: center; gap: 15px; border: 1px solid #bae6fd; margin-bottom: -5px;}
.change-id-btn { background: #0ea5e9; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.95rem; font-weight: bold; transition: 0.2s; }
.change-id-btn:hover { background: #0284c7; }
</style>
