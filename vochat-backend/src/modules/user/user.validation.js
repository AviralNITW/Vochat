// ============================================
// VoChat - User Validation Schemas
// ============================================

const { z } = require('zod');

const searchSchema = {
  query: z.object({
    q: z.string().min(1, 'Search query cannot be empty').max(50),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  }),
};

const updateProfileSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50).optional(),
    avatarUrl: z.string().url('Must be a valid URL').optional().nullable(),
    textBio: z.string().max(100, 'Bio must be under 100 characters').optional().nullable(),
    audioBioUrl: z.string().url('Must be a valid URL').optional().nullable(),
  }),
};

module.exports = { searchSchema, updateProfileSchema };
