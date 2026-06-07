const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/apiError');

// Magic bytes (file signatures) for supported image formats
const MAGIC_BYTES = {
  jpeg: Buffer.from([0xFF, 0xD8, 0xFF]),
  png: Buffer.from([0x89, 0x50, 0x4E, 0x47]),
  gif: Buffer.from([0x47, 0x49, 0x46]),
  webp: Buffer.from([0x52, 0x49, 0x46, 0x46]) // RIFF signature, needs additional check for WEBP
};

const validateFileMagic = (filePath) => {
  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 12);
  fs.closeSync(fd);

  // Check JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;

  // Check PNG
  if (buffer.slice(0, 4).equals(MAGIC_BYTES.png)) return true;

  // Check GIF
  if (buffer.slice(0, 3).equals(MAGIC_BYTES.gif)) return true;

  // Check WEBP (RIFF header followed by WEBP)
  if (buffer.slice(0, 4).equals(MAGIC_BYTES.webp) && buffer.slice(8, 12).toString('ascii') === 'WEBP') return true;

  return false;
};

const uploadImage = (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }

  try {
    // Validate file magic bytes to prevent file type spoofing
    const filePath = req.file.path;
    if (!validateFileMagic(filePath)) {
      // Delete the uploaded file if it fails validation
      fs.unlinkSync(filePath);
      throw new ApiError(400, 'Invalid image file. File content does not match image format.');
    }

    const relativePath = path.join('/uploads/restaurants', req.file.filename).replace(/\\/g, '/');

    res.json({
      success: true,
      url: relativePath
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
};

module.exports = { uploadImage };