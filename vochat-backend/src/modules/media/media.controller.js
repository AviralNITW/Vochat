// ============================================
// VoChat - Media Controller (Cloudinary)
// Handles file uploads to Cloudinary
// ============================================

const { getCloudinary } = require('../../config/cloudinary');
const ApiResponse = require('../../utils/ApiResponse');
const { InternalServerError, BadRequestError } = require('../../utils/ApiError');
const streamifier = require('streamifier');

class MediaController {
  /**
   * Upload file to Cloudinary
   * POST /api/media/upload
   * Body (multipart/form-data):
   *   - file: the file to upload
   *   - folder: 'avatars' | 'bios' | 'misc'
   */
  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      const cloudinary = getCloudinary();
      
      // Local Disk Storage Fallback if Cloudinary is not configured
      if (!cloudinary) {
        const path = require('path');
        const fs = require('fs');
        const { v4: uuidv4 } = require('uuid');

        const isAudio = req.file.mimetype.startsWith('audio/');
        const isImage = req.file.mimetype.startsWith('image/');

        if (!isAudio && !isImage) {
          throw new BadRequestError('Only audio and image files are allowed');
        }

        // Determine safe extension based on mimetype
        let ext = 'bin';
        if (isAudio) {
          if (req.file.mimetype.includes('m4a')) ext = 'm4a';
          else if (req.file.mimetype.includes('wav')) ext = 'wav';
          else if (req.file.mimetype.includes('mp4')) ext = 'm4a';
          else if (req.file.mimetype.includes('mpeg')) ext = 'mp3';
          else ext = 'm4a';
        } else if (isImage) {
          if (req.file.mimetype.includes('png')) ext = 'png';
          else if (req.file.mimetype.includes('jpeg') || req.file.mimetype.includes('jpg')) ext = 'jpg';
          else ext = 'png';
        }

        const fileName = `${uuidv4()}.${ext}`;
        const uploadDir = path.join(__dirname, '../../../public/uploads');

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, req.file.buffer);

        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:5000';
        const fileUrl = `${protocol}://${host}/uploads/${fileName}`;

        return ApiResponse.success(res, 200, 'File uploaded locally successfully', {
          url: fileUrl,
          publicId: fileName,
          mimetype: req.file.mimetype,
          size: req.file.size,
        });
      }

      const folder = `vochat/${req.body.folder || 'misc'}`;

      // Upload from buffer using a stream with resource_type 'auto'
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });

      ApiResponse.success(res, 200, 'File uploaded successfully', {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        mimetype: req.file.mimetype,
        size: req.file.size,
        width: uploadResult.width,
        height: uploadResult.height,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MediaController();
