import { db } from '../config/firebase.js';
import { collection, getDocs, query as firestoreQuery, limit } from 'firebase/firestore';

// Initialize database
async function initDatabase() {
  console.log('Checking Firebase database connection...');
  
  try {
    // Test the connection by querying a collection
    const testQuery = firestoreQuery(collection(db, 'users'), limit(1));
    await getDocs(testQuery);
    
    console.log('Firebase database connection successful');
    
    // No need to create collections in Firebase as they are created automatically
    // when documents are added
    
    console.log('Firebase database initialization completed');
    return true;
  } catch (error) {
    console.error('Error initializing Firebase database:', error);
    throw error;
  }
}

// Export the initialization function
export default initDatabase;