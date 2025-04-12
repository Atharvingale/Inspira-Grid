import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the migration file
const migrationFile = path.join(__dirname, '../database/migrations/create_project_updates_table.sql');

// Read and execute the SQL file
async function runMigration() {
  try {
    console.log('Running migration...');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    await db.query(sql);
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();