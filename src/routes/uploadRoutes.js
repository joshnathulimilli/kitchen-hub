const express = require('express');
const multer = require('multer');
const path = require('path');
const { uploadImage } = require('../controllers/uploadController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'public', 'uploads', 'restaurants'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    // Check MIME type from client (first line of defense)
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Invalid file extension. Allowed: jpg, jpeg, png, webp, gif'));
    }

    cb(null, true);
  }
});

// Require authentication for uploads (vendors and admins only)
router.post('/image', protect, authorize('vendor', 'admin'), upload.single('image'), uploadImage);

module.exports = router;
