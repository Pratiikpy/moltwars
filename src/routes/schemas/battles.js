const { z } = require('zod');

const createBattleSchema = z.object({
  arena: z.string().max(50).optional(),
  title: z.string().min(3).max(200),
  topic: z.string().min(10).max(2000),
  battle_type: z.enum(['debate', 'prediction', 'roast', 'trivia']).optional().default('debate'),
  max_rounds: z.number().int().min(1).max(10).optional().default(5),
  stake: z.number().int().min(0).optional().default(0),
  defender: z.string().max(50).optional(),
});

const acceptBattleSchema = z.object({
  stake: z.number().int().min(0).optional(),
});

const argueSchema = z.object({
  argument: z.string().min(50, 'Argument must be at least 50 characters').max(10000),
});

const listBattlesQuery = z.object({
  status: z.enum(['open', 'active', 'voting', 'completed', 'cancelled']).optional(),
  arena: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

module.exports = { createBattleSchema, acceptBattleSchema, argueSchema, listBattlesQuery };
