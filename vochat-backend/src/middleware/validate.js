// ============================================
// VoChat - Input Validation Middleware (Zod)
// ============================================

const { ZodError } = require('zod');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Creates a validation middleware from a Zod schema
 * Validates req.body, req.query, or req.params
 *
 * @param {object} schema - Zod schema object { body?, query?, params? }
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const zodErrors = error.errors || error.issues || [];
        const details = zodErrors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return ApiResponse.badRequest(res, 'Validation failed', details);
      }
      next(error);
    }
  };
};

module.exports = { validate };
