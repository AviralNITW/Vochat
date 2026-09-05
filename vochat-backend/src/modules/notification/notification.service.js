// ============================================
// VoChat - Notification Service
// Sends push notifications via Firebase Cloud Messaging (FCM)
// ============================================

const { getMessaging } = require('../../config/firebase');
const prisma = require('../../config/database');
const logger = require('../../utils/logger');

class NotificationService {
  /**
   * Save a device token for push notifications
   */
  async registerDeviceToken(userId, token, platform) {
    // Upsert the token
    const deviceToken = await prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform, updatedAt: new Date() },
      create: { userId, token, platform },
    });

    return deviceToken;
  }

  /**
   * Remove a device token (logout)
   */
  async removeDeviceToken(userId, token) {
    await prisma.deviceToken.deleteMany({
      where: { userId, token },
    });
  }

  /**
   * Send a push notification to a specific user
   * @param {string} userId - Target user
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Custom key-value payload
   */
  async sendToUser(userId, title, body, data = {}) {
    const messaging = getMessaging();
    if (!messaging) {
      logger.warn(`Firebase FCM disabled. Skipped push to user: ${userId}`);
      return false;
    }

    try {
      // Find user's device tokens
      const tokens = await prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });

      if (tokens.length === 0) return false;

      const deviceTokens = tokens.map(t => t.token);

      const message = {
        notification: { title, body },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK', // For Android/Flutter compat
        },
        tokens: deviceTokens,
      };

      const response = await messaging.sendMulticast(message);
      
      // Cleanup invalid/expired tokens
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (
              errCode === 'messaging/invalid-registration-token' ||
              errCode === 'messaging/registration-token-not-registered'
            ) {
              failedTokens.push(deviceTokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          await prisma.deviceToken.deleteMany({
            where: { token: { in: failedTokens } },
          });
          logger.info(`🧹 Cleaned up ${failedTokens.length} invalid FCM tokens`);
        }
      }

      return true;
    } catch (error) {
      logger.error('FCM Push Error:', error);
      return false;
    }
  }
}

module.exports = new NotificationService();
