// PostgreSQL Database Configuration
const { Pool } = require('pg');
require('dotenv').config();

// Determine if running in serverless environment (Vercel)
const isServerless = !!process.env.VERCEL;

// Build connection configuration
const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Connection pool settings - reduced for serverless to avoid connection exhaustion
  max: isServerless ? 2 : 20,
  idleTimeoutMillis: isServerless ? 10000 : 30000,
  connectionTimeoutMillis: isServerless ? 5000 : 2000,
};

// Enable SSL for production databases (Supabase, Railway, RDS, etc.)
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: false // Required for most managed databases
  };
}

// Alternative: Use DATABASE_URL if provided (common for Railway, Heroku)
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === 'production') {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

// Create connection pool
const pool = new Pool(poolConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  // Don't exit in serverless environment - let the request fail gracefully
  if (!isServerless) {
    process.exit(-1);
  }
});

// Query helper function
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Get a client from the pool (for transactions)
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = {
  pool,
  query,
  getClient
};
