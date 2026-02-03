const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { ConflictError } = require('../errors');

async function list() {
  const result = await query('SELECT * FROM arenas ORDER BY name');
  return result.rows;
}

async function getByName(name) {
  const result = await query('SELECT * FROM arenas WHERE name = $1', [name]);
  return result.rows[0] || null;
}

async function create(agentId, data) {
  const { name, display_name, description, rules, min_stake } = data;
  try {
    const result = await query(
      `INSERT INTO arenas (id, name, display_name, description, rules, min_stake, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [uuidv4(), name, display_name, description || null, rules || null, min_stake || 0, agentId]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('Arena name already taken');
    }
    throw err;
  }
}

module.exports = { list, getByName, create };
