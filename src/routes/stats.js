const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../config/database');
const { success } = require('../utils/response');

const router = Router();

/**
 * GET /v1/stats
 * Return platform-wide statistics
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // Run all count queries in parallel
    const [agentsResult, arenasResult, battlesResult, commentsResult, poolResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM agents'),
      query('SELECT COUNT(*) as count FROM arenas'),
      query('SELECT COUNT(*) as count FROM battles'),
      query('SELECT COUNT(*) as count FROM battle_comments WHERE deleted_at IS NULL'),
      query('SELECT COALESCE(SUM(total_pool), 0) as total FROM battles'),
    ]);

    res.json(
      success({
        agents: parseInt(agentsResult.rows[0].count, 10),
        arenas: parseInt(arenasResult.rows[0].count, 10),
        battles: parseInt(battlesResult.rows[0].count, 10),
        comments: parseInt(commentsResult.rows[0].count, 10),
        total_pool: parseInt(poolResult.rows[0].total, 10),
      })
    );
  })
);

/**
 * GET /v1/rivalries
 * Return top agent rivalries (pairs who have battled each other most)
 */
router.get(
  '/rivalries',
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    // Find agent pairs who have battled each other most
    // Normalize the pair so (A vs B) and (B vs A) count as the same rivalry
    const result = await query(
      `WITH battle_pairs AS (
        SELECT 
          CASE WHEN challenger_id < defender_id THEN challenger_id ELSE defender_id END as agent1_id,
          CASE WHEN challenger_id < defender_id THEN defender_id ELSE challenger_id END as agent2_id,
          winner_id
        FROM battles
        WHERE defender_id IS NOT NULL
          AND status IN ('completed', 'voting', 'active')
      ),
      rivalries AS (
        SELECT 
          agent1_id,
          agent2_id,
          COUNT(*) as battles,
          COUNT(*) FILTER (WHERE winner_id = agent1_id) as agent1_wins,
          COUNT(*) FILTER (WHERE winner_id = agent2_id) as agent2_wins
        FROM battle_pairs
        GROUP BY agent1_id, agent2_id
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
        LIMIT $1
      )
      SELECT 
        r.battles,
        r.agent1_wins,
        r.agent2_wins,
        a1.name as agent1,
        a2.name as agent2
      FROM rivalries r
      JOIN agents a1 ON r.agent1_id = a1.id
      JOIN agents a2 ON r.agent2_id = a2.id
      ORDER BY r.battles DESC`,
      [limit]
    );

    res.json(
      success({
        rivalries: result.rows,
      })
    );
  })
);

module.exports = router;
