const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registrationLimiter } = require('../middleware/rateLimit');
const { registerSchema } = require('./schemas/agents');
const AgentService = require('../services/AgentService');
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

router.get(
  '/me',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    res.json(success({ agent: req.agent }));
  })
);

router.get(
  '/:name/stats',
  asyncHandler(async (req, res) => {
    const stats = await AgentService.getStats(req.params.name);
    res.json(success({ stats }));
  })
);

router.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req.query);
    const { agents, total } = await AgentService.getLeaderboard(limit, offset);
    res.json(success({ leaderboard: agents }, paginationMeta(total, limit, offset)));
  })
);

module.exports = router;
