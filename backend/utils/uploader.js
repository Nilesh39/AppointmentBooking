import fs from 'fs';
import path from 'path';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

/**
 * Uploads a local file (from multer temp) to Cloudinary or saves it locally if Cloudinary is not configured.
 * @param {Object} file - The file object from req.file
 * @returns {Promise<string>} The file URL (Cloudinary secure URL or local static URL)
 */
export const uploadFile = async (file) => {
  if (!file) return null;
  const tempPath = file.path;

  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(tempPath, {
        folder: 'mediconnect',
        resource_type: 'auto',
      });
      // Delete local temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error, falling back to local storage:', error);
    }
  }

  // Local Fallback: Move file from public/temp to public/uploads
  try {
    const filename = path.basename(tempPath);
    const destinationPath = path.join('./public/uploads', filename);

    if (fs.existsSync(tempPath)) {
      fs.renameSync(tempPath, destinationPath);
    }
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Local file upload fallback error:', err);
    throw new Error('Failed to save file locally');
  }
};
