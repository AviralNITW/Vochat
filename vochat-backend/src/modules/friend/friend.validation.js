// ============================================
// VoChat - Friend Validation Schemas
// ============================================

const { z } = require('zod');

const addFriendSchema = {
  body: z.object({
    friendId: z.string().uuid('Invalid friend ID format'),
  }),
};

const respondFriendSchema = {
  body: z.object({
    status: z.enum(['ACCEPTED', 'DECLINED']),
  }),
};

module.exports = { addFriendSchema, respondFriendSchema };
