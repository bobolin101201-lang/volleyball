const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const app = require('./app');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket 連線管理
let currentMatchId = null;
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`Client connected. Total clients: ${clients.size}`);

  // 發送當前比賽 ID 給新連線的客戶端
  if (currentMatchId) {
    ws.send(JSON.stringify({
      type: 'match-joined',
      matchId: currentMatchId
    }));
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // 更新當前比賽 ID
      if (data.type === 'match-started') {
        currentMatchId = data.matchId;
        console.log(`Match started: ${currentMatchId}`);
      }
      
      // 廣播訊息給所有客戶端
      if (data.type === 'score-update' || data.type === 'grade-update' || data.type === 'match-ended') {
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected. Total clients: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`Volleyball stats server running at http://localhost:${PORT}`);
});
