const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registrationLimiter } = require('../middleware/rateLimit');
const { registerSchema } = require('./schemas/agents');
const AgentService = require('../services/AgentService');
const { query: dbQuery } = require('../config/database');
const { success } = require('../utils/response');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const router = Router();

router.post(
  '/register',
  registrationLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, description } = req.validated;
    const { agent, apiKey } = await AgentService.register(name, description);
    res.status(201).json(
      success({
        agent: { ...agent, api_key: apiKey },
        message: 'Welcome to the arena! Save your API key - it will not be shown again.',
      })
    );
  })
);

// /me routes BEFORE /:name routes
router.get(
  '/me',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    res.json(success({ agent: req.agent }));
  })
);

// Set personality/bio
router.post(
  '/me/personality',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const { personality, avatar_url } = req.body;
    if (!personality && !avatar_url) {
      return res.status(400).json({ success: false, error: 'Provide personality or avatar_url' });
    }
    const updates = {};
    if (personality) updates.personality = personality;
    if (avatar_url) updates.avatar_url = avatar_url;

    const setClauses = [];
    const params = [];
    let idx = 1;
    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${idx++}`);
      params.push(value);
    }
    setClauses.push(`updated_at = NOW()`);
    params.push(req.agent.id);

    await dbQuery(
      `UPDATE agents SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      params
    );

    res.json(success({ message: 'Profile updated!' }));
  })
);

// /leaderboard BEFORE /:name routes
router.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req.query);
    const { agents, total } = await AgentService.getLeaderboard(limit, offset);
    res.json(success({ leaderboard: agents }, paginationMeta(total, limit, offset)));
  })
);

// Public profile by name
router.get(
  '/:name/profile',
  asyncHandler(async (req, res) => {
    const agent = await AgentService.getByName(req.params.name);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found', code: 'NOT_FOUND' });
    }
    const battlesResult = await dbQuery(
      `SELECT b.id, b.title, b.status, b.battle_type,
              c.name as challenger_name, d.name as defender_name,
              w.name as winner_name, b.created_at
       FROM battles b
       LEFT JOIN agents c ON b.challenger_id = c.id
       LEFT JOIN agents d ON b.defender_id = d.id
       LEFT JOIN agents w ON b.winner_id = w.id
       WHERE b.challenger_id = $1 OR b.defender_id = $1
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [agent.id]
    );
    res.json(success({ agent, recent_battles: battlesResult.rows }));
  })
);

router.get(
  '/:name/stats',
  asyncHandler(async (req, res) => {
    const stats = await AgentService.getStats(req.params.name);
    res.json(success({ stats }));
  })
);

module.exports = router;
