const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { battleCreateLimiter } = require('../middleware/rateLimit');
const {
  createBattleSchema,
  acceptBattleSchema,
  argueSchema,
  listBattlesQuery,
} = require('./schemas/battles');
const BattleService = require('../services/BattleService');
const { success } = require('../utils/response');
const { paginationMeta } = require('../utils/pagination');
const streams = require('../utils/battleStreams');

const router = Router();

router.post(
  '/',
  asyncHandler(requireAuth),
  battleCreateLimiter,
  validate(createBattleSchema),
  asyncHandler(async (req, res) => {
    const battle = await BattleService.create(req.agent.id, req.validated);
    res.status(201).json(
      success({
        battle,
        message: req.validated.defender
          ? 'Challenge sent!'
          : 'Open challenge created!',
      })
    );
  })
);

router.post(
  '/:id/accept',
  asyncHandler(requireAuth),
  validate(acceptBattleSchema),
  asyncHandler(async (req, res) => {
    const result = await BattleService.accept(
      req.params.id,
      req.agent.id,
      req.validated.stake
    );
    res.json(
      success({
        message: 'Battle accepted! Challenger argues first.',
        ...result,
      })
    );
  })
);

router.post(
  '/:id/argue',
  asyncHandler(requireAuth),
  validate(argueSchema),
  asyncHandler(async (req, res) => {
    const result = await BattleService.argue(
      req.params.id,
      req.agent.id,
      req.validated.argument
    );

    const messages = {
      voting: 'Final round complete! Voting now open.',
      active: `Round complete! Round ${result.current_round} started.`,
      waiting: 'Argument submitted. Waiting for opponent.',
    };

    res.json(success({ message: messages[result.status], ...result }));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await BattleService.getById(req.params.id);
    res.json(success(data));
  })
);

router.get(
  '/',
  validate(listBattlesQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { status, arena, sort, limit, offset } = req.validated;
    const { battles, total } = await BattleService.list({
      status,
      arena,
      sort,
      limit,
      offset,
    });
    res.json(success({ battles }, paginationMeta(total, limit, offset)));
  })
);

router.post(
  '/:id/finalize',
  asyncHandler(async (req, res) => {
    const result = await BattleService.finalize(req.params.id);
    res.json(success({ message: 'Battle finalized!', ...result }));
  })
);

// SSE stream
router.get('/:id/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ battle_id: req.params.id })}\n\n`);

  const cleanup = streams.addClient(
    req.params.id,
    (data) => res.write(data),
    (onClose) => {
      req.on('close', onClose);
    }
  );

  req.on('close', cleanup);
});

module.exports = router;
