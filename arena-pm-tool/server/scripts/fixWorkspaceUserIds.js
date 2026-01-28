// Migration script to fix workspace table user ID types
// Changes UUID columns to INTEGER to match Express users table
//
// Run with: npm run db:fix-workspace-ids

const { pool, query } = require('../config/database');

async function fixWorkspaceUserIds() {
  const client = await pool.connect();

  try {
    console.log('\n========================================');
    console.log('  FIX WORKSPACE USER ID TYPES');
    console.log('========================================\n');
    console.log('This migration changes UUID user columns to INTEGER');
    console.log('to match the Express users table schema.\n');

    await client.query('BEGIN');

    // Step 1: Fix workspaces.owner_id (UUID -> INTEGER)
    console.log('Step 1: Fixing workspaces.owner_id...');
    await client.query(`
      ALTER TABLE workspaces
      DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey
    `);
    await client.query(`
      ALTER TABLE workspaces
      ALTER COLUMN owner_id TYPE INTEGER USING NULL
    `);
    await client.query(`
      ALTER TABLE workspaces
      ADD CONSTRAINT workspaces_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('   ✓ workspaces.owner_id fixed\n');

    // Step 2: Fix workspace_members.user_id (UUID -> INTEGER)
    console.log('Step 2: Fixing workspace_members.user_id...');
    await client.query(`
      ALTER TABLE workspace_members
      DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey
    `);
    // Also need to drop the unique constraint that includes user_id
    await client.query(`
      ALTER TABLE workspace_members
      DROP CONSTRAINT IF EXISTS unique_workspace_member
    `);
    await client.query(`
      ALTER TABLE workspace_members
      ALTER COLUMN user_id TYPE INTEGER USING NULL
    `);
    await client.query(`
      ALTER TABLE workspace_members
      ADD CONSTRAINT workspace_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    // Re-add the unique constraint
    await client.query(`
      ALTER TABLE workspace_members
      ADD CONSTRAINT unique_workspace_member UNIQUE (workspace_id, user_id)
    `);
    console.log('   ✓ workspace_members.user_id fixed\n');

    // Step 3: Fix workspace_invitations.invited_by (UUID -> INTEGER)
    console.log('Step 3: Fixing workspace_invitations.invited_by...');
    await client.query(`
      ALTER TABLE workspace_invitations
      DROP CONSTRAINT IF EXISTS workspace_invitations_invited_by_fkey
    `);
    await client.query(`
      ALTER TABLE workspace_invitations
      ALTER COLUMN invited_by TYPE INTEGER USING NULL
    `);
    await client.query(`
      ALTER TABLE workspace_invitations
      ADD CONSTRAINT workspace_invitations_invited_by_fkey
      FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('   ✓ workspace_invitations.invited_by fixed\n');

    await client.query('COMMIT');

    // Verify the changes
    console.log('Step 4: Verifying column types...');
    const verifyResult = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name IN ('workspaces', 'workspace_members', 'workspace_invitations')
        AND column_name IN ('owner_id', 'user_id', 'invited_by')
      ORDER BY table_name, column_name
    `);

    console.log('   Column types after migration:');
    verifyResult.rows.forEach(row => {
      const status = row.data_type === 'integer' ? '✓' : '✗';
      console.log(`     ${status} ${row.table_name}.${row.column_name}: ${row.data_type}`);
    });

    console.log('\n========================================');
    console.log('  MIGRATION COMPLETED SUCCESSFULLY');
    console.log('========================================\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n========================================');
    console.error('  MIGRATION FAILED');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error('\nAll changes have been rolled back.');
    console.error('========================================\n');
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
fixWorkspaceUserIds()
  .then(() => {
    console.log('Migration script finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
