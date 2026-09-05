// ============================================
// VoChat - Posts Controller
// ============================================

const postsService = require('./posts.service');
const ApiResponse = require('../../utils/ApiResponse');

class PostsController {
  async createPost(req, res, next) {
    try {
      const post = await postsService.createPost(req.userId, req.body);
      ApiResponse.created(res, 'Post published successfully', { post });
    } catch (error) {
      next(error);
    }
  }

  async getFeed(req, res, next) {
    try {
      const posts = await postsService.getFeed(req.userId);
      ApiResponse.success(res, 200, 'Feed retrieved successfully', { posts });
    } catch (error) {
      next(error);
    }
  }

  async toggleLike(req, res, next) {
    try {
      const { id } = req.params;
      const result = await postsService.toggleLike(req.userId, id);
      ApiResponse.success(res, 200, result.liked ? 'Post liked' : 'Post unliked', result);
    } catch (error) {
      next(error);
    }
  }

  async toggleBookmark(req, res, next) {
    try {
      const { id } = req.params;
      const result = await postsService.toggleBookmark(req.userId, id);
      ApiResponse.success(res, 200, result.bookmarked ? 'Post bookmarked' : 'Post unbookmarked', result);
    } catch (error) {
      next(error);
    }
  }

  async addComment(req, res, next) {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const comment = await postsService.addComment(req.userId, id, text);
      ApiResponse.created(res, 'Comment added successfully', { comment });
    } catch (error) {
      next(error);
    }
  }

  async getComments(req, res, next) {
    try {
      const { id } = req.params;
      const comments = await postsService.getComments(id);
      ApiResponse.success(res, 200, 'Comments retrieved successfully', { comments });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PostsController();
