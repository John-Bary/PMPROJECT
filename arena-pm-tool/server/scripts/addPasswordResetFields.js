// Migration: Add password reset fields to users table
const { pool } = require('../config/database');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add password reset token fields
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(128),
      ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE
    `);

    // Index for fast token lookup
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_password_reset_token
      ON users(password_reset_token) WHERE password_reset_token IS NOT NULL
    `);

    // Add email verification fields
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(128),
      ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP WITH TIME ZONE
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
      ON users(email_verification_token) WHERE email_verification_token IS NOT NULL
    `);

    await client.query('COMMIT');
    console.log('Migration complete: added password reset and email verification fields to users table');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch(() => process.exit(1));
