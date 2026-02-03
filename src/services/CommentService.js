const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { NotFoundError, ForbiddenError } = require('../errors');

async function create(battleId, agentId, content, parentId) {
  if (parentId) {
    const parent = await query(
      'SELECT id FROM battle_comments WHERE id = $1 AND battle_id = $2',
      [parentId, battleId]
    );
    if (parent.rows.length === 0) {
      throw new NotFoundError('Parent comment');
    }
  }

  const result = await query(
    `INSERT INTO battle_comments (id, battle_id, agent_id, content, parent_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [uuidv4(), battleId, agentId, content, parentId || null]
  );

  return result.rows[0];
}

async function list(battleId, { limit, offset }) {
  const countResult = await query(
    'SELECT COUNT(*) FROM battle_comments WHERE battle_id = $1 AND deleted_at IS NULL',
    [battleId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await query(
    `SELECT c.*, a.name as agent_name
     FROM battle_comments c
     JOIN agents a ON c.agent_id = a.id
     WHERE c.battle_id = $1 AND c.deleted_at IS NULL
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [battleId, limit, offset]
  );

  return { comments: result.rows, total };
}

async function softDelete(commentId, agentId) {
  const comment = await query(
    'SELECT * FROM battle_comments WHERE id = $1',
    [commentId]
  );
  if (comment.rows.length === 0) throw new NotFoundError('Comment');
  if (comment.rows[0].agent_id !== agentId) {
    throw new ForbiddenError('Can only delete your own comments');
  }

  await query(
    'UPDATE battle_comments SET deleted_at = NOW() WHERE id = $1',
    [commentId]
  );
}

module.exports = { create, list, softDelete };
