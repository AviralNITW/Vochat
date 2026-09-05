// ============================================
// VoChat - Friend Service
// Handles adding, responding, and listing friends
// ============================================

const prisma = require('../../config/database');
const { NotFoundError, ConflictError, BadRequestError } = require('../../utils/ApiError');
const { emitToUser } = require('../../socket'); // For real-time notifications

class FriendService {
  /**
   * Send a friend request
   */
  async sendRequest(userId, friendId) {
    if (userId === friendId) {
      throw new BadRequestError('Cannot send a friend request to yourself');
    }

    // Check if user exists
    const friendExists = await prisma.user.findUnique({ where: { id: friendId } });
    if (!friendExists) throw new NotFoundError('User not found');

    // Check existing friendship
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'PENDING') throw new ConflictError('Friend request already exists');
      if (existing.status === 'ACCEPTED') throw new ConflictError('You are already friends');
      
      // If declined before, allow sending again? For now, yes, just update it.
      if (existing.status === 'DECLINED') {
        const updated = await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: 'PENDING', userId, friendId }
        });
        emitToUser(friendId, 'new_friend_request', { fromUserId: userId });
        return updated;
      }
    }

    // Create new request
    const friendship = await prisma.friendship.create({
      data: {
        userId,
        friendId,
        status: 'PENDING',
      },
      include: {
        user: { select: { name: true } },
      },
    });

    // Real-time notification
    emitToUser(friendId, 'new_friend_request', { fromUserId: userId });

    // Push notification (FCM)
    const notificationService = require('../notification/notification.service');
    notificationService.sendToUser(friendId, 'New Friend Request', `${friendship.user.name} sent you a friend request`, {
      type: 'friend_request',
      userId: userId,
    });

    return friendship;
  }

  /**
   * Respond to friend request (Accept/Decline)
   */
  async respondToRequest(requestId, userId, status) {
    const friendship = await prisma.friendship.findUnique({ where: { id: requestId } });

    if (!friendship) throw new NotFoundError('Friend request not found');
    if (friendship.friendId !== userId) throw new BadRequestError('You cannot respond to this request');
    if (friendship.status !== 'PENDING') throw new BadRequestError(`Request is already ${friendship.status}`);

    const updated = await prisma.friendship.update({
      where: { id: requestId },
      data: { status },
    });

    if (status === 'ACCEPTED') {
      emitToUser(friendship.userId, 'friend_request_accepted', { friendId: userId });
      // TODO: Create initial Streak here later
    }

    return updated;
  }

  /**
   * Remove a friend
   */
  async removeFriend(requestId, userId) {
    const friendship = await prisma.friendship.findUnique({ where: { id: requestId } });

    if (!friendship) throw new NotFoundError('Friendship not found');
    if (friendship.userId !== userId && friendship.friendId !== userId) {
      throw new BadRequestError('You are not part of this friendship');
    }

    await prisma.friendship.delete({ where: { id: requestId } });

    return true;
  }

  /**
   * Get all friends (status = ACCEPTED)
   */
  async getFriends(userId) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, isOnline: true } },
        friend: { select: { id: true, name: true, avatarUrl: true, isOnline: true } },
      },
    });

    // Map to simple friend objects
    return friendships.map((f) => {
      const isInitiator = f.userId === userId;
      const friendData = isInitiator ? f.friend : f.user;
      return {
        friendshipId: f.id,
        ...friendData,
      };
    });
  }

  /**
   * Get pending friend requests
   */
  async getPendingRequests(userId) {
    // Requests sent TO me
    const received = await prisma.friendship.findMany({
      where: { friendId: userId, status: 'PENDING' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    // Requests sent BY me
    const sent = await prisma.friendship.findMany({
      where: { userId: userId, status: 'PENDING' },
      include: { friend: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return { received, sent };
  }
}

module.exports = new FriendService();
