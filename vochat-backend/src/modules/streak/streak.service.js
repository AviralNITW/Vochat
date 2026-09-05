// ============================================
// VoChat - Streak Service
// Handles streak logic (increment, reset)
// ============================================

const prisma = require('../../config/database');
const { emitToUser } = require('../../socket');
const { NotFoundError } = require('../../utils/ApiError');

class StreakService {
  /**
   * Automatically invoked when a user sends or plays a message.
   */
  async recordInteraction(userId, friendId) {
    // Sort IDs to ensure unique combination
    const user1Id = userId < friendId ? userId : friendId;
    const user2Id = userId < friendId ? friendId : userId;
    const isUser1 = userId === user1Id;

    let streak = await prisma.streak.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    const now = new Date();

    if (!streak) {
      // Create new streak tracker
      streak = await prisma.streak.create({
        data: {
          user1Id,
          user2Id,
          user1Interacted: isUser1,
          user2Interacted: !isUser1,
          lastInteractionDate: now,
        },
      });
      return streak;
    }

    // Check if both users have interacted today to increment streak
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const timeSinceLastInteraction = now - new Date(streak.lastInteractionDate);

    // If it's been more than 48 hours, streak is broken
    if (timeSinceLastInteraction > 2 * oneDayInMs) {
      streak = await prisma.streak.update({
        where: { id: streak.id },
        data: {
          streakCount: 0,
          user1Interacted: isUser1,
          user2Interacted: !isUser1,
          lastInteractionDate: now,
        },
      });
      emitToUser(userId, 'streak_broken', { friendId, streakCount: 0 });
      emitToUser(friendId, 'streak_broken', { friendId: userId, streakCount: 0 });
      return streak;
    }

    // Determine current interaction state
    const user1Interacted = isUser1 ? true : streak.user1Interacted;
    const user2Interacted = !isUser1 ? true : streak.user2Interacted;

    // Both interacted? Increment streak
    if (user1Interacted && user2Interacted) {
      streak = await prisma.streak.update({
        where: { id: streak.id },
        data: {
          streakCount: streak.streakCount + 1,
          user1Interacted: false, // Reset for next interaction period
          user2Interacted: false,
          lastInteractionDate: now,
        },
      });
      
      // Notify both users of the increased streak
      emitToUser(userId, 'streak_updated', { friendId, streakCount: streak.streakCount });
      emitToUser(friendId, 'streak_updated', { friendId: userId, streakCount: streak.streakCount });
    } else {
      // Just update interaction flag
      streak = await prisma.streak.update({
        where: { id: streak.id },
        data: {
          user1Interacted,
          user2Interacted,
          lastInteractionDate: now,
        },
      });
    }

    return streak;
  }

  /**
   * Get streaks for current user
   */
  async getUserStreaks(userId) {
    const streaks = await prisma.streak.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      orderBy: { streakCount: 'desc' },
    });

    return streaks.map((streak) => ({
      friendId: streak.user1Id === userId ? streak.user2Id : streak.user1Id,
      streakCount: streak.streakCount,
      userInteracted: streak.user1Id === userId ? streak.user1Interacted : streak.user2Interacted,
      friendInteracted: streak.user1Id === userId ? streak.user2Interacted : streak.user1Interacted,
      lastInteractionDate: streak.lastInteractionDate,
    }));
  }
}

module.exports = new StreakService();
