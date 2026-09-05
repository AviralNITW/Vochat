// ============================================
// VoChat - Auth Validation Schemas (Zod)
// ============================================

const { z } = require('zod');

const registerSchema = {
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be at most 50 characters')
      .trim(),
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must be at most 100 characters'),
  }),
};

const loginSchema = {
  body: z.object({
    email: z
      .string()
      .min(1, 'Email or username is required')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(1, 'Password is required'),
  }),
};

const verifyOtpSchema = {
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    otp: z
      .string()
      .length(6, 'OTP must be exactly 6 characters')
      .regex(/^\d+$/, 'OTP must be digits only'),
  }),
};

const socialLoginSchema = {
  body: z.object({
    clerkUserId: z
      .string()
      .min(1, 'Clerk user ID is required'),
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    name: z
      .string()
      .min(1, 'Name is required')
      .trim(),
  }),
};

const resendOtpSchema = {
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    type: z
      .enum(['signup', 'login', 'forgot_password'])
      .optional()
      .default('signup'),
  }),
};

const forgotPasswordSchema = {
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
  }),
};

const resetPasswordSchema = {
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    otp: z
      .string()
      .length(6, 'OTP must be exactly 6 characters')
      .regex(/^\d+$/, 'OTP must be digits only'),
    newPassword: z
      .string()
      .min(6, 'New password must be at least 6 characters')
      .max(100, 'New password must be at most 100 characters'),
  }),
};

module.exports = { 
  registerSchema, 
  loginSchema, 
  verifyOtpSchema, 
  socialLoginSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
