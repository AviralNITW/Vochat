// ============================================
// VoChat - User Controller
// ============================================

const userService = require('./user.service');
const ApiResponse = require('../../utils/ApiResponse');

class UserController {
  /**
   * GET /api/users/search?q=query
   */
  async searchUsers(req, res, next) {
    try {
      const { q, limit } = req.query;
      const users = await userService.searchUsers(q, req.userId, limit);

      ApiResponse.success(res, 200, 'Users found', { users });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:id
   */
  async getUserProfile(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.getUserProfile(id);

      ApiResponse.success(res, 200, 'User profile retrieved', { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/me
   */
  async updateProfile(req, res, next) {
    try {
      const updatedUser = await userService.updateProfile(req.userId, req.body);

      ApiResponse.success(res, 200, 'Profile updated', { user: updatedUser });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/me/stats
   */
  async getUserStats(req, res, next) {
    try {
      const stats = await userService.getUserStats(req.userId);
      ApiResponse.success(res, 200, 'User stats retrieved', { stats });
    } catch (error) {
      next(error);
    }
  }

  async followUser(req, res, next) {
    try {
      const { id } = req.params;
      const follow = await userService.followUser(req.userId, id);
      ApiResponse.success(res, 200, 'User followed successfully', { follow });
    } catch (error) {
      next(error);
    }
  }

  async unfollowUser(req, res, next) {
    try {
      const { id } = req.params;
      await userService.unfollowUser(req.userId, id);
      ApiResponse.success(res, 200, 'User unfollowed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getFollowers(req, res, next) {
    try {
      const { id } = req.params;
      const followers = await userService.getFollowers(id);
      ApiResponse.success(res, 200, 'Followers retrieved successfully', { followers });
    } catch (error) {
      next(error);
    }
  }

  async getFollowing(req, res, next) {
    try {
      const { id } = req.params;
      const following = await userService.getFollowing(id);
      ApiResponse.success(res, 200, 'Following retrieved successfully', { following });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
