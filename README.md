# Volleyball Dashboard Scaffold

This repository contains a lightweight Node.js + Express + static frontend scaffold. It keeps the volleyball-themed header, lets you record a lineup for both teams, manually adjust the score (得分／失分)、清除球員、重置比分，並統計接球品質：

- 上方卡片顯示我方整體在 A/B/C/D/F 各等級的累積次數。
- 下方表格列出每位我方球員在 A/B/C/D 各等級的累積次數。
- 當任一方達到 25 分且領先 2 分（或超過 25 分後仍領先 2 分）時，比賽自動結束。

## Requirements

- Node.js 18 or newer
- npm (bundled with Node.js)

## Setup

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` while running `npm run dev`. Use `npm run start` if you do not need auto-reload.

## Project layout

```
volleyball/
├─ public/
│  ├─ index.html   # Header layout, lineup board, score/clear/reset controls, summary table
│  ├─ app.js       # Lineup logic, exclusive grading, scoreboard, grade summaries
│  └─ styles.css   # Styling for header, lineup, scoreboard, and summary table
└─ src/
   ├─ app.js       # Express configuration
   └─ server.js    # Server bootstrap
```

## Suggested next steps

1. Replace the temporary in-memory lineup handling with backend APIs under `src/app.js`.
2. Persist lineup data, grade histories, and score history to a database if you need long-term storage.
3. Expand the UI in `public/` with additional match statistics or reports.
4. Add linting, testing, or typing tools that match your development workflow.