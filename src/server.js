const PORT = process.env.PORT || 3000;
const app = require('./app');

const server = app.listen(PORT, () => {
  console.log(`Volleyball stats server running at http://localhost:${PORT}`);
});

// 全局錯誤處理
process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});

server.on('error', (err) => {
  console.error('[SERVER ERROR]:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});
