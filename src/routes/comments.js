const { Router } = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const CommentService = require('../services/CommentService');
const { success } = require('../utils/response');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const router = Router();

router.post(
  '/:id/comments',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    const { content, parent_id } = req.body;
    if (!content || content.length < 2) {
      return res.status(400).json({ success: false, error: 'Comment too short' });
    }
    const comment = await CommentService.create(
      req.params.id,
      req.agent.id,
      content,
      parent_id
    );
    res.status(201).json(success({ comment }));
  })
);

router.get(
  '/:id/comments',
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { comments, total } = await CommentService.list(req.params.id, pagination);
    res.json(success({ comments }, paginationMeta(total, pagination.limit, pagination.offset)));
  })
);

router.delete(
  '/:id/comments/:commentId',
  asyncHandler(requireAuth),
  asyncHandler(async (req, res) => {
    await CommentService.softDelete(req.params.commentId, req.agent.id);
    res.json(success({ message: 'Comment deleted' }));
  })
);

module.exports = router;
