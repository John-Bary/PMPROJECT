// Database Reset Script
// WARNING: This will delete all data and recreate tables

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function resetDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('⚠️  WARNING: This will DELETE ALL DATA and reset the database!');
    console.log('🔧 Starting database reset...\n');

    // Read and execute schema file (it includes DROP TABLE statements)
    const schemaPath = path.join(__dirname, '../config/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schemaSql);

    console.log('✅ Database reset completed successfully!');
    console.log('\n📝 Demo credentials:');
    console.log('   Email: admin@todoria.app');
    console.log('   Password: password123\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    await pool.end();
    process.exit(1);
  }
}

resetDatabase();
