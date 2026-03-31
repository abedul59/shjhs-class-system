import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const supabase = await serverSupabaseClient(event)
    
    // 隨意對一個表格進行最輕量的查詢 (這裡假設你有 students 或類似的表)
    // 就算這個表不存在而報錯，Supabase 的伺服器也已經被成功「喚醒」了！
    await supabase.from('students').select('id').limit(1)

    return { success: true, message: '新化國中班級系統 Supabase 喚醒成功！' }
  } catch (err) {
    // 即使有 error 也回傳 success，因為重點是「已經打到 Supabase 了」
    return { success: true, message: '喚醒指令已送出' }
  }
})
