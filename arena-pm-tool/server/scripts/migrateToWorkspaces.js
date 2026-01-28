#!/usr/bin/env node

/**
 * Migration Script: Migrate Existing Users to Multi-Workspace Model
 *
 * This script:
 * 1. Creates a personal workspace for each existing user
 * 2. Adds users as admin of their personal workspace
 * 3. Migrates their existing tasks and categories to that workspace
 *
 * Run with: node scripts/migrateToWorkspaces.js
 *
 * IMPORTANT: Run this only AFTER the workspace tables have been created
 * via the database schema migration (Phase 1).
 */

require('dotenv').config();
const { pool, query, getClient } = require('../config/database');

const migrateToWorkspaces = async () => {
  console.log('\n========================================');
  console.log('  WORKSPACE MIGRATION SCRIPT');
  console.log('========================================\n');

  const client = await getClient();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Step 1: Get all existing users
    console.log('Step 1: Fetching existing users...');
    const usersResult = await client.query(
      'SELECT id, name, email FROM users ORDER BY id ASC'
    );
    const users = usersResult.rows;
    console.log(`   Found ${users.length} user(s)\n`);

    if (users.length === 0) {
      console.log('No users found. Nothing to migrate.');
      await client.query('COMMIT');
      return;
    }

    // Step 2: For each user, check if they already have a workspace
    console.log('Step 2: Creating workspaces for users without one...\n');

    let workspacesCreated = 0;
    let workspacesSkipped = 0;

    for (const user of users) {
      // Check if user already has a workspace
      const existingWorkspace = await client.query(
        'SELECT id FROM workspace_members WHERE user_id = $1 LIMIT 1',
        [user.id]
      );

      if (existingWorkspace.rows.length > 0) {
        console.log(`   Skipping user "${user.name}" (${user.email}) - already has workspace`);
        workspacesSkipped++;
        continue;
      }

      // Create personal workspace
      const workspaceName = `${user.name}'s Workspace`;
      const workspaceResult = await client.query(
        'INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id, name',
        [workspaceName, user.id]
      );
      const workspace = workspaceResult.rows[0];

      // Add user as admin of their workspace
      await client.query(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
        [workspace.id, user.id, 'admin']
      );

      console.log(`   Created workspace "${workspace.name}" for user "${user.name}"`);
      workspacesCreated++;

      // Step 3: Migrate user's categories to their workspace
      const categoriesUpdated = await client.query(
        `UPDATE categories
         SET workspace_id = $1
         WHERE created_by = $2 AND workspace_id IS NULL`,
        [workspace.id, user.id]
      );
      if (categoriesUpdated.rowCount > 0) {
        console.log(`      - Migrated ${categoriesUpdated.rowCount} categories`);
      }

      // Step 4: Migrate user's tasks to their workspace
      const tasksUpdated = await client.query(
        `UPDATE tasks
         SET workspace_id = $1
         WHERE created_by = $2 AND workspace_id IS NULL`,
        [workspace.id, user.id]
      );
      if (tasksUpdated.rowCount > 0) {
        console.log(`      - Migrated ${tasksUpdated.rowCount} tasks`);
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    // Summary
    console.log('\n========================================');
    console.log('  MIGRATION COMPLETE');
    console.log('========================================');
    console.log(`  Workspaces created: ${workspacesCreated}`);
    console.log(`  Users skipped (already had workspace): ${workspacesSkipped}`);
    console.log('========================================\n');

    // Verification: Show current state
    console.log('Verification - Current workspace distribution:\n');
    const verificationResult = await query(`
      SELECT
        w.id,
        w.name,
        u.email as owner_email,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
        (SELECT COUNT(*) FROM categories WHERE workspace_id = w.id) as category_count,
        (SELECT COUNT(*) FROM tasks WHERE workspace_id = w.id) as task_count
      FROM workspaces w
      LEFT JOIN users u ON w.owner_id = u.id
      ORDER BY w.created_at ASC
    `);

    console.log('Workspace | Owner | Members | Categories | Tasks');
    console.log('----------|-------|---------|------------|------');
    verificationResult.rows.forEach(row => {
      console.log(
        `${row.name.substring(0, 20).padEnd(20)} | ` +
        `${(row.owner_email || 'N/A').substring(0, 15).padEnd(15)} | ` +
        `${String(row.member_count).padStart(7)} | ` +
        `${String(row.category_count).padStart(10)} | ` +
        `${String(row.task_count).padStart(5)}`
      );
    });
    console.log('\n');

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('\n========================================');
    console.error('  MIGRATION FAILED');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error('\nAll changes have been rolled back.');
    console.error('========================================\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration
migrateToWorkspaces()
  .then(() => {
    console.log('Migration script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
