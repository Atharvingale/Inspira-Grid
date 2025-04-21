import { 
  collection, doc, getDoc, getDocs, query as firestoreQuery, 
  where, orderBy, limit, addDoc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

// Get all active sessions
export const getAllActiveSessions = async () => {
  try {
    const now = new Date();
    const sessionsRef = collection(db, 'sessions');
    const sessionsQuery = firestoreQuery(
      sessionsRef,
      where('expiresAt', '>', now)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);
    
    const sessions = [];
    sessionsSnapshot.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return sessions;
  } catch (error) {
    console.error('Error getting active sessions:', error);
    throw error;
  }
};

// Clean up expired sessions
export const cleanupExpiredSessions = async () => {
  try {
    const now = new Date();
    const sessionsRef = collection(db, 'sessions');
    const expiredSessionsQuery = firestoreQuery(
      sessionsRef,
      where('expiresAt', '<', now)
    );
    const expiredSessionsSnapshot = await getDocs(expiredSessionsQuery);
    
    const deletePromises = [];
    expiredSessionsSnapshot.forEach(doc => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    console.log(`Cleaned up ${deletePromises.length} expired sessions`);
    
    return deletePromises.length;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    throw error;
  }
};

// Get user sessions
export const getUserSessions = async (userId) => {
  try {
    const sessionsRef = collection(db, 'sessions');
    const sessionsSnapshot = await getDocs(sessionsRef);
    
    const userSessions = [];
    sessionsSnapshot.forEach(doc => {
      const sessionData = doc.data();
      // Parse the serialized session data
      if (sessionData.sessionData) {
        const parsedSession = JSON.parse(sessionData.sessionData);
        if (parsedSession.user && parsedSession.user.user_id === userId) {
          userSessions.push({
            id: doc.id,
            ...sessionData,
            session: parsedSession
          });
        }
      }
    });
    
    return userSessions;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    throw error;
  }
};

// Invalidate all sessions for a user
export const invalidateUserSessions = async (userId) => {
  try {
    const userSessions = await getUserSessions(userId);
    
    const deletePromises = [];
    userSessions.forEach(session => {
      deletePromises.push(deleteDoc(doc(db, 'sessions', session.id)));
    });
    
    await Promise.all(deletePromises);
    console.log(`Invalidated ${deletePromises.length} sessions for user ${userId}`);
    
    return deletePromises.length;
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
    throw error;
  }
};