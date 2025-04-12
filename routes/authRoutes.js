import express from 'express';
const router = express.Router();
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import database configuration
import db from '../config/database.js';

// Middleware for logging
router.use((req, res, next) => {
  console.log(`Auth Route: ${req.method} ${req.path}`);
  next();
});

// Signup route - GET
router.get("/signup", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("signup", { 
    user: null, 
    error: req.query.error || null,
    success: req.query.success || null
  });
});

// Signup route - POST
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, confirmPassword, skills } = req.body;
    
    // Validate input
    if (!name || !email || !password || !confirmPassword) {
      return res.render("signup", { 
        user: null, 
        error: "All required fields must be filled",
        success: null
      });
    }
    
    if (password !== confirmPassword) {
      return res.render("signup", { 
        user: null, 
        error: "Passwords do not match",
        success: null
      });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render("signup", { 
        user: null, 
        error: "Please enter a valid email address",
        success: null
      });
    }
    
    // Process skills if provided
    const skillsArray = skills ? skills.split(',').map(skill => skill.trim()) : [];
    
    // Insert new user with skills
    const result = await db.query(
      `INSERT INTO users (name, email, password, skills, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [name, email, await bcrypt.hash(password, 10), JSON.stringify(skillsArray)]
    );
    
    const newUser = result.rows[0];
    
    // Set session
    req.session.user = {
      user_id: newUser.user_id,
      name: newUser.name,
      email: newUser.email,
      profile_complete: false,
      profile_pic: newUser.profile_pic || '/images/user.jpg'
    };
    
    // Redirect to profile completion
    return res.redirect("/profile/complete");
    
  } catch (error) {
    console.error("Signup error:", error);
    return res.render("signup", {
      user: null,
      error: "An error occurred during signup. Please try again.",
      success: null
    });
  }
});

// Signin route - GET
router.get("/signin", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("signin", { 
    user: null, 
    error: req.query.error || null,
    success: req.query.success || null
  });
});

// Signin route - POST
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.render("signin", { 
        user: null, 
        error: "Email and password are required",
        success: null
      });
    }
    
    // Check if user exists
    const userResult = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.render("signin", {
        user: null,
        error: "Invalid email or password",
        success: null
      });
    }

    const user = userResult.rows[0];
    
    // Compare password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.render("signin", {
        user: null,
        error: "Invalid email or password",
        success: null
      });
    }

    // Check if profile is complete
    const isComplete = user.title && user.bio;

    // Set session data consistently
    req.session.user = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      profile_complete: isComplete,
      profile_pic: user.profile_pic || '/images/user.jpg'
    };
    
    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
        return res.render("signin", {
          user: null,
          error: "An error occurred during sign in",
          success: null
        });
      }
      
      // Redirect based on profile completion
      if (!isComplete) {
        return res.redirect("/profile/complete");
      }
      return res.redirect("/dashboard");
    });

  } catch (error) {
    console.error("Error in signin:", error);
    res.render("signin", {
      user: null,
      error: "An error occurred during sign in",
      success: null
    });
  }
});

// Signout route
router.get("/signout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/");
  });
});

// Alias /logout to /signout for consistency with header.ejs
router.get("/logout", (req, res) => {
  res.redirect("/signout");
});

export default router;