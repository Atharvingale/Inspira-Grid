const express = require('express');
const { body, validationResult, query } = require('express-validator');
const admin = require('firebase-admin');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get Firestore instance
const db = admin.firestore();

// Search users for messaging
router.get('/search', [
  requireAuth,
  query('q').isString().isLength({ min: 2, max: 50 }).withMessage('Search query must be 2-50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const searchQuery = req.query.q.toLowerCase().trim();
    
    // Search users by displayName and email
    // Note: Firestore doesn't support case-insensitive search natively
    // This is a simple implementation - for production, consider using Algolia or similar
    const usersSnapshot = await db.collection('users')
      .where('profileComplete', '==', true) // Only show users with complete profiles
      .limit(20)
      .get();
    
    const users = [];
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      const displayName = (userData.displayName || '').toLowerCase();
      const email = (userData.email || '').toLowerCase();
      
      // Simple text matching
      if (displayName.includes(searchQuery) || email.includes(searchQuery)) {
        users.push({
          uid: doc.id,
          displayName: userData.displayName,
          email: userData.email,
          photoURL: userData.photoURL,
          bio: userData.bio,
          skills: userData.skills || []
        });
      }
    });

    // Sort by relevance (exact matches first, then partial matches)
    users.sort((a, b) => {
      const aDisplayName = (a.displayName || '').toLowerCase();
      const bDisplayName = (b.displayName || '').toLowerCase();
      const aEmail = (a.email || '').toLowerCase();
      const bEmail = (b.email || '').toLowerCase();
      
      // Exact matches first
      if (aDisplayName === searchQuery || aEmail === searchQuery) return -1;
      if (bDisplayName === searchQuery || bEmail === searchQuery) return 1;
      
      // Then starts with matches
      if (aDisplayName.startsWith(searchQuery) || aEmail.startsWith(searchQuery)) return -1;
      if (bDisplayName.startsWith(searchQuery) || bEmail.startsWith(searchQuery)) return 1;
      
      return 0;
    });

    res.json({
      users: users.slice(0, 10) // Limit to top 10 results
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      error: 'Failed to search users',
      message: error.message
    });
  }
});

// Get user profile by ID
router.get('/:userId', [
  requireAuth
], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    const userData = userDoc.data();
    
    // Return public profile information only
    const publicProfile = {
      uid: userDoc.id,
      displayName: userData.displayName,
      email: userData.email,
      photoURL: userData.photoURL,
      bio: userData.bio,
      location: userData.location,
      website: userData.website,
      skills: userData.skills || [],
      joinedAt: userData.joinedAt,
      profileComplete: userData.profileComplete
    };
    
    res.json(publicProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile',
      message: error.message
    });
  }
});

// Get users by IDs (for bulk operations)
router.post('/bulk', [
  requireAuth,
  body('userIds').isArray({ min: 1, max: 50 }).withMessage('userIds must be an array with 1-50 items'),
  body('userIds.*').isString().withMessage('Each user ID must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userIds } = req.body;
    const users = [];
    
    // Firestore has a limit of 10 items per 'in' query, so we'll use multiple queries if needed
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 10) {
      chunks.push(userIds.slice(i, i + 10));
    }
    
    for (const chunk of chunks) {
      const usersSnapshot = await db.collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
        .get();
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        users.push({
          uid: doc.id,
          displayName: userData.displayName,
          email: userData.email,
          photoURL: userData.photoURL,
          bio: userData.bio,
          skills: userData.skills || []
        });
      });
    }
    
    res.json({
      users
    });
  } catch (error) {
    console.error('Error fetching users bulk:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

module.exports = router;