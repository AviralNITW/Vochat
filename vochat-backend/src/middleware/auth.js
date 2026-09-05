// ============================================
// VoChat - JWT Authentication Middleware
// Verifies Bearer token from Authorization header
// Compatible with: Android OkHttp Interceptor + Web Axios
// ============================================

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const prisma = require('../config/database');
const { UnauthorizedError } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Extracts JWT from Authorization header, verifies it,
 * and attaches the user object to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Token not provided');
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid token');
      }
      throw new UnauthorizedError('Token verification failed');
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        isOnline: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Attach user to request — same data available on both Web and Android
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate };
