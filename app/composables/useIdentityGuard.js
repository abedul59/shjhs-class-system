import { ref, computed } from 'vue'

export function useIdentityGuard(supabase) {
  const isIpWhitelisted = ref(false)
  const isIpBrownlisted = ref(false)
  const currentIpStr = ref('')
  const currentIdentity = ref('匿名來訪者')
  const showIdentityModal = ref(false)

  const activeRoleCategory = computed(() => {
    const id = currentIdentity.value;
    if (!id) return 'anonymous';
    if (id.includes('導師')) return 'teacher';
    if (id.includes('任課老師')) return 'subject_teacher';
    if (id.includes('家長')) return 'parent';
    if (id.includes('學生')) return 'student';
    if (isIpBrownlisted.value) return 'classroom';
    return 'anonymous';
  })

  const isContentVisible = computed(() => isIpBrownlisted.value || currentIdentity.value !== '匿名來訪者')

  const checkIpRules = async () => {
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json')
      const { ip } = await ipRes.json()
      currentIpStr.value = ip 
      const { data: rules } = await supabase.from('ip_rules').select('ip_range, rule_type')
      if (rules && rules.length > 0) {
        isIpWhitelisted.value = rules.filter(r => r.rule_type === '白名單').some(r => ip.startsWith(r.ip_range))
        isIpBrownlisted.value = rules.filter(r => r.rule_type === '褐名單').some(r => ip.startsWith(r.ip_range))
      }
    } catch (e) {}
  }

  const checkIdentity = () => {
    currentIdentity.value = localStorage.getItem('visitor_known_identity') || '匿名來訪者'
    if (!isIpBrownlisted.value && currentIdentity.value === '匿名來訪者') {
      showIdentityModal.value = true
    }
  }

  const logVisit = async () => {
    if (sessionStorage.getItem('visit_logged')) return
    try {
      const ua = navigator.userAgent
      let role = localStorage.getItem('visitor_known_identity') || '匿名來訪者'
      if (sessionStorage.getItem('schedule_admin_logged_in') === 'true' || sessionStorage.getItem('exams_admin_logged_in') === 'true') {
        role = '導師'
      }
      await supabase.from('visitor_logs').insert([{ 
        ip_address: currentIpStr.value || '未知IP', 
        device_info: ua, 
        role: role, 
        action_details: '👁️ 瀏覽頁面：班級首頁' 
      }])
      sessionStorage.setItem('visit_logged', 'true')
    } catch (e) {}
  }

  const logRoleVisit = async (roleName) => {
    try { 
      await supabase.from('visitor_logs').insert([{ 
        ip_address: currentIpStr.value || '未知IP', 
        device_info: navigator.userAgent, 
        role: roleName, 
        action_details: `🔑 解鎖後台：${roleName}` 
      }]) 
    } catch (e) {}
  }

  return {
    isIpWhitelisted, isIpBrownlisted, currentIpStr, currentIdentity, showIdentityModal, 
    activeRoleCategory, isContentVisible,
    checkIpRules, checkIdentity, logVisit, logRoleVisit
  }
}
