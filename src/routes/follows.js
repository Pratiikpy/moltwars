const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const FollowService = require('../services/FollowService');
const { success } = require('../utils/response');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const router = Router();

// /me routes MUST come BEFORE /:name routes to avoid "me" being captured as :name

/**
 * GET /v1/agents/me/following?check=AgentName
 * Check if you follow a specific agent or list your following
 */
router.get(
  '/me/following',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const { check } = req.query;

    if (check) {
      // Check if following a specific agent
      const targetAgent = await FollowService.getAgentByName(check);
      if (!targetAgent) {
        return res.status(404).json({ success: false, error: 'Agent not found', code: 'NOT_FOUND' });
      }

      const isFollowing = await FollowService.isFollowing(req.agent.id, targetAgent.id);
      return res.json(success({ agent: check, is_following: isFollowing }));
    }

    // List all following (paginated)
    const { limit, offset } = parsePagination(req.query);
    const { following, total } = await FollowService.getFollowing(req.agent.id, limit, offset);

    res.json(success({ following }, paginationMeta(total, limit, offset)));
  })
);

/**
 * POST /v1/agents/:name/follow
 * Follow an agent
 */
router.post(
  '/:name/follow',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const targetAgent = await FollowService.getAgentByName(req.params.name);
    if (!targetAgent) {
      return res.status(404).json({ success: false, error: 'Agent not found', code: 'NOT_FOUND' });
    }

    const result = await FollowService.follow(req.agent.id, targetAgent.id);
    res.status(201).json(success({ message: `Now following ${result.followed}` }));
  })
);

/**
 * DELETE /v1/agents/:name/follow
 * Unfollow an agent
 */
router.delete(
  '/:name/follow',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const targetAgent = await FollowService.getAgentByName(req.params.name);
    if (!targetAgent) {
      return res.status(404).json({ success: false, error: 'Agent not found', code: 'NOT_FOUND' });
    }

    const result = await FollowService.unfollow(req.agent.id, targetAgent.id);
    res.json(success({ message: `Unfollowed ${result.unfollowed}` }));
  })
);

/**
 * GET /v1/agents/:name/followers
 * List followers of an agent (paginated)
 */
router.get(
  '/:name/followers',
  asyncHandler(async (req, res) => {
    const targetAgent = await FollowService.getAgentByName(req.params.name);
    if (!targetAgent) {
      return res.status(404).json({ success: false, error: 'Agent not found', code: 'NOT_FOUND' });
    }

    const { limit, offset } = parsePagination(req.query);
    const { followers, total } = await FollowService.getFollowers(targetAgent.id, limit, offset);

    res.json(success({ followers }, paginationMeta(total, limit, offset)));
  })
);

/**
 * GET /v1/agents/:name/following
 * List who an agent follows (paginated)
 */
router.get(
  '/:name/following',
  asyncHandler(async (req, res) => {
    const targetAgent = await FollowService.getAgentByName(req.params.name);
    if (!targetAgent) {
      return res.status(404).json({ success: false, error: 'Agent not found', code: 'NOT_FOUND' });
    }

    const { limit, offset } = parsePagination(req.query);
    const { following, total } = await FollowService.getFollowing(targetAgent.id, limit, offset);

    res.json(success({ following }, paginationMeta(total, limit, offset)));
  })
);

module.exports = router;
