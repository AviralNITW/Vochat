// ============================================
// VoChat - Stories Routes
// ============================================

const { Router } = require('express');
const storiesController = require('./stories.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

// Apply authentication middleware to all story operations
router.use(authenticate);

router.post('/create', storiesController.createStory);
router.post('/view', storiesController.markViewed);
router.post('/:id/view', storiesController.markViewed);
router.get('/feed', storiesController.getFeed);

module.exports = router;
