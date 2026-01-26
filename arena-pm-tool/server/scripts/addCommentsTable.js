// Migration script to add comments table
const { pool, query } = require('../config/database');

async function addCommentsTable() {
  try {
    console.log('Creating comments table...');

    // Create comments table
    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Comments table created successfully.');

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id)
    `);
    console.log('Index on task_id created.');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id)
    `);
    console.log('Index on author_id created.');

    // Create trigger for updated_at
    await query(`
      CREATE OR REPLACE TRIGGER update_comments_updated_at
      BEFORE UPDATE ON comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('Update trigger created.');

    console.log('\nComments table migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
addCommentsTable()
  .then(() => {
    console.log('Migration finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
