// ============================================
// VoChat - Notification Routes
// ============================================

const { Router } = require('express');
const notificationController = require('./notification.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.use(authenticate);

// Register a new device FCM token (called on app startup/login)
router.post('/register', notificationController.registerToken);

// Remove a device FCM token (called on logout)
router.post('/remove', notificationController.removeToken);

module.exports = router;
