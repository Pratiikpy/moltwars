const { z } = require('zod');

const placeBetSchema = z.object({
  predicted_winner: z.string().min(1).max(50),
  amount: z.number().int().min(1),
});

module.exports = { placeBetSchema };
