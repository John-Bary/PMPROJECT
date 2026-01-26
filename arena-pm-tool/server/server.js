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

  if (process.env.NODE_ENV === 'production' && envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }

  // Development defaults
  return [
    'http://localhost:3000',
    'http://localhost:3001'
  ];
};

const allowedOrigins = getAllowedOrigins();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(null, false);
      }
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting for API routes
app.use('/api', apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files for uploads (avatars, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic test route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Arena PM Tool API is running',
    timestamp: new Date().toISOString()
  });
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
