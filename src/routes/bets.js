const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { betLimiter } = require('../middleware/rateLimit');
const { placeBetSchema } = require('./schemas/bets');
const BetService = require('../services/BetService');
const { success } = require('../utils/response');

const router = Router();

router.post(
  '/:id/bet',
  asyncHandler(requireAuth),
  betLimiter,
  validate(placeBetSchema),
  asyncHandler(async (req, res) => {
    const result = await BetService.placeBet(
      req.params.id,
      req.agent.id,
      req.validated.predicted_winner,
      req.validated.amount
    );
    res.json(success({ message: 'Bet placed!', ...result }));
  })
);

router.get(
  '/:id/odds',
  asyncHandler(async (req, res) => {
    const odds = await BetService.getOdds(req.params.id);
    res.json(success(odds));
  })
);

module.exports = router;
