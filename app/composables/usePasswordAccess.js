import { ref } from 'vue'

export function usePasswordAccess(isWeekday) {
  const showPwdModal = ref(false)
  const pwdTarget = ref('')
  const pwdModalTitle = ref('')
  const pwdModalDesc = ref('')
  const currentEditorRole = ref('')

  const openPwdModal = (target) => {
    pwdTarget.value = target
    if (target === 'emergency') { 
      pwdModalTitle.value = '🚨 緊急通知系統解鎖'
      pwdModalDesc.value = '請輸入「導師」密碼：' 
    } else if (target === 'contact') { 
      pwdModalTitle.value = '✏️ 編輯聯絡簿解鎖'
      pwdModalDesc.value = '請輸入「學藝股長」、「輔導股長」或「導師」密碼：' 
    } else if (target === 'classNotes') { 
      pwdModalTitle.value = '⚡ 編輯注意事項解鎖'
      pwdModalDesc.value = '請輸入「學藝股長」、「輔導股長」或「導師」密碼：' 
    } else if (target === 'attendance') {
      const isLate = new Date().getHours() >= 8
      pwdModalTitle.value = '⏰ 點名權限解鎖'
      pwdModalDesc.value = !isWeekday ? '今天是週末，請輸入「導師」密碼以變更點名狀態：' : '已超過規定時間 (08:00)，請輸入「導師」密碼解鎖變更：'
    }
    showPwdModal.value = true
  }

  return {
    showPwdModal, pwdTarget, pwdModalTitle, pwdModalDesc, currentEditorRole,
    openPwdModal
  }
}
