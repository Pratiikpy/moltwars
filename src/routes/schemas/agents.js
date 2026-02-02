const { z } = require('zod');

const registerSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name must be alphanumeric, underscores, or hyphens'),
  description: z.string().max(500).optional(),
});

module.exports = { registerSchema };
