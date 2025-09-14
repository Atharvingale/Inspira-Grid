const express = require('express');
const passport = require('../config/passport');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GitHub OAuth Routes

// Initiate GitHub OAuth
router.get('/github', 
  passport.authenticate('github', { 
    scope: ['user:email', 'public_repo', 'read:user'] 
  })
);

// GitHub OAuth callback
router.get('/github/callback',
  (req, res, next) => {
    console.log('GitHub callback received with code:', req.query.code?.substring(0, 10) + '...');
    
    passport.authenticate('github', (err, user, info) => {
      if (err) {
        console.error('GitHub OAuth authentication error:', err);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=github_auth_failed&details=${encodeURIComponent(err.message)}`);
      }
      
      if (!user) {
        console.error('GitHub OAuth failed - no user returned:', info);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=github_auth_no_user`);
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('Login error after GitHub OAuth:', err);
          return res.redirect(`${process.env.CLIENT_URL}/login?error=login_failed`);
        }
        
        console.log('GitHub OAuth success for user:', user.uid);
        const redirectUrl = `${process.env.CLIENT_URL}/dashboard?github_connected=true`;
        res.redirect(redirectUrl);
      });
    })(req, res, next);
  }
);

// Get current user's GitHub info
router.get('/github/profile', requireAuth, async (req, res) => {
  try {
    // Authentication is now handled by middleware

    if (!req.user.githubId) {
      return res.status(404).json({ 
        error: 'No GitHub account linked' 
      });
    }

    // Return GitHub profile info (without sensitive data)
    const githubInfo = {
      githubId: req.user.githubId,
      githubUsername: req.user.githubUsername,
      githubProfileUrl: req.user.githubProfileUrl,
      publicRepos: req.user.publicRepos,
      followers: req.user.followers,
      following: req.user.following,
      linkedAt: req.user.updatedAt
    };

    res.json(githubInfo);
  } catch (error) {
    console.error('GitHub profile fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch GitHub profile' 
    });
  }
});

// Get user's GitHub repositories
router.get('/github/repos', requireAuth, async (req, res) => {
  try {
    if (!req.user.githubAccessToken) {
      return res.status(401).json({ 
        error: 'GitHub not connected' 
      });
    }

    // Use GitHub API to fetch user's repositories
    const axios = require('axios');
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        'Authorization': `token ${req.user.githubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      params: {
        sort: 'updated',
        per_page: 20,
        type: 'owner'
      }
    });

    const repos = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      htmlUrl: repo.html_url,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      isPrivate: repo.private,
      topics: repo.topics || []
    }));

    res.json(repos);
  } catch (error) {
    console.error('GitHub repos fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch GitHub repositories' 
    });
  }
});

// Disconnect GitHub account
router.post('/github/disconnect', requireAuth, async (req, res) => {
  try {
    // Authentication is now handled by middleware

    // Remove GitHub data from user profile
    const admin = require('firebase-admin');
    const db = admin.firestore();
    
    await db.collection('users').doc(req.user.uid).update({
      githubId: admin.firestore.FieldValue.delete(),
      githubUsername: admin.firestore.FieldValue.delete(),
      githubAccessToken: admin.firestore.FieldValue.delete(),
      githubProfileUrl: admin.firestore.FieldValue.delete(),
      publicRepos: admin.firestore.FieldValue.delete(),
      followers: admin.firestore.FieldValue.delete(),
      following: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      message: 'GitHub account disconnected successfully' 
    });
  } catch (error) {
    console.error('GitHub disconnect error:', error);
    res.status(500).json({ 
      error: 'Failed to disconnect GitHub account' 
    });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        error: 'Failed to logout' 
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.json({ 
        message: 'Logged out successfully' 
      });
    });
  });
});

// Get current session user
router.get('/user', requireAuth, (req, res) => {
  // Return user data without sensitive information
  const { githubAccessToken, ...safeUserData } = req.user;
  res.json(safeUserData);
});

module.exports = router;