// ============================================
// VoChat - Friend Controller
// ============================================

const friendService = require('./friend.service');
const ApiResponse = require('../../utils/ApiResponse');

class FriendController {
  /**
   * POST /api/friends/request
   */
  async sendRequest(req, res, next) {
    try {
      const { friendId } = req.body;
      const request = await friendService.sendRequest(req.userId, friendId);
      ApiResponse.created(res, 'Friend request sent', { request });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/friends/request/:id
   */
  async respondToRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body; // ACCEPTED or DECLINED
      const result = await friendService.respondToRequest(id, req.userId, status);
      ApiResponse.success(res, 200, `Friend request ${status.toLowerCase()}`, { friendship: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/friends/:id
   */
  async removeFriend(req, res, next) {
    try {
      const { id } = req.params; // friendship ID
      await friendService.removeFriend(id, req.userId);
      ApiResponse.success(res, 200, 'Friend removed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/friends
   */
  async getFriends(req, res, next) {
    try {
      const friends = await friendService.getFriends(req.userId);
      ApiResponse.success(res, 200, 'Friends list retrieved', { friends });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/friends/pending
   */
  async getPendingRequests(req, res, next) {
    try {
      const requests = await friendService.getPendingRequests(req.userId);
      ApiResponse.success(res, 200, 'Pending requests retrieved', requests);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FriendController();
