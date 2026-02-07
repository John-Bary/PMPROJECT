// Import required packages
const dotenv = require('dotenv');

// Load environment variables before Sentry init
dotenv.config();

// Initialize Sentry as early as possible
const Sentry = require('./lib/sentry');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const { pool } = require('./config/database');
const { startReminderScheduler } = require('./jobs/reminderJob');
const { startEmailQueueScheduler } = require('./jobs/emailQueueJob');
const { apiLimiter } = require('./middleware/rateLimiter');
const { doubleCsrfProtection, csrfTokenRoute } = require('./middleware/csrf');
const requestIdMiddleware = require('./middleware/requestId');
const logger = require('./lib/logger');

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const categoryRoutes = require('./routes/categories');
const commentRoutes = require('./routes/comments');
const meRoutes = require('./routes/me');
const holidayRoutes = require('./routes/holidays');
const reminderRoutes = require('./routes/reminders');
const workspaceRoutes = require('./routes/workspaces');

// Initialize Express app
const app = express();

// Trust proxy for accurate IP detection behind reverse proxy (Heroku, Railway, etc.)
if (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Disable X-Powered-By header
app.disable('x-powered-by');

// Security headers via Helmet
const helmetConfig = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' }
};

if (process.env.NODE_ENV === 'production') {
  helmetConfig.contentSecurityPolicy = {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"]
    }
  };
  helmetConfig.hsts = {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  };
} else {
  helmetConfig.contentSecurityPolicy = false;
}

app.use(helmet(helmetConfig));

// Assign unique request ID to every request (for tracing/logging)
app.use(requestIdMiddleware);

// Allowed origins for CORS - environment-aware
const getAllowedOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  // Development origins (only used locally)
  const origins = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000', 'http://localhost:3001'];

  // Add origins from environment variable (required for production)
  if (envOrigins) {
    const additionalOrigins = envOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
    additionalOrigins.forEach(origin => {
      if (!origins.includes(origin)) {
        origins.push(origin);
      }
    });
  }

  if (process.env.NODE_ENV === 'production' && origins.length === 0) {
    logger.warn('No ALLOWED_ORIGINS configured for production');
  }

  logger.info({ origins }, 'CORS allowed origins');
  return origins;
};

const allowedOrigins = getAllowedOrigins();

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // API-06: In production, reject requests with no origin (null origin attacks)
    // In development, allow no-origin for tools like curl/Postman
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(null, false);
      }
      return callback(null, true);
    }
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Log denied origins for debugging
    logger.warn({ origin, allowedOrigins }, 'CORS request from unlisted origin');
    // Still allow the request but without CORS headers (browser will block)
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Rate limiting for API routes
app.use('/api', apiLimiter);

// API-05: Explicit body size limits to prevent large payload attacks
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// CSRF protection: token endpoint + guard on mutating methods
app.get('/api/csrf-token', csrfTokenRoute);
app.use('/api', doubleCsrfProtection);

// INJ-07: Serve static files for uploads with Content-Disposition to prevent browser execution
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set('Content-Disposition', 'attachment');
  }
}));

// API-02: Health check - reduced info disclosure in production
app.get('/api/health', async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';

  const health = {
    status: 'OK',
    timestamp: new Date().toISOString()
  };

  // Only expose extra details in non-production
  if (!isProd) {
    health.message = 'Todoria API is running';
    health.environment = process.env.NODE_ENV || 'development';
  }

  // Optional: Check database connectivity (add ?db=true to URL)
  if (req.query.db === 'true') {
    try {
      await pool.query('SELECT 1 as connected');
      health.database = { status: 'connected' };
    } catch (error) {
      health.database = {
        status: 'error',
        message: isProd ? 'Database unavailable' : error.message.replace(/password=\S+/gi, 'password=***')
      };
      health.status = 'DEGRADED';
    }
  }

  // Check email queue health (add ?queue=true to URL)
  if (req.query.queue === 'true') {
    try {
      const { getEmailQueueHealth } = require('./jobs/emailQueueJob');
      health.emailQueue = await getEmailQueueHealth();
    } catch (error) {
      health.emailQueue = { status: 'error' };
    }
  }

  // Only expose config checks in non-production
  if (!isProd) {
    health.config = {
      database_url: !!process.env.DATABASE_URL,
      jwt_secret: !!process.env.JWT_SECRET,
      allowed_origins: !!process.env.ALLOWED_ORIGINS
    };
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/me', meRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/workspaces', workspaceRoutes);

// Sentry error handler (must be before other error handlers)
Sentry.setupExpressErrorHandler(app);

// Global error handler — catches anything not handled by withErrorHandling
const AppError = require('./lib/AppError');
app.use((err, req, res, _next) => {
  const requestId = req.id || 'unknown';
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;

  logger.error({ requestId, method: req.method, url: req.originalUrl, err }, 'Unhandled error');

  res.status(statusCode).json({
    status: 'error',
    message: isAppError ? err.message : 'Internal server error',
    requestId,
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    requestId: req.id,
  });
});

// Start server (only in non-serverless environment)
const PORT = process.env.PORT || 5001;

// AUTH-05: Validate JWT_SECRET at startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.fatal('JWT_SECRET must be set and at least 32 characters long');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, `Server is running on port ${PORT}`);
    logger.info({ endpoint: `http://localhost:${PORT}/api` }, 'API endpoint ready');
    logger.info({ healthCheck: `http://localhost:${PORT}/api/health` }, 'Health check available');

    // Schedule daily reminder job (only for local development)
    startReminderScheduler();

    // Start email queue processor
    startEmailQueueScheduler();
  });
}

// Export app for Vercel serverless functions
module.exports = app;
