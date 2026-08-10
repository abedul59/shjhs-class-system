/**
 * 根據隱私設定，取得學生的顯示姓名
 * @param {Object} student - 學生資料物件 (需包含 real_name 與 hidden_name)
 * @param {Boolean} isHidden - 是否開啟隱藏姓名模式
 * @returns {String} 應顯示的姓名
 */
export const getDisplayName = (student, isHidden) => {
  // 防呆：確保傳入的學生資料存在
  if (!student) return '';
  
  // 如果開啟隱藏模式，且資料庫有 hidden_name，就回傳隱藏姓名
  // 否則一律顯示真實姓名
  if (isHidden && student.hidden_name) {
    return student.hidden_name;
  }
  
  return student.real_name || '';
};
