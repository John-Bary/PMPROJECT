// Migration script for multiple assignees feature
// Migrates existing single assignee_id data to task_assignments table

const { query, pool } = require('../config/database');

async function migrateAssignees() {
  console.log('Starting assignee migration...\n');

  try {
    // Step 1: Add indexes if they don't exist
    console.log('Step 1: Adding indexes to task_assignments table...');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
    `);
    console.log('  - Created index on task_id');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
    `);
    console.log('  - Created index on user_id');

    // Step 2: Count existing tasks with assignees
    const countResult = await query(
      'SELECT COUNT(*) FROM tasks WHERE assignee_id IS NOT NULL'
    );
    const taskCount = parseInt(countResult.rows[0].count);
    console.log(`\nStep 2: Found ${taskCount} tasks with single assignee_id`);

    if (taskCount === 0) {
      console.log('  - No tasks to migrate');
    } else {
      // Step 3: Migrate existing assignees to junction table
      console.log('\nStep 3: Migrating to task_assignments table...');

      const migrateResult = await query(`
        INSERT INTO task_assignments (task_id, user_id, assigned_at)
        SELECT id, assignee_id, created_at
        FROM tasks
        WHERE assignee_id IS NOT NULL
        ON CONFLICT (task_id, user_id) DO NOTHING
        RETURNING task_id
      `);
      console.log(`  - Migrated ${migrateResult.rowCount} assignments`);

      // Step 4: Verify migration
      console.log('\nStep 4: Verifying migration...');

      const verifyResult = await query(`
        SELECT t.id, t.title, t.assignee_id, ta.user_id as migrated_user_id
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id AND t.assignee_id = ta.user_id
        WHERE t.assignee_id IS NOT NULL AND ta.user_id IS NULL
      `);

      if (verifyResult.rows.length > 0) {
        console.error('  WARNING: Some tasks were not migrated:');
        verifyResult.rows.forEach(row => {
          console.error(`    - Task ${row.id}: "${row.title}" (assignee_id: ${row.assignee_id})`);
        });
      } else {
        console.log('  - All tasks successfully migrated!');
      }
    }

    // Step 5: Show final counts
    console.log('\nStep 5: Final statistics...');

    const assignmentCount = await query('SELECT COUNT(*) FROM task_assignments');
    console.log(`  - Total entries in task_assignments: ${assignmentCount.rows[0].count}`);

    const tasksWithAssignees = await query(`
      SELECT COUNT(DISTINCT task_id) FROM task_assignments
    `);
    console.log(`  - Tasks with at least one assignee: ${tasksWithAssignees.rows[0].count}`);

    console.log('\nMigration completed successfully!');
    console.log('\nNote: The assignee_id column on tasks table is now deprecated.');
    console.log('New code should use the task_assignments table for all assignee operations.');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  migrateAssignees()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateAssignees };
