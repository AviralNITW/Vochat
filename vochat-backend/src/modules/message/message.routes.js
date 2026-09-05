// ============================================
// VoChat - Message Routes
// ============================================

const { Router } = require('express');
const messageController = require('./message.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { messageLimiter } = require('../../middleware/rateLimiter');
const { sendMessageSchema, markPlayedSchema } = require('./message.validation');

const router = Router();

router.use(authenticate);

// Conversations
router.get('/conversations', messageController.getConversationsList);
router.get('/conversation/:friendId', messageController.getConversation);

// Sending & Interacting
router.post('/send', messageLimiter, validate(sendMessageSchema), messageController.sendMessage);
router.post('/play', validate(markPlayedSchema), messageController.markAsPlayed);

module.exports = router;
