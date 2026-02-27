// PostgreSQL Database Configuration
const { Pool } = require('pg');
require('dotenv').config();
const logger = require('../lib/logger');

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
  max: isServerless ? 5 : 20,
  idleTimeoutMillis: isServerless ? 10000 : 30000,
  connectionTimeoutMillis: isServerless ? 5000 : 2000,
};

// DATA-02: Enable SSL for production databases with proper cert validation
// Use DB_CA_CERT env var to provide CA certificate for full validation
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = process.env.DB_CA_CERT
    ? { rejectUnauthorized: true, ca: process.env.DB_CA_CERT }
    : { rejectUnauthorized: false }; // Fallback for managed databases that don't provide CA
}

// Alternative: Use DATABASE_URL if provided (common for Railway, Heroku)
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === 'production') {
    poolConfig.ssl = process.env.DB_CA_CERT
      ? { rejectUnauthorized: true, ca: process.env.DB_CA_CERT }
      : { rejectUnauthorized: false };
  }
}

// Create connection pool
const pool = new Pool(poolConfig);

// Test database connection
pool.on('connect', () => {
  logger.info('Database connected successfully');
});

pool.on('error', (err) => {
  logger.fatal({ err }, 'Unexpected database pool error');
  process.exit(-1);
});

// Query helper function
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    logger.error({ err: error, query: text.substring(0, 200) }, 'Database query error');
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
