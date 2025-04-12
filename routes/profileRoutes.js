import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';  // Add this import
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

// Add these missing profile routes

// Profile view route
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    
    // Get complete user profile information
    const userResult = await db.query(
      `SELECT u.*, 
        (SELECT COUNT(*) FROM projects WHERE owner_id = $1) as projectCount,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.user_id = $1) as teamCount,
        (SELECT COUNT(*) FROM tasks WHERE assigned_to = $1) as taskCount
      FROM users u WHERE u.user_id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.redirect("/signin");
    }
    
    const userProfile = userResult.rows[0];
    
    // Get user skills
    const skillsResult = await db.query(
      `SELECT s.skill_name as name, us.proficiency_level as level
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.skill_id
       WHERE us.user_id = $1`,
      [userId]
    );
    
    // Get user education
    const educationResult = await db.query(
      `SELECT institution_name as institution, degree, field_of_study,
        start_date, end_date, grade, activities, description,
        EXTRACT(YEAR FROM start_date) as startYear,
        EXTRACT(YEAR FROM end_date) as endYear
       FROM user_education
       WHERE user_id = $1
       ORDER BY start_date DESC`,
      [userId]
    );
    
    // Get recent activities
    const activitiesResult = await db.query(
      `SELECT type, description, created_at
       FROM activity_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );
    
    // Combine all data
    const userData = {
      ...userProfile,
      skills: skillsResult.rows,
      education: educationResult.rows,
      recentActivities: activitiesResult.rows.map(activity => ({
        ...activity,
        timeAgo: new Date(activity.created_at).toLocaleDateString('en-US')
      }))
    };
    
    // Render profile page
    res.render("profile", {
      user: userData,
      title: "My Profile",
      currentPage: "profile",
      cssFiles: ['profile']
    });
  } catch (error) {
    console.error("Error in profile view route:", error);
    res.render("error", {
      user: req.session.user,
      error: "An error occurred while loading your profile. Please try again.",
      title: "Error",
      currentPage: "profile"
    });
  }
});

// Profile edit route - GET
router.get("/profile/edit", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    
    // Get user profile data
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.redirect("/signin");
    }
    
    const userData = userResult.rows[0];
    
    // Get user skills
    const skillsResult = await db.query(
      `SELECT s.skill_id, s.skill_name, us.proficiency_level
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.skill_id
       WHERE us.user_id = $1`,
      [userId]
    );
    
    // Get all available skills for dropdown
    const allSkillsResult = await db.query(
      "SELECT skill_id, skill_name, category FROM skills ORDER BY category, skill_name"
    );
    
    // Render edit profile page
    res.render("edit-profile", {
      user: {
        ...req.session.user,
        ...userData,
        skills: skillsResult.rows
      },
      allSkills: allSkillsResult.rows,
      error: req.query.error || null,
      success: req.query.success || null,
      title: "Edit Profile",
      currentPage: "profile",
      cssFiles: ['profile-edit']
    });
  } catch (error) {
    console.error("Error in profile edit route:", error);
    res.render("error", {
      user: req.session.user,
      error: "An error occurred while loading your profile. Please try again.",
      title: "Error",
      currentPage: "profile"
    });
  }
});

// Profile edit route - POST
router.post("/profile/edit", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { name, title, bio, location, phone, website, skills } = req.body;
    
    // Start a transaction
    await db.query("BEGIN");
    
    // Update user profile
    await db.query(
      `UPDATE users 
       SET name = $1, title = $2, bio = $3, location = $4, phone = $5, website = $6, updated_at = NOW()
       WHERE user_id = $7`,
      [name, title, bio, location, phone, website, userId]
    );
    
    // Handle skills update if provided
    if (skills) {
      // First delete existing skills
      await db.query("DELETE FROM user_skills WHERE user_id = $1", [userId]);
      
      // Then add new skills
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      
      for (const skillId of skillsArray) {
        // Default proficiency level to 70%
        await db.query(
          "INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES ($1, $2, $3)",
          [userId, skillId, "70"]
        );
      }
    }
    
    // Commit transaction
    await db.query("COMMIT");
    
    // Update session user data
    req.session.user.name = name;
    
    // Redirect back to profile
    res.redirect("/profile?success=Profile updated successfully");
  } catch (error) {
    // Rollback transaction on error
    await db.query("ROLLBACK");
    console.error("Error updating profile:", error);
    res.redirect("/profile/edit?error=An error occurred while updating your profile");
  }
});

// Profile picture upload route
router.post("/profile/upload-photo", isAuthenticated, upload.single('profile_pic'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    
    const userId = req.session.user.user_id;
    const filePath = `/uploads/profiles/${req.file.filename}`;
    
    // Update user profile picture in database
    await db.query(
      "UPDATE users SET profile_pic = $1, updated_at = NOW() WHERE user_id = $2",
      [filePath, userId]
    );
    
    // Update session
    req.session.user.profile_pic = filePath;
    
    res.json({ 
      success: true, 
      message: "Profile picture updated successfully",
      filePath: filePath
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ 
      success: false, 
      message: "An error occurred while uploading your profile picture" 
    });
  }
});

// Profile picture serve route
router.get("/profile-pic/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get user profile picture path
    const result = await db.query(
      "SELECT profile_pic FROM users WHERE user_id = $1",
      [userId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].profile_pic) {
      // Return default profile picture
      return res.sendFile(path.join(__dirname, '../public/images/user.jpg'));
    }
    
    // Extract the filename from the stored path
    const profilePicPath = result.rows[0].profile_pic;
    const fullPath = path.join(__dirname, '../public', profilePicPath);
    
    // Check if file exists
    if (fs.existsSync(fullPath)) {
      return res.sendFile(fullPath);
    } else {
      // Return default if file doesn't exist
      return res.sendFile(path.join(__dirname, '../public/images/user.jpg'));
    }
  } catch (error) {
    console.error("Error serving profile picture:", error);
    res.sendFile(path.join(__dirname, '../public/images/user.jpg'));
  }
});

export default router;