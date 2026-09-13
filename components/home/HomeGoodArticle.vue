<template>
  <div class="good-article-card">
    <div class="card-header">
      <h3>📖 教育優質文章</h3>
    </div>
    
    <div class="article-content-wrapper">
      <h2 class="article-title">{{ article.title }}</h2>
      <div class="article-meta">發布時間：{{ new Date(article.updated_at).toLocaleDateString('zh-TW') }}</div>
      
      <!-- 💡 使用 v-html 渲染從後台貼上的圖文，並靠 CSS 限制最大寬度防止手機破版 -->
      <div class="article-body rich-text-content" v-html="article.content"></div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  article: { type: Object, required: true }
})
</script>

<style scoped>
.good-article-card {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  margin-bottom: 25px;
  border-top: 5px solid #10b981; /* 綠色頂部強調線 */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px dashed #e2e8f0;
  padding-bottom: 15px;
  margin-bottom: 20px;
}
.card-header h3 {
  margin: 0;
  color: #047857;
  font-size: 1.35rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.article-content-wrapper {
  background: #f8fafc;
  padding: 25px 30px;
  border-radius: 8px;
}

.article-title {
  margin: 0 0 10px 0;
  color: #1e293b;
  font-size: 1.6rem;
  line-height: 1.4;
}

.article-meta {
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #cbd5e1;
}

/* 💡 RWD 富文本內容防護 (確保貼上的網頁圖片、表格在手機上不破版) */
.rich-text-content {
  font-size: 1.1rem;
  color: #334155;
  line-height: 1.8;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* 強制所有圖片最大不能超過容器寬度 */
.rich-text-content :deep(img) {
  max-width: 100% !important;
  height: auto !important;
  border-radius: 8px;
  margin: 15px 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.rich-text-content :deep(iframe) {
  max-width: 100%;
}

.rich-text-content :deep(table) {
  width: 100% !important;
  max-width: 100%;
  overflow-x: auto;
  display: block;
}

/* 手機版適配 */
@media (max-width: 768px) {
  .good-article-card { padding: 15px; }
  .article-content-wrapper { padding: 15px; }
  .article-title { font-size: 1.3rem; }
  .rich-text-content { font-size: 1rem; line-height: 1.6; }
}
</style>
