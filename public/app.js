const gradeOptions = ['A', 'B', 'C', 'D', 'F'];
const displayedGrades = ['A', 'B', 'C', 'D'];

// 得分方式選項
const scoreTypeOptions = [
  { id: 'attack', label: '攻擊得分' },
  { id: 'serve', label: '發球得分' },
  { id: 'tip', label: '吊球得分' },
  { id: 'block', label: '攔網得分' },
  { id: 'opp_attack_error', label: '對方攻擊失誤' },
  { id: 'opp_serve_error', label: '對方發球失誤' },
  { id: 'opp_defense_error', label: '對方防守失誤' },
  { id: 'opp_foul', label: '對方犯規' },
];

// 失分方式選項
const lossTypeOptions = [
  { id: 'opp_attack', label: '對方攻擊得分' },
  { id: 'opp_serve', label: '對方發球得分' },
  { id: 'opp_tip', label: '對方吊球得分' },
  { id: 'opp_block', label: '對方攔網得分' },
  { id: 'attack_no_in', label: '攻擊失誤(no in)' },
  { id: 'attack_out', label: '攻擊失誤(out ball)' },
  { id: 'serve_error', label: '發球失誤' },
  { id: 'defense_error', label: '防守失誤' },
  { id: 'raise_error', label: '舉球失誤' },
  { id: 'other_error', label: '其他失誤' },
  { id: 'foul', label: '犯規' },
];

// 需要選擇球員的原因 ID（我方球員的得分/失分）
const playerReasonsIds = [
  'attack', 'serve', 'tip', 'block', // 得分原因
  'attack_no_in', 'attack_out', 'serve_error', 'defense_error', 'foul' // 失分原因
];

// 檢查是否需要選擇球員
function needsPlayerSelection(reasonId) {
  return playerReasonsIds.includes(reasonId);
}

// 比賽信息
const matchInfo = {
  school: '',
  date: '',
  match_id: '',
};

const lineupState = {
  ours: [],
  opponent: [],
};

// 統計數據 - 每個球員的評分統計
const stats = {
  ours: {},
  opponent: {},
};

// 得分/失分原因統計
const reasonStats = {
  score: {}, // 得分原因統計
  loss: {},  // 失分原因統計
};

// 每個球員的得分/失分原因統計
const playerReasonStats = {
  ours: {}, // { playerId: { score: {}, loss: {} } }
  opponent: {}, // { playerId: { score: {}, loss: {} } }
};

// 初始化得分/失分原因統計
function initializeReasonStats() {
  reasonStats.score = {};
  reasonStats.loss = {};
  scoreTypeOptions.forEach(option => {
    reasonStats.score[option.id] = 0;
  });
  lossTypeOptions.forEach(option => {
    reasonStats.loss[option.id] = 0;
  });
}
initializeReasonStats();

// 初始化某位球員的得分/失分原因統計
function initializePlayerReasonStats(teamKey, playerId) {
  if (!playerReasonStats[teamKey]) playerReasonStats[teamKey] = {};
  if (!playerReasonStats[teamKey][playerId]) {
    playerReasonStats[teamKey][playerId] = {
      score: {},
      loss: {},
    };
    scoreTypeOptions.forEach(option => {
      playerReasonStats[teamKey][playerId].score[option.id] = 0;
    });
    lossTypeOptions.forEach(option => {
      playerReasonStats[teamKey][playerId].loss[option.id] = 0;
    });
  }
}

let currentRotation = 1; // 當前輪次（1-6）
let currentServer = false;
let hasOurServeInCurrentRotation = false; // 當前輪次是否已有我方發球
let hasOppServeInCurrentRotation = false; // 當前輪次是否已有對方發球

// 輪次發球/接發球統計 - 每輪次記錄發球和接發球的數量
const rotationStats = {
  1: { serve: 0, receive: 0 },
  2: { serve: 0, receive: 0 },
  3: { serve: 0, receive: 0 },
  4: { serve: 0, receive: 0 },
  5: { serve: 0, receive: 0 },
  6: { serve: 0, receive: 0 },
};

let activeGradeSelector = null;
let activeScoreTypeSelector = null;
let isDeleteMode = false;
let matchOver = false;
let hasGradedPlayer = false;
let currentMatchActive = false; // 追蹤目前是否有進行中的比賽

const score = {
  ours: 0,
  opponent: 0,
};

let currentGradedPlayerId = null;
let availablePlayers = []; // 從 API 取得的我方球員

// 比賽信息輸入
const schoolInput = document.getElementById('school-input');
const matchDateInput = document.getElementById('match-date-input');
const matchIdDisplay = document.getElementById('match-id-display');
const ourPlayerSelect = document.getElementById('our-player-select');
const newMatchBtn = document.getElementById('new-match-btn');

const teams = {
  ours: {
    addBtn: document.getElementById('add-our-player-btn'),
    list: document.getElementById('our-player-list'),
  },
  opponent: {
    input: document.getElementById('opponent-player-input'),
    addBtn: document.getElementById('add-opponent-player-btn'),
    list: document.getElementById('opponent-player-list'),
  },
};

const scoreDisplay = document.getElementById('score-display');
const scorePlusBtn = document.getElementById('score-plus-btn');
const scoreMinusBtn = document.getElementById('score-minus-btn');
const clearOpponentPlayersBtn = document.getElementById('clear-opponent-players-btn');
const nextSetBtn = document.getElementById('next-set-btn');
const resetMatchBtn = document.getElementById('reset-match-btn');
const scoreNeutralBtn = document.getElementById('score-neutral-btn');
const matchResult = document.getElementById('match-result');
const setPointsToggle = document.getElementById('set-points-toggle');

// 比賽設定
let maxPointsPerSet = 25; // 默認25分

// ===== 初始化 =====
async function initializeMatch() {
  // 嘗試從 localStorage 恢復比賽 ID
  const localMatchId = localStorage.getItem('currentMatchId');
  
  if (localMatchId) {
    console.log(`[Init] 從 localStorage 恢復比賽 ID: ${localMatchId}`);
    matchInfo.match_id = localMatchId;
    matchIdDisplay.textContent = matchInfo.match_id;
    currentMatchActive = true;
    // 等待載入完成後再繼續
    await loadMatchFromDatabase().catch(err => {
      console.log('[Init] 載入本地比賽失敗:', err);
    });
  } else {
    console.log('[Init] 沒有本地比賽 ID，等待用戶操作...');
    matchIdDisplay.textContent = '等待開始...';
  }
  
  loadAvailablePlayers();
  updateScoreDisplay();
  updateScoreBtnsStyle();
  updateRotationStatsDisplay();
  
  // 設置默認得分上限為25分
  maxPointsPerSet = 25;
  setPointsToggle.checked = true;
}

// 生成短碼作為比賽 ID
function generateMatchId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 從資料庫建立新比賽
async function createMatchInDatabase(school = '') {
  try {
    const res = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchInfo.match_id,
        school: school,
        date: new Date().toISOString().split('T')[0],
      }),
    });
    if (!res.ok) throw new Error('建立比賽失敗');
    await res.json();
    // 更新 URL
    window.history.replaceState({}, '', `?match=${matchInfo.match_id}`);
  } catch (err) {
    console.error('建立比賽失敗:', err);
  }
}

// 從資料庫載入比賽
async function loadMatchFromDatabase() {
  try {
    console.log('載入比賽:', matchInfo.match_id);
    const res = await fetch(`/api/matches/${matchInfo.match_id}`);
    if (!res.ok) {
      throw new Error(`載入失敗: ${res.status}`);
    }
    
    const match = await res.json();
    console.log('從資料庫取得比賽:', match);
    
    matchInfo.school = match.school || '';
    matchInfo.date = match.date || '';
    score.ours = match.our_score || 0;
    score.opponent = match.opponent_score || 0;
    
    // 確保 input 框被更新
    if (schoolInput) {
      schoolInput.value = matchInfo.school;
      console.log('設置學校:', matchInfo.school);
    }
    if (matchDateInput) {
      matchDateInput.value = matchInfo.date;
    }
    updateScoreDisplay();
    
    // 載入上場球員
    await loadLineupFromDatabase();
    // 載入統計數據
    await loadStatsFromDatabase();
    // 載入全局得分/失分原因統計
    await loadReasonStatsFromDatabase();
    // 載入球員得失分原因統計
    await loadPlayerReasonStatsFromDatabase();
    // 載入輪次統計
    await loadRotationStatsFromDatabase();
  } catch (err) {
    console.error('載入比賽失敗:', err);
    throw err; // 重新拋出錯誤讓呼叫者處理
  }
}

// 從資料庫載入上場球員
async function loadLineupFromDatabase() {
  try {
    const res = await fetch(`/api/match-lineups/${matchInfo.match_id}`);
    if (!res.ok) return;
    
    const lineups = await res.json();
    lineupState.ours = [];
    lineupState.opponent = [];
    
    lineups.forEach(lineup => {
      const player = {
        id: lineup.player_id || lineup.player_name,
        name: lineup.player_name,
        grade: null,
      };
      lineupState[lineup.team].push(player);
    });
    
    updatePlayerListsDisplay();
  } catch (err) {
    console.error('載入上場球員失敗:', err);
  }
}

// 從資料庫載入統計
async function loadStatsFromDatabase() {
  try {
    const res = await fetch(`/api/match-stats/${matchInfo.match_id}`);
    if (!res.ok) return;
    
    const matchStats = await res.json();
    stats.ours = {};
    stats.opponent = {};
    
    matchStats.forEach(stat => {
      const teamKey = stat.team;
      if (!stats[teamKey][stat.player_name]) {
        stats[teamKey][stat.player_name] = { A: 0, B: 0, C: 0, D: 0 };
      }
      stats[teamKey][stat.player_name][stat.grade] = stat.count;
    });
    
    updateStatsDisplay();
  } catch (err) {
    console.error('載入統計失敗:', err);
  }
}

// 從資料庫載入球員得失分原因統計
async function loadPlayerReasonStatsFromDatabase() {
  try {
    const res = await fetch(`/api/player-reason-stats/${matchInfo.match_id}`);
    if (!res.ok) return;
    
    const playerStats = await res.json();
    console.log('[LoadPlayerReasonStats] 從資料庫取得資料:', playerStats);
    console.log('[LoadPlayerReasonStats] 上場球員:', lineupState.ours);
    
    // 初始化
    playerReasonStats.ours = {};
    playerReasonStats.opponent = {};
    
    playerStats.forEach(stat => {
      const teamKey = stat.team || 'ours'; // 預設為我方
      if (!playerReasonStats[teamKey]) playerReasonStats[teamKey] = {};
      
      // 嘗試用多種方式匹配球員 ID
      let matchedPlayerId = null;
      
      // 方法 1: 直接用 player_id
      if (stat.player_id) {
        matchedPlayerId = stat.player_id;
      }
      
      // 方法 2: 如果沒有 player_id，嘗試用球員名稱匹配
      if (!matchedPlayerId && stat.player_name) {
        const matchedPlayer = lineupState[teamKey].find(p => p.name === stat.player_name);
        if (matchedPlayer) {
          matchedPlayerId = matchedPlayer.id;
        }
      }
      
      // 如果還是找不到，就跳過
      if (!matchedPlayerId) {
        console.warn(`[LoadPlayerReasonStats] 找不到球員: ${stat.player_name || stat.player_id}`);
        return;
      }
      
      if (!playerReasonStats[teamKey][matchedPlayerId]) {
        playerReasonStats[teamKey][matchedPlayerId] = {
          score: {},
          loss: {},
        };
        scoreTypeOptions.forEach(option => {
          playerReasonStats[teamKey][matchedPlayerId].score[option.id] = 0;
        });
        lossTypeOptions.forEach(option => {
          playerReasonStats[teamKey][matchedPlayerId].loss[option.id] = 0;
        });
      }
      
      if (stat.reason_type === 'score') {
        playerReasonStats[teamKey][matchedPlayerId].score[stat.reason_id] = stat.count;
      } else if (stat.reason_type === 'loss') {
        playerReasonStats[teamKey][matchedPlayerId].loss[stat.reason_id] = stat.count;
      }
    });
    
    console.log('[LoadPlayerReasonStats] 載入後的 playerReasonStats:', playerReasonStats);
    updatePlayerReasonStatsDisplay();
  } catch (err) {
    console.error('載入球員得失分原因統計失敗:', err);
  }
}

// 從資料庫載入全局得分/失分原因統計
async function loadReasonStatsFromDatabase() {
  try {
    const res = await fetch(`/api/reason-stats/${matchInfo.match_id}`);
    if (!res.ok) return;
    
    const data = await res.json();
    console.log('[LoadReasonStats] 從資料庫取得全局得分/失分原因統計:', data);
    
    // 初始化並加載統計
    initializeReasonStats();
    
    if (data.score) {
      Object.entries(data.score).forEach(([reasonId, count]) => {
        reasonStats.score[reasonId] = count;
      });
    }
    
    if (data.loss) {
      Object.entries(data.loss).forEach(([reasonId, count]) => {
        reasonStats.loss[reasonId] = count;
      });
    }
    
    console.log('[LoadReasonStats] 載入後的 reasonStats:', reasonStats);
    updateReasonStatsDisplay();
  } catch (err) {
    console.error('載入全局得分/失分原因統計失敗:', err);
  }
}

// 從資料庫載入輪次統計
async function loadRotationStatsFromDatabase() {
  try {
    const res = await fetch(`/api/match-rotation-stats/${matchInfo.match_id}`);
    if (!res.ok) return;
    
    const data = await res.json();
    console.log('[LoadRotationStats] 從資料庫取得輪次統計:', data);
    
    // 初始化輪次統計
    for (let i = 1; i <= 6; i++) {
      if (data[i]) {
        rotationStats[i].serve = data[i].serve;
        rotationStats[i].receive = data[i].receive;
      }
    }
    
    console.log('[LoadRotationStats] 載入後的 rotationStats:', rotationStats);
    updateRotationStatsDisplay();
  } catch (err) {
    console.error('載入輪次統計失敗:', err);
  }
}

// 載入可用的我方球員
async function loadAvailablePlayers() {
  try {
    const res = await fetch('/api/our-players');
    if (!res.ok) return;
    
    availablePlayers = await res.json();
    updatePlayerSelect();
  } catch (err) {
    console.error('載入球員失敗:', err);
  }
}

// 更新我方球員選單
function updatePlayerSelect() {
  ourPlayerSelect.innerHTML = '<option value="">-- 選擇球員 --</option>';
  availablePlayers.forEach(player => {
    const option = document.createElement('option');
    option.value = player.id;
    option.textContent = player.name;
    ourPlayerSelect.appendChild(option);
  });
}

// ===== 關閉選擇器 =====
function closeActiveSelector() {
  if (activeGradeSelector) {
    const { container, button } = activeGradeSelector;
    container.remove();
    button.classList.remove('player-btn--active');
    activeGradeSelector = null;
  }
}

function closeScoreTypeSelector() {
  if (activeScoreTypeSelector) {
    const { container, button } = activeScoreTypeSelector;
    container.remove();
    button.classList.remove('score-btn--active');
    activeScoreTypeSelector = null;
  }
}

// ===== 等級選擇器 =====
function createGradeSelector(button, teamKey, playerId) {
  closeActiveSelector();

  const selector = document.createElement('div');
  selector.className = 'grade-selector';

  gradeOptions.forEach((grade) => {
    const optionBtn = document.createElement('button');
    optionBtn.type = 'button';
    optionBtn.className = 'grade-option';
    optionBtn.textContent = grade;
    optionBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      setPlayerGrade(teamKey, playerId, grade);
      closeActiveSelector();
    });
    selector.appendChild(optionBtn);
  });

  document.body.appendChild(selector);
  
  const rect = button.getBoundingClientRect();
  selector.style.left = (rect.left + rect.width / 2 - selector.offsetWidth / 2) + 'px';
  selector.style.top = (rect.bottom + 8) + 'px';
  
  button.classList.add('player-btn--active');
  activeGradeSelector = { container: selector, button };
}

function handlePlayerButtonClick(event, teamKey, playerId) {
  event.stopPropagation();
  const button = event.currentTarget;
  if (activeGradeSelector && activeGradeSelector.button === button) {
    closeActiveSelector();
  } else {
    createGradeSelector(button, teamKey, playerId);
  }
}

// ===== 球員管理 =====
function createPlayerButton(teamKey, player) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'player-btn';
  button.textContent = player.name;
  button.dataset.playerId = player.id;
  if (player.grade) {
    button.dataset.grade = player.grade;
  }
  
  button.addEventListener('click', (e) => {
    if (isDeleteMode) {
      deletePlayer(teamKey, player.id);
    } else {
      handlePlayerButtonClick(e, teamKey, player.id);
    }
  });
  
  return button;
}

function updatePlayerListsDisplay() {
  teams.ours.list.innerHTML = '';
  teams.opponent.list.innerHTML = '';

  lineupState.ours.forEach(player => {
    const button = createPlayerButton('ours', player);
    teams.ours.list.appendChild(button);
  });

  lineupState.opponent.forEach(player => {
    const button = createPlayerButton('opponent', player);
    teams.opponent.list.appendChild(button);
  });
}

async function addPlayer(teamKey) {
  // ✅ 檢查比賽 ID 是否存在
  if (!matchInfo.match_id) {
    console.error('[AddPlayer] 錯誤：比賽 ID 未初始化，無法新增球員');
    alert('比賽還未初始化，請稍候片刻後重試');
    return;
  }
  
  let playerName, playerId;
  
  if (teamKey === 'ours') {
    if (!ourPlayerSelect.value) return;
    playerId = ourPlayerSelect.value;
    const selected = availablePlayers.find(p => p.id == playerId);
    playerName = selected.name;
  } else {
    const opponentNumber = teams[teamKey].input.value.trim();
    if (!opponentNumber) return;
    
    // 只用背號作為 ID 和顯示名稱
    playerName = opponentNumber;
    playerId = opponentNumber;
  }

  // 檢查是否已存在
  const exists = lineupState[teamKey].some(p => p.id === playerId);
  if (exists) {
    alert('該球員已在名單中');
    return;
  }

  const player = { id: playerId, name: playerName, grade: null };
  
  lineupState[teamKey].push(player);

  // 為我方球員初始化得分/失分原因統計
  if (teamKey === 'ours') {
    initializePlayerReasonStats('ours', playerId);
  }

  // 存到資料庫
  try {
    const response = await fetch('/api/match-lineups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchInfo.match_id,
        player_id: teamKey === 'ours' ? playerId : null,
        player_name: playerName,
        team: teamKey,
      }),
    });
    
    if (!response.ok) {
      console.error('[AddPlayer] 伺服器錯誤:', response.status, response.statusText);
      throw new Error(`伺服器返回錯誤: ${response.status}`);
    }
    
    console.log('[AddPlayer] 球員已成功保存到資料庫:', { teamKey, playerName, matchId: matchInfo.match_id });
  } catch (err) {
    console.error('[AddPlayer] 新增球員失敗:', err);
    alert('新增球員失敗，請檢查連線或稍後重試');
    // 如果保存失敗，移除本地的球員
    lineupState[teamKey].pop();
    updatePlayerListsDisplay();
    return;
  }

  updatePlayerListsDisplay();
  updatePlayerReasonStatsDisplay();
  
  if (teamKey === 'ours') {
    ourPlayerSelect.value = '';
  } else {
    teams[teamKey].input.value = '';
  }
}

function deletePlayer(teamKey, playerId) {
  const index = lineupState[teamKey].findIndex(p => p.id === playerId);
  if (index === -1) return;

  lineupState[teamKey].splice(index, 1);

  // 從統計中移除
  if (stats[teamKey][playerId]) {
    delete stats[teamKey][playerId];
  }
  
  // 從得分/失分原因統計中移除
  if (playerReasonStats[teamKey] && playerReasonStats[teamKey][playerId]) {
    delete playerReasonStats[teamKey][playerId];
  }

  updatePlayerListsDisplay();
  updateStatsDisplay();
  updatePlayerReasonStatsDisplay();
}

// ===== 統計 =====
function resetStats() {
  stats.ours = {};
  stats.opponent = {};
  playerReasonStats.ours = {};
  playerReasonStats.opponent = {};
  initializeReasonStats();
  updateStatsDisplay();
  updateReasonStatsDisplay();
  updatePlayerReasonStatsDisplay();
}

function updateScoreBtnsStyle() {
  if (hasGradedPlayer) {
    scorePlusBtn.style.opacity = '1';
    scorePlusBtn.style.cursor = 'pointer';
    scorePlusBtn.style.pointerEvents = 'auto';
    scoreMinusBtn.style.opacity = '1';
    scoreMinusBtn.style.cursor = 'pointer';
    scoreMinusBtn.style.pointerEvents = 'auto';
  } else {
    scorePlusBtn.style.opacity = '0.5';
    scorePlusBtn.style.cursor = 'not-allowed';
    scorePlusBtn.style.pointerEvents = 'none';
    scoreMinusBtn.style.opacity = '0.5';
    scoreMinusBtn.style.cursor = 'not-allowed';
    scoreMinusBtn.style.pointerEvents = 'none';
  }
}

function clearAllDisplayedGrades(exceptPlayerId) {
  Object.keys(lineupState).forEach(teamKey => {
    lineupState[teamKey].forEach((player) => {
      if (player.id !== exceptPlayerId) {
        player.grade = null;
      }
    });

    const list = teams[teamKey].list;
    Array.from(list.querySelectorAll('.player-btn')).forEach((button) => {
      if (button.dataset.playerId !== exceptPlayerId) {
        delete button.dataset.grade;
      }
    });
  });
  
  hasGradedPlayer = false;
  updateScoreBtnsStyle();
}

function setPlayerGrade(teamKey, playerId, grade) {
  if (currentGradedPlayerId && currentGradedPlayerId !== playerId) {
    clearAllDisplayedGrades(playerId);
  }

  const player = lineupState[teamKey].find((item) => item.id === playerId);
  if (!player) {
    return;
  }

  player.grade = grade;
  player.lastUpdatedAt = new Date().toISOString();
  
  const button = teams[teamKey].list.querySelector(`[data-player-id="${playerId}"]`);
  if (button) {
    button.dataset.grade = grade;
  }
  
  // 設定 currentServer 標誌
  // 我方球員被評分時設為 false（接發球）
  // 對方球員被評分時設為 true（發球）
  if (teamKey === 'ours') {
    if(grade ==='F'){
      currentServer = true;
    }else{
      currentServer = false;
      console.log(`[Grade] 我方球員 "${player.name}" 被評分為 ${grade}，currentServer = ${currentServer} (接發球)`);
    }
  } else if (teamKey === 'opponent') {
    if(grade ==='F'){
      currentServer = false;
    }else{
      currentServer = true;
      console.log(`[Grade] 對方球員 "${player.name}" 被評分為 ${grade}，currentServer = ${currentServer} (發球)`);
    }
  }
  
  currentGradedPlayerId = playerId;
  hasGradedPlayer = true;
  updateScoreBtnsStyle();
  updateRotationStatsDisplay(); // 立即更新背景色
}

function updateStats(teamKey, playerId, playerName, grade) {
  if (displayedGrades.includes(grade)) {
    if (!stats[teamKey][playerName]) {
      stats[teamKey][playerName] = {
        A: 0, B: 0, C: 0, D: 0
      };
    }
    stats[teamKey][playerName][grade]++;
  }
  updateStatsDisplay();
}

function updateStatsDisplay() {
  const ourStatsTable = document.getElementById('our-stats-table');
  const opponentStatsTable = document.getElementById('opponent-stats-table');

  [
    { key: 'ours', tableBody: ourStatsTable },
    { key: 'opponent', tableBody: opponentStatsTable }
  ].forEach(({ key, tableBody }) => {
    tableBody.innerHTML = '';

    const statsArray = Object.entries(stats[key]);

    if (key === 'opponent') {
      statsArray.sort(([, aStats], [, bStats]) => {
        const aDCount = aStats.D || 0;
        const bDCount = bStats.D || 0;
        if (bDCount !== aDCount) return bDCount - aDCount;
        const aCCount = aStats.C || 0;
        const bCCount = bStats.C || 0;
        return bCCount - aCCount;
      });
    }

    statsArray.forEach(([playerId, playerStats]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${playerId}</td>
        <td>${playerStats.A || 0}</td>
        <td>${playerStats.B || 0}</td>
        <td>${playerStats.C || 0}</td>
        <td>${playerStats.D || 0}</td>
      `;
      tableBody.appendChild(tr);
    });

    if (tableBody.children.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = '<td colspan="5" style="text-align: center; color: #999;">尚無統計數據</td>';
      tableBody.appendChild(emptyRow);
    }
  });
}

// 更新得分/失分原因統計顯示
function updateReasonStatsDisplay() {
  const scoreReasonTable = document.getElementById('score-reason-stats-table');
  const lossReasonTable = document.getElementById('loss-reason-stats-table');

  // 更新得分原因表（綠色）
  scoreReasonTable.innerHTML = '';
  scoreTypeOptions.forEach(option => {
    const count = reasonStats.score[option.id] || 0;
    if (count > 0) {
      const tr = document.createElement('tr');
      tr.style.backgroundColor = '#d1fae5';
      tr.innerHTML = `
        <td>${option.label}</td>
        <td style="color: #059669; font-weight: 600;">${count}</td>
      `;
      scoreReasonTable.appendChild(tr);
    }
  });
  if (scoreReasonTable.children.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="2" style="text-align: center; color: #999;">尚無得分</td>';
    scoreReasonTable.appendChild(emptyRow);
  }

  // 更新失分原因表（紅色）
  lossReasonTable.innerHTML = '';
  lossTypeOptions.forEach(option => {
    const count = reasonStats.loss[option.id] || 0;
    if (count > 0) {
      const tr = document.createElement('tr');
      tr.style.backgroundColor = '#fee2e2';
      tr.innerHTML = `
        <td>${option.label}</td>
        <td style="color: #dc2626; font-weight: 600;">${count}</td>
      `;
      lossReasonTable.appendChild(tr);
    }
  });
  if (lossReasonTable.children.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="2" style="text-align: center; color: #999;">尚無失分</td>';
    lossReasonTable.appendChild(emptyRow);
  }
}

// 更新每位球員的得分/失分原因統計顯示
function updatePlayerReasonStatsDisplay() {
  const container = document.getElementById('player-reason-stats-container');
  container.innerHTML = '';
  
  // 只顯示我方球員
  if (lineupState.ours.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">尚無上場球員</p>';
    return;
  }
  
  // 建立表格
  const table = document.createElement('table');
  table.className = 'player-reason-stats-table';
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  
  // 建立表頭
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.style.borderBottom = '2px solid #d1d5db';
  
  // 第一列：球員名稱
  const nameHeader = document.createElement('th');
  nameHeader.textContent = '球員名稱';
  nameHeader.style.textAlign = 'left';
  nameHeader.style.padding = '10px';
  nameHeader.style.fontWeight = '600';
  nameHeader.style.color = '#1f2933';
  headerRow.appendChild(nameHeader);
  
  // 得分原因欄位
  const scoreReasons = [
    { id: 'attack', label: '攻擊得分' },
    { id: 'serve', label: '發球得分' },
    { id: 'block', label: '攔網得分' },
    { id: 'tip', label: '吊球得分' },
  ];
  scoreReasons.forEach(reason => {
    const th = document.createElement('th');
    th.textContent = reason.label;
    th.style.textAlign = 'center';
    th.style.padding = '10px';
    th.style.fontWeight = '600';
    th.style.color = '#1f2933';
    th.style.backgroundColor = '#d1fae5';
    headerRow.appendChild(th);
  });
  
  // 失分原因欄位
  const lossReasons = [
    { id: 'attack_no_in', label: '攻擊失誤(No In)' },
    { id: 'attack_out', label: '攻擊失誤(Out Ball)' },
    { id: 'serve_error', label: '發球失誤' },
    { id: 'defense_error', label: '防守失誤' },
    { id: 'foul', label: '犯規' },
  ];
  lossReasons.forEach(reason => {
    const th = document.createElement('th');
    th.textContent = reason.label;
    th.style.textAlign = 'center';
    th.style.padding = '10px';
    th.style.fontWeight = '600';
    th.style.color = '#1f2933';
    th.style.backgroundColor = '#fee2e2';
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // 建立表身
  const tbody = document.createElement('tbody');
  let hasData = false;
  
  lineupState.ours.forEach((player, index) => {
    const playerId = player.id;
    initializePlayerReasonStats('ours', playerId);
    const playerStats = playerReasonStats.ours[playerId];
    
    // 確保 playerStats 存在
    if (!playerStats) {
      console.warn(`[UpdateDisplay] 球員 ${playerId} (${player.name}) 的統計不存在`);
      return;
    }
    
    // 檢查是否有任何統計
    const hasScoreStats = Object.values(playerStats.score).some(v => v > 0);
    const hasLossStats = Object.values(playerStats.loss).some(v => v > 0);
    
    if (!hasScoreStats && !hasLossStats) {
      console.log(`[UpdateDisplay] 球員 ${player.name} 沒有統計`);
      return; // 跳過沒有統計的球員
    }
    
    hasData = true;
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #e5e7eb';
    if (index % 2 === 0) {
      row.style.backgroundColor = '#f9fafb';
    }
    
    // 球員名稱
    const nameCell = document.createElement('td');
    nameCell.textContent = player.name;
    nameCell.style.padding = '10px';
    nameCell.style.fontWeight = '500';
    nameCell.style.color = '#1f2933';
    row.appendChild(nameCell);
    
    // 得分原因數據
    scoreReasons.forEach(reason => {
      const cell = document.createElement('td');
      const count = playerStats.score[reason.id] || 0;
      cell.textContent = count > 0 ? count : '';
      cell.style.textAlign = 'center';
      cell.style.padding = '10px';
      cell.style.color = count > 0 ? '#059669' : '#999';
      cell.style.fontWeight = count > 0 ? '600' : '400';
      if (count > 0) {
        cell.style.backgroundColor = '#d1fae5';
      }
      row.appendChild(cell);
    });
    
    // 失分原因數據
    lossReasons.forEach(reason => {
      const cell = document.createElement('td');
      const count = playerStats.loss[reason.id] || 0;
      cell.textContent = count > 0 ? count : '';
      cell.style.textAlign = 'center';
      cell.style.padding = '10px';
      cell.style.color = count > 0 ? '#dc2626' : '#999';
      cell.style.fontWeight = count > 0 ? '600' : '400';
      if (count > 0) {
        cell.style.backgroundColor = '#fee2e2';
      }
      row.appendChild(cell);
    });
    
    tbody.appendChild(row);
  });
  
  if (!hasData) {
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">尚無統計數據</p>';
    return;
  }
  
  table.appendChild(tbody);
  container.appendChild(table);
}

// 更新輪次發球/接發球統計表顯示
function updateRotationStatsDisplay() {
  const rotationStatsTableBody = document.getElementById('rotation-stats-table');
  if (!rotationStatsTableBody) return;
  
  // 取得所有現有的行
  const rows = rotationStatsTableBody.querySelectorAll('tr');
  
  // 更新每一輪次的數據
  for (let i = 1; i <= 6; i++) {
    if (rows[i - 1]) {
      const cells = rows[i - 1].querySelectorAll('td');
      if (cells.length >= 3) {
        cells[0].textContent = i;           // 輪次
        cells[1].textContent = rotationStats[i].serve;     // 發球
        cells[2].textContent = rotationStats[i].receive;   // 接發球
        
        // 清除所有背景色
        cells[0].style.backgroundColor = '';
        cells[1].style.backgroundColor = '';
        cells[2].style.backgroundColor = '';
        
        // 為當前輪次的相應欄位添加背景色
        if (i === currentRotation) {
          cells[0].style.backgroundColor = '#e0e7ff'; // 輪次欄位淺藍色
          
          // 根據 currentServer 標記發球或接發球
          if (currentServer === true) {
            // 當前是發球狀態，標記發球欄位
            cells[1].style.backgroundColor = '#fef08a'; // 發球欄位黃色
          } else if (currentServer === false) {
            // 當前是接發球狀態，標記接發球欄位
            cells[2].style.backgroundColor = '#fca5a5'; // 接發球欄位淺紅色
          }
        }
      }
    }
  }
}

function resetDisplayedGrades() {
  clearAllDisplayedGrades(null);
  closeActiveSelector();
}

// ===== 比賽控制 =====
async function saveMatchToDatabase() {
  try {
    await fetch(`/api/matches/${matchInfo.match_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        our_score: score.ours,
        opponent_score: score.opponent,
        school: matchInfo.school,
        date: matchInfo.date,
        status: matchOver ? 'completed' : 'ongoing',
      }),
    });
  } catch (err) {
    console.error('保存比賽失敗:', err);
  }
}

async function saveStatToDatabase(teamKey, playerName, grade) {
  try {
    const player = lineupState[teamKey].find(p => p.name === playerName);
    // 資料庫只存純名稱（不含學校前綴）
    const dbPlayerName = playerName;
    await fetch('/api/match-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchInfo.match_id,
        player_id: player?.id || null,
        player_name: dbPlayerName,
        team: teamKey,
        grade,
      }),
    });
  } catch (err) {
    console.error('保存統計失敗:', err);
  }
}

function updateScoreDisplay() {
  scoreDisplay.textContent = `${score.ours} : ${score.opponent}`;
}

function resetMatch() {
  // 先儲存目前局的分數到資料庫
  saveMatchToDatabase();
  
  // 清空比賽信息
  matchInfo.school = '';
  matchInfo.date = '';
  matchInfo.our_score = 0;
  matchInfo.opponent_score = 0;
  schoolInput.value = '';
  matchDateInput.value = '';
  
  // 重置分數和狀態
  score.ours = 0;
  score.opponent = 0;
  matchOver = false;
  scorePlusBtn.disabled = false;
  scoreMinusBtn.disabled = false;
  matchResult.textContent = '';
  resetDisplayedGrades();
  currentGradedPlayerId = null;
  hasGradedPlayer = false;
  resetStats();
  updateScoreDisplay();
  updateScoreBtnsStyle();
  
  // 重置輪次統計
  currentRotation = 1;
  currentServer = false;
  hasOurServeInCurrentRotation = false;
  hasOppServeInCurrentRotation = false;
  for (let i = 1; i <= 6; i++) {
    rotationStats[i].serve = 0;
    rotationStats[i].receive = 0;
  }
  updateRotationStatsDisplay();
  
  // 清空上場球員
  lineupState.ours = [];
  lineupState.opponent = [];
  updatePlayerListsDisplay();
  
  // 標記比賽已結束
  currentMatchActive = false;
  localStorage.setItem('matchActive', 'false');
  
  // 重置得分上限為25分
  maxPointsPerSet = 25;
  setPointsToggle.checked = true;
  
  // 儲存空白比賽到資料庫
  saveMatchToDatabase();
  
  // 清空 match_id（結束比賽，等待用戶開始新比賽）
  matchInfo.match_id = '';
  matchIdDisplay.textContent = '等待開始...';
  localStorage.removeItem('currentMatchId');
  localStorage.setItem('matchActive', 'false');
  
  // 更新 URL 移除比賽 ID
  window.history.replaceState({}, '', '/');
}

function nextSet() {
  // 先儲存目前局的分數到資料庫
  saveMatchToDatabase();
  
  // 生成新的比賽 ID 用於下一局
  const newMatchId = generateMatchId();
  matchInfo.match_id = newMatchId;
  matchIdDisplay.textContent = newMatchId;
  localStorage.setItem('currentMatchId', newMatchId);
  
  // 立即建立新局的比賽記錄到資料庫，並傳入當前的學校名稱和日期
  try {
    fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchInfo.match_id,
        school: matchInfo.school,
        date: matchInfo.date,
      }),
    }).then(res => {
      if (!res.ok) throw new Error('建立比賽失敗');
      window.history.replaceState({}, '', `?match=${matchInfo.match_id}`);
    }).catch(err => console.error('建立比賽失敗:', err));
  } catch (err) {
    console.error('建立比賽異常:', err);
  }
  
  // 保存上場球員到新比賽
  lineupState.ours.forEach(player => {
    fetch('/api/match-lineups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchInfo.match_id,
        player_id: player.id,
        player_name: player.name,
        team: 'ours',
      }),
    }).catch(err => console.error('保存我方球員失敗:', err));
  });
  
  lineupState.opponent.forEach(player => {
    fetch('/api/match-lineups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchInfo.match_id,
        player_id: player.id,
        player_name: player.name,
        team: 'opponent',
      }),
    }).catch(err => console.error('保存對方球員失敗:', err));
  });
  
  // 重置分數和狀態（清空顯示但保留比賽信息）
  score.ours = 0;
  score.opponent = 0;
  matchOver = false;
  scorePlusBtn.disabled = false;
  scoreMinusBtn.disabled = false;
  matchResult.textContent = '';
  resetDisplayedGrades();
  currentGradedPlayerId = null;
  hasGradedPlayer = false;
  resetStats();
  updateScoreDisplay();
  updateScoreBtnsStyle();
  
  // 重置輪次統計
  currentRotation = 1;
  currentServer = false;
  hasOurServeInCurrentRotation = false;
  hasOppServeInCurrentRotation = false;
  for (let i = 1; i <= 6; i++) {
    rotationStats[i].serve = 0;
    rotationStats[i].receive = 0;
  }
  updateRotationStatsDisplay();
  
  // 重置得分上限為25分
  maxPointsPerSet = 25;
  setPointsToggle.checked = true;
}

function checkMatchEnd() {
  const diff = Math.abs(score.ours - score.opponent);
  if ((score.ours >= maxPointsPerSet || score.opponent >= maxPointsPerSet) && diff >= 2) {
    matchOver = true;
    currentMatchActive = false;
    localStorage.setItem('matchActive', 'false');
    const winnerLabel = score.ours > score.opponent ? '我方' : '對方';
    matchResult.textContent = `${winnerLabel}以 ${score.ours} : ${score.opponent} 獲勝！`;
    scorePlusBtn.disabled = true;
    scoreMinusBtn.disabled = true;
  }
}

// ===== 得分選擇器 =====
function createScoreTypeSelector(button, callback) {
  closeScoreTypeSelector();

  const selector = document.createElement('div');
  selector.className = 'score-type-selector';

  const options = button === scorePlusBtn ? scoreTypeOptions : lossTypeOptions;

  options.forEach((option) => {
    const optionBtn = document.createElement('button');
    optionBtn.type = 'button';
    optionBtn.className = 'score-type-option';
    optionBtn.textContent = option.label;
    optionBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      callback(option.id);
      closeScoreTypeSelector();
    });
    selector.appendChild(optionBtn);
  });

  document.body.appendChild(selector);

  // 在元素添加到 DOM 後重新計算位置
  const rect = button.getBoundingClientRect();
  const selectorRect = selector.getBoundingClientRect();
  selector.style.left = (rect.left + rect.width / 2 - selectorRect.width / 2) + 'px';
  selector.style.top = (rect.bottom + 8) + 'px';
  
  button.classList.add('score-btn--active');
  activeScoreTypeSelector = { container: selector, button };
}

// 創建球員選擇器 - 用於選擇要記錄得失分原因的球員
function createPlayerSelector(button, reasonType, callback) {
  closeScoreTypeSelector();
  
  const selector = document.createElement('div');
  selector.className = 'player-selector';
  
  // 阻止選擇器本身的點擊事件冒泡
  selector.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  
  // 只顯示我方上場球員
  lineupState.ours.forEach((player) => {
    const optionBtn = document.createElement('button');
    optionBtn.type = 'button';
    optionBtn.className = 'player-option';
    optionBtn.textContent = player.name;
    optionBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      callback(player.id, player.name);
      closePlayerSelector();
    });
    selector.appendChild(optionBtn);
  });
  
  // 如果沒有上場球員，顯示提示信息
  if (lineupState.ours.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.padding = '10px';
    emptyMsg.style.color = '#666';
    emptyMsg.textContent = '沒有上場球員';
    selector.appendChild(emptyMsg);
  }
  
  document.body.appendChild(selector);
  
  // 在元素添加到 DOM 後重新計算位置
  const rect = button.getBoundingClientRect();
  const selectorRect = selector.getBoundingClientRect();
  selector.style.left = (rect.left + rect.width / 2 - selectorRect.width / 2) + 'px';
  selector.style.top = (rect.bottom + 8) + 'px';
  
  button.classList.add('score-btn--active');
}

// 關閉球員選擇器
function closePlayerSelector() {
  const selector = document.querySelector('.player-selector');
  if (selector) {
    selector.remove();
  }
}

// ===== 事件監聽 =====
teams.ours.addBtn.addEventListener('click', () => addPlayer('ours'));
ourPlayerSelect.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') teams.ours.addBtn.click();
});

teams.opponent.addBtn.addEventListener('click', () => addPlayer('opponent'));
teams.opponent.input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') teams.opponent.addBtn.click();
});

scorePlusBtn.addEventListener('click', (event) => {
  event.stopPropagation(); // 阻止事件冒泡到document
  if (matchOver || !hasGradedPlayer) {
    return;
  }
  
  createScoreTypeSelector(scorePlusBtn, (scoreType) => {
    const executeScoreRecord = async (playerId = null, playerName = null) => {
      // 記錄全局得分原因統計
      if (scoreType && reasonStats.score.hasOwnProperty(scoreType)) {
        reasonStats.score[scoreType] += 1;
        console.log('記錄得分原因:', scoreType, '目前數量:', reasonStats.score[scoreType]);
        updateReasonStatsDisplay();
        
        // 保存全局得分原因統計到資料庫
        try {
          await fetch('/api/match-reason-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              match_id: matchInfo.match_id,
              reason_id: scoreType,
              reason_type: 'score',
            }),
          });
        } catch (err) {
          console.error('保存全局得分原因統計失敗:', err);
        }
      }
      
      // 如果是需要記錄球員的原因，才記錄球員統計
      if (needsPlayerSelection(scoreType) && playerId) {
        initializePlayerReasonStats('ours', playerId);
        playerReasonStats.ours[playerId].score[scoreType] += 1;
        console.log('記錄球員得分原因:', playerName, scoreType, '目前數量:', playerReasonStats.ours[playerId].score[scoreType]);
        updatePlayerReasonStatsDisplay();
        
        // 保存到資料庫
        try {
          await fetch('/api/player-reason-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              match_id: matchInfo.match_id,
              player_id: playerId,
              player_name: playerName,
              reason_id: scoreType,
              reason_type: 'score',
            }),
          });
        } catch (err) {
          console.error('保存球員得分原因統計失敗:', err);
        }
      }
      
      Object.keys(lineupState).forEach(teamKey => {
        lineupState[teamKey].forEach(player => {
          if (player.grade) {
            updateStats(teamKey, player.id, player.name, player.grade);
            saveStatToDatabase(teamKey, player.name, player.grade);
          }
        });
      });

      // 記錄輪次統計：currentServer = true 且得分時，發球數 +1
      if (currentServer === true) {
        rotationStats[currentRotation].serve += 1;
        console.log(`[RotationStats] 輪次 ${currentRotation} 發球數 +1，目前發球: ${rotationStats[currentRotation].serve}`);
        // 保存輪次統計到資料庫
        try {
          await fetch('/api/match-rotation-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              match_id: matchInfo.match_id,
              rotation_number: currentRotation,
              serve: rotationStats[currentRotation].serve,
              receive: rotationStats[currentRotation].receive,
            }),
          });
        } catch (err) {
          console.error('[RotationStats] 保存失敗:', err);
        }
        updateRotationStatsDisplay();
      }

      // currentServer = false 且得分時，設定 hasOppServeInCurrentRotation = true
      if (currentServer === false) {
        hasOppServeInCurrentRotation = true;
        currentServer = true; // 得分後輪到我方發球
        updateRotationStatsDisplay(); // 立即更新背景色
        console.log(`[RotationAdvance] 設定 hasOppServeInCurrentRotation = true`);
      }

      // 檢查是否兩個都已記錄，如果是則進入下一輪次
      if (hasOurServeInCurrentRotation && hasOppServeInCurrentRotation) {
        currentRotation = currentRotation === 6 ? 1 : currentRotation + 1;
        hasOurServeInCurrentRotation = false;
        hasOppServeInCurrentRotation = false;
        updateRotationStatsDisplay(); // 立即更新背景色
        console.log(`[RotationAdvance] 進入輪次 ${currentRotation}，重置標誌`);
      }

      score.ours += 1;
      updateScoreDisplay();
      clearAllDisplayedGrades(null);
      closeActiveSelector();
      currentGradedPlayerId = null;
      hasGradedPlayer = false;
      updateScoreBtnsStyle();
      saveMatchToDatabase();
      checkMatchEnd();
    };
    
    // 檢查是否需要選擇球員
    if (needsPlayerSelection(scoreType)) {
      createPlayerSelector(scorePlusBtn, scoreType, executeScoreRecord);
    } else {
      executeScoreRecord();
    }
  });
});

scoreMinusBtn.addEventListener('click', (event) => {
  event.stopPropagation(); // 阻止事件冒泡到document
  if (matchOver || !hasGradedPlayer) {
    return;
  }
  
  createScoreTypeSelector(scoreMinusBtn, (lossType) => {
    const executeLossRecord = async (playerId = null, playerName = null) => {
      // 記錄全局失分原因統計
      if (lossType && reasonStats.loss.hasOwnProperty(lossType)) {
        reasonStats.loss[lossType] += 1;
        console.log('記錄失分原因:', lossType, '目前數量:', reasonStats.loss[lossType]);
        updateReasonStatsDisplay();
        
        // 保存全局失分原因統計到資料庫
        try {
          await fetch('/api/match-reason-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              match_id: matchInfo.match_id,
              reason_id: lossType,
              reason_type: 'loss',
            }),
          });
        } catch (err) {
          console.error('保存全局失分原因統計失敗:', err);
        }
      }
      
      // 如果是需要記錄球員的原因，才記錄球員統計
      if (needsPlayerSelection(lossType) && playerId) {
        initializePlayerReasonStats('ours', playerId);
        playerReasonStats.ours[playerId].loss[lossType] += 1;
        console.log('記錄球員失分原因:', playerName, lossType, '目前數量:', playerReasonStats.ours[playerId].loss[lossType]);
        updatePlayerReasonStatsDisplay();
        
        // 保存到資料庫
        try {
          await fetch('/api/player-reason-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              match_id: matchInfo.match_id,
              player_id: playerId,
              player_name: playerName,
              reason_id: lossType,
              reason_type: 'loss',
            }),
          });
        } catch (err) {
          console.error('保存球員失分原因統計失敗:', err);
        }
      }
      
      Object.keys(lineupState).forEach(teamKey => {
        lineupState[teamKey].forEach(player => {
          if (player.grade) {
            updateStats(teamKey, player.id, player.name, player.grade);
            saveStatToDatabase(teamKey, player.name, player.grade);
          }
        });
      });

      // 記錄輪次統計：currentServer = false 且失分時，接發球數 +1
      if (currentServer === false) {
        rotationStats[currentRotation].receive += 1;
        console.log(`[RotationStats] 輪次 ${currentRotation} 接發球數 +1，目前接發球: ${rotationStats[currentRotation].receive}`);
        // 保存輪次統計到資料庫
        try {
          await fetch('/api/match-rotation-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              match_id: matchInfo.match_id,
              rotation_number: currentRotation,
              serve: rotationStats[currentRotation].serve,
              receive: rotationStats[currentRotation].receive,
            }),
          });
        } catch (err) {
          console.error('[RotationStats] 保存失敗:', err);
        }
        updateRotationStatsDisplay();
      }

      // currentServer = true 且失分時，設定 hasOurServeInCurrentRotation = true
      if (currentServer === true) {
        hasOurServeInCurrentRotation = true;
        currentServer = false; // 失分後輪到對方發球
        updateRotationStatsDisplay(); // 立即更新背景色
        console.log(`[RotationAdvance] 設定 hasOurServeInCurrentRotation = true`);
      }

      // 檢查是否兩個都已記錄，如果是則進入下一輪次
      if (hasOurServeInCurrentRotation && hasOppServeInCurrentRotation) {
        currentRotation = currentRotation === 6 ? 1 : currentRotation + 1;
        hasOurServeInCurrentRotation = false;
        hasOppServeInCurrentRotation = false;
        updateRotationStatsDisplay(); // 立即更新背景色
        console.log(`[RotationAdvance] 進入輪次 ${currentRotation}，重置標誌`);
      }

      score.opponent += 1;
      updateScoreDisplay();
      clearAllDisplayedGrades(null);
      closeActiveSelector();
      currentGradedPlayerId = null;
      hasGradedPlayer = false;
      updateScoreBtnsStyle();
      saveMatchToDatabase();
      checkMatchEnd();
    };
    
    // 檢查是否需要選擇球員
    if (needsPlayerSelection(lossType)) {
      createPlayerSelector(scoreMinusBtn, lossType, executeLossRecord);
    } else {
      executeLossRecord();
    }
  });
});

clearOpponentPlayersBtn.addEventListener('click', () => {
  if (matchOver) return;
  isDeleteMode = !isDeleteMode;
  clearOpponentPlayersBtn.classList.toggle('score-btn--deleting', isDeleteMode);
});

scoreNeutralBtn.addEventListener('click', () => {
  if (matchOver) {
    return;
  }
  
  Object.keys(lineupState).forEach(teamKey => {
    lineupState[teamKey].forEach(player => {
      if (player.grade) {
        updateStats(teamKey, player.id, player.name, player.grade);
        saveStatToDatabase(teamKey, player.name, player.grade);
      }
    });
  });
  
  clearAllDisplayedGrades(null);
  closeActiveSelector();
  currentGradedPlayerId = null;
});

nextSetBtn.addEventListener('click', nextSet);
resetMatchBtn.addEventListener('click', resetMatch);

schoolInput.addEventListener('input', (e) => {
  matchInfo.school = e.target.value;
  
  // 如果用戶輸入了學校名稱且還沒有 match_id，自動開始比賽
  if (e.target.value.trim() && !matchInfo.match_id) {
    console.log('[Auto-Start] 用戶輸入學校名稱，自動開始比賽');
    startNewMatch();
  }
  
  saveMatchToDatabase();
});

// 開始新比賽的函數
async function startNewMatch() {
  if (matchInfo.match_id) {
    console.log('[StartMatch] 已有比賽 ID，無需開始新比賽');
    return;
  }
  
  try {
    // 生成新的 match_id
    matchInfo.match_id = generateMatchId();
    matchIdDisplay.textContent = matchInfo.match_id;
    localStorage.setItem('currentMatchId', matchInfo.match_id);
    localStorage.setItem('matchActive', 'true');
    currentMatchActive = true;
    
    console.log(`[StartMatch] ✓ 開始新比賽: ${matchInfo.match_id}`);
    
    // 建立比賽記錄到資料庫
    await createMatchInDatabase();
    
    // 更新 URL
    window.history.replaceState({}, '', `?match=${matchInfo.match_id}`);
  } catch (err) {
    console.error('[StartMatch] 開始比賽失敗:', err);
  }
}

matchDateInput.addEventListener('change', (e) => {
  matchInfo.date = e.target.value;
  saveMatchToDatabase();
});

setPointsToggle.addEventListener('change', (e) => {
  maxPointsPerSet = e.target.checked ? 25 : 15;
});

// 點擊外面關閉選擇器
document.addEventListener('click', () => {
  closeActiveSelector();
  closeScoreTypeSelector();
  closePlayerSelector();
});

// 新增比賽按鈕事件
newMatchBtn.addEventListener('click', () => {
  // 清除 localStorage 並重新導向到首頁
  // 伺服器會自動建立新的比賽 ID
  localStorage.removeItem('currentMatchId');
  localStorage.removeItem('matchActive');
  window.location.href = '/';
});

// 初始化
console.log('Script loaded, waiting for DOM...');

document.addEventListener('DOMContentLoaded', () => {
  console.log('initializing...', {
    scorePlusBtn,
    scoreMinusBtn,
    matchIdDisplay,
    ourPlayerSelect,
  });
  initializeMatch();
});
