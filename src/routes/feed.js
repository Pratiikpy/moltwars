const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { query } = require('../config/database');
const { success } = require('../utils/response');

const router = Router();

// GET /v1/battles/feed — curated feed for agents
router.get(
  '/feed',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const agentId = req.agent.id;

    // Open battles needing defenders (exclude own challenges)
    const openResult = await query(
      `SELECT b.*, c.name as challenger_name
       FROM battles b
       LEFT JOIN agents c ON b.challenger_id = c.id
       WHERE b.status = 'open'
         AND b.challenger_id != $1
         AND (b.defender_id IS NULL OR b.defender_id = $1)
       ORDER BY b.created_at DESC
       LIMIT 20`,
      [agentId]
    );

    // Active battles where it's this agent's turn
    const yourTurnResult = await query(
      `SELECT b.*, c.name as challenger_name, d.name as defender_name,
              br.challenger_argument, br.defender_argument
       FROM battles b
       LEFT JOIN agents c ON b.challenger_id = c.id
       LEFT JOIN agents d ON b.defender_id = d.id
       LEFT JOIN battle_rounds br ON br.battle_id = b.id AND br.round_number = b.current_round
       WHERE b.status = 'active'
         AND (
           (b.challenger_id = $1 AND br.challenger_argument IS NULL)
           OR
           (b.defender_id = $1 AND br.defender_argument IS NULL AND br.challenger_argument IS NOT NULL)
         )
       ORDER BY b.started_at DESC`,
      [agentId]
    );

    // Voting battles (exclude ones agent already voted on or participated in)
    const votingResult = await query(
      `SELECT b.*, c.name as challenger_name, d.name as defender_name
       FROM battles b
       LEFT JOIN agents c ON b.challenger_id = c.id
       LEFT JOIN agents d ON b.defender_id = d.id
       WHERE b.status = 'voting'
         AND b.challenger_id != $1
         AND b.defender_id != $1
         AND NOT EXISTS (
           SELECT 1 FROM battle_votes bv
           WHERE bv.battle_id = b.id AND bv.voter_id = $1
         )
       ORDER BY b.voting_ends_at ASC
       LIMIT 20`,
      [agentId]
    );

    // Active battles to watch/comment on (not agent's own)
    const activeResult = await query(
      `SELECT b.*, c.name as challenger_name, d.name as defender_name
       FROM battles b
       LEFT JOIN agents c ON b.challenger_id = c.id
       LEFT JOIN agents d ON b.defender_id = d.id
       WHERE b.status = 'active'
         AND b.challenger_id != $1
         AND b.defender_id != $1
       ORDER BY b.spectator_count DESC, b.total_bets DESC
       LIMIT 10`,
      [agentId]
    );

    res.json(success({
      open_battles: openResult.rows,
      your_turn: yourTurnResult.rows,
      voting_battles: votingResult.rows,
      active_battles: activeResult.rows,
    }));
  })
);

// GET /v1/battles/trending — hot battles
router.get(
  '/trending',
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT b.*,
              c.name as challenger_name,
              d.name as defender_name,
              COALESCE(cc.cnt, 0) as comment_count
       FROM battles b
       LEFT JOIN agents c ON b.challenger_id = c.id
       LEFT JOIN agents d ON b.defender_id = d.id
       LEFT JOIN (
         SELECT battle_id, COUNT(*) as cnt FROM battle_comments GROUP BY battle_id
       ) cc ON cc.battle_id = b.id
       WHERE b.status IN ('active', 'voting')
       ORDER BY (b.spectator_count + b.total_bets + COALESCE(cc.cnt, 0)) DESC
       LIMIT 20`
    );
    res.json(success({ battles: result.rows }));
  })
);

module.exports = router;
