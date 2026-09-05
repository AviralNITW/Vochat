// ============================================
// VoChat - Auth Routes
// POST /api/auth/register
// POST /api/auth/login
// GET  /api/auth/me       (protected)
// POST /api/auth/logout   (protected)
// ============================================

const { Router } = require('express');
const authController = require('./auth.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');
const { 
  registerSchema, 
  loginSchema, 
  verifyOtpSchema, 
  socialLoginSchema, 
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('./auth.validation');

const router = Router();

// Public routes (with auth rate limiting)
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/verify-signup', authLimiter, validate(verifyOtpSchema), authController.verifySignup);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/verify-login', authLimiter, validate(verifyOtpSchema), authController.verifyLogin);
router.post('/resend-otp', authLimiter, validate(resendOtpSchema), authController.resendOtp);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/social-login', authLimiter, validate(socialLoginSchema), authController.socialLogin);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
