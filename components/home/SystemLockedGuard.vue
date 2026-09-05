<template>
  <div class="unverified-placeholder">
    <div class="spinner-icon">🛡️</div>
    <h2>系統安全鎖定中</h2>
    <p>為保護班級資訊，請於驗證畫面選擇身分後進入。</p>
  </div>
</template>

<style scoped>
.unverified-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; padding: 80px 20px; border-radius: 12px; border: 1px dashed #cbd5e1; margin-top: 20px; }
.spinner-icon { font-size: 4rem; animation: pulse 2s infinite; margin-bottom: 20px; }
.unverified-placeholder h2 { color: #334155; margin-bottom: 10px; }
.unverified-placeholder p { color: #64748b; font-size: 1.1rem; }
@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }
</style>
