// Rate Limiting Middleware
// Protects API from abuse and brute-force attacks

const rateLimit = require('express-rate-limit');

// General API rate limiter
// 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/api/health';
  }
});

// Stricter rate limiter for authentication endpoints
// AUTH-04: Removed skipSuccessfulRequests to prevent brute-force counter reset
// 5 attempts per 15 minutes per IP (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    retryAfter: Math.ceil((parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  }
});

// Rate limiter for invitation endpoints
// 5 invitations per hour per IP
const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many invitation requests. Please try again later.'
  }
});

// Rate limiter for file uploads
// 3 uploads per minute per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many upload requests. Limit is 3 per minute. Please try again shortly.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  inviteLimiter,
  uploadLimiter
};
