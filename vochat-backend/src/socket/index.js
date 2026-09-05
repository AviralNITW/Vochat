// ============================================
// VoChat - Socket.IO Setup
// Real-time messaging for both Web and Android
// Android: socket.io-client-java
// Web: socket.io-client
// ============================================

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../utils/logger');

let io = null;

// Map of userId -> Set of socketIds (user can have multiple connections)
const onlineUsers = new Map();

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`🔌 Socket connected: ${userId} (${socket.id})`);

    // Track online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal room (for targeted messages)
    socket.join(`user:${userId}`);

    // Broadcast online status to friends
    socket.broadcast.emit('user_online', { userId });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: ${userId} (${socket.id})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast offline status
          socket.broadcast.emit('user_offline', { userId });
        }
      }
    });

    // Handle typing indicator (optional)
    socket.on('typing', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('user_typing', { userId });
    });

    socket.on('stop_typing', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('user_stop_typing', { userId });
    });
  });

  logger.info('🔌 Socket.IO initialized');
  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

/**
 * Emit an event to a specific user (across all their connected devices)
 * Works for both Android and Web clients
 */
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

module.exports = {
  initializeSocket,
  getIO,
  isUserOnline,
  getOnlineUserIds,
  emitToUser,
};
