const PORT = process.env.PORT || 3000;
const app = require('./app');

app.listen(PORT, () => {
  console.log(`Volleyball stats server running at http://localhost:${PORT}`);
});
