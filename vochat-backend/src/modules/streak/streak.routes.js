// ============================================
// VoChat - Streak Routes
// ============================================

const { Router } = require('express');
const streakController = require('./streak.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.use(authenticate);

// Get all streaks for current user
router.get('/', streakController.getUserStreaks);

module.exports = router;
