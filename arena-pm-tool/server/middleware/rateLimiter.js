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
    return req.path === '/health';
  }
});

// Stricter rate limiter for authentication endpoints
// 10 attempts per 15 minutes per IP (prevents brute-force while allowing retries)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    retryAfter: Math.ceil((parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  // Only count failed authentication attempts (wrong password, etc.)
  // Successful logins don't count against the limit
  skipSuccessfulRequests: true
});

module.exports = {
  apiLimiter,
  authLimiter
};
