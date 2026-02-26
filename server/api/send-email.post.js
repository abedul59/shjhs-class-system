import nodemailer from 'nodemailer'

export default defineEventHandler(async (event) => {
  // 1. 讀取前端傳來的資料
  const body = await readBody(event)
  const { bcc, to, subject, content } = body

  // 2. 設定 SMTP 伺服器 (使用環境變數的 Gmail 帳密)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SENDER_EMAIL,
      pass: process.env.SENDER_PASSWORD
    }
  })

  try {
    // 3. 執行寄信
    const info = await transporter.sendMail({
      from: `"班級導師系統" <${process.env.SENDER_EMAIL}>`,
      to: to || process.env.SENDER_EMAIL, // 如果沒有指定收件人，就寄給自己 (Bcc 才會隱藏名單)
      bcc: bcc ? bcc.join(',') : '',      // 密件副本群發名單
      subject: subject || '班級重要通知',
      text: content
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ 伺服器寄信失敗:', error)
    throw createError({
      statusCode: 500,
      statusMessage: '寄信失敗，請檢查 SMTP 設定'
    })
  }
})