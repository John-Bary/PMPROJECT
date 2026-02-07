// Authentication Middleware
// Protects routes by verifying JWT tokens

const jwt = require('jsonwebtoken');
const Sentry = require('../lib/sentry');

// Middleware to verify JWT token from cookies or Authorization header
const authMiddleware = async (req, res, next) => {
  try {
    // Try to get token from cookie first, then Authorization header
    let token = req.cookies.token;

    if (!token && req.headers.authorization) {
      // Check for "Bearer <token>" format
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // If no token found, deny access
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No authentication token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request object
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    // Set Sentry user context for error tracking
    Sentry.setUser({ id: decoded.userId, email: decoded.email });

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    // Token verification failed
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authentication token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication token has expired. Please login again.'
      });
    }

    // Other errors
    return res.status(500).json({
      status: 'error',
      message: 'Authentication error'
    });
  }
};

// Middleware to check if user is admin
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Admin privileges required.'
    });
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware
};
