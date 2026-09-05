// ============================================
// VoChat - Posts Routes
// ============================================

const { Router } = require('express');
const postsController = require('./posts.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

// Apply authentication middleware to all post operations
router.use(authenticate);

// Post creation & feed
router.post('/create', postsController.createPost);
router.get('/feed', postsController.getFeed);

// Interactions (Likes, Comments, Bookmarks)
router.post('/:id/like', postsController.toggleLike);
router.post('/:id/bookmark', postsController.toggleBookmark);
router.post('/:id/comment', postsController.addComment);
router.get('/:id/comments', postsController.getComments);

module.exports = router;
