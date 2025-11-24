const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors());
app.use(express.json());

// Supabase 初始化
const supabaseUrl = process.env.SUPABASE_URL || 'https://arymmivalnqfgitdwbdd.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeW1taXZhbG5xZmdpdGR3YmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzkwMTMsImV4cCI6MjA3OTExNTAxM30.hvtHTZG-Yq7HcjdblELzAoFRCjLyfl5SkTdcQ_lwaOI';
let supabase;

try {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[INIT] Supabase client created successfully');
} catch (err) {
  console.error('[INIT] Failed to create Supabase client:', err);
  process.exit(1);
}

const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===== 我方球員 API =====
// 取得所有我方球員
app.get('/api/our-players', async (req, res) => {
  try {
    console.log('[DEBUG] Getting our-players...');
    const { data, error } = await supabase
      .from('our_players')
      .select('id, name')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('[ERROR] Supabase query error:', error);
      throw error;
    }
    
    console.log('[DEBUG] Successfully retrieved players:', data?.length || 0);
    res.json(data || []);
  } catch (err) {
    console.error('[ERROR] /api/our-players failed:', {message: err.message, err});
    res.status(500).json({ error: err.message || 'Internal server error', details: err });
  }
});

// 新增我方球員
app.post('/api/our-players', async (req, res) => {
  try {
    const { name } = req.body;
    const { data, error } = await supabase
      .from('our_players')
      .insert([{ name }])
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 刪除我方球員
app.delete('/api/our-players/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('our_players')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 更新我方球員
app.put('/api/our-players/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { data, error } = await supabase
      .from('our_players')
      .update({ name })
      .eq('id', id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===== 比賽 API =====
// 建立新比賽
app.post('/api/matches', async (req, res) => {
  try {
    const { match_id, school, date } = req.body;
    const { data, error } = await supabase
      .from('matches')
      .insert([{ match_id, school, date, status: 'ongoing' }])
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 取得比賽資訊
app.get('/api/matches/:match_id', async (req, res) => {
  try {
    const { match_id } = req.params;
    console.log('取得比賽:', match_id);
    
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('match_id', match_id)
      .single();
    
    if (error) {
      console.error('查詢比賽錯誤:', error);
      // 如果是 PGRST116 錯誤表示沒有資料
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: '比賽不存在' });
      }
      throw error;
    }
    
    console.log('成功取得比賽:', data);
    res.json(data);
  } catch (err) {
    console.error('API 錯誤:', err);
    res.status(500).json({ error: err.message });
  }
});

// 更新比賽分數
app.put('/api/matches/:match_id', async (req, res) => {
  try {
    const { match_id } = req.params;
    const { our_score, opponent_score, status, school, date } = req.body;
    console.log('更新比賽:', { match_id, our_score, opponent_score, status, school, date });
    
    const { data, error } = await supabase
      .from('matches')
      .update({ 
        our_score, 
        opponent_score, 
        status, 
        school,
        date,
        updated_at: new Date() 
      })
      .eq('match_id', match_id)
      .select();
    
    if (error) {
      console.error('更新比賽錯誤:', error);
      throw error;
    }
    
    console.log('比賽更新成功:', data);
    res.json(data[0]);
  } catch (err) {
    console.error('更新比賽 API 錯誤:', err);
    res.status(500).json({ error: err.message });
  }
});

// 取得所有比賽（歷史）
app.get('/api/matches-history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===== 比賽上場球員 API =====
// 取得比賽的上場球員
app.get('/api/match-lineups/:match_id', async (req, res) => {
  try {
    const { match_id } = req.params;
    const { data, error } = await supabase
      .from('match_lineups')
      .select('*')
      .eq('match_id', match_id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 新增比賽上場球員
app.post('/api/match-lineups', async (req, res) => {
  try {
    const { match_id, player_id, player_name, team } = req.body;
    const { data, error } = await supabase
      .from('match_lineups')
      .insert([{ match_id, player_id, player_name, team }])
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 刪除比賽上場球員
app.delete('/api/match-lineups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('match_lineups')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===== 比賽統計 API =====
// 取得比賽統計
app.get('/api/match-stats/:match_id', async (req, res) => {
  try {
    const { match_id } = req.params;
    const { data, error } = await supabase
      .from('match_stats')
      .select('*')
      .eq('match_id', match_id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 添加或更新統計
app.post('/api/match-stats', async (req, res) => {
  try {
    const { match_id, player_id, player_name, team, grade } = req.body;
    
    // 先查找是否已存在
    const { data: existing, error: queryError } = await supabase
      .from('match_stats')
      .select('*')
      .eq('match_id', match_id)
      .eq('player_name', player_name)
      .eq('team', team)
      .eq('grade', grade);
    
    if (queryError) throw queryError;
    
    if (existing && existing.length > 0) {
      // 更新計數
      const { data, error } = await supabase
        .from('match_stats')
        .update({ count: existing[0].count + 1 })
        .eq('id', existing[0].id)
        .select();
      if (error) throw error;
      return res.json(data[0]);
    }
    
    // 新增統計
    const { data, error } = await supabase
      .from('match_stats')
      .insert([{ match_id, player_id, player_name, team, grade, count: 1 }])
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===== 球員得失分原因統計 API =====
// 取得球員得失分原因統計
app.get('/api/player-reason-stats/:match_id', async (req, res) => {
  try {
    const { match_id } = req.params;
    const { data, error } = await supabase
      .from('player_reason_stats')
      .select('*')
      .eq('match_id', match_id);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 保存球員得失分原因統計
app.post('/api/player-reason-stats', async (req, res) => {
  try {
    const { match_id, player_id, player_name, reason_id, reason_type } = req.body;
    
    // 先查找是否已存在
    const { data: existing, error: queryError } = await supabase
      .from('player_reason_stats')
      .select('*')
      .eq('match_id', match_id)
      .eq('player_id', player_id)
      .eq('reason_id', reason_id)
      .eq('reason_type', reason_type)
      .single();
    
    if (existing) {
      // 更新計數
      const { data, error } = await supabase
        .from('player_reason_stats')
        .update({ count: existing.count + 1 })
        .eq('id', existing.id)
        .select();
      if (error) throw error;
      return res.json(data[0]);
    }
    
    // 新增統計
    const { data, error } = await supabase
      .from('player_reason_stats')
      .insert([{ 
        match_id, 
        player_id, 
        player_name, 
        reason_id, 
        reason_type, 
        count: 1 
      }])
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 刪除比賽及其相關數據
app.delete('/api/matches/:match_id', async (req, res) => {
  try {
    const { match_id } = req.params;
    console.log('收到刪除請求，比賽 ID:', match_id);
    
    // 刪除該比賽的統計數據
    console.log('正在刪除統計數據...');
    const { error: statsError } = await supabase
      .from('match_stats')
      .delete()
      .eq('match_id', match_id);
    
    if (statsError) {
      console.error('刪除統計數據失敗:', statsError);
      throw statsError;
    }
    console.log('統計數據刪除成功');
    
    // 刪除該比賽的球員得失分原因統計
    console.log('正在刪除球員得失分原因統計...');
    const { error: playerReasonStatsError } = await supabase
      .from('player_reason_stats')
      .delete()
      .eq('match_id', match_id);
    
    if (playerReasonStatsError) {
      console.error('刪除球員得失分原因統計失敗:', playerReasonStatsError);
      throw playerReasonStatsError;
    }
    console.log('球員得失分原因統計刪除成功');
    
    // 刪除該比賽的上場球員
    console.log('正在刪除上場球員...');
    const { error: lineupsError } = await supabase
      .from('match_lineups')
      .delete()
      .eq('match_id', match_id);
    
    if (lineupsError) {
      console.error('刪除上場球員失敗:', lineupsError);
      throw lineupsError;
    }
    console.log('上場球員刪除成功');
    
    // 刪除比賽本身
    console.log('正在刪除比賽...');
    const { error: matchError } = await supabase
      .from('matches')
      .delete()
      .eq('match_id', match_id);
    
    if (matchError) {
      console.error('刪除比賽失敗:', matchError);
      throw matchError;
    }
    console.log('比賽刪除成功');
    
    res.json({ message: '比賽已成功刪除' });
  } catch (err) {
    console.error('刪除操作出錯:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== 比賽狀態管理 (Polling) =====
// 內存存儲 - 比賽狀態
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
    const idleSeconds = Math.round((now - lastActivityTime) / 1000);
    console.log(`[Polling] 復用現有比賽: ${activeMatchId}, 距上次活動 ${idleSeconds} 秒`);
  }
  
  return activeMatchId;
}

// 更新最後活動時間
function updateActivityTime() {
  const oldTime = lastActivityTime;
  lastActivityTime = Date.now();
  const idleSeconds = oldTime ? Math.round((lastActivityTime - oldTime) / 1000) : 0;
  console.log(`[Polling] 活動時間已更新，比賽 ${activeMatchId} 保活中（距上次更新 ${idleSeconds} 秒）`);
}

// API 端點：取得活躍比賽 ID
app.get('/api/active-match', async (req, res) => {
  try {
    const matchId = getActiveMatch();
    
    // 檢查此比賽在資料庫中是否存在
    const { data: existingMatch, error: queryError } = await supabase
      .from('matches')
      .select('match_id')
      .eq('match_id', matchId)
      .single();
    
    // 如果比賽不存在，建立新的空比賽記錄
    if (!existingMatch && (!queryError || queryError.code === 'PGRST116')) {
      console.log(`[API] 比賽 ${matchId} 在資料庫中不存在，建立新記錄`);
      const { error: insertError } = await supabase
        .from('matches')
        .insert([{
          match_id: matchId,
          school: '',
          date: new Date().toISOString().split('T')[0],
          our_score: 0,
          opponent_score: 0,
          status: 'ongoing'
        }]);
      
      if (insertError) {
        console.error(`[API] 建立比賽記錄失敗:`, insertError);
      } else {
        console.log(`[API] 比賽記錄已建立: ${matchId}`);
      }
    }
    
    // 每次有客戶端檢查時，更新活動時間（代表有人在用這個比賽）
    updateActivityTime();
    console.log(`[API] GET /api/active-match -> 返回比賽 ID: ${matchId}`);
    res.json({ match_id: matchId });
  } catch (err) {
    console.error('[API] GET /api/active-match 失敗:', err);
    res.status(500).json({ error: err.message });
  }
});

// API 端點：報告活動（客戶端定期調用來保持連線）
app.post('/api/report-activity', (req, res) => {
  updateActivityTime();
  console.log(`[API] POST /api/report-activity -> 活動已報告`);
  res.json({ success: true });
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else if (req.path.startsWith('/api/')) {
    res.status(404).json({ message: 'API endpoint not found' });
  } else {
    next();
  }
});

module.exports = app;
