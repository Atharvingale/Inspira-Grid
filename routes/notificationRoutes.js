import express from 'express';
const router = express.Router();
import { 
  collection, doc, getDoc, getDocs, query as firestoreQuery, where, 
  orderBy, limit, addDoc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

import { db } from '../config/firebase.js';

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/signin");
};

// Get user notifications
router.get("/notifications", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    
    // Get notifications for the user
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('user_id', '==', userId),
      orderBy('created_at', 'desc'),
      limit(50)
    );
    const notificationsSnapshot = await getDocs(notificationsQuery);
    
    const notifications = notificationsSnapshot.docs.map(doc => ({
      notification_id: doc.id,
      ...doc.data(),
      created_at_formatted: doc.data().created_at ? 
        new Date(doc.data().created_at.toDate()).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'recently'
    }));
    
    // Count unread notifications
    const unreadCount = notifications.filter(notification => !notification.is_read).length;
    
    return res.status(200).json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications"
    });
  }
});

// Mark notification as read
router.put("/notifications/:id/read", isAuthenticated, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.session.user.user_id;
    
    // Check if notification exists and belongs to user
    const notificationRef = doc(db, 'notifications', notificationId);
    const notificationSnap = await getDoc(notificationRef);
    
    if (!notificationSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }
    
    if (notificationSnap.data().user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this notification"
      });
    }
    
    // Mark as read
    await updateDoc(notificationRef, {
      is_read: true,
      read_at: serverTimestamp()
    });
    
    return res.status(200).json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read"
    });
  }
});

// Mark all notifications as read
router.put("/notifications/read-all", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    
    // Get unread notifications for the user
    const notificationsRef = collection(db, 'notifications');
    const unreadQuery = query(
      notificationsRef,
      where('user_id', '==', userId),
      where('is_read', '==', false)
    );
    const unreadSnapshot = await getDocs(unreadQuery);
    
    // Mark all as read
    const updatePromises = unreadSnapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        is_read: true,
        read_at: serverTimestamp()
      })
    );
    
    await Promise.all(updatePromises);
    
    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      count: unreadSnapshot.size
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read"
    });
  }
});

// Delete notification
router.delete("/notifications/:id", isAuthenticated, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.session.user.user_id;
    
    // Check if notification exists and belongs to user
    const notificationRef = doc(db, 'notifications', notificationId);
    const notificationSnap = await getDoc(notificationRef);
    
    if (!notificationSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }
    
    if (notificationSnap.data().user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this notification"
      });
    }
    
    // Delete notification
    await deleteDoc(notificationRef);
    
    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification"
    });
  }
});

export default router;