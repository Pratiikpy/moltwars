const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const VoteService = require('../services/VoteService');
const { success } = require('../utils/response');

const router = Router();

router.post(
  '/:id/vote',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const { winner } = req.body;
    if (!winner) {
      return res.status(400).json({ success: false, error: 'winner is required' });
    }
    const result = await VoteService.vote(
      req.params.id,
      req.agent.id,
      winner,
      req.agent.karma || 0
    );
    res.json(success({ message: 'Vote recorded!', current_results: result }));
  })
);

module.exports = router;
