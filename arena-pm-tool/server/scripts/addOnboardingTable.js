// Migration script to add onboarding tracking tables
const { pool, query } = require('../config/database');

async function addOnboardingTable() {
  try {
    console.log('Adding onboarding_completed_at to workspace_members...');

    await query(`
      ALTER TABLE workspace_members
      ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE
    `);
    console.log('Column onboarding_completed_at added to workspace_members.');

    console.log('Creating workspace_onboarding_progress table...');

    await query(`
      CREATE TABLE IF NOT EXISTS workspace_onboarding_progress (
        id SERIAL PRIMARY KEY,
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        current_step INTEGER DEFAULT 1,
        steps_completed JSONB DEFAULT '[]'::jsonb,
        profile_updated BOOLEAN DEFAULT false,
        skipped_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_onboarding_per_member UNIQUE (workspace_id, user_id)
      )
    `);
    console.log('workspace_onboarding_progress table created.');

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_onboarding_workspace_id
      ON workspace_onboarding_progress(workspace_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_onboarding_user_id
      ON workspace_onboarding_progress(user_id)
    `);
    console.log('Indexes created.');

    // Create trigger for updated_at
    await query(`
      CREATE OR REPLACE TRIGGER update_onboarding_progress_updated_at
      BEFORE UPDATE ON workspace_onboarding_progress
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('Update trigger created.');

    console.log('\nOnboarding migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
addOnboardingTable()
  .then(() => {
    console.log('Migration finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
