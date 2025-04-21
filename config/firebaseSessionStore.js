import { Store } from 'express-session';
import { 
  collection, doc, getDoc, setDoc, deleteDoc, 
  query as firestoreQuery, where, getDocs, serverTimestamp 
} from 'firebase/firestore';

class FirebaseSessionStore extends Store {
  constructor(options = {}) {
    super(options);
    this.db = options.db;
    this.collection = options.collection || 'sessions';
    this.ttl = options.ttl || 86400; // Default 24 hours
  }

  // Get a session from the store given a session ID
  async get(sid, callback) {
    try {
      const sessionRef = doc(this.db, this.collection, sid);
      const sessionSnap = await getDoc(sessionRef);
      
      if (!sessionSnap.exists()) {
        return callback(null, null);
      }
      
      const sessionData = sessionSnap.data();
      
      // Check if session has expired
      if (sessionData.expiresAt && new Date(sessionData.expiresAt) < new Date()) {
        await this.destroy(sid);
        return callback(null, null);
      }
      
      // Parse the serialized session data
      return callback(null, JSON.parse(sessionData.sessionData || '{}'));
    } catch (error) {
      return callback(error);
    }
  }

  // Upsert a session in the store given a session ID and session data
  async set(sid, session, callback) {
    try {
      const sessionRef = doc(this.db, this.collection, sid);
      const expires = new Date(Date.now() + (this.ttl * 1000));
      
      // Serialize the session object to JSON string
      const sessionData = JSON.stringify(session);
      
      await setDoc(sessionRef, {
        sessionData,
        created: serverTimestamp(),
        expiresAt: expires.toISOString()
      });
      
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  // Destroy the session with the given session ID
  async destroy(sid, callback = () => {}) {
    try {
      const sessionRef = doc(this.db, this.collection, sid);
      await deleteDoc(sessionRef);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  // Clear all sessions from the store
  async clear(callback) {
    try {
      const sessionsRef = collection(this.db, this.collection);
      const sessionsSnapshot = await getDocs(sessionsRef);
      
      const deletePromises = [];
      sessionsSnapshot.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  // Get the count of all sessions in the store
  async length(callback) {
    try {
      const sessionsRef = collection(this.db, this.collection);
      const sessionsSnapshot = await getDocs(sessionsRef);
      callback(null, sessionsSnapshot.size);
    } catch (error) {
      callback(error);
    }
  }

  // Get all sessions in the store
  async all(callback) {
    try {
      const sessionsRef = collection(this.db, this.collection);
      const sessionsSnapshot = await getDocs(sessionsRef);
      
      const sessions = {};
      sessionsSnapshot.forEach(doc => {
        const sessionData = doc.data();
        sessions[doc.id] = sessionData.session;
      });
      
      callback(null, sessions);
    } catch (error) {
      callback(error);
    }
  }
}

export default FirebaseSessionStore;