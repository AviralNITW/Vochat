// ============================================
// VoChat - Cloudinary Configuration
// Free media storage (images + audio)
// ============================================

const cloudinary = require('cloudinary').v2;
const config = require('./env');

let isConfigured = false;

function initializeCloudinary() {
  if (isConfigured) return true;

  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    console.warn('⚠️  Cloudinary not configured — media upload disabled');
    return false;
  }

  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });

  isConfigured = true;
  console.log('☁️  Cloudinary initialized successfully');
  return true;
}

function getCloudinary() {
  if (!initializeCloudinary()) return null;
  return cloudinary;
}

module.exports = { getCloudinary, initializeCloudinary };
