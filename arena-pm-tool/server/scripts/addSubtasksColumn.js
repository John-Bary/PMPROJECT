// Migration script to add parent_task_id column to tasks table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function addSubtasksColumn() {
  try {
    console.log('🔧 Adding subtasks support to database...\n');

    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tasks' AND column_name='parent_task_id'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('   ℹ️  parent_task_id column already exists');
      await pool.end();
      return;
    }

    // Add parent_task_id column
    console.log('1️⃣ Adding parent_task_id column...');
    await pool.query(`
      ALTER TABLE tasks 
      ADD COLUMN parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE
    `);
    console.log('   ✅ parent_task_id column added');

    // Add index for performance
    console.log('\n2️⃣ Adding index for parent_task_id...');
    await pool.query(`
      CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id)
    `);
    console.log('   ✅ Index created');

    await pool.end();
    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Error running migration:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addSubtasksColumn();
