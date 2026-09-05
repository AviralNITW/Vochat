// ============================================
// VoChat - Message Service
// ============================================

const prisma = require('../../config/database');
const config = require('../../config/env');
const { NotFoundError, BadRequestError } = require('../../utils/ApiError');
const { emitToUser } = require('../../socket');
// Streak service will be required later
const streakService = require('../streak/streak.service');

class MessageService {
  /**
   * Send a new ephemeral voice message
   */
  async sendMessage(senderId, data) {
    const { receiverId, audioUrl, mediaId, duration } = data;

    if (senderId === receiverId) {
      throw new BadRequestError('Cannot send message to yourself');
    }

    // Check friendship (must be accepted)
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: receiverId, status: 'ACCEPTED' },
          { userId: receiverId, friendId: senderId, status: 'ACCEPTED' },
        ],
      },
    });

    if (!friendship) {
      throw new BadRequestError('You can only message accepted friends');
    }

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.messageExpiryHours);

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        audioUrl,
        mediaId,
        duration,
        expiresAt,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Real-time delivery
    emitToUser(receiverId, 'new_message', message);

    // Push notification (FCM)
    const notificationService = require('../notification/notification.service');
    notificationService.sendToUser(receiverId, 'New Voice Message', `From ${message.sender.name}`, {
      type: 'message',
      messageId: message.id,
      senderId: message.senderId,
    });

    // Update Streak
    await streakService.recordInteraction(senderId, receiverId);

    return message;
  }

  /**
   * Mark message as played (triggers immediate deletion logic on client)
   * On server, we update status. A background job will actually delete it.
   */
  async markAsPlayed(userId, messageId) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });

    if (!message) throw new NotFoundError('Message not found');
    if (message.receiverId !== userId) throw new BadRequestError('Unauthorized to play this message');
    if (message.isPlayed) return message;

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        isPlayed: true,
        playedAt: new Date(),
        // Optional: immediately expire or set a short TTL
      },
    });

    // Notify sender that it was played
    emitToUser(message.senderId, 'message_played', { messageId, playedAt: updated.playedAt });

    return updated;
  }

  /**
   * Get messages between user and friend
   */
  async getConversation(userId, friendId, limit = 50, cursor) {
    const query = {
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
        // Do not return expired messages
        expiresAt: { gt: new Date() },
      },
      take: limit,
      orderBy: { createdAt: 'asc' }, // Oldest to newest for chat UI
      include: {
        sender: { select: { id: true, name: true } },
      },
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    return prisma.message.findMany(query);
  }

  /**
   * Get latest message per friend (Conversations List)
   */
  async getConversationsList(userId) {
    // In PostgreSQL, finding the latest message per group is best done with a raw query or distinct.
    // For Prisma, we can fetch the friendships and then the latest message for each.
    
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

    const conversations = [];

    for (const f of friendships) {
      const friendData = f.userId === userId ? f.friend : f.user;
      
      const latestMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: friendData.id },
            { senderId: friendData.id, receiverId: userId },
          ],
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (latestMessage) {
        conversations.push({
          friend: friendData,
          latestMessage,
        });
      }
    }

    // Sort by latest message date descending
    return conversations.sort((a, b) => b.latestMessage.createdAt - a.latestMessage.createdAt);
  }
}

module.exports = new MessageService();
