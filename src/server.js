const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const app = require('./app');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket 連線管理
let currentMatchId = null;
let matchStartTime = null; // 追蹤比賽開始時間
const clients = new Set();
const CLIENT_TIMEOUT = 30000; // 30秒無客戶端就清除比賽

// 生成短碼作為比賽 ID
function generateMatchId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 檢查比賽是否過期
function isMatchExpired() {
  if (!matchStartTime) return false;
  return Date.now() - matchStartTime > CLIENT_TIMEOUT;
}

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WebSocket] Client connected. Total clients: ${clients.size}`);
  console.log(`[WebSocket] Current match: ${currentMatchId}`);

  // 如果還沒有比賽，或比賽過期了，建立新比賽
  if (!currentMatchId || isMatchExpired()) {
    currentMatchId = generateMatchId();
    matchStartTime = Date.now();
    console.log(`[WebSocket] New match created: ${currentMatchId}`);
  }

  // 發送當前比賽 ID 給新連線的客戶端
  ws.send(JSON.stringify({
    type: 'match-assigned',
    matchId: currentMatchId
  }));
  console.log(`[WebSocket] Assigned match ${currentMatchId} to new client`);

  // 通知其他客戶端有新人加入
  const notifyCount = clients.size - 1;
  if (notifyCount > 0) {
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'match-joined',
          matchId: currentMatchId
        }));
      }
    });
    console.log(`[WebSocket] Notified ${notifyCount} other clients`);
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // 廣播訊息給所有客戶端
      if (data.type === 'score-update' || data.type === 'grade-update' || data.type === 'match-ended') {
        console.log(`[WebSocket] Broadcasting ${data.type} to all clients`);
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
      
      // 比賽結束時，清除當前比賽 ID 準備下一場
      if (data.type === 'match-ended') {
        console.log(`[WebSocket] Match ${currentMatchId} ended`);
        currentMatchId = null;
        matchStartTime = null;
      }
    } catch (err) {
      console.error('[WebSocket] Message error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Client disconnected. Total clients: ${clients.size}`);
    
    // 如果所有客戶端都斷開，清除當前比賽 ID
    if (clients.size === 0) {
      console.log('[WebSocket] All clients disconnected, clearing match');
      currentMatchId = null;
      matchStartTime = null;
    }
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`Volleyball stats server running at http://localhost:${PORT}`);
});
