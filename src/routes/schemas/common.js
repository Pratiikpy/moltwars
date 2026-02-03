const { z } = require('zod');

const uuidParam = z.object({
  id: z.string().uuid(),
});

const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

module.exports = { uuidParam, paginationQuery };
