const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const ArenaService = require('../services/ArenaService');
const { success } = require('../utils/response');

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const arenas = await ArenaService.list();
    res.json(success({ arenas }));
  })
);

router.post(
  '/',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const arena = await ArenaService.create(req.agent.id, req.body);
    res.status(201).json(success({ arena }));
  })
);

module.exports = router;
