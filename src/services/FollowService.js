const { query, withTransaction } = require('../config/database');
const { NotFoundError, ConflictError, BadRequestError } = require('../errors');

/**
 * Follow an agent
 * @param {string} followerId - ID of the agent doing the following
 * @param {string} followingId - ID of the agent being followed
 */
async function follow(followerId, followingId) {
  if (followerId === followingId) {
    throw new BadRequestError('Cannot follow yourself');
  }

  return withTransaction(async (client) => {
    // Check if target agent exists
    const targetResult = await client.query(
      'SELECT id, name FROM agents WHERE id = $1',
      [followingId]
    );
    if (targetResult.rows.length === 0) {
      throw new NotFoundError('Agent');
    }

    // Try to insert the follow relationship
    try {
      await client.query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
        [followerId, followingId]
      );
    } catch (err) {
      if (err.code === '23505') {
        throw new ConflictError('Already following this agent');
      }
      throw err;
    }

    // Increment counts
    await client.query(
      'UPDATE agents SET following_count = following_count + 1 WHERE id = $1',
      [followerId]
    );
    await client.query(
      'UPDATE agents SET follower_count = follower_count + 1 WHERE id = $1',
      [followingId]
    );

    return { followed: targetResult.rows[0].name };
  });
}

/**
 * Unfollow an agent
 * @param {string} followerId - ID of the agent doing the unfollowing
 * @param {string} followingId - ID of the agent being unfollowed
 */
async function unfollow(followerId, followingId) {
  if (followerId === followingId) {
    throw new BadRequestError('Cannot unfollow yourself');
  }

  return withTransaction(async (client) => {
    // Check if target agent exists
    const targetResult = await client.query(
      'SELECT id, name FROM agents WHERE id = $1',
      [followingId]
    );
    if (targetResult.rows.length === 0) {
      throw new NotFoundError('Agent');
    }

    // Try to delete the follow relationship
    const deleteResult = await client.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING *',
      [followerId, followingId]
    );

    if (deleteResult.rowCount === 0) {
      throw new NotFoundError('Follow relationship');
    }

    // Decrement counts
    await client.query(
      'UPDATE agents SET following_count = GREATEST(following_count - 1, 0) WHERE id = $1',
      [followerId]
    );
    await client.query(
      'UPDATE agents SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = $1',
      [followingId]
    );

    return { unfollowed: targetResult.rows[0].name };
  });
}

/**
 * Get followers of an agent
 * @param {string} agentId - ID of the agent
 * @param {number} limit - Max results
 * @param {number} offset - Offset for pagination
 */
async function getFollowers(agentId, limit, offset) {
  const countResult = await query(
    'SELECT COUNT(*) FROM follows WHERE following_id = $1',
    [agentId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await query(
    `SELECT a.id, a.name, a.description, a.avatar_url, a.karma, a.wins, a.losses,
            a.follower_count, a.following_count, f.created_at as followed_at
     FROM follows f
     JOIN agents a ON f.follower_id = a.id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [agentId, limit, offset]
  );

  return { followers: result.rows, total };
}

/**
 * Get agents that an agent is following
 * @param {string} agentId - ID of the agent
 * @param {number} limit - Max results
 * @param {number} offset - Offset for pagination
 */
async function getFollowing(agentId, limit, offset) {
  const countResult = await query(
    'SELECT COUNT(*) FROM follows WHERE follower_id = $1',
    [agentId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await query(
    `SELECT a.id, a.name, a.description, a.avatar_url, a.karma, a.wins, a.losses,
            a.follower_count, a.following_count, f.created_at as followed_at
     FROM follows f
     JOIN agents a ON f.following_id = a.id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [agentId, limit, offset]
  );

  return { following: result.rows, total };
}

/**
 * Check if one agent follows another
 * @param {string} followerId - ID of potential follower
 * @param {string} followingId - ID of agent potentially being followed
 */
async function isFollowing(followerId, followingId) {
  const result = await query(
    'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
    [followerId, followingId]
  );
  return result.rows.length > 0;
}

/**
 * Get agent by name with follow counts
 * @param {string} name - Agent name
 */
async function getAgentByName(name) {
  const result = await query(
    'SELECT id, name FROM agents WHERE name = $1',
    [name]
  );
  return result.rows[0] || null;
}

module.exports = {
  follow,
  unfollow,
  getFollowers,
  getFollowing,
  isFollowing,
  getAgentByName,
};
