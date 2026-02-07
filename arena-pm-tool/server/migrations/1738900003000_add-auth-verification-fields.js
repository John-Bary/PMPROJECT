/**
 * Migration: Add email verification and password reset fields to users table.
 *
 * The auth controller references these columns for:
 *   - Registration (email_verified, email_verification_token, email_verification_expires_at)
 *   - Login (email_verified)
 *   - Forgot/reset password (password_reset_token, password_reset_expires_at)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('users', {
    password_reset_token: { type: 'varchar(128)' },
    password_reset_expires_at: { type: 'timestamptz' },
    email_verified: { type: 'boolean', default: false },
    email_verification_token: { type: 'varchar(128)' },
    email_verification_expires_at: { type: 'timestamptz' },
  }, { ifNotExists: true });

  pgm.createIndex('users', 'password_reset_token', {
    name: 'idx_users_password_reset_token',
    where: 'password_reset_token IS NOT NULL',
    ifNotExists: true,
  });

  pgm.createIndex('users', 'email_verification_token', {
    name: 'idx_users_email_verification_token',
    where: 'email_verification_token IS NOT NULL',
    ifNotExists: true,
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('users', [], { name: 'idx_users_email_verification_token', ifExists: true });
  pgm.dropIndex('users', [], { name: 'idx_users_password_reset_token', ifExists: true });
  pgm.dropColumns('users', [
    'email_verification_expires_at',
    'email_verification_token',
    'email_verified',
    'password_reset_expires_at',
    'password_reset_token',
  ], { ifExists: true });
};
