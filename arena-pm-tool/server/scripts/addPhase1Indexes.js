// Phase 1 — Add missing composite indexes for multi-tenant query performance
// Run with: node server/scripts/addPhase1Indexes.js

require('dotenv').config();
const { pool } = require('../config/database');

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_tasks_workspace_due ON tasks(workspace_id, due_date)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_workspace_category ON tasks(workspace_id, category_id)',
  'CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(workspace_id, role)',
  'CREATE INDEX IF NOT EXISTS idx_invitations_workspace_email ON workspace_invitations(workspace_id, email) WHERE accepted_at IS NULL',
];

async function run() {
  const client = await pool.connect();
  try {
    for (const sql of INDEXES) {
      console.log(`Running: ${sql}`);
      await client.query(sql);
      console.log('  OK');
    }
    console.log('\nAll Phase 1 indexes created successfully.');
  } catch (error) {
    console.error('Error creating indexes:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
