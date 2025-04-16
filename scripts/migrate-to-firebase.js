import pg from 'pg';
import dotenv from 'dotenv';
import { db } from '../config/firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Load environment variables
dotenv.config();

// Create a PostgreSQL client
const pgClient = new pg.Client({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "inspira_grid",
  password: process.env.DB_PASSWORD || "123456789",
  port: process.env.DB_PORT || 5432
});

// Function to migrate a table to a Firestore collection
async function migrateTable(tableName, collectionName) {
  console.log(`Migrating ${tableName} to ${collectionName}...`);
  
  try {
    // Get all rows from PostgreSQL table
    const result = await pgClient.query(`SELECT * FROM ${tableName}`);
    
    // Add each row to Firestore
    for (const row of result.rows) {
      // Convert PostgreSQL row to Firestore document
      const doc = { ...row };
      
      // Convert dates to Firestore timestamps
      if (doc.created_at) {
        doc.created_at = new Date(doc.created_at);
      } else {
        doc.created_at = serverTimestamp();
      }
      
      if (doc.updated_at) {
        doc.updated_at = new Date(doc.updated_at);
      } else {
        doc.updated_at = serverTimestamp();
      }
      
      // Add document to Firestore
      await addDoc(collection(db, collectionName), doc);
    }
    
    console.log(`Migrated ${result.rows.length} records from ${tableName} to ${collectionName}`);
  } catch (error) {
    console.error(`Error migrating ${tableName}:`, error);
  }
}

// Main migration function
async function migrateToFirebase() {
  try {
    console.log('Starting migration from PostgreSQL to Firebase...');
    
    // Connect to PostgreSQL
    await pgClient.connect();
    
    // Get list of tables
    const tablesResult = await pgClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Migrate each table
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      await migrateTable(tableName, tableName);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close PostgreSQL connection
    await pgClient.end();
    process.exit(0);
  }
}

// Run the migration
migrateToFirebase();