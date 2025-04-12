import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
const router = express.Router();

// Import database configuration
import db from '../config/database.js';

// Import middleware
import { isAuthenticated } from '../middleware/auth.js';

// Set up file storage for profile pictures
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/profiles'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.session.user.user_id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
});

// Profile completion route - GET
router.get("/profile/complete", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    
    // Check if profile is already complete
    const userResult = await db.query(
      "SELECT title, bio FROM users WHERE user_id = $1",
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.redirect("/signin");
    }
    
    const user = userResult.rows[0];
    
    // If profile is already complete, redirect to dashboard
    if (user.title && user.bio) {
      req.session.user.profile_complete = true;
      return res.redirect("/dashboard");
    }
    
    // Render profile completion page
    res.render("complete-profile", {
      user: req.session.user,
      error: req.query.error || null
    });
  } catch (error) {
    console.error("Error in profile completion route:", error);
    res.render("error", {
      user: req.session.user,
      error: "An error occurred. Please try again.",
      title: "Error"
    });
  }
});

// Profile completion route - POST
router.post("/profile/complete", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { title, bio, skills, location, website, phone } = req.body;
    
    // Validate required fields
    if (!title || !bio) {
      return res.redirect("/profile/complete?error=Title and bio are required");
    }
    
    // Update user profile
    await db.query(
      "UPDATE users SET title = $1, bio = $2, skills = $3, location = $4, website = $5, phone = $6, profile_complete = TRUE WHERE user_id = $7",
      [title, bio, skills, location, website, phone, userId]
    );
    
    // Update session
    req.session.user.profile_complete = true;
    
    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
        return res.redirect("/profile/complete?error=An error occurred. Please try again.");
      }
      
      console.log("Profile completed, redirecting to dashboard");
      return res.redirect("/dashboard");
    });
  } catch (error) {
    console.error("Error in profile completion route:", error);
    res.redirect("/profile/complete?error=An error occurred. Please try again.");
  }
});

// Add the rest of your profile routes here...

export default router;