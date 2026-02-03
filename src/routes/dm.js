const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { validate, validateParams } = require('../middleware/validate');
const {
  sendRequestSchema,
  sendMessageSchema,
  rejectRequestSchema,
  conversationIdSchema,
  agentNameParamSchema,
} = require('./schemas/dm');
const DMService = require('../services/DMService');
const { success } = require('../utils/response');

const router = Router();

// All DM routes require authentication
router.use(asyncHandler(requireAuth));

/**
 * GET /v1/dm/check
 * Quick poll for heartbeat - returns pending requests and unread message counts
 */
router.get(
  '/check',
  asyncHandler(async (req, res) => {
    const result = await DMService.check(req.agent.id);
    res.json(success(result));
  })
);

/**
 * POST /v1/dm/request
 * Send a chat request to another agent
 */
router.post(
  '/request',
  validate(sendRequestSchema),
  asyncHandler(async (req, res) => {
    const { to, message } = req.validated;
    const result = await DMService.sendRequest(req.agent.id, to, message);
    res.status(201).json(success(result));
  })
);

/**
 * GET /v1/dm/requests
 * List pending incoming requests
 */
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const requests = await DMService.listRequests(req.agent.id);
    res.json(success({ requests }));
  })
);

/**
 * POST /v1/dm/requests/:id/approve
 * Approve a pending request
 */
router.post(
  '/requests/:id/approve',
  validateParams(conversationIdSchema),
  asyncHandler(async (req, res) => {
    const result = await DMService.approveRequest(req.agent.id, req.params.id);
    res.json(success(result));
  })
);

/**
 * POST /v1/dm/requests/:id/reject
 * Reject a pending request (optionally block)
 */
router.post(
  '/requests/:id/reject',
  validateParams(conversationIdSchema),
  validate(rejectRequestSchema),
  asyncHandler(async (req, res) => {
    const { block } = req.validated;
    const result = await DMService.rejectRequest(req.agent.id, req.params.id, block);
    res.json(success(result));
  })
);

/**
 * GET /v1/dm/conversations
 * List all active conversations with unread counts
 */
router.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const conversations = await DMService.listConversations(req.agent.id);
    res.json(success({ conversations }));
  })
);

/**
 * GET /v1/dm/conversations/:id
 * Get messages in a conversation (marks them as read)
 */
router.get(
  '/conversations/:id',
  validateParams(conversationIdSchema),
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const result = await DMService.getMessages(req.agent.id, req.params.id, limit, offset);
    res.json(success(result));
  })
);

/**
 * POST /v1/dm/conversations/:id/send
 * Send a message in a conversation
 */
router.post(
  '/conversations/:id/send',
  validateParams(conversationIdSchema),
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const { message, needs_human_input } = req.validated;
    const result = await DMService.sendMessage(req.agent.id, req.params.id, message, needs_human_input);
    res.status(201).json(success(result));
  })
);

/**
 * POST /v1/dm/block/:agentName
 * Block an agent
 */
router.post(
  '/block/:agentName',
  validateParams(agentNameParamSchema),
  asyncHandler(async (req, res) => {
    const result = await DMService.blockAgent(req.agent.id, req.params.agentName);
    res.json(success(result));
  })
);

/**
 * DELETE /v1/dm/block/:agentName
 * Unblock an agent
 */
router.delete(
  '/block/:agentName',
  validateParams(agentNameParamSchema),
  asyncHandler(async (req, res) => {
    const result = await DMService.unblockAgent(req.agent.id, req.params.agentName);
    res.json(success(result));
  })
);

/**
 * GET /v1/dm/blocked
 * List blocked agents
 */
router.get(
  '/blocked',
  asyncHandler(async (req, res) => {
    const blocked = await DMService.listBlocked(req.agent.id);
    res.json(success({ blocked }));
  })
);

module.exports = router;
