// ============================================
// VoChat - Auth Service (Business Logic)
// Handles: Registration, Login, OTP Verification, Clerk Social Login
// ============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const config = require('../../config/env');
const { ConflictError, UnauthorizedError, ApiError } = require('../../utils/ApiError');
const logger = require('../../utils/logger');
const { sendOtpEmail } = require('../../utils/email');

const SALT_ROUNDS = 12;

class AuthService {
  /**
   * Register a new user (Stage 1: Create pending and send OTP)
   * @param {object} data - { name, email, password }
   * @returns {object} - { email, status }
   */
  async register({ name, email, password }) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.isVerified) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    if (existingUser) {
      // Update unverified user details
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password: hashedPassword,
          otp,
          otpExpires,
        },
      });
      logger.info(`Updated unverified registration and generated new OTP for: ${email}`);
    } else {
      // Create pending unverified user
      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          otp,
          otpExpires,
          isVerified: false,
        },
      });
      logger.info(`Created unverified user and generated OTP for: ${email}`);
    }

    // Send OTP via Nodemailer
    await sendOtpEmail(email, otp, 'signup');

    // Output OTP in dev console for easy debugging
    console.log(`\n========================================`);
    console.log(`Signup OTP for ${email}: ${otp}`);
    console.log(`========================================\n`);

    return {
      email,
      status: 'pending_verification',
    };
  }

  /**
   * Verify signup OTP and complete registration (Stage 2)
   * @param {object} data - { email, otp }
   * @returns {object} - { user, token }
   */
  async verifySignup({ email, otp }) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.isVerified) {
      throw new ApiError(400, 'User is already verified');
    }

    if (!user.otp || user.otp !== otp) {
      throw new UnauthorizedError('Invalid OTP');
    }

    if (new Date() > user.otpExpires) {
      throw new UnauthorizedError('OTP has expired');
    }

    // Mark user as verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otp: null,
        otpExpires: null,
        isOnline: true,
        lastSeen: new Date(),
      },
    });

    // Generate token
    const token = this.generateToken(updatedUser.id);

    logger.info(`User successfully signed up and verified: ${updatedUser.email}`);

    const { password: _, otp: __, otpExpires: ___, ...userWithoutPassword } = updatedUser;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Login an existing user (Stage 1: Verify credentials and send OTP)
   * @param {object} data - { identifier, password }
   * @returns {object} - { email, status }
   */
  async login({ identifier, password }) {
    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { name: identifier }
        ]
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate login OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    // Update OTP on user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpires,
      },
    });

    // Send OTP via Nodemailer
    await sendOtpEmail(user.email, otp, 'login');

    // Output OTP in dev console for easy debugging
    console.log(`\n========================================`);
    console.log(`Login OTP for ${user.email}: ${otp}`);
    console.log(`========================================\n`);

    return {
      email: user.email,
      status: 'pending_verification',
    };
  }

  /**
   * Verify login OTP and complete login (Stage 2)
   * @param {object} data - { email, otp }
   * @returns {object} - { user, token }
   */
  async verifyLogin({ email, otp }) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.otp || user.otp !== otp) {
      throw new UnauthorizedError('Invalid OTP');
    }

    if (new Date() > user.otpExpires) {
      throw new UnauthorizedError('OTP has expired');
    }

    // Clear OTP and update online status
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true, // Mark verified if logging in successfully
        otp: null,
        otpExpires: null,
        isOnline: true,
        lastSeen: new Date(),
      },
    });

    // Generate token
    const token = this.generateToken(updatedUser.id);

    logger.info(`User successfully logged in and verified via OTP: ${updatedUser.email}`);

    const { password: _, otp: __, otpExpires: ___, ...userWithoutPassword } = updatedUser;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Resend verification OTP to user
   * @param {object} data - { email, type }
   * @returns {object} - { email, status }
   */
  async resendOtp({ email, type }) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (type === 'signup' && user.isVerified) {
      throw new ApiError(400, 'User is already verified');
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    // Update user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpires,
      },
    });

    // Send OTP via Nodemailer
    await sendOtpEmail(email, otp, type);

    // Output OTP in dev console for easy debugging
    console.log(`\n========================================`);
    console.log(`Resent ${type} OTP for ${email}: ${otp}`);
    console.log(`========================================\n`);

    return {
      email,
      status: 'pending_verification',
    };
  }

  /**
   * Request password reset OTP
   * @param {object} data - { email }
   * @returns {object} - { email, status }
   */
  async forgotPassword({ email }) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('User with this email does not exist');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpires,
      },
    });

    await sendOtpEmail(email, otp, 'forgot_password');

    console.log(`\n========================================`);
    console.log(`Password Reset OTP for ${email}: ${otp}`);
    console.log(`========================================\n`);

    return {
      email,
      status: 'pending_reset',
    };
  }

  /**
   * Verify reset OTP and set new password
   * @param {object} data - { email, otp, newPassword }
   * @returns {object} - { message }
   */
  async resetPassword({ email, otp, newPassword }) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.otp || user.otp !== otp) {
      throw new UnauthorizedError('Invalid OTP');
    }

    if (new Date() > user.otpExpires) {
      throw new UnauthorizedError('OTP has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpires: null,
      },
    });

    logger.info(`Password reset successfully for: ${email}`);

    return {
      message: 'Password reset successfully. You can now login with your new password.',
    };
  }

  /**
   * Authenticate / Synchronize Clerk Social User (Google/Apple)
   * @param {object} data - { clerkUserId, email, name }
   * @returns {object} - { user, token }
   */
  async socialLogin({ clerkUserId, email, name }) {
    if (!config.clerkSecretKey) {
      throw new ApiError(500, 'Clerk secret key is not configured on the backend');
    }

    // Verify Clerk user id securely with Clerk Backend API
    try {
      const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        headers: {
          'Authorization': `Bearer ${config.clerkSecretKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.error(`Clerk API returned status ${response.status} for user ${clerkUserId}`);
        throw new UnauthorizedError('Failed to verify Clerk user ID');
      }

      const clerkUser = await response.json();
      
      // Verify email matches Clerk user account
      const emailMatches = clerkUser.email_addresses?.some(
        e => e.email_address?.toLowerCase() === email.toLowerCase()
      );

      if (!emailMatches) {
        throw new UnauthorizedError('Email mismatch with Clerk account');
      }
    } catch (err) {
      logger.error('Clerk verification error:', err);
      throw new UnauthorizedError('Social session verification failed');
    }

    // Find local user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Auto-create user for new social sign up
      const hashedPassword = await bcrypt.hash(clerkUserId, SALT_ROUNDS); // Use Clerk ID as standard backend password fallback
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          isVerified: true,
          isOnline: true,
          lastSeen: new Date(),
        },
      });
      logger.info(`Created new local user from Clerk social login: ${email}`);
    } else {
      // Log in existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true, // OAuth validates the email, so force true
          isOnline: true,
          lastSeen: new Date(),
        },
      });
      logger.info(`Social login successful for existing user: ${email}`);
    }

    const token = this.generateToken(user.id);
    const { password: _, otp: __, otpExpires: ___, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Get current user profile
   * @param {string} userId
   * @returns {object} - user profile
   */
  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        textBio: true,
        audioBioUrl: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return user;
  }

  /**
   * Logout user (update online status)
   * @param {string} userId
   */
  async logout(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeen: new Date() },
    });

    logger.info(`User logged out: ${userId}`);
  }

  /**
   * Generate JWT token
   * @param {string} userId
   * @returns {string} - JWT token
   */
  generateToken(userId) {
    return jwt.sign(
      { userId },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  }
}

module.exports = new AuthService();
