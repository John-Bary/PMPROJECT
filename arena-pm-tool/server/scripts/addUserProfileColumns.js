/**
 * Migration script to add user profile columns
 * Adds first_name, last_name, language, timezone, and notification settings
 *
 * Run with: node scripts/addUserProfileColumns.js
 */

const { pool } = require('../config/database');

async function addUserProfileColumns() {
  const client = await pool.connect();

  try {
    console.log('Starting user profile columns migration...\n');

    await client.query('BEGIN');

    // Check if first_name column already exists
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'first_name'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('Migration already applied. Columns already exist.');
      await client.query('ROLLBACK');
      return;
    }

    // Add new columns
    console.log('Adding first_name column...');
    await client.query(`
      ALTER TABLE users ADD COLUMN first_name VARCHAR(60)
    `);

    console.log('Adding last_name column...');
    await client.query(`
      ALTER TABLE users ADD COLUMN last_name VARCHAR(60)
    `);

    console.log('Adding language column...');
    await client.query(`
      ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'en'
    `);

    console.log('Adding timezone column...');
    await client.query(`
      ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'
    `);

    console.log('Adding email_notifications_enabled column...');
    await client.query(`
      ALTER TABLE users ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT true
    `);

    console.log('Adding email_digest_mode column...');
    await client.query(`
      ALTER TABLE users ADD COLUMN email_digest_mode VARCHAR(20) DEFAULT 'immediate'
    `);

    // Migrate existing name data to first_name and last_name
    console.log('\nMigrating existing name data...');
    await client.query(`
      UPDATE users
      SET
        first_name = TRIM(SPLIT_PART(name, ' ', 1)),
        last_name = CASE
          WHEN POSITION(' ' IN name) > 0
          THEN TRIM(SUBSTRING(name FROM POSITION(' ' IN name) + 1))
          ELSE TRIM(SPLIT_PART(name, ' ', 1))
        END
      WHERE first_name IS NULL
    `);

    // Set NOT NULL constraints after data migration
    console.log('Setting NOT NULL constraints...');
    await client.query(`
      ALTER TABLE users
      ALTER COLUMN first_name SET NOT NULL,
      ALTER COLUMN last_name SET NOT NULL
    `);

    await client.query('COMMIT');

    // Verify migration
    const result = await client.query(`
      SELECT id, name, first_name, last_name, language, timezone,
             email_notifications_enabled, email_digest_mode
      FROM users
      LIMIT 5
    `);

    console.log('\n--- Migration completed successfully! ---\n');
    console.log('Sample user data after migration:');
    console.table(result.rows);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
addUserProfileColumns()
  .then(() => {
    console.log('\nMigration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
