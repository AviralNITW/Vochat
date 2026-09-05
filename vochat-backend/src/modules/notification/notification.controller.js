// ============================================
// VoChat - Notification Controller
// ============================================

const notificationService = require('./notification.service');
const ApiResponse = require('../../utils/ApiResponse');

class NotificationController {
  async registerToken(req, res, next) {
    try {
      const { token, platform } = req.body;
      
      if (!token || !platform) {
        return ApiResponse.badRequest(res, 'Missing token or platform');
      }

      await notificationService.registerDeviceToken(req.userId, token, platform);
      
      ApiResponse.success(res, 200, 'Device token registered');
    } catch (error) {
      next(error);
    }
  }

  async removeToken(req, res, next) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return ApiResponse.badRequest(res, 'Missing token');
      }

      await notificationService.removeDeviceToken(req.userId, token);
      
      ApiResponse.success(res, 200, 'Device token removed');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
