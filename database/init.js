import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to run SQL file
async function runSqlFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await db.query(sql);
    console.log(`Successfully executed SQL file: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`Error executing SQL file ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

// Initialize database
async function initDatabase() {
  console.log('Initializing database...');
  
  // Check if tables exist
  try {
    // Run all migration files in the migrations directory
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log('Created migrations directory');
    }
    
    // Get all SQL files in the migrations directory
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure proper order
    
    // Run each migration file
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      await runSqlFile(filePath);
    }
    
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Export the initialization function
export default initDatabase;