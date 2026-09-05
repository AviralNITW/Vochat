// ============================================
// VoChat - User Service
// Handles profile fetching, search, updates
// ============================================

const prisma = require('../../config/database');
const { NotFoundError } = require('../../utils/ApiError');

class UserService {
  /**
   * Get public profile by ID
   */
  async getUserProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        textBio: true,
        audioBioUrl: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Search users by name or email
   * @param {string} query
   * @param {string} excludeUserId
   */
  async searchUsers(query, excludeUserId, limit = 10) {
    return prisma.user.findMany({
      where: {
        id: { not: excludeUserId },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { startsWith: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        textBio: true,
        isOnline: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update current user profile
   */
  async updateProfile(userId, data) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        textBio: true,
        audioBioUrl: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Get user statistics (friends, streaks, messages, followers, following)
   */
  async getUserStats(userId) {
    const [friendsCount, streaksCount, messagesCount, followersCount, followingCount] = await Promise.all([
      prisma.friendship.count({
        where: {
          OR: [{ userId }, { friendId: userId }],
          status: 'ACCEPTED',
        },
      }),
      prisma.streak.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
          streakCount: { gt: 0 },
        },
      }),
      prisma.message.count({
        where: {
          senderId: userId,
        },
      }),
      prisma.follow.count({
        where: {
          followingId: userId,
        },
      }),
      prisma.follow.count({
        where: {
          followerId: userId,
        },
      }),
    ]);

    return {
      friendsCount,
      streaksCount,
      messagesCount,
      followersCount,
      followingCount,
    };
  }

  /**
   * Follow a user
   */
  async followUser(userId, targetUserId) {
    if (userId === targetUserId) {
      throw new Error('Cannot follow yourself');
    }

    const targetExists = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetExists) {
      throw new NotFoundError('Target user not found');
    }

    try {
      return await prisma.follow.create({
        data: {
          followerId: userId,
          followingId: targetUserId,
        },
      });
    } catch (e) {
      // Return existing follow if duplicate
      return { followerId: userId, followingId: targetUserId };
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId, targetUserId) {
    try {
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });
      return { success: true };
    } catch (e) {
      throw new NotFoundError('Follow connection not found');
    }
  }

  /**
   * Get followers list of a user
   */
  async getFollowers(userId) {
    const follows = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            textBio: true,
          },
        },
      },
    });
    return follows.map((f) => f.follower);
  }

  /**
   * Get following list of a user
   */
  async getFollowing(userId) {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            textBio: true,
          },
        },
      },
    });
    return follows.map((f) => f.following);
  }
}

module.exports = new UserService();
