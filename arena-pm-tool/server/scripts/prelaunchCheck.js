#!/usr/bin/env node

/**
 * Pre-launch verification script
 * Run: node server/scripts/prelaunchCheck.js
 * Or:  cd server && npm run prelaunch
 *
 * Checks that all required environment variables are set
 * and validates their format before deploying to production.
 */

require('dotenv').config();

const REQUIRED_SERVER_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CLIENT_URL',
  'ALLOWED_ORIGINS',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRO_PRICE_ID',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'SENTRY_DSN',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
];

const REQUIRED_CLIENT_VARS = [
  'REACT_APP_POSTHOG_KEY',
  'REACT_APP_POSTHOG_HOST',
];

const OPTIONAL_VARS = [
  'BACKUP_ENABLED',
  'REMINDER_JOB_ENABLED',
  'RETENTION_ENABLED',
  'ABSTRACT_API_KEY',
];

let passed = 0;
let failed = 0;
let warnings = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
    failed++;
  }
}

function warn(label, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  WARN  ${label}${detail ? ` -- ${detail}` : ''}`);
    warnings++;
  }
}

console.log('\n=== Todoria Pre-Launch Check ===\n');

// Check required server vars
console.log('Server Environment Variables:');
for (const v of REQUIRED_SERVER_VARS) {
  check(v, !!process.env[v], 'not set');
}

// Check JWT_SECRET length
if (process.env.JWT_SECRET) {
  check('JWT_SECRET length >= 32', process.env.JWT_SECRET.length >= 32,
    `only ${process.env.JWT_SECRET.length} chars`);
}

// Check Stripe keys are live (not test)
if (process.env.STRIPE_SECRET_KEY) {
  check('STRIPE_SECRET_KEY is live key',
    process.env.STRIPE_SECRET_KEY.startsWith('sk_live_'),
    'using test key (sk_test_)');
}

// Check CLIENT_URL is not localhost
if (process.env.CLIENT_URL) {
  check('CLIENT_URL is not localhost',
    !process.env.CLIENT_URL.includes('localhost'),
    process.env.CLIENT_URL);
}

// Check ALLOWED_ORIGINS doesn't contain localhost
if (process.env.ALLOWED_ORIGINS) {
  check('ALLOWED_ORIGINS has no localhost',
    !process.env.ALLOWED_ORIGINS.includes('localhost'),
    process.env.ALLOWED_ORIGINS);
}

console.log('\nClient Environment Variables:');
for (const v of REQUIRED_CLIENT_VARS) {
  check(v, !!process.env[v], 'not set');
}

console.log('\nOptional Variables:');
for (const v of OPTIONAL_VARS) {
  warn(v, !!process.env[v], 'not set (optional)');
}

console.log('\n--- Summary ---');
console.log(`  Passed:   ${passed}`);
console.log(`  Failed:   ${failed}`);
console.log(`  Warnings: ${warnings}`);
console.log(`  Result:   ${failed === 0 ? 'READY FOR LAUNCH' : 'NOT READY -- fix failures above'}`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
