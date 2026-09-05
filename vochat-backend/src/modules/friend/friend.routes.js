// ============================================
// VoChat - Friend Routes
// ============================================

const { Router } = require('express');
const friendController = require('./friend.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { addFriendSchema, respondFriendSchema } = require('./friend.validation');

const router = Router();

// All friend routes require authentication
router.use(authenticate);

// List friends and pending requests
router.get('/', friendController.getFriends);
router.get('/pending', friendController.getPendingRequests);

// Send, respond, remove
router.post('/request', validate(addFriendSchema), friendController.sendRequest);
router.patch('/request/:id', validate(respondFriendSchema), friendController.respondToRequest);
router.delete('/:id', friendController.removeFriend);

module.exports = router;
