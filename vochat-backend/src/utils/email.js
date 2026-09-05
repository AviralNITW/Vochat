// ============================================
// VoChat - Email Service (Nodemailer)
// ============================================

const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('./logger');

// Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.emailUser,
    pass: config.emailPass,
  },
});

/**
 * Send an OTP email to the user
 * @param {string} email 
 * @param {string} otp 
 * @param {string} type - 'signup' or 'login'
 */
const sendOtpEmail = async (email, otp, type = 'signup') => {
  let subject = 'Verify your VoChat Email';
  let actionText = 'create your account';
  let titleText = 'Confirm Your Registration';

  if (type === 'login') {
    subject = 'Your VoChat Login OTP';
    actionText = 'complete your secure login';
    titleText = 'VoChat Login Request';
  } else if (type === 'forgot_password') {
    subject = 'Reset your VoChat Password';
    actionText = 'reset your password';
    titleText = 'Password Reset Request';
  }

  const mailOptions = {
    from: `"VoChat System" <${config.emailUser}>`,
    to: email,
    subject: subject,
    text: `Your One-Time Password for VoChat is: ${otp}\nThis code will expire in 10 minutes.`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1F2937; background-color: #F9FAFB; max-width: 500px; margin: 0 auto; border-radius: 12px; border: 1px solid #E5E7EB;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #7C3AED; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 0.5px;">VoChat</h2>
          <p style="color: #6B7280; font-size: 14px; margin-top: 4px;">Speak freely. Vanish completely.</p>
        </div>
        <div style="background-color: #FFFFFF; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <h3 style="color: #111827; margin-top: 0; font-size: 18px; font-weight: 600;">${titleText}</h3>
          <p style="color: #4B5563; font-size: 15px; line-height: 22px;">Please use the following One-Time Password (OTP) to ${actionText}:</p>
          <div style="background-color: #F3F4F6; padding: 16px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 6px; border-radius: 8px; margin: 24px 0; color: #7C3AED; border: 1px solid #E5E7EB;">
            ${otp}
          </div>
          <p style="color: #EF4444; font-size: 13px; font-weight: 500; margin-bottom: 0;">This code will expire in 10 minutes.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; text-align: center; line-height: 18px;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`OTP email sent successfully to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send OTP email to ${email}:`, error);
    // Return false so caller knows it failed, but we won't crash
    return false;
  }
};

module.exports = { sendOtpEmail };
