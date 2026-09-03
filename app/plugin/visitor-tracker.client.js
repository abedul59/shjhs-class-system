export default defineNuxtPlugin((nuxtApp) => {
  const supabase = useSupabaseClient()
  const router = useRouter()

  // 取得 IP 並快取，避免拖慢效能
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

  // 共用寫入函式
  const autoLogAction = async (actionDesc) => {
    try {
      const ip = await getVisitorIP()
      await supabase.from('visitor_logs').insert([{ 
        ip_address: ip, 
        device_info: navigator.userAgent, 
        action_details: actionDesc
      }])
    } catch (e) {
      console.warn('追蹤寫入失敗', e)
    }
  }

  // 💡 等待網站載入完成後再開始追蹤，避免干擾效能與抓不到元件
  nuxtApp.hook('app:mounted', () => {
    
    // 1. 紀錄「直接從網址列進入其他頁面」的動作 (首頁已在 index.vue 紀錄，所以避開 /)
    const initialPath = decodeURIComponent(router.currentRoute.value.path)
    if (initialPath !== '/') {
      autoLogAction(`👁️ 進入頁面：${initialPath}`)
    }

    // 2. 攔截網站內的後續路由跳轉
    router.afterEach((to) => {
      const path = decodeURIComponent(to.path)
      if (path !== '/') {
         autoLogAction(`👁️ 進入頁面：${path}`)
      }
    })

    // 3. 攔截全站點擊事件
    window.addEventListener('click', (e) => {
      // 💡 放寬捕捉範圍：不僅捕捉 button, a，連帶捕捉帶有 btn 等特定樣式的區域
      const target = e.target.closest('button, a, .btn, .cork-card, .student-card')
      
      if (target) {
        // 抓取按鈕上的文字，清除換行符號
        let text = target.innerText || target.title || target.value || ''
        text = text.replace(/[\r\n]+/g, ' ').trim()
        
        // 如果是圖片連結或沒有文字的連結，就抓它的網址
        if (!text && target.tagName.toLowerCase() === 'a') {
          text = target.getAttribute('href')
        }
        
        if (text) {
          text = text.substring(0, 30) // 限制擷取字數，避免抓到落落長的文章
          autoLogAction(`🖱️ 點擊：${text}`)
        }
      }
    }, { passive: true })
    
  })
})
