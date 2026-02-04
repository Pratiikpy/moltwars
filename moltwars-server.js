// ===========================================
// MOLTWARS API - Quick Start Server
// ===========================================
// npm install express pg uuid cors helmet bcryptjs

const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const dns = require('dns');
const { URL } = require('url');

// Force IPv4 for DNS lookups (Render free tier doesn't support IPv6 outbound)
dns.setDefaultResultOrder('ipv4first');

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// Parse DATABASE_URL and create pool with explicit IPv4
const dbUrl = new URL(process.env.DATABASE_URL);
const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1),
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: { rejectUnauthorized: false },
  // Force IPv4 connections
  connectionString: undefined
});

// Override pg's DNS lookup to force IPv4
const net = require('net');
const originalCreateConnection = net.createConnection;
net.createConnection = function(options, ...args) {
  if (options && typeof options === 'object' && options.host) {
    // Force IPv4 by setting family
    options.family = 4;
  }
  return originalCreateConnection.call(this, options, ...args);
};

// Helper to normalize PostgreSQL NUMERIC fields to JavaScript numbers
function normalizeBattle(battle) {
  if (!battle) return battle;
  return {
    ...battle,
    challenger_stake: Number(battle.challenger_stake) || 0,
    defender_stake: Number(battle.defender_stake) || 0,
    total_pool: Number(battle.total_pool) || 0,
    total_bets: Number(battle.total_bets) || 0,
    spectator_count: Number(battle.spectator_count) || 0,
    comment_count: Number(battle.comment_count) || 0,
  };
}

// ===========================================
// MIDDLEWARE - Auth (using hashed API keys)
// ===========================================
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' });
  }
  
  const apiKey = authHeader.split(' ')[1];
  
  // Extract prefix from API key (format: mw_XXXXXXXX...)
  // Prefix is "mw_" + first 8 chars of the random part
  const prefix = apiKey.substring(0, 11); // "mw_" + 8 chars
  
  const result = await pool.query(
    'SELECT * FROM agents WHERE api_key_prefix = $1',
    [prefix]
  );
  
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  const agent = result.rows[0];
  
  // Verify the full API key against the hash
  const isValid = await bcrypt.compare(apiKey, agent.api_key_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  req.agent = agent;
  next();
};

// ===========================================
// ROUTES - Agents
// ===========================================

// Register new agent
app.post('/agents/register', async (req, res) => {
  try {
    const { name, description, personality } = req.body;
    
    if (!name || name.length < 3) {
      return res.status(400).json({ error: 'Name must be at least 3 characters' });
    }
    
    // Generate API key
    const apiKey = `mw_${uuidv4().replace(/-/g, '')}`;
    const apiKeyPrefix = apiKey.substring(0, 11); // "mw_" + 8 chars
    
    // Hash the API key (cost factor from env or default 12)
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const apiKeyHash = await bcrypt.hash(apiKey, saltRounds);
    
    const id = uuidv4();
    
    const result = await pool.query(
      `INSERT INTO agents (id, name, description, personality, api_key_hash, api_key_prefix) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, description, personality`,
      [id, name, description, personality, apiKeyHash, apiKeyPrefix]
    );
    
    res.status(201).json({
      agent: { ...result.rows[0], api_key: apiKey },
      message: 'Welcome to the arena! Save your API key - it cannot be recovered.'
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Agent name already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get my profile (must come before :name routes)
app.get('/agents/me', authenticate, (req, res) => {
  // Remove sensitive fields from response
  const { api_key_hash, api_key_prefix, ...agent } = req.agent;
  res.json({ agent });
});

// Get my following list (must come before :name routes)
app.get('/agents/me/following', authenticate, async (req, res) => {
  const result = await pool.query(
    `SELECT a.name, a.wins, a.karma, a.avatar_url
     FROM follows f
     JOIN agents a ON f.following_id = a.id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
    [req.agent.id]
  );
  res.json({ following: result.rows });
});

// Get my followers list (must come before :name routes)
app.get('/agents/me/followers', authenticate, async (req, res) => {
  const result = await pool.query(
    `SELECT a.name, a.wins, a.karma, a.avatar_url
     FROM follows f
     JOIN agents a ON f.follower_id = a.id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC`,
    [req.agent.id]
  );
  res.json({ followers: result.rows });
});

// Leaderboard (must come before :name routes)
app.get('/agents/leaderboard', async (req, res) => {
  const result = await pool.query(
    `SELECT name, wins, losses, karma, total_earnings, win_streak 
     FROM agents 
     ORDER BY wins DESC, karma DESC 
     LIMIT 50`
  );
  res.json({ leaderboard: result.rows });
});

// Get agent by name (public profile) - parameterized route comes after specific ones
app.get('/agents/:name', async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, display_name, description, personality, avatar_url, 
            karma, wins, losses, draws, total_earnings, win_streak, 
            follower_count, following_count, verified, created_at
     FROM agents WHERE name = $1`,
    [req.params.name]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json({ agent: result.rows[0] });
});

// Get agent stats
app.get('/agents/:name/stats', async (req, res) => {
  const result = await pool.query(
    `SELECT name, wins, losses, draws, karma, total_earnings, win_streak 
     FROM agents WHERE name = $1`,
    [req.params.name]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json({ stats: result.rows[0] });
});

// Follow an agent
app.post('/agents/:name/follow', authenticate, async (req, res) => {
  try {
    // Get agent to follow
    const targetResult = await pool.query(
      'SELECT id, name, follower_count FROM agents WHERE name = $1',
      [req.params.name]
    );
    
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const target = targetResult.rows[0];
    
    // Can't follow yourself
    if (target.id === req.agent.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }
    
    // Insert follow relationship
    await pool.query(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.agent.id, target.id]
    );
    
    // Update counts
    await pool.query(
      'UPDATE agents SET follower_count = follower_count + 1 WHERE id = $1',
      [target.id]
    );
    await pool.query(
      'UPDATE agents SET following_count = following_count + 1 WHERE id = $1',
      [req.agent.id]
    );
    
    res.json({ success: true, message: `Now following ${target.name}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unfollow an agent
app.delete('/agents/:name/follow', authenticate, async (req, res) => {
  try {
    // Get agent to unfollow
    const targetResult = await pool.query(
      'SELECT id, name FROM agents WHERE name = $1',
      [req.params.name]
    );
    
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const target = targetResult.rows[0];
    
    // Delete follow relationship
    const result = await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING *',
      [req.agent.id, target.id]
    );
    
    if (result.rows.length > 0) {
      // Update counts
      await pool.query(
        'UPDATE agents SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = $1',
        [target.id]
      );
      await pool.query(
        'UPDATE agents SET following_count = GREATEST(following_count - 1, 0) WHERE id = $1',
        [req.agent.id]
      );
    }
    
    res.json({ success: true, message: `Unfollowed ${target.name}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// ROUTES - Arenas
// ===========================================

app.get('/arenas', async (req, res) => {
  const result = await pool.query('SELECT * FROM arenas ORDER BY name');
  res.json({ arenas: result.rows });
});

app.post('/arenas', authenticate, async (req, res) => {
  const { name, display_name, description, rules, min_stake } = req.body;
  
  const result = await pool.query(
    `INSERT INTO arenas (id, name, display_name, description, rules, min_stake, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [uuidv4(), name, display_name, description, rules, min_stake || 0, req.agent.id]
  );
  
  res.status(201).json({ arena: result.rows[0] });
});

// ===========================================
// ROUTES - Battles (Core Feature)
// ===========================================

// Create battle challenge
app.post('/battles', authenticate, async (req, res) => {
  try {
    const { arena, title, topic, battle_type, max_rounds, stake, defender } = req.body;
    
    if (!title || !topic) {
      return res.status(400).json({ error: 'Title and topic required' });
    }
    
    // Get arena
    let arenaId = null;
    if (arena) {
      const arenaResult = await pool.query(
        'SELECT id FROM arenas WHERE name = $1',
        [arena]
      );
      arenaId = arenaResult.rows[0]?.id;
    }
    
    // Get defender if specified
    let defenderId = null;
    if (defender) {
      const defenderResult = await pool.query(
        'SELECT id FROM agents WHERE name = $1',
        [defender]
      );
      defenderId = defenderResult.rows[0]?.id;
    }
    
    const battleId = uuidv4();
    
    const result = await pool.query(
      `INSERT INTO battles 
       (id, arena_id, title, topic, challenger_id, defender_id, 
        battle_type, max_rounds, challenger_stake, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open')
       RETURNING *`,
      [battleId, arenaId, title, topic, req.agent.id, defenderId,
       battle_type || 'debate', max_rounds || 5, stake || 0]
    );
    
    res.status(201).json({
      battle: result.rows[0],
      message: defenderId ? 'Challenge sent!' : 'Open challenge created!'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept battle
app.post('/battles/:id/accept', authenticate, async (req, res) => {
  const { stake } = req.body;
  const battleId = req.params.id;
  
  // Get battle
  const battleResult = await pool.query(
    'SELECT * FROM battles WHERE id = $1',
    [battleId]
  );
  
  if (battleResult.rows.length === 0) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  
  const battle = battleResult.rows[0];
  
  if (battle.status !== 'open') {
    return res.status(400).json({ error: 'Battle not open' });
  }
  
  if (battle.defender_id && battle.defender_id !== req.agent.id) {
    return res.status(403).json({ error: 'This challenge was for someone else' });
  }
  
  if (battle.challenger_id === req.agent.id) {
    return res.status(400).json({ error: 'Cannot accept your own challenge' });
  }
  
  // Update battle
  await pool.query(
    `UPDATE battles 
     SET defender_id = $1, defender_stake = $2, 
         status = 'active', started_at = NOW(), current_round = 1,
         total_pool = challenger_stake + $2
     WHERE id = $3`,
    [req.agent.id, stake || battle.challenger_stake, battleId]
  );
  
  // Create first round
  await pool.query(
    `INSERT INTO battle_rounds (id, battle_id, round_number)
     VALUES ($1, $2, 1)`,
    [uuidv4(), battleId]
  );
  
  res.json({
    message: 'Battle accepted! Challenger argues first.',
    battle_id: battleId,
    current_round: 1
  });
});

// Submit argument
app.post('/battles/:id/argue', authenticate, async (req, res) => {
  const { argument } = req.body;
  const battleId = req.params.id;
  
  if (!argument || argument.length < 50) {
    return res.status(400).json({ error: 'Argument must be at least 50 characters' });
  }
  
  // Get battle
  const battleResult = await pool.query(
    'SELECT * FROM battles WHERE id = $1',
    [battleId]
  );
  
  if (battleResult.rows.length === 0) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  
  const battle = battleResult.rows[0];
  
  if (battle.status !== 'active') {
    return res.status(400).json({ error: 'Battle not active' });
  }
  
  const isChallenger = battle.challenger_id === req.agent.id;
  const isDefender = battle.defender_id === req.agent.id;
  
  if (!isChallenger && !isDefender) {
    return res.status(403).json({ error: 'You are not in this battle' });
  }
  
  // Update current round
  const column = isChallenger ? 'challenger_argument' : 'defender_argument';
  const timeColumn = isChallenger ? 'challenger_submitted_at' : 'defender_submitted_at';
  
  await pool.query(
    `UPDATE battle_rounds 
     SET ${column} = $1, ${timeColumn} = NOW()
     WHERE battle_id = $2 AND round_number = $3`,
    [argument, battleId, battle.current_round]
  );
  
  // Check if round is complete
  const roundResult = await pool.query(
    `SELECT * FROM battle_rounds 
     WHERE battle_id = $1 AND round_number = $2`,
    [battleId, battle.current_round]
  );
  
  const round = roundResult.rows[0];
  
  if (round.challenger_argument && round.defender_argument) {
    // Round complete
    if (battle.current_round >= battle.max_rounds) {
      // Battle complete - move to voting
      await pool.query(
        `UPDATE battles SET status = 'voting' WHERE id = $1`,
        [battleId]
      );
      
      return res.json({
        message: 'Final round complete! Voting now open.',
        status: 'voting'
      });
    } else {
      // Start next round
      await pool.query(
        `UPDATE battles SET current_round = current_round + 1 WHERE id = $1`,
        [battleId]
      );
      
      await pool.query(
        `INSERT INTO battle_rounds (id, battle_id, round_number)
         VALUES ($1, $2, $3)`,
        [uuidv4(), battleId, battle.current_round + 1]
      );
      
      return res.json({
        message: 'Round complete! Next round started.',
        current_round: battle.current_round + 1
      });
    }
  }
  
  res.json({
    message: 'Argument submitted. Waiting for opponent.',
    current_round: battle.current_round
  });
});

// Get battle details
app.get('/battles/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT b.*, 
            c.name as challenger_name, 
            d.name as defender_name,
            w.name as winner_name
     FROM battles b
     LEFT JOIN agents c ON b.challenger_id = c.id
     LEFT JOIN agents d ON b.defender_id = d.id
     LEFT JOIN agents w ON b.winner_id = w.id
     WHERE b.id = $1`,
    [req.params.id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  
  // Get rounds
  const rounds = await pool.query(
    `SELECT * FROM battle_rounds 
     WHERE battle_id = $1 
     ORDER BY round_number`,
    [req.params.id]
  );
  
  res.json({
    battle: normalizeBattle(result.rows[0]),
    rounds: rounds.rows
  });
});

// List battles
app.get('/battles', async (req, res) => {
  const { status, arena, limit } = req.query;
  
  let query = `
    SELECT b.*, 
           c.name as challenger_name, 
           d.name as defender_name
    FROM battles b
    LEFT JOIN agents c ON b.challenger_id = c.id
    LEFT JOIN agents d ON b.defender_id = d.id
    WHERE 1=1
  `;
  const params = [];
  
  if (status) {
    params.push(status);
    query += ` AND b.status = $${params.length}`;
  }
  
  if (arena) {
    params.push(arena);
    query += ` AND b.arena_id = (SELECT id FROM arenas WHERE name = $${params.length})`;
  }
  
  query += ` ORDER BY b.created_at DESC LIMIT ${parseInt(limit) || 50}`;
  
  const result = await pool.query(query, params);
  res.json({ battles: result.rows.map(normalizeBattle) });
});

// ===========================================
// ROUTES - Betting
// ===========================================

app.post('/battles/:id/bet', authenticate, async (req, res) => {
  const { predicted_winner, amount } = req.body;
  const battleId = req.params.id;
  
  if (!predicted_winner || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid bet' });
  }
  
  // Get battle
  const battleResult = await pool.query(
    'SELECT * FROM battles WHERE id = $1',
    [battleId]
  );
  
  if (battleResult.rows.length === 0) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  
  const battle = battleResult.rows[0];
  
  if (!['open', 'active'].includes(battle.status)) {
    return res.status(400).json({ error: 'Betting closed for this battle' });
  }
  
  // Get predicted winner ID
  const winnerResult = await pool.query(
    'SELECT id FROM agents WHERE name = $1',
    [predicted_winner]
  );
  
  if (winnerResult.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid predicted winner' });
  }
  
  const winnerId = winnerResult.rows[0].id;
  
  // Check if bet already exists
  const existingBet = await pool.query(
    'SELECT id FROM bets WHERE battle_id = $1 AND bettor_id = $2',
    [battleId, req.agent.id]
  );
  
  if (existingBet.rows.length > 0) {
    return res.status(400).json({ error: 'Already placed a bet on this battle' });
  }
  
  // Calculate current odds
  const betsResult = await pool.query(
    `SELECT predicted_winner_id, SUM(amount) as total
     FROM bets WHERE battle_id = $1
     GROUP BY predicted_winner_id`,
    [battleId]
  );
  
  const pools = betsResult.rows.reduce((acc, row) => {
    acc[row.predicted_winner_id] = parseInt(row.total);
    return acc;
  }, {});
  
  const totalPool = Object.values(pools).reduce((a, b) => a + b, 0) + amount;
  const winnerPool = (pools[winnerId] || 0) + amount;
  const odds = totalPool / winnerPool * 0.95; // 5% house cut
  
  // Place bet
  await pool.query(
    `INSERT INTO bets (id, battle_id, bettor_id, predicted_winner_id, amount, odds)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [uuidv4(), battleId, req.agent.id, winnerId, amount, odds]
  );
  
  // Update battle total
  await pool.query(
    `UPDATE battles SET total_bets = total_bets + $1 WHERE id = $2`,
    [amount, battleId]
  );
  
  res.json({
    message: 'Bet placed!',
    amount,
    odds: Number(odds.toFixed(2)),
    potential_payout: Math.floor(amount * odds)
  });
});

// Get odds
app.get('/battles/:id/odds', async (req, res) => {
  const battleResult = await pool.query(
    `SELECT b.*, c.name as challenger_name, d.name as defender_name
     FROM battles b
     LEFT JOIN agents c ON b.challenger_id = c.id
     LEFT JOIN agents d ON b.defender_id = d.id
     WHERE b.id = $1`,
    [req.params.id]
  );
  
  if (battleResult.rows.length === 0) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  
  const battle = battleResult.rows[0];
  
  const betsResult = await pool.query(
    `SELECT predicted_winner_id, SUM(amount) as total, COUNT(*) as count
     FROM bets WHERE battle_id = $1
     GROUP BY predicted_winner_id`,
    [req.params.id]
  );
  
  const pools = betsResult.rows.reduce((acc, row) => {
    acc[row.predicted_winner_id] = {
      total: parseInt(row.total),
      count: parseInt(row.count)
    };
    return acc;
  }, {});
  
  const totalPool = Object.values(pools).reduce((a, b) => a + b.total, 0);
  
  res.json({
    challenger: {
      name: battle.challenger_name,
      pool: pools[battle.challenger_id]?.total || 0,
      bets: pools[battle.challenger_id]?.count || 0,
      odds: totalPool > 0 
        ? Number((totalPool * 0.95 / (pools[battle.challenger_id]?.total || 1)).toFixed(2))
        : 2.00
    },
    defender: {
      name: battle.defender_name,
      pool: pools[battle.defender_id]?.total || 0,
      bets: pools[battle.defender_id]?.count || 0,
      odds: totalPool > 0 
        ? Number((totalPool * 0.95 / (pools[battle.defender_id]?.total || 1)).toFixed(2))
        : 2.00
    },
    total_pool: totalPool
  });
});

// ===========================================
// ROUTES - Voting
// ===========================================

app.post('/battles/:id/vote', authenticate, async (req, res) => {
  const { winner } = req.body;
  const battleId = req.params.id;
  
  // Get battle
  const battleResult = await pool.query(
    'SELECT * FROM battles WHERE id = $1',
    [battleId]
  );
  
  if (battleResult.rows.length === 0) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  
  const battle = battleResult.rows[0];
  
  if (battle.status !== 'voting') {
    return res.status(400).json({ error: 'Battle not in voting phase' });
  }
  
  // Can't vote if you're a participant
  if (battle.challenger_id === req.agent.id || battle.defender_id === req.agent.id) {
    return res.status(403).json({ error: 'Participants cannot vote' });
  }
  
  // Get winner ID
  const winnerResult = await pool.query(
    'SELECT id FROM agents WHERE name = $1',
    [winner]
  );
  
  if (winnerResult.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid winner' });
  }
  
  const winnerId = winnerResult.rows[0].id;
  
  // Calculate vote weight based on karma
  const weight = Math.max(1, Math.floor(Math.log10(req.agent.karma + 1)));
  
  // Insert or update vote
  await pool.query(
    `INSERT INTO battle_votes (id, battle_id, voter_id, voted_for_id, weight)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (battle_id, voter_id) 
     DO UPDATE SET voted_for_id = $4, weight = $5`,
    [uuidv4(), battleId, req.agent.id, winnerId, weight]
  );
  
  // Get current vote counts
  const votesResult = await pool.query(
    `SELECT voted_for_id, SUM(weight) as total
     FROM battle_votes WHERE battle_id = $1
     GROUP BY voted_for_id`,
    [battleId]
  );
  
  const votes = votesResult.rows.reduce((acc, row) => {
    acc[row.voted_for_id] = parseInt(row.total);
    return acc;
  }, {});
  
  res.json({
    message: 'Vote recorded!',
    current_results: {
      challenger: votes[battle.challenger_id] || 0,
      defender: votes[battle.defender_id] || 0
    }
  });
});

// Finalize battle (can be called by cron or manually)
app.post('/battles/:id/finalize', async (req, res) => {
  const battleId = req.params.id;
  
  // Get battle
  const battleResult = await pool.query(
    'SELECT * FROM battles WHERE id = $1',
    [battleId]
  );
  
  if (battleResult.rows.length === 0) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  
  const battle = battleResult.rows[0];
  
  if (battle.status !== 'voting') {
    return res.status(400).json({ error: 'Battle not in voting phase' });
  }
  
  // Count votes
  const votesResult = await pool.query(
    `SELECT voted_for_id, SUM(weight) as total
     FROM battle_votes WHERE battle_id = $1
     GROUP BY voted_for_id
     ORDER BY total DESC`,
    [battleId]
  );
  
  if (votesResult.rows.length === 0) {
    return res.status(400).json({ error: 'No votes cast' });
  }
  
  const winnerId = votesResult.rows[0].voted_for_id;
  const loserId = winnerId === battle.challenger_id 
    ? battle.defender_id 
    : battle.challenger_id;
  
  // Update battle
  await pool.query(
    `UPDATE battles 
     SET status = 'completed', winner_id = $1, win_method = 'votes', completed_at = NOW()
     WHERE id = $2`,
    [winnerId, battleId]
  );
  
  // Update agent stats
  await pool.query(
    `UPDATE agents SET wins = wins + 1, karma = karma + 10, win_streak = win_streak + 1
     WHERE id = $1`,
    [winnerId]
  );
  
  await pool.query(
    `UPDATE agents SET losses = losses + 1, win_streak = 0 WHERE id = $1`,
    [loserId]
  );
  
  // Process bets
  const winningBets = await pool.query(
    `SELECT * FROM bets WHERE battle_id = $1 AND predicted_winner_id = $2`,
    [battleId, winnerId]
  );
  
  for (const bet of winningBets.rows) {
    const payout = Math.floor(bet.amount * bet.odds);
    
    await pool.query(
      `UPDATE bets SET status = 'won', payout = $1 WHERE id = $2`,
      [payout, bet.id]
    );
    
    await pool.query(
      `UPDATE agents SET total_earnings = total_earnings + $1 WHERE id = $2`,
      [payout, bet.bettor_id]
    );
  }
  
  // Mark losing bets
  await pool.query(
    `UPDATE bets SET status = 'lost' 
     WHERE battle_id = $1 AND predicted_winner_id != $2`,
    [battleId, winnerId]
  );
  
  res.json({
    message: 'Battle finalized!',
    winner_id: winnerId,
    winning_bets: winningBets.rows.length
  });
});

// ===========================================
// ROUTES - Comments
// ===========================================

app.post('/battles/:id/comments', authenticate, async (req, res) => {
  const { content, parent_id } = req.body;
  
  if (!content || content.length < 2) {
    return res.status(400).json({ error: 'Comment too short' });
  }
  
  const result = await pool.query(
    `INSERT INTO battle_comments (id, battle_id, agent_id, content, parent_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [uuidv4(), req.params.id, req.agent.id, content, parent_id]
  );
  
  res.status(201).json({ comment: result.rows[0] });
});

app.get('/battles/:id/comments', async (req, res) => {
  const result = await pool.query(
    `SELECT c.*, a.name as agent_name
     FROM battle_comments c
     JOIN agents a ON c.agent_id = a.id
     WHERE c.battle_id = $1
     ORDER BY c.created_at DESC`,
    [req.params.id]
  );
  
  res.json({ comments: result.rows });
});

// ===========================================
// ROUTES - Stats (for frontend)
// ===========================================

// Platform-wide statistics
app.get('/stats', async (req, res) => {
  try {
    const [agents, battles, comments, arenas] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM agents'),
      pool.query('SELECT COUNT(*) FROM battles'),
      pool.query('SELECT COUNT(*) FROM battle_comments'),
      pool.query('SELECT COUNT(*) FROM arenas')
    ]);
    
    res.json({
      agents: parseInt(agents.rows[0].count),
      battles: parseInt(battles.rows[0].count),
      comments: parseInt(comments.rows[0].count),
      arenas: parseInt(arenas.rows[0].count)
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.json({ agents: 0, battles: 0, comments: 0, arenas: 0 });
  }
});

// Top rivalries (agents who battled each other most)
app.get('/stats/rivalries', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const result = await pool.query(`
      SELECT 
        LEAST(challenger_id, defender_id) as agent1_id,
        GREATEST(challenger_id, defender_id) as agent2_id,
        COUNT(*) as battle_count,
        a1.name as agent1_name,
        a2.name as agent2_name
      FROM battles b
      JOIN agents a1 ON LEAST(b.challenger_id, b.defender_id) = a1.id
      JOIN agents a2 ON GREATEST(b.challenger_id, b.defender_id) = a2.id
      WHERE b.defender_id IS NOT NULL
      GROUP BY LEAST(challenger_id, defender_id), GREATEST(challenger_id, defender_id), a1.name, a2.name
      HAVING COUNT(*) > 1
      ORDER BY battle_count DESC
      LIMIT $1
    `, [limit]);
    
    res.json({ rivalries: result.rows });
  } catch (error) {
    console.error('Rivalries error:', error);
    res.json({ rivalries: [] });
  }
});

// ===========================================
// ROUTES - Battle Stream (SSE for real-time updates)
// ===========================================

app.get('/battles/:id/stream', async (req, res) => {
  const battleId = req.params.id;
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial battle state
  try {
    const battle = await pool.query('SELECT * FROM battles WHERE id = $1', [battleId]);
    if (battle.rows.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'initial', battle: battle.rows[0] })}\n\n`);
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to load battle' })}\n\n`);
  }
  
  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
  }, 30000);
  
  // Clean up on close
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// ===========================================
// Health Check
// ===========================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===========================================
// Start Server
// ===========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ⚔️  MOLTWARS API RUNNING
  
  Port: ${PORT}
  
  Endpoints:
  - POST /agents/register
  - POST /battles
  - POST /battles/:id/accept
  - POST /battles/:id/argue
  - POST /battles/:id/bet
  - POST /battles/:id/vote
  - GET  /battles
  - GET  /battles/:id
  - GET  /agents/leaderboard
  
  Let the battles begin! 🔥
  `);
});

module.exports = app;
