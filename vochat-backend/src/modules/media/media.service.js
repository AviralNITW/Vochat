// ============================================
// VoChat - Media Service
// Generates Signed URLs for Firebase Storage
// ============================================

const { v4: uuidv4 } = require('uuid');
const { getStorage } = require('../../config/firebase');
const prisma = require('../../config/database');
const { BadRequestError } = require('../../utils/ApiError');
const config = require('../../config/env');

class MediaService {
  /**
   * Generates a signed URL for uploading an audio file to Firebase Storage
   * Works for both Android and Web. Client uploads directly to Firebase,
   * bypassing our Node server to save bandwidth.
   */
  async generateUploadUrl(userId, mimeType, fileSize, duration) {
    if (!mimeType.startsWith('audio/')) {
      throw new BadRequestError('Only audio files are allowed');
    }

    if (fileSize > 10 * 1024 * 1024) { // 10MB limit
      throw new BadRequestError('File size exceeds 10MB limit');
    }

    const bucket = getStorage();
    const fileExtension = mimeType.split('/')[1] || 'webm';
    const fileName = `${userId}/${uuidv4()}.${fileExtension}`;

    // Create a database record for this media
    const media = await prisma.media.create({
      data: {
        userId,
        filePath: fileName,
        fileSize,
        duration,
        mimeType,
      },
    });

    if (!bucket) {
      // Mock mode for local dev without Firebase
      return {
        mediaId: media.id,
        uploadUrl: `http://localhost:${config.port}/mock-upload/${fileName}`,
        downloadUrl: `http://localhost:${config.port}/mock-download/${fileName}`,
        filePath: fileName,
      };
    }

    const file = bucket.file(fileName);

    // Generate V4 signed URL for uploading
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: mimeType,
    });

    // Generate a long-lived download URL (managed via Ephemeral cron)
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

    return {
      mediaId: media.id,
      uploadUrl,
      downloadUrl,
      filePath: fileName,
    };
  }
}

module.exports = new MediaService();
