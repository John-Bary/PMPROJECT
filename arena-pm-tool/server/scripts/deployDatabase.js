#!/usr/bin/env node

/**
 * Production Database Deployment Script
 *
 * Deploys schema and seeds to a production database.
 * Supports both individual env vars and DATABASE_URL.
 *
 * Usage:
 *   npm run db:deploy
 *   node scripts/deployDatabase.js
 *
 * For production, ensure these are set:
 *   DATABASE_URL (or DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
 *   DB_SSL=true (for managed databases)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

// Build connection config
const getPoolConfig = () => {
  const config = {
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  if (process.env.DATABASE_URL) {
    config.connectionString = process.env.DATABASE_URL;
    config.ssl = { rejectUnauthorized: false };
    return config;
  }

  config.host = process.env.DB_HOST;
  config.port = process.env.DB_PORT;
  config.database = process.env.DB_NAME;
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;

  if (process.env.DB_SSL === 'true') {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
};

const poolConfig = getPoolConfig();

// Determine database name for display
const dbName = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.split('/').pop().split('?')[0]
  : process.env.DB_NAME;

const dbHost = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'remote'
  : process.env.DB_HOST;

async function deployDatabase() {
  console.log('==========================================');
  console.log('Todoria - Production Database Deploy');
  console.log('==========================================\n');

  console.log(`Database: ${dbName}`);
  console.log(`Host: ${dbHost}`);
  console.log(`SSL: ${poolConfig.ssl ? 'Enabled' : 'Disabled'}`);

  // Check for --force flag to skip confirmation
  const forceMode = process.argv.includes('--force');

  if (!forceMode) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('\nThis will reset the database. Type "DEPLOY" to confirm: ', resolve);
    });
    rl.close();

    if (answer !== 'DEPLOY') {
      console.log('Deployment cancelled.');
      process.exit(0);
    }
  }

  const pool = new Pool(poolConfig);

  try {
    // Test connection
    console.log('\n1. Testing connection...');
    const testResult = await pool.query('SELECT NOW() as time, version() as version');
    console.log(`   ✅ Connected at ${testResult.rows[0].time}`);

    // Run schema
    console.log('\n2. Running schema migrations...');
    const schemaPath = path.join(__dirname, '../config/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schemaSql);
    console.log('   ✅ Schema deployed successfully');

    // Verify tables
    console.log('\n3. Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('   Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Check data
    console.log('\n4. Verifying seed data...');
    const usersResult = await pool.query('SELECT id, email, name, role FROM users ORDER BY id');
    const categoriesResult = await pool.query('SELECT id, name FROM categories ORDER BY position');
    const tasksResult = await pool.query('SELECT COUNT(*) as count FROM tasks');

    console.log('\n   Users:');
    usersResult.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.name}) [${user.role}]`);
    });

    console.log('\n   Categories:');
    categoriesResult.rows.forEach(cat => {
      console.log(`   - ${cat.name}`);
    });

    console.log(`\n   Tasks: ${tasksResult.rows[0].count} demo tasks created`);

    console.log('\n==========================================');
    console.log('✅ Database deployment completed!');
    console.log('==========================================');
    console.log('\nLogin credentials (all passwords: password123):');
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.email}`);
    });

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nConnection refused. Check:');
      console.error('  - Database host and port are correct');
      console.error('  - Database server is running');
      console.error('  - Firewall allows connections');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\nHost not found. Check DB_HOST or DATABASE_URL');
    } else if (error.message.includes('SSL')) {
      console.error('\nSSL error. Try setting DB_SSL=true');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

deployDatabase();
