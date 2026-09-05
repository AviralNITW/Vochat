// ============================================
// VoChat - Consistent API Response Format
// Android (Retrofit/Moshi) and Web (Axios)
// can deserialize these with a single wrapper
// ============================================

class ApiResponse {
  /**
   * Success response
   * @param {object} res - Express response
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable message
   * @param {any} data - Response payload
   */
  static success(res, statusCode = 200, message = 'Success', data = null) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Created response (201)
   */
  static created(res, message = 'Created successfully', data = null) {
    return ApiResponse.success(res, 201, message, data);
  }

  /**
   * Error response
   * @param {object} res - Express response
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Machine-readable error code
   * @param {string} message - Human-readable error message
   * @param {any} details - Additional error details
   */
  static error(res, statusCode = 500, code = 'INTERNAL_ERROR', message = 'Something went wrong', details = null) {
    const response = {
      success: false,
      error: {
        code,
        message,
      },
    };

    if (details) {
      response.error.details = details;
    }

    return res.status(statusCode).json(response);
  }

  // Common error shortcuts
  static badRequest(res, message = 'Bad request', details = null) {
    return ApiResponse.error(res, 400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return ApiResponse.error(res, 401, 'UNAUTHORIZED', message);
  }

  static forbidden(res, message = 'Forbidden') {
    return ApiResponse.error(res, 403, 'FORBIDDEN', message);
  }

  static notFound(res, message = 'Not found') {
    return ApiResponse.error(res, 404, 'NOT_FOUND', message);
  }

  static conflict(res, message = 'Conflict') {
    return ApiResponse.error(res, 409, 'CONFLICT', message);
  }

  static tooManyRequests(res, message = 'Too many requests') {
    return ApiResponse.error(res, 429, 'TOO_MANY_REQUESTS', message);
  }
}

module.exports = ApiResponse;
