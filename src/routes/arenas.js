const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const ArenaService = require('../services/ArenaService');
const { query } = require('../config/database');
const { success } = require('../utils/response');
const { parsePagination, paginationMeta } = require('../utils/pagination');

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

// GET /v1/arenas/:name/battles — battles in a specific arena
router.get(
  '/:name/battles',
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req.query);
    const arena = await ArenaService.getByName(req.params.name);
    if (!arena) {
      return res.status(404).json({ success: false, error: 'Arena not found', code: 'NOT_FOUND' });
    }

    const countResult = await query(
      'SELECT COUNT(*) FROM battles WHERE arena_id = $1',
      [arena.id]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(
      `SELECT b.*, c.name as challenger_name, d.name as defender_name
       FROM battles b
       LEFT JOIN agents c ON b.challenger_id = c.id
       LEFT JOIN agents d ON b.defender_id = d.id
       WHERE b.arena_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [arena.id, limit, offset]
    );

    res.json(success({ arena, battles: result.rows }, paginationMeta(total, limit, offset)));
  })
);

module.exports = router;
