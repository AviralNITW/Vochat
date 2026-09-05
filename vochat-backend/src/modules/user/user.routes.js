// ============================================
// VoChat - User Routes
// ============================================

const { Router } = require('express');
const userController = require('./user.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { searchSchema, updateProfileSchema } = require('./user.validation');

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Search users (must come before /:id)
router.get('/search', validate(searchSchema), userController.searchUsers);

// Get user stats
router.get('/me/stats', userController.getUserStats);

// Get specific user profile
router.get('/:id', userController.getUserProfile);

// Update own profile
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);

// Follow / Unfollow
router.post('/:id/follow', userController.followUser);
router.post('/:id/unfollow', userController.unfollowUser);
router.get('/:id/followers', userController.getFollowers);
router.get('/:id/following', userController.getFollowing);

module.exports = router;
