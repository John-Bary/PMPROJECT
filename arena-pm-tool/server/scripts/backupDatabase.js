#!/usr/bin/env node

/**
 * Database Backup Script for Todoria
 *
 * Creates a timestamped pg_dump backup of the database.
 * Can be run manually or scheduled via cron.
 *
 * Usage:
 *   npm run db:backup
 *   node scripts/backupDatabase.js
 *
 * Environment variables required:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *
 * Optional:
 *   BACKUP_DIR - Directory to store backups (default: ./backups)
 *   BACKUP_RETENTION_DAYS - Days to keep old backups (default: 7)
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 7;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`Created backup directory: ${BACKUP_DIR}`);
}

// Generate timestamp for filename
const timestamp = new Date().toISOString()
  .replace(/[:.]/g, '-')
  .replace('T', '_')
  .slice(0, 19);

const backupFilename = `todorio_backup_${timestamp}.sql`;
const backupPath = path.join(BACKUP_DIR, backupFilename);

// Build pg_dump command
const dbPassword = process.env.DB_PASSWORD || '';
const pgDumpArgs = [
  '-h', process.env.DB_HOST || 'localhost',
  '-p', process.env.DB_PORT || '5432',
  '-U', process.env.DB_USER || 'postgres',
  '-d', process.env.DB_NAME || 'todorio',
  '-F', 'p',
  '--clean',
  '--if-exists',
  '--no-owner',
  '-f', backupPath
];

const pgDumpCommand = dbPassword
  ? `PGPASSWORD="${dbPassword}" pg_dump ${pgDumpArgs.join(' ')}`
  : `pg_dump ${pgDumpArgs.join(' ')}`;

console.log('Starting database backup...');
console.log(`Database: ${process.env.DB_NAME || 'todorio'}`);
console.log(`Output: ${backupPath}`);

exec(pgDumpCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('Backup failed:', error.message);
    if (stderr) console.error('stderr:', stderr);
    process.exit(1);
  }

  // Get file size
  const stats = fs.statSync(backupPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`Backup completed successfully!`);
  console.log(`File: ${backupFilename}`);
  console.log(`Size: ${fileSizeMB} MB`);

  // Clean up old backups
  cleanupOldBackups();
});

function cleanupOldBackups() {
  console.log(`\nCleaning up backups older than ${RETENTION_DAYS} days...`);

  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  files.forEach(file => {
    if (!file.startsWith('todorio_backup_')) return;

    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtime.getTime();

    if (age > maxAge) {
      fs.unlinkSync(filePath);
      console.log(`  Deleted: ${file}`);
      deletedCount++;
    }
  });

  console.log(`Cleaned up ${deletedCount} old backup(s)`);
}
