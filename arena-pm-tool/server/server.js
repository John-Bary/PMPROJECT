// Import required packages
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const { pool } = require('./config/database');
const { startReminderScheduler } = require('./jobs/reminderJob');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const categoryRoutes = require('./routes/categories');
const commentRoutes = require('./routes/comments');
const meRoutes = require('./routes/me');
const holidayRoutes = require('./routes/holidays');
const reminderRoutes = require('./routes/reminders');

// Load environment variables
dotenv.config();

// Validate critical environment variables
const validateEnvironment = () => {
  const requiredVars = ['JWT_SECRET'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('   Please set these variables in your .env file or environment.');

    // In production, this is a critical error
    if (process.env.NODE_ENV === 'production') {
      console.error('   Server cannot start without required configuration.');
      // Don't exit in serverless environment, but log the error
      if (!process.env.VERCEL) {
        process.exit(1);
      }
    }
  }

  // Warn about database configuration
  const hasDbUrl = !!process.env.DATABASE_URL;
  const hasDbConfig = !!(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER);

  if (!hasDbUrl && !hasDbConfig) {
    console.warn('⚠️  No database configuration found. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD.');
  }
};

validateEnvironment();

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
    console.warn('WARNING: No ALLOWED_ORIGINS configured for production!');
  }

  console.log('CORS allowed origins:', origins);
  return origins;
};

const allowedOrigins = getAllowedOrigins();

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Log denied origins for debugging
    console.warn(`CORS request from origin: ${origin}, allowed: ${allowedOrigins.join(', ')}`);
    // Still allow the request but without CORS headers (browser will block)
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Rate limiting for API routes
app.use('/api', apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files for uploads (avatars, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route with optional database verification
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'OK',
    message: 'Arena PM Tool API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    serverless: !!process.env.VERCEL
  };

  // Optional: Check database connectivity (add ?db=true to URL)
  if (req.query.db === 'true') {
    try {
      const result = await pool.query('SELECT 1 as connected');
      health.database = {
        status: 'connected',
        // Don't expose connection details, just confirm it works
        pooler: process.env.DATABASE_URL?.includes('pooler') ? 'yes' : 'no'
      };
    } catch (error) {
      health.database = {
        status: 'error',
        message: error.message.replace(/password=\S+/gi, 'password=***')
      };
      health.status = 'DEGRADED';
    }
  }

  // Check if critical env vars are set (without exposing values)
  health.config = {
    database_url: !!process.env.DATABASE_URL,
    jwt_secret: !!process.env.JWT_SECRET,
    allowed_origins: !!process.env.ALLOWED_ORIGINS
  };

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Database test route
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    res.json({
      status: 'OK',
      message: 'Database connection successful',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/me', meRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/reminders', reminderRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Start server (only in non-serverless environment)
const PORT = process.env.PORT || 5001;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n Server is running on port ${PORT}`);
    console.log(` API endpoint: http://localhost:${PORT}/api`);
    console.log(` Health check: http://localhost:${PORT}/api/health\n`);

    // Schedule daily reminder job (only for local development)
    startReminderScheduler();
  });
}

// Export app for Vercel serverless functions
module.exports = app;
