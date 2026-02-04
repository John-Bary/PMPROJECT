// Authentication Routes
// Defines all auth-related API endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  register,
  login,
  logout,
  getCurrentUser,
  getAllUsers,
  startDemo
} = require('../controllers/authController');

// Public routes (no authentication required)
// Rate limited to prevent brute-force attacks
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/demo', authLimiter, startDemo);

// Protected routes (authentication required)
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getCurrentUser);
router.get('/users', authMiddleware, getAllUsers);

module.exports = router;
