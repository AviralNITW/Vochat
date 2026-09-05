// ============================================
// VoChat - Express Application Entry Point
// ============================================
// This is a STANDALONE API server.
// Both Android (Retrofit) and Web (Axios) clients
// connect to this same server.
// ============================================

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Config
const config = require('./config/env');
const logger = require('./utils/logger');

// Middleware
const { errorHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const friendRoutes = require('./modules/friend/friend.routes');

const messageRoutes = require('./modules/message/message.routes');
const streakRoutes = require('./modules/streak/streak.routes');
const mediaRoutes = require('./modules/media/media.routes');
const notificationRoutes = require('./modules/notification/notification.routes');
const postsRoutes = require('./modules/posts/posts.routes');
const storiesRoutes = require('./modules/stories/stories.routes');

// Socket
const { initializeSocket } = require('./socket');

// ============================================
// Create Express App
// ============================================
const app = express();
const server = http.createServer(app);

// ============================================
// Initialize Socket.IO
// ============================================
initializeSocket(server);

// ============================================
// Initialize Cron Jobs
// ============================================
const { initCronJobs } = require('./utils/cron');
initCronJobs();

// ============================================
// Global Middleware
// ============================================

// Security headers
app.use(helmet());

// CORS - configured for both web frontend and Android app
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
app.use(morgan('dev', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Rate limiting
app.use(generalLimiter);

// ============================================
// Health Check
// ============================================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'VoChat API is running',
    data: {
      version: '1.0.0',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/streaks', streakRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/stories', storiesRoutes);

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
    },
  });
});

// ============================================
// Global Error Handler (must be last)
// ============================================
app.use(errorHandler);

// ============================================
// Start Server
// ============================================
server.listen(config.port, () => {
  logger.info(`
  🎙️  VoChat API Server
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🌐  URL:         http://localhost:${config.port}
  🔧  Environment: ${config.nodeEnv}
  📡  Health:      http://localhost:${config.port}/health
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
});

module.exports = { app, server };
