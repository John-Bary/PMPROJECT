// User Profile Routes
// Handles /api/me endpoints for profile, preferences, notifications, and avatar

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  getProfile,
  updateProfile,
  updatePreferences,
  updateNotifications,
  uploadAvatar,
  deleteAvatar,
  getMyTasks
} = require('../controllers/meController');

// Allowed file extensions for avatar uploads (whitelist)
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/avatars'));
  },
  filename: (req, file, cb) => {
    // Whitelist extension to prevent path traversal / double-extension attacks
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  }
});

// File filter for avatar uploads (checks both mimetype and extension)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// All routes require authentication
router.use(authMiddleware);

// Profile routes
router.get('/', getProfile);
router.patch('/', updateProfile);

// Preferences routes
router.patch('/preferences', updatePreferences);

// Notification routes
router.patch('/notifications', updateNotifications);

// Avatar routes (rate limited)
router.post('/avatar', uploadLimiter, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', deleteAvatar);

// My tasks route
router.get('/tasks', getMyTasks);

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }

  next(error);
});

module.exports = router;
