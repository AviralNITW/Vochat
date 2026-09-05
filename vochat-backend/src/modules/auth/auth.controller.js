// ============================================
// VoChat - Auth Controller (HTTP Layer)
// Handles request/response — delegates to service
// ============================================

const authService = require('./auth.service');
const ApiResponse = require('../../utils/ApiResponse');

class AuthController {
  /**
   * POST /api/auth/register
   * Stage 1: Initiates email registration and sends OTP
   */
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register({ name, email, password });

      ApiResponse.success(res, 200, 'Verification OTP sent to your email', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/verify-signup
   * Stage 2: Verifies signup OTP and completes registration
   */
  async verifySignup(req, res, next) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifySignup({ email, otp });

      ApiResponse.created(res, 'Registration successfully verified', {
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Stage 1: Verifies credentials and sends OTP
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ identifier: email, password });

      ApiResponse.success(res, 200, 'Verification OTP sent to your email', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/verify-login
   * Stage 2: Verifies login OTP and completes sign-in
   */
  async verifyLogin(req, res, next) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyLogin({ email, otp });

      ApiResponse.success(res, 200, 'Login successful', {
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/resend-otp
   * Resends verification OTP
   */
  async resendOtp(req, res, next) {
    try {
      const { email, type } = req.body;
      const result = await authService.resendOtp({ email, type });

      ApiResponse.success(res, 200, 'Verification OTP resent to your email', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Stage 1: Initiates password reset and sends OTP
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword({ email });

      ApiResponse.success(res, 200, 'Password reset OTP sent to your email', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/reset-password
   * Stage 2: Verifies reset OTP and updates password
   */
  async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await authService.resetPassword({ email, otp, newPassword });

      ApiResponse.success(res, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/social-login
   * Social Authentication endpoint (Google/Apple via Clerk validation)
   */
  async socialLogin(req, res, next) {
    try {
      const { clerkUserId, email, name } = req.body;
      const result = await authService.socialLogin({ clerkUserId, email, name });

      ApiResponse.success(res, 200, 'Social authentication successful', {
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.userId);

      ApiResponse.success(res, 200, 'User retrieved', { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      await authService.logout(req.userId);

      ApiResponse.success(res, 200, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
