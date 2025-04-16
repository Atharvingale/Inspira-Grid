import { db } from './firebase.js';
import { 
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, 
  query as firestoreQuery, where, orderBy, limit, startAfter, serverTimestamp 
} from 'firebase/firestore';

// Helper function to convert Firestore document to a more usable format
const convertDoc = (doc) => {
  return {
    id: doc.id,
    ...doc.data()
  };
};

// Query function that mimics the PostgreSQL query interface
const query = async (collectionName, options = {}) => {
  try {
    const collectionRef = collection(db, collectionName);
    
    // Build query based on options
    let q = collectionRef;
    
    if (options.where) {
      options.where.forEach(condition => {
        q = firestoreQuery(q, where(condition.field, condition.operator, condition.value));
      });
    }
    
    if (options.orderBy) {
      options.orderBy.forEach(order => {
        q = firestoreQuery(q, orderBy(order.field, order.direction || 'asc'));
      });
    }
    
    if (options.limit) {
      q = firestoreQuery(q, limit(options.limit));
    }
    
    // Execute query
    const querySnapshot = await getDocs(q);
    
    // Format results to match PostgreSQL response format
    const rows = [];
    querySnapshot.forEach(doc => {
      rows.push(convertDoc(doc));
    });
    
    return { rows };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Add a document to a collection
const add = async (collectionName, data) => {
  try {
    // Add timestamp
    data.created_at = serverTimestamp();
    data.updated_at = serverTimestamp();
    
    const docRef = await addDoc(collection(db, collectionName), data);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error('Database add error:', error);
    throw error;
  }
};

// Get a document by ID
const get = async (collectionName, id) => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return convertDoc(docSnap);
    } else {
      return null;
    }
  } catch (error) {
    console.error('Database get error:', error);
    throw error;
  }
};

// Update a document
const update = async (collectionName, id, data) => {
  try {
    // Add updated timestamp
    data.updated_at = serverTimestamp();
    
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
    return { id, ...data };
  } catch (error) {
    console.error('Database update error:', error);
    throw error;
  }
};

// Delete a document
const remove = async (collectionName, id) => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { id };
  } catch (error) {
    console.error('Database delete error:', error);
    throw error;
  }
};

// Export functions
export default {
  query,
  add,
  get,
  update,
  remove
};