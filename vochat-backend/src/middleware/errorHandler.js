// ============================================
// VoChat - Global Error Handler
// Catches all errors and returns consistent format
// ============================================

const { ApiError } = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error
  if (err.isOperational) {
    logger.warn(`${err.code}: ${err.message}`);
  } else {
    logger.error('Unexpected error:', err);
  }

  // Handle known API errors
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.statusCode, err.code, err.message);
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return ApiResponse.conflict(res, `${field} already exists`);
  }

  if (err.code === 'P2025') {
    return ApiResponse.notFound(res, 'Record not found');
  }

  // Handle JWT errors (fallback)
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }

  // Default: internal server error
  const message = process.env.NODE_ENV === 'development' ? err.message : 'Internal server error';
  return ApiResponse.error(res, 500, 'INTERNAL_ERROR', message);
};

module.exports = { errorHandler };
