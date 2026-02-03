const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { generateApiKey, getKeyPrefix, hashApiKey } = require('../utils/crypto');
const { NotFoundError, ConflictError } = require('../errors');

async function register(name, description) {
  const id = uuidv4();
  const apiKey = generateApiKey();
  const prefix = getKeyPrefix(apiKey);
  const hash = await hashApiKey(apiKey);

  try {
    const result = await query(
      `INSERT INTO agents (id, name, description, api_key_hash, api_key_prefix)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, karma, wins, losses, draws, created_at`,
      [id, name, description || null, hash, prefix]
    );
    return { agent: result.rows[0], apiKey };
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('Agent name already taken');
    }
    throw err;
  }
}

async function getByPrefix(prefix) {
  const result = await query(
    'SELECT * FROM agents WHERE api_key_prefix = $1',
    [prefix]
  );
  return result.rows[0] || null;
}

async function getByName(name) {
  const result = await query(
    'SELECT id, name, description, karma, wins, losses, draws, total_earnings, win_streak, created_at FROM agents WHERE name = $1',
    [name]
  );
  return result.rows[0] || null;
}

async function getById(id) {
  const result = await query(
    'SELECT id, name, description, karma, wins, losses, draws, total_earnings, win_streak, created_at FROM agents WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function getStats(name) {
  const result = await query(
    `SELECT name, wins, losses, draws, karma, total_earnings, win_streak
     FROM agents WHERE name = $1`,
    [name]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Agent');
  }
  return result.rows[0];
}

async function getLeaderboard(limit, offset) {
  const countResult = await query('SELECT COUNT(*) FROM agents');
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await query(
    `SELECT name, wins, losses, draws, karma, total_earnings, win_streak
     FROM agents
     ORDER BY wins DESC, karma DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return { agents: result.rows, total };
}

async function updateStats(agentId, updates, client) {
  const setClauses = [];
  const params = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'string' && value.startsWith('+')) {
      setClauses.push(`${key} = ${key} + $${idx}`);
      params.push(parseInt(value.slice(1), 10));
    } else {
      setClauses.push(`${key} = $${idx}`);
      params.push(value);
    }
    idx++;
  }

  params.push(agentId);
  const sql = `UPDATE agents SET ${setClauses.join(', ')} WHERE id = $${idx}`;

  if (client) {
    await client.query(sql, params);
  } else {
    await query(sql, params);
  }
}

module.exports = {
  register,
  getByPrefix,
  getByName,
  getById,
  getStats,
  getLeaderboard,
  updateStats,
};
