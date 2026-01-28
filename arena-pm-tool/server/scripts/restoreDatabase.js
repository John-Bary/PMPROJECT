#!/usr/bin/env node

/**
 * Database Restore Script for Todoria
 *
 * Restores database from a backup file.
 *
 * Usage:
 *   npm run db:restore -- --file=backups/arena_pm_backup_2024-01-20.sql
 *   node scripts/restoreDatabase.js --file=path/to/backup.sql
 */

const { exec } = require('child_process');
const fs = require('fs');
const readline = require('readline');
require('dotenv').config();

// Parse command line arguments
const args = process.argv.slice(2);
const fileArg = args.find(arg => arg.startsWith('--file='));

if (!fileArg) {
  console.error('Error: Please specify a backup file');
  console.log('Usage: npm run db:restore -- --file=backups/backup.sql');
  process.exit(1);
}

const backupFile = fileArg.replace('--file=', '');

if (!fs.existsSync(backupFile)) {
  console.error(`Error: Backup file not found: ${backupFile}`);
  process.exit(1);
}

// Confirm restoration
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('WARNING: This will overwrite the current database!');
console.log(`Database: ${process.env.DB_NAME || 'todoria'}`);
console.log(`Backup file: ${backupFile}`);

rl.question('\nType "RESTORE" to confirm: ', (answer) => {
  rl.close();

  if (answer !== 'RESTORE') {
    console.log('Restoration cancelled.');
    process.exit(0);
  }

  performRestore();
});

function performRestore() {
  console.log('\nStarting database restoration...');

  const dbPassword = process.env.DB_PASSWORD || '';
  const psqlArgs = [
    '-h', process.env.DB_HOST || 'localhost',
    '-p', process.env.DB_PORT || '5432',
    '-U', process.env.DB_USER || 'postgres',
    '-d', process.env.DB_NAME || 'todoria',
    '-f', backupFile
  ];

  const psqlCommand = dbPassword
    ? `PGPASSWORD="${dbPassword}" psql ${psqlArgs.join(' ')}`
    : `psql ${psqlArgs.join(' ')}`;

  exec(psqlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('Restoration failed:', error.message);
      if (stderr) console.error('stderr:', stderr);
      process.exit(1);
    }

    console.log('Database restored successfully!');
    if (stdout) console.log(stdout);
  });
}
