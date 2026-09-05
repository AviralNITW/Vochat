// ============================================
// VoChat - Cron Background Jobs
// Handles ephemeral message cleanup and streak resets
// ============================================

const cron = require('node-cron');
const prisma = require('../config/database');
const config = require('../config/env');
const logger = require('./logger');

function initCronJobs() {
  // 1. Ephemeral Message Cleanup
  // Runs based on interval in .env (default: every 5 minutes)
  cron.schedule(config.cleanupCronInterval, async () => {
    try {
      const now = new Date();
      
      const { count } = await prisma.message.deleteMany({
        where: {
          expiresAt: { lt: now }
        }
      });
      
      if (count > 0) {
        logger.info(`🧹 Cron: Cleaned up ${count} expired messages`);
      }
    } catch (error) {
      logger.error('Cron Error (Message Cleanup):', error);
    }
  });

  // 2. Daily Streak Check
  // Runs every day at midnight to reset broken streaks
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
      
      const { count } = await prisma.streak.updateMany({
        where: {
          lastInteractionDate: { lt: twoDaysAgo },
          streakCount: { gt: 0 }
        },
        data: {
          streakCount: 0,
          user1Interacted: false,
          user2Interacted: false
        }
      });
      
      if (count > 0) {
        logger.info(`🔥 Cron: Reset ${count} broken streaks`);
      }
    } catch (error) {
      logger.error('Cron Error (Streak Reset):', error);
    }
  });

  logger.info('⏱️  Cron background jobs initialized');
}

module.exports = { initCronJobs };
