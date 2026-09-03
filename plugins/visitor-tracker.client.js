export default defineNuxtPlugin((nuxtApp) => {
  // 確保這段程式碼只在客戶端(瀏覽器)執行
  if (process.server) return

  const supabase = useSupabaseClient()
  const router = useRouter()

  // 💡 IP 快取機制：避免每次點擊都去要一次 IP，拖慢效能或被 API 阻擋
  const getVisitorIP = async () => {
    let ip = sessionStorage.getItem('cached_visitor_ip')
    if (!ip) {
      try {
        const res = await fetch('https://api.ipify.org?format=json')
        ip = (await res.json()).ip
        sessionStorage.setItem('cached_visitor_ip', ip)
      } catch (e) {
        ip = '未知IP'
      }
    }
    return ip
  }

  // 💡 共用的資料庫寫入函式
  const autoLogAction = async (actionDesc) => {
    try {
      const ip = await getVisitorIP()
      const ua = navigator.userAgent
      
      await supabase.from('visitor_logs').insert([{ 
        ip_address: ip, 
        device_info: ua, 
        action_details: actionDesc
      }])
    } catch (e) {
      // 寫入失敗不阻擋使用者操作，僅在開發者終端顯示
      console.warn('自動追蹤寫入失敗', e)
    }
  }

  // ==========================================
  // 1. 自動追蹤「頁面瀏覽」 (攔截 Router)
  // ==========================================
  router.afterEach((to) => {
    // 當切換頁面時，自動紀錄網址路徑 (例如：/assignments)
    autoLogAction(`👁️ 進入頁面：${decodeURIComponent(to.path)}`)
  })

  // ==========================================
  // 2. 自動追蹤「按鈕與連結點擊」 (攔截全域 Click 事件)
  // ==========================================
  window.addEventListener('click', (e) => {
    // 自動往上層尋找，確認這次點擊是否發生在 <button> 或 <a> 標籤內
    const target = e.target.closest('button, a')
    
    if (target) {
      // 自動抓取按鈕上的文字，若無文字則抓 title，若為連結則抓 href
      let text = target.innerText?.trim().replace(/\n/g, ' ') || target.title || target.value
      
      if (!text && target.tagName.toLowerCase() === 'a') {
        text = target.getAttribute('href')
      }
      
      if (text) {
        // 擷取前 30 個字避免抓到落落長的垃圾內容
        text = text.substring(0, 30)
        autoLogAction(`🖱️ 點擊：${text}`)
      }
    }
  }, { passive: true }) // passive: true 確保不會卡住使用者的點擊效能
})
