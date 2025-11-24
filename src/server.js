const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const app = require('./app');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket 連線管理
let currentMatchId = null;
const clients = new Set();

// 生成短碼作為比賽 ID
function generateMatchId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`Client connected. Total clients: ${clients.size}`);

  // 如果還沒有比賽，建立新比賽
  if (!currentMatchId) {
    currentMatchId = generateMatchId();
    console.log(`New match created: ${currentMatchId}`);
  }

  // 發送當前比賽 ID 給新連線的客戶端
  ws.send(JSON.stringify({
    type: 'match-assigned',
    matchId: currentMatchId
  }));

  // 通知其他客戶端有新人加入
  clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'match-joined',
        matchId: currentMatchId
      }));
    }
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // 廣播訊息給所有客戶端
      if (data.type === 'score-update' || data.type === 'grade-update' || data.type === 'match-ended') {
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
      
      // 比賽結束時，清除當前比賽 ID 準備下一場
      if (data.type === 'match-ended') {
        console.log(`Match ${currentMatchId} ended`);
        currentMatchId = null;
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected. Total clients: ${clients.size}`);
    
    // 如果所有客戶端都斷開，清除當前比賽 ID
    if (clients.size === 0) {
      currentMatchId = null;
      console.log('All clients disconnected, match cleared');
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`Volleyball stats server running at http://localhost:${PORT}`);
});
