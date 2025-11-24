const PORT = process.env.PORT || 3000;
const app = require('./app');

// 比賽狀態管理（內存存儲）
let activeMatchId = null;
let lastActivityTime = null;
const MATCH_TIMEOUT = 5 * 60 * 1000; // 5分鐘無活動就清除比賽

// 生成短碼作為比賽 ID
function generateMatchId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 取得或建立活躍比賽
function getActiveMatch() {
  const now = Date.now();
  
  // 檢查比賽是否過期（超過5分鐘無活動）
  if (activeMatchId && lastActivityTime && (now - lastActivityTime) > MATCH_TIMEOUT) {
    console.log(`[Polling] 比賽 ${activeMatchId} 因無活動已過期（閒置超過 5 分鐘）`);
    activeMatchId = null;
    lastActivityTime = null;
  }
  
  // 如果沒有活躍比賽，建立新的
  if (!activeMatchId) {
    activeMatchId = generateMatchId();
    lastActivityTime = now;
    console.log(`[Polling] ✓ 建立新比賽: ${activeMatchId}`);
  } else {
    console.log(`[Polling] 復用現有比賽: ${activeMatchId}, 距上次活動 ${Math.round((now - lastActivityTime) / 1000)} 秒`);
  }
  
  return activeMatchId;
}

// 更新最後活動時間
function updateActivityTime() {
  lastActivityTime = Date.now();
  console.log(`[Polling] 活動時間已更新，比賽 ${activeMatchId} 保活中`);
}

// API 端點：取得活躍比賽 ID
app.get('/api/active-match', (req, res) => {
  const matchId = getActiveMatch();
  // 每次有客戶端檢查時，更新活動時間（代表有人在用這個比賽）
  updateActivityTime();
  res.json({ match_id: matchId });
});

// API 端點：報告活動（客戶端定期調用來保持連線）
app.post('/api/report-activity', (req, res) => {
  updateActivityTime();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Volleyball stats server running at http://localhost:${PORT}`);
});
