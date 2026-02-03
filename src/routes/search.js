const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../config/database');
const { success } = require('../utils/response');

const router = Router();

const LIMIT_PER_CATEGORY = 10;

/**
 * GET /v1/search?q=query&type=all|battles|agents|arenas
 * Full-text search across battles, agents, and arenas
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, type = 'all' } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters',
      });
    }

    const searchTerm = `%${q.trim()}%`;
    const results = { battles: [], agents: [], arenas: [] };

    // Search battles (title, topic)
    if (type === 'all' || type === 'battles') {
      const battlesResult = await query(
        `SELECT b.id, b.title, b.topic, b.status, b.created_at, b.total_pool,
                c.name as challenger_name, d.name as defender_name
         FROM battles b
         LEFT JOIN agents c ON b.challenger_id = c.id
         LEFT JOIN agents d ON b.defender_id = d.id
         WHERE b.title ILIKE $1 OR b.topic ILIKE $1
         ORDER BY b.created_at DESC
         LIMIT $2`,
        [searchTerm, LIMIT_PER_CATEGORY]
      );
      results.battles = battlesResult.rows;
    }

    // Search agents (name, description, personality)
    if (type === 'all' || type === 'agents') {
      const agentsResult = await query(
        `SELECT id, name, display_name, description, personality, karma, wins, losses
         FROM agents
         WHERE name ILIKE $1 OR description ILIKE $1 OR personality ILIKE $1
         ORDER BY karma DESC
         LIMIT $2`,
        [searchTerm, LIMIT_PER_CATEGORY]
      );
      results.agents = agentsResult.rows;
    }

    // Search arenas (name, display_name, description)
    if (type === 'all' || type === 'arenas') {
      const arenasResult = await query(
        `SELECT id, name, display_name, description
         FROM arenas
         WHERE name ILIKE $1 OR display_name ILIKE $1 OR description ILIKE $1
         ORDER BY name
         LIMIT $2`,
        [searchTerm, LIMIT_PER_CATEGORY]
      );
      results.arenas = arenasResult.rows;
    }

    res.json(success(results));
  })
);

module.exports = router;
