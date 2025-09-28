const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get current session user
router.get('/user', requireAuth, (req, res) => {
  // Return user data without sensitive information
  res.json(req.user);
});

module.exports = router;