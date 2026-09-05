// ============================================
// VoChat - Rate Limiter Middleware
// Prevents API abuse (spam, flooding)
// ============================================

const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const ApiResponse = require('../utils/ApiResponse');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ApiResponse.tooManyRequests(res, 'Too many requests, please try again later');
  },
});

// Strict limiter for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ApiResponse.tooManyRequests(res, 'Too many login attempts, please try again later');
  },
});

// Message sending limiter
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ApiResponse.tooManyRequests(res, 'Sending too fast, please slow down');
  },
});

module.exports = { generalLimiter, authLimiter, messageLimiter };
