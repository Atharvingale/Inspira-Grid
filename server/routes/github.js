const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');
const admin = require('firebase-admin');

const router = express.Router();


// Initialize GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use('github-oauth', new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/github/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    // Store the access token and profile data
    const userData = {
      githubId: profile.id,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      email: profile.emails?.[0]?.value || '',
      avatarUrl: profile.photos?.[0]?.value || '',
      profileUrl: profile.profileUrl,
      accessToken: accessToken,
      publicRepos: profile._json?.public_repos || 0,
      followers: profile._json?.followers || 0,
      following: profile._json?.following || 0,
      bio: profile._json?.bio || '',
      location: profile._json?.location || '',
      website: profile._json?.blog || '',
      company: profile._json?.company || ''
    };
    
    return done(null, userData);
  }));
  
  console.log('✅ GitHub OAuth strategy initialized');
} else {
  console.log('⚠️  GitHub OAuth credentials not provided');
}

/**
 * Get GitHub OAuth URL for authenticated user
 */
router.get('/oauth-url', requireAuth, (req, res) => {
  console.log('🔐 GitHub OAuth URL requested by user:', req.user.uid);
  console.log('📋 Current session ID:', req.sessionID);
  
  // Check if GitHub OAuth is configured
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(503).json({
      error: 'GitHub OAuth not configured',
      message: 'GitHub OAuth credentials are not configured on the server'
    });
  }
  
  try {
    // Store user ID in session for linking after OAuth
    req.session.firebaseUid = req.user.uid;
    console.log('💾 Storing firebaseUid in session:', req.user.uid);
    
    // Store redirect preference
    const redirectTo = req.query.redirect || 'project-create';
    req.session.githubRedirect = redirectTo;
    console.log('💾 Storing redirect preference:', redirectTo);
    
    // Generate OAuth URL with both session and state-based UID storage
    const baseUrl = `https://github.com/login/oauth/authorize`;
    const stateData = JSON.stringify({
      uid: req.user.uid,
      redirect: redirectTo,
      timestamp: Date.now()
    });
    const encodedState = Buffer.from(stateData).toString('base64');
    
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/github/callback',
      scope: 'user:email public_repo read:user',
      state: encodedState // Include user ID and redirect preference in state
    });
    
    const oauthUrl = `${baseUrl}?${params.toString()}`;
    
    res.json({
      oauthUrl,
      message: 'GitHub OAuth URL generated successfully'
    });
  } catch (error) {
    console.error('Error generating GitHub OAuth URL:', error);
    res.status(500).json({
      error: 'Failed to generate OAuth URL',
      message: error.message
    });
  }
});

/**
 * Initialize GitHub OAuth flow (fallback route for direct access)
 */
router.get('/connect', requireAuth, (req, res, next) => {
  // Store user ID in session for linking after OAuth
  req.session.firebaseUid = req.user.uid;
  
  passport.authenticate('github-oauth', {
    scope: ['user:email', 'public_repo', 'read:user']
  })(req, res, next);
});

/**
 * Handle GitHub OAuth callback
 */
router.get('/callback', (req, res, next) => {
  console.log('🔄 GitHub OAuth callback received');
  console.log('Session firebaseUid:', req.session.firebaseUid);
  console.log('Query params:', req.query);
  
  passport.authenticate('github-oauth', async (err, githubData, info) => {
    if (err) {
      console.error('GitHub OAuth error:', err);
      return res.redirect(`${process.env.CLIENT_URL}/dashboard/projects/create?error=github_auth_failed`);
    }
    
    if (!githubData) {
      console.error('GitHub OAuth failed - no user data');
      return res.redirect(`${process.env.CLIENT_URL}/dashboard/projects/create?error=github_auth_no_user`);
    }
    
    try {
      let firebaseUid = req.session.firebaseUid;
      let redirectPreference = req.session.githubRedirect || 'project-create';
      
      console.log('🔍 Checking firebaseUid from session:', firebaseUid);
      
      // If session doesn't have UID, try to get it from state parameter
      if (!firebaseUid && req.query.state) {
        try {
          const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString('utf8'));
          if (stateData.uid && (Date.now() - stateData.timestamp < 10 * 60 * 1000)) { // 10 min expiry
            firebaseUid = stateData.uid;
            redirectPreference = stateData.redirect || 'project-create';
            console.log('🔄 Retrieved firebaseUid from state parameter:', firebaseUid);
          }
        } catch (error) {
          console.log('❌ Failed to parse state parameter:', error.message);
        }
      }
      
      if (!firebaseUid) {
        console.log('❌ No firebaseUid in session or state, redirecting to login');
        return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=login_required`);
      }
      
      // Update user document with GitHub data
      const db = admin.firestore();
      await db.collection('users').doc(firebaseUid).update({
        github: {
          id: githubData.githubId,
          username: githubData.username,
          displayName: githubData.displayName,
          email: githubData.email,
          avatarUrl: githubData.avatarUrl,
          profileUrl: githubData.profileUrl,
          publicRepos: githubData.publicRepos,
          followers: githubData.followers,
          following: githubData.following,
          bio: githubData.bio,
          location: githubData.location,
          website: githubData.website,
          company: githubData.company,
          connectedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        githubAccessToken: githubData.accessToken, // Store separately for API access
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Determine redirect URL based on preference (from session or state)
      let redirectUrl;
      
      switch (redirectPreference) {
        case 'profile':
          redirectUrl = `${process.env.CLIENT_URL}/dashboard/profile?github=connected&tab=github`;
          break;
        case 'project-create':
        default:
          redirectUrl = `${process.env.CLIENT_URL}/dashboard/projects/create?github=connected`;
          break;
      }
      
      // Clean up session
      delete req.session.firebaseUid;
      delete req.session.githubRedirect;
      
      console.log(`✅ GitHub linked to user: ${firebaseUid}`);
      console.log('🔄 Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error linking GitHub account:', error);
      res.redirect(`${process.env.CLIENT_URL}/dashboard/projects/create?error=github_link_failed`);
    }
  })(req, res, next);
});

/**
 * Get user's GitHub profile
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (!userData.github) {
      return res.status(404).json({ error: 'GitHub account not connected' });
    }
    
    // Return GitHub profile without access token
    const { connectedAt, ...githubProfile } = userData.github;
    res.json({
      ...githubProfile,
      connectedAt: connectedAt?.toDate?.() || null
    });
  } catch (error) {
    console.error('Error fetching GitHub profile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch GitHub profile',
      message: error.message 
    });
  }
});

/**
 * Get user's GitHub repositories
 */
router.get('/repositories', requireAuth, async (req, res) => {
  try {
    const { limit = 20, sort = 'updated', type = 'owner' } = req.query;
    
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (!userData.githubAccessToken) {
      return res.status(404).json({ error: 'GitHub account not connected' });
    }
    
    // Fetch repositories from GitHub API
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        'Authorization': `token ${userData.githubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Inspira-Grid'
      },
      params: {
        per_page: Math.min(parseInt(limit), 100),
        sort: sort,
        type: type,
        direction: 'desc'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'GitHub token expired',
        message: 'Please reconnect your GitHub account'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch repositories',
      message: error.message 
    });
  }
});

/**
 * Search user's repositories
 */
router.get('/repositories/search', requireAuth, async (req, res) => {
  try {
    const { q, limit = 10, sort = 'updated' } = req.query;
    
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (!userData.githubAccessToken) {
      return res.status(404).json({ error: 'GitHub account not connected' });
    }
    
    // Search repositories using GitHub API
    const username = userData.github?.username;
    if (!username) {
      return res.status(400).json({ error: 'GitHub username not found' });
    }
    
    const searchQuery = `${q.trim()} user:${username}`;
    const response = await axios.get('https://api.github.com/search/repositories', {
      headers: {
        'Authorization': `token ${userData.githubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Inspira-Grid'
      },
      params: {
        q: searchQuery,
        per_page: Math.min(parseInt(limit), 100),
        sort: sort,
        order: 'desc'
      }
    });
    
    res.json(response.data.items || []);
  } catch (error) {
    console.error('Error searching repositories:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'GitHub token expired',
        message: 'Please reconnect your GitHub account'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to search repositories',
      message: error.message 
    });
  }
});

/**
 * Get specific repository details
 */
router.get('/repositories/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (!userData.githubAccessToken) {
      return res.status(404).json({ error: 'GitHub account not connected' });
    }
    
    // Verify user owns or has access to this repository
    const username = userData.github?.username;
    if (owner !== username) {
      return res.status(403).json({ error: 'Access denied to repository' });
    }
    
    // Fetch repository details
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${userData.githubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Inspira-Grid'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching repository:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'GitHub token expired',
        message: 'Please reconnect your GitHub account'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch repository',
      message: error.message 
    });
  }
});

/**
 * Disconnect GitHub account
 */
router.post('/disconnect', requireAuth, async (req, res) => {
  try {
    const db = admin.firestore();
    
    // Remove GitHub data from user document
    await db.collection('users').doc(req.user.uid).update({
      github: admin.firestore.FieldValue.delete(),
      githubAccessToken: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ GitHub disconnected from user: ${req.user.uid}`);
    res.json({ message: 'GitHub account disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    res.status(500).json({ 
      error: 'Failed to disconnect GitHub account',
      message: error.message 
    });
  }
});

/**
 * Get repository commits
 */
router.get('/repositories/:owner/:repo/commits', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { per_page = 10, page = 1 } = req.query;
    
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (!userData.githubAccessToken) {
      return res.status(404).json({ error: 'GitHub account not connected' });
    }
    
    // Fetch commits from GitHub API
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits`, {
      headers: {
        'Authorization': `token ${userData.githubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Inspira-Grid'
      },
      params: {
        per_page: Math.min(parseInt(per_page), 100),
        page: parseInt(page)
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching repository commits:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'GitHub token expired',
        message: 'Please reconnect your GitHub account'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch repository commits',
      message: error.message 
    });
  }
});

/**
 * Get repository issues
 */
router.get('/repositories/:owner/:repo/issues', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { state = 'open', per_page = 10, page = 1 } = req.query;
    
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (!userData.githubAccessToken) {
      return res.status(404).json({ error: 'GitHub account not connected' });
    }
    
    // Fetch issues from GitHub API
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      headers: {
        'Authorization': `token ${userData.githubAccessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Inspira-Grid'
      },
      params: {
        state,
        per_page: Math.min(parseInt(per_page), 100),
        page: parseInt(page)
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching repository issues:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'GitHub token expired',
        message: 'Please reconnect your GitHub account'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch repository issues',
      message: error.message 
    });
  }
});

/**
 * Link repository to project
 */
router.post('/link-repository', requireAuth, async (req, res) => {
  try {
    const { projectId, repositoryUrl, repositoryName, description } = req.body;
    
    if (!projectId || !repositoryUrl || !repositoryName) {
      return res.status(400).json({ error: 'Project ID, repository URL, and repository name are required' });
    }
    
    const Project = require('../models/Project');
    
    // Verify the project exists and user has permission
    const project = await Project.getById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.ownerId !== req.user.uid && 
        !project.teamMembers?.some(member => member.userId === req.user.uid)) {
      return res.status(403).json({ error: 'Access denied to project' });
    }
    
    // Link repository to project using the model
    const updatedProject = await Project.linkGitHubRepository(projectId, {
      repositoryUrl,
      repositoryName,
      description
    });
    
    res.json({ 
      message: 'Repository linked to project successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Error linking repository to project:', error);
    res.status(500).json({ 
      error: 'Failed to link repository to project',
      message: error.message 
    });
  }
});

/**
 * Unlink repository from project
 */
router.delete('/unlink-repository/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const Project = require('../models/Project');
    
    // Verify the project exists and user has permission
    const project = await Project.getById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.ownerId !== req.user.uid && 
        !project.teamMembers?.some(member => member.userId === req.user.uid)) {
      return res.status(403).json({ error: 'Access denied to project' });
    }
    
    // Unlink repository from project using the model
    const updatedProject = await Project.unlinkGitHubRepository(projectId);
    
    res.json({ 
      message: 'Repository unlinked from project successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Error unlinking repository from project:', error);
    res.status(500).json({ 
      error: 'Failed to unlink repository from project',
      message: error.message 
    });
  }
});

/**
 * Webhook endpoint for GitHub events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // TODO: Implement webhook handling for real-time repository updates
  // This could be used to sync repository data, track commits, etc.
  console.log('GitHub webhook received:', req.headers['x-github-event']);
  res.status(200).send('Webhook received');
});

module.exports = router;