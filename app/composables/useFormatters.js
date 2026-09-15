import { unref } from 'vue'

export function useFormatters(isIpWhitelistedRef, allStudentsForLoginRef) {
  
  // 1. 隱私過濾器 (自動將本名替換為隱藏名)
  const privacyFilter = (txt) => {
    let result = String(txt || '')
    // 解開 ref 以取得實際值
    const isIpWhitelisted = unref(isIpWhitelistedRef)
    const allStudentsForLogin = unref(allStudentsForLoginRef)

    if (!isIpWhitelisted && allStudentsForLogin && allStudentsForLogin.length > 0) {
      // 確保從名字長的開始替換，避免短名字誤殺長名字的一部份
      const sortedStudents = [...allStudentsForLogin].sort((a, b) => (b.real_name || '').length - (a.real_name || '').length)
      sortedStudents.forEach(stu => {
        if (stu.real_name && stu.hidden_name && stu.real_name.trim() !== '') { 
          result = result.split(stu.real_name).join(stu.hidden_name) 
        }
      })
    }
    return result
  }

  // 2. 換行格式化 (過濾隱私後，將 \n 轉成 <br>)
  const formatNL = (txt) => {
    return privacyFilter(txt).replace(/\n/g, '<br>')
  }

  // 3. 日期時間格式化
  const formatDateTime = (dtStr) => {
    return dtStr ? new Date(dtStr).toLocaleString('zh-TW', { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', hour12: false 
    }) : ''
  }

  return {
    privacyFilter,
    formatNL,
    formatDateTime
  }
}
