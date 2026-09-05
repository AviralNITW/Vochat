// ============================================
// VoChat - Media Routes
// ============================================

const { Router } = require('express');
const mediaController = require('./media.controller');
const { authenticate } = require('../../middleware/auth');
const multer = require('multer');

const router = Router();

// Multer configuration: store file in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // limit file size to 10MB
  },
});

// All media routes require authentication
router.use(authenticate);

/**
 * @route POST /api/media/upload
 * @desc Upload an image or audio file to Firebase
 * @access Private
 */
router.post('/upload', upload.single('file'), mediaController.uploadFile);

module.exports = router;
