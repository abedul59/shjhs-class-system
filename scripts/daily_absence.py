import os
import sys
import smtplib
from datetime import datetime
import pytz
from email.message import EmailMessage
from supabase import create_client, Client

# ==================== 1. 環境變數與連線設定 ====================
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
sender_email = os.environ.get("SENDER_EMAIL")
sender_password = os.environ.get("SENDER_PASSWORD")

if not all([url, key, sender_email, sender_password]):
    print("❌ 錯誤：環境變數設定不完整，請檢查 GitHub Secrets (需包含 SENDER_EMAIL 與 SENDER_PASSWORD)。")
    sys.exit(1)

supabase: Client = create_client(url, key)

# 設定台灣時區
tw_tz = pytz.timezone('Asia/Taipei')
today_dt = datetime.now(tw_tz)
today_str = today_dt.strftime('%Y-%m-%d')
today_display = today_dt.strftime('%Y年%m月%d日')

print(f"啟動遲到檢查排程，目前台灣時間：{today_dt.strftime('%Y-%m-%d %H:%M:%S')}")

# ==================== 2. 檢查導師授權狀態 (核心升級區塊) ====================
try:
    ctrl_res = supabase.table('daily_controls').select('*').eq('record_date', today_str).execute()
    
    if not ctrl_res.data:
        print("➡️ 今日無授權紀錄（導師尚未進入後台點擊），排程自動結束。")
        sys.exit(0)

    daily_control = ctrl_res.data[0]
    
    if not daily_control.get('is_authorized'):
        print("➡️ 導師目前為「未授權」或「取消授權」狀態，不執行發信。")
        sys.exit(0)
        
    if daily_control.get('is_sent'):
        print("✅ 今日遲到通知已經發送完畢，為避免重複發信，排程自動結束。")
        sys.exit(0)

    cutoff_time = daily_control.get('cutoff_time', '08:00')
    print(f"🟢 確認已獲得導師授權！結算時間為：{cutoff_time}，開始抓取未到名單...")

except Exception as e:
    print(f"❌ 查詢授權狀態時發生錯誤: {e}")
    sys.exit(1)

# ==================== 3. 抓取學生與打卡資料 ====================
try:
    students_res = supabase.table('students').select('*').execute()
    students = students_res.data

    attendances_res = supabase.table('attendances').select('*').eq('record_date', today_str).execute()
    attendances = {a['student_id']: a for a in attendances_res.data}

    parents_res = supabase.table('parents').select('*').execute()
    parents = parents_res.data
except Exception as e:
    print(f"❌ 撈取資料時發生錯誤: {e}")
    sys.exit(1)

# 過濾出未到學生
absent_students = []
for s in students:
    att = attendances.get(s['id'])
    if not att or att.get('status') == '未到':
        absent_students.append(s)

if not absent_students:
    print("🎉 今日全班皆已打卡！無須發送遲到通知。")
    # 雖然沒人遲到，但還是將今日狀態標記為「已發送」，讓導師後台顯示綠燈
    supabase.table('daily_controls').update({'is_sent': True}).eq('record_date', today_str).execute()
    sys.exit(0)

# ==================== 4. 執行寄信 ====================
success_count = 0

try:
    # 登入 Gmail SMTP 伺服器
    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.login(sender_email, sender_password)

    for student in absent_students:
        # 找出該學生的所有家長信箱並去重複 (支援多位家長)
        student_parents = [p for p in parents if p['student_id'] == student['id']]
        emails = list(set([p['email'] for p in student_parents if p.get('email')]))

        if not emails:
            print(f"⚠️ {student['real_name']} 無家長綁定信箱，略過。")
            continue

        # 準備信件內容
        msg = EmailMessage()
        msg['Subject'] = f"⚠️ 學校出缺席通知 - {student['real_name']} 尚未打卡"
        msg['From'] = f"班級導師系統 <{sender_email}>"
        msg['To'] = sender_email # 收件人填自己，避免被判定為垃圾信
        msg['Bcc'] = ", ".join(emails) # 家長放密件副本

        content = f"""親愛的家長您好：

系統偵測到您的孩子 【{student['real_name']}】 於今日 ({today_display}) 結算時間 {cutoff_time} 尚未完成到校打卡，特此通知。

若孩子已請假，請忽略此信件；若孩子已出門，請您留意其通勤安全，並可透過班級系統私訊與導師聯繫。

班級導師 敬上
(此為系統自動發送，請勿直接回信)"""
        
        msg.set_content(content)

        try:
            # 寄出信件
            server.send_message(msg)
            print(f"📤 成功發送給 {student['real_name']} 的家長: {emails}")
            
            # 寫入系統通訊紀錄 (稽核用)
            supabase.table('communication_logs').insert({
                'student_id': student['id'],
                'notification_type': '遲到通知 (自動排程)',
                'sent_by': 'Python自動排程',
                'recipient_emails': ", ".join(emails),
                'message_content': content
            }).execute()

            success_count += 1
        except Exception as e:
            print(f"❌ 發送給 {student['real_name']} 失敗: {e}")

    server.quit()

    # ==================== 5. 標記完成 (連動網頁後台) ====================
    # 將 is_sent 設為 True，這樣導師後台的呼吸燈就會變成綠色的「已發送」
    supabase.table('daily_controls').update({'is_sent': True}).eq('record_date', today_str).execute()
    print(f"✅ 全部作業完成！共成功寄送 {success_count} 封遲到通知信。已將今日狀態更新為「已發送」。")

except Exception as e:
    print(f"❌ SMTP 寄信過程發生嚴重錯誤: {e}")
    sys.exit(1)