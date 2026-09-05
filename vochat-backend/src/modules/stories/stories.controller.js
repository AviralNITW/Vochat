// ============================================
// VoChat - Stories Controller
// ============================================

const storiesService = require('./stories.service');
const ApiResponse = require('../../utils/ApiResponse');

class StoriesController {
  async createStory(req, res, next) {
    try {
      const story = await storiesService.createStory(req.userId, req.body);
      ApiResponse.created(res, 'Story published successfully', { story });
    } catch (error) {
      next(error);
    }
  }

  async markViewed(req, res, next) {
    try {
      const { storyId } = req.body;
      const result = await storiesService.markStoryViewed(req.userId, storyId || req.params.id);
      ApiResponse.success(res, 200, 'Story marked as viewed', { result });
    } catch (error) {
      next(error);
    }
  }

  async getFeed(req, res, next) {
    try {
      const result = await storiesService.getFeed(req.userId);
      ApiResponse.success(res, 200, 'Stories feed retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StoriesController();
