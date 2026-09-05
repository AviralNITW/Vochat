// ============================================
// VoChat - Environment Configuration
// Validates all required env vars at startup
// ============================================

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Firebase (kept for FCM push notifications)
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  },

  // Cloudinary (media storage: profile pics, voice bios)
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',').map(s => s.trim()) || ['http://localhost:3000'],

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  // Ephemeral
  messageExpiryHours: parseInt(process.env.MESSAGE_EXPIRY_HOURS, 10) || 24,
  cleanupCronInterval: process.env.CLEANUP_CRON_INTERVAL || '*/5 * * * *',

  // Clerk
  clerkSecretKey: process.env.CLERK_SECRET_KEY,

  // SMTP Email
  emailUser: process.env.EMAIL_USER || 'emsmaster456@gmail.com',
  emailPass: process.env.EMAIL_PASS || 'ems@456890',
};

// Validate critical config
const requiredVars = ['databaseUrl', 'jwtSecret'];
for (const key of requiredVars) {
  if (!config[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = config;
