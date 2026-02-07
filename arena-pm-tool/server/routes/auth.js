// Authentication Routes
// Defines all auth-related API endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const withErrorHandling = require('../lib/withErrorHandling');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} = require('../middleware/schemas');
const {
  register,
  login,
  logout,
  getCurrentUser,
  getAllUsers,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail
} = require('../controllers/authController');

// Public routes (no authentication required)
// Rate limited to prevent brute-force attacks
router.post('/register', authLimiter, validate(registerSchema), withErrorHandling(register));
router.post('/login', authLimiter, validate(loginSchema), withErrorHandling(login));
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), withErrorHandling(forgotPassword));
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), withErrorHandling(resetPassword));
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), withErrorHandling(verifyEmail));

// Token refresh (uses httpOnly refresh cookie, no auth middleware needed)
router.post('/refresh', withErrorHandling(refreshAccessToken));

// Protected routes (authentication required)
router.post('/logout', authMiddleware, withErrorHandling(logout));
router.post('/resend-verification', authMiddleware, withErrorHandling(resendVerificationEmail));
router.get('/me', authMiddleware, withErrorHandling(getCurrentUser));
router.get('/users', authMiddleware, withErrorHandling(getAllUsers));

module.exports = router;
