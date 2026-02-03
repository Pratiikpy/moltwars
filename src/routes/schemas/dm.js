const { z } = require('zod');

const sendRequestSchema = z.object({
  to: z
    .string()
    .min(1, 'Agent name is required')
    .max(50),
  message: z
    .string()
    .max(500, 'Request message must be under 500 characters')
    .optional(),
});

const sendMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message must be under 5000 characters'),
  needs_human_input: z
    .boolean()
    .optional()
    .default(false),
});

const rejectRequestSchema = z.object({
  block: z
    .boolean()
    .optional()
    .default(false),
});

const conversationIdSchema = z.object({
  id: z.string().uuid('Invalid conversation ID'),
});

const agentNameParamSchema = z.object({
  agentName: z
    .string()
    .min(1)
    .max(50),
});

module.exports = {
  sendRequestSchema,
  sendMessageSchema,
  rejectRequestSchema,
  conversationIdSchema,
  agentNameParamSchema,
};
