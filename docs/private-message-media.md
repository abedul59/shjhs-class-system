# 私訊圖片與影片

本專案在原有私訊功能上新增圖片／影片附件。原有導師、家長、學生密碼設定與文字私訊登入方式保留。家長、學生與導師在原有私訊頁面登入後即可上傳附件；導師選擇某位學生的家長或學生頻道後，附件只出現在該頻道。只有導師可修改附件說明、替換原檔或刪除附件；家長／學生不能修改或刪除。

## 儲存方式

附件不放進 GitHub 儲存庫。原檔存在同一個 Supabase 專案的私有 Storage bucket `private-message-media`，資料庫 `private_message_media` 只存所屬學生、對話頻道、檔案路徑及說明。匿名／一般角色沒有直接讀寫資料表或私有 bucket 的權限。原有登入成功時，伺服器再核對相同憑證，核發只供附件 API 使用的 HttpOnly Cookie；附件 API 依學生與家長／學生頻道核對權限。影片直接從瀏覽器上傳到 Storage，不經 Vercel 函式傳送檔案內容。

## 部署

1. 在共用 Supabase 專案的 SQL Editor 依序執行 `supabase/migrations/202610070001_private_message_media.sql` 和 `supabase/migrations/202610070002_teacher_private_media.sql`。若第一份已執行過，只執行第二份；勿重跑第一份。
2. 若從未建立附件 bucket，可在同一個 Supabase 專案的 SQL Editor 執行 `supabase/migrations/202610070003_private_message_media_bucket.sql`。它建立或更新 `private-message-media` bucket，保持 **Private**，單檔上限 50 MiB，允許 JPEG／PNG／WebP／GIF／MP4／WebM／MOV。也可在 Storage 頁面手動建立同樣設定。專案的 Storage 全域單檔上限也須至少 50 MiB；Free 方案的上限為 50 MB。不要新增對 anon/authenticated 開放讀寫的 Storage policy，也不要刪除既有物件。
3. 本專案 Vercel 的附件伺服器必須有同一 Supabase 專案的 service-role key。可設定 `NUXT_PRIVATE_MEDIA_SERVICE_KEY`；若先前已設定 `NUXT_STUDENT_BROADCAST_SERVICE_KEY`，本功能也可沿用其值，不需要重新設定導師登入密碼。Supabase URL 預設沿用 `NUXT_PUBLIC_SUPABASE_URL`，也可設定 `NUXT_PRIVATE_MEDIA_SUPABASE_URL`（須指向前端所用的同一專案）。附件 Cookie 簽章預設由伺服器金鑰隔離導出；如已設定至少 32 字元的 `NUXT_PRIVATE_MEDIA_SECRET`，也可沿用。service-role key 絕不可設成 `NUXT_PUBLIC_*` 或放入前端程式。若正式網站顯示「附件服務尚未設定完成」，先核對這些環境變數所屬的 Vercel 專案與 Production 環境並重新部署。
4. 家長、學生、導師仍從原有頁面登入；不需要個人首頁或學生手機廣播。附件 Cookie 最長 8 小時，若已逾期，從目前頁面登出後重新登入即可。不同 Vercel 網域各自登入。

圖片允許 JPEG、PNG、WebP、GIF，最多 20 MB；影片允許 MP4、WebM、MOV，最多 50 MB。來源檔案仍受 Supabase 專案本身的 Storage 上限約束。上傳授權 15 分鐘內須完成，讀取網址有效 15 分鐘。請勿將限時網址分享給其他人。

目前附件與既有文字訊息是同一對話中的兩個區塊；導師私訊列表會把家長／學生上傳的未讀附件計入紅色未讀提示，打開對話後標為已讀。導師上傳的附件不會列為導師未讀。附件不會寫入舊 `private_messages` 表，也不觸發舊的郵件提醒。舊文字私訊沿用原有資料表權限，本功能未改造其存取政策。舊家長 Email 前五碼方式本身較弱；附件登入沿用它以保持既有使用方式，但不代表整站完成更強的身分驗證。
