// Admin Routes
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const withErrorHandling = require('../lib/withErrorHandling');
const { getStats } = require('../controllers/adminController');

// All admin routes require authentication
router.use(authMiddleware);

// GET /api/admin/stats - Dashboard statistics (admin only)
router.get('/stats', withErrorHandling(getStats));

module.exports = router;
