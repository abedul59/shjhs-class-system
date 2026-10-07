# 私訊圖片與影片

本專案以 `abedul59/shjhs-class-system` 的 `main` 為基礎，只新增私訊圖片／影片。原有導師、家長、學生密碼設定與文字私訊登入方式保留。家長、學生與導師在原有私訊頁面登入後即可上傳附件；導師選擇某位學生的家長或學生頻道後，附件只出現在該頻道。只有導師可修改附件說明、替換原檔或刪除附件；家長／學生不能修改或刪除。

## 儲存方式

附件不放進 GitHub 儲存庫。原檔存在同一個 Supabase 專案的私有 Storage bucket `private-message-media`，資料庫 `private_message_media` 只存所屬學生、對話頻道、檔案路徑及說明。匿名／一般角色沒有直接讀寫資料表或私有 bucket 的權限。原有登入成功時，伺服器再核對相同憑證，核發只供附件 API 使用的 HttpOnly Cookie；附件 API 依學生與家長／學生頻道核對權限。影片直接從瀏覽器上傳到 Storage，不經 Vercel 函式傳送檔案內容。

## 部署

1. 在共用 Supabase 專案的 SQL Editor 依序執行 `supabase/migrations/202610070001_private_message_media.sql` 和 `supabase/migrations/202610070002_teacher_private_media.sql`。若第一份已執行過，只執行第二份；勿重跑第一份。
2. 在 Supabase **Storage** 新增 bucket，名稱精確填入 `private-message-media`，設為 **Private**，單檔上限 50 MB，允許的 MIME 類型為 `image/jpeg`、`image/png`、`image/webp`、`image/gif`、`video/mp4`、`video/webm`、`video/quicktime`。專案的 Storage 全域單檔上限也須至少 50 MB。不要新增對 anon/authenticated 開放讀寫的 Storage policy。若 bucket 已存在，核對上述設定即可；不要刪除既有物件。
3. 在新專案 Vercel 設定伺服器環境變數：`NUXT_PRIVATE_MEDIA_SECRET`（至少 32 字元隨機值）、`NUXT_PRIVATE_MEDIA_SUPABASE_URL`（共用 Supabase 專案 URL）、`NUXT_PRIVATE_MEDIA_SERVICE_KEY`（同專案的 service-role key）。後兩者用於伺服器查證身分、儲存檔案與簽發上傳／讀取網址；絕不可設成 `NUXT_PUBLIC_*` 或放入前端程式。這些不是導師登入密碼，不改變舊專案的 `admin_password` 設定。
4. 家長、學生、導師仍從原有頁面登入；不需要個人首頁或學生手機廣播。附件 Cookie 最長 8 小時，若已逾期，從目前頁面登出後重新登入即可。不同 Vercel 網域各自登入。

圖片允許 JPEG、PNG、WebP、GIF，最多 20 MB；影片允許 MP4、WebM、MOV，最多 50 MB。來源檔案仍受 Supabase 專案本身的 Storage 上限約束。上傳授權 15 分鐘內須完成，讀取網址有效 15 分鐘。請勿將限時網址分享給其他人。

目前附件與既有文字訊息是同一對話中的兩個區塊；導師私訊列表會把家長／學生上傳的未讀附件計入紅色未讀提示，打開對話後標為已讀。導師上傳的附件不會列為導師未讀。附件不會寫入舊 `private_messages` 表，也不觸發舊的郵件提醒。舊文字私訊沿用原有資料表權限，本功能未改造其存取政策。舊家長 Email 前五碼方式本身較弱；附件登入沿用它以保持既有使用方式，但不代表整站完成更強的身分驗證。
