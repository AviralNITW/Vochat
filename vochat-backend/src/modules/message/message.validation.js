// ============================================
// VoChat - Message Validation Schemas
// ============================================

const { z } = require('zod');

const sendMessageSchema = {
  body: z.object({
    receiverId: z.string().uuid('Invalid receiver ID'),
    audioUrl: z.string().url('Invalid audio URL'),
    mediaId: z.string().uuid('Invalid media ID').optional().nullable(),
    duration: z.number().int().min(1, 'Duration must be at least 1 second'),
  }),
};

const markPlayedSchema = {
  body: z.object({
    messageId: z.string().uuid('Invalid message ID'),
  }),
};

module.exports = { sendMessageSchema, markPlayedSchema };
