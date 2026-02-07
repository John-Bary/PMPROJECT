// Migration: Add activity_log table for workspace activity tracking
// Run with: node scripts/addActivityLog.js

const { query, pool } = require('../config/database');

async function migrate() {
  console.log('Adding activity_log table...');

  await query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      entity_type VARCHAR(30) NOT NULL,
      entity_id VARCHAR(50),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON activity_log(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
  `);

  console.log('Migration complete: activity_log table created.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
