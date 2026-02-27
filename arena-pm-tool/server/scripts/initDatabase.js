// Database Initialization Script
// Run this to create the database and tables

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// First, connect without specifying a database to create it
const adminPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'postgres' // Connect to default postgres database
});

async function initializeDatabase() {
  try {
    // DATA-03: Prevent running with demo seeds in production
    if (process.env.NODE_ENV === 'production') {
      console.error('ERROR: initDatabase.js should not be run in production. Use proper migrations instead.');
      process.exit(1);
    }

    console.log('🔧 Starting database initialization...\n');

    // INJ-01: Validate DB_NAME to prevent SQL injection (only allow alphanumeric, underscores, hyphens)
    const dbName = process.env.DB_NAME;
    if (!dbName || !/^[a-zA-Z0-9_-]+$/.test(dbName)) {
      console.error('ERROR: DB_NAME must only contain alphanumeric characters, underscores, and hyphens.');
      process.exit(1);
    }

    // Step 1: Create database if it doesn't exist
    console.log('1️⃣ Creating database if not exists...');
    const checkResult = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    if (checkResult.rows.length === 0) {
      // DB_NAME is validated above to be safe for identifier interpolation
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`   ✅ Database '${dbName}' created`);
    } else {
      console.log(`   ℹ️  Database '${dbName}' already exists`);
    }

    // Close admin connection
    await adminPool.end();

    // Step 2: Connect to the new database and run schema
    console.log('\n2️⃣ Running schema SQL...');
    const appPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: dbName,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    // Read and execute schema file
    const schemaPath = path.join(__dirname, '../config/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await appPool.query(schemaSql);
    console.log('   ✅ Schema created successfully');

    // Step 3: Verify tables were created
    console.log('\n3️⃣ Verifying tables...');
    const tablesResult = await appPool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('   ✅ Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`      - ${row.table_name}`);
    });

    // Step 4: Check demo data
    console.log('\n4️⃣ Checking demo data...');
    const usersCount = await appPool.query('SELECT COUNT(*) FROM users');
    const categoriesCount = await appPool.query('SELECT COUNT(*) FROM categories');
    const tasksCount = await appPool.query('SELECT COUNT(*) FROM tasks');

    console.log(`   ✅ Users: ${usersCount.rows[0].count}`);
    console.log(`   ✅ Categories: ${categoriesCount.rows[0].count}`);
    console.log(`   ✅ Tasks: ${tasksCount.rows[0].count}`);

    // Close connection
    await appPool.end();

    console.log('\n✨ Database initialization completed successfully!');
    console.log('\n📝 Demo credentials:');
    console.log('   Email: admin@todoria.app');
    console.log('   Password: password123');
    console.log('\n   Other users: john@todoria.app, jane@todoria.app, mike@todoria.app, sarah@todoria.app');
    console.log('   All passwords: password123\n');

  } catch (error) {
    console.error('\n❌ Error initializing database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
