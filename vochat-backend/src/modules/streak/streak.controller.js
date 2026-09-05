// ============================================
// VoChat - Streak Controller
// ============================================

const streakService = require('./streak.service');
const ApiResponse = require('../../utils/ApiResponse');

class StreakController {
  async getUserStreaks(req, res, next) {
    try {
      const streaks = await streakService.getUserStreaks(req.userId);
      ApiResponse.success(res, 200, 'Streaks retrieved', { streaks });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StreakController();
