import express from 'express';
const router = express.Router();
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { collection, query as firestoreQuery, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

// Load environment variables
dotenv.config();

// Import Firebase configuration
import { db, auth } from '../config/firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

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
    
    // Check if email already exists
    const usersCollection = collection(db, 'users');
    const emailQuery = firestoreQuery(usersCollection, where('email', '==', email));
    const emailSnapshot = await getDocs(emailQuery);
    
    if (!emailSnapshot.empty) {
      return res.render("signup", { 
        user: null, 
        error: "Email already in use",
        success: null
      });
    }
    
    // Process skills if provided
    const skillsArray = skills ? skills.split(',').map(skill => skill.trim()) : [];
    
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Insert new user with skills in Firestore
    const newUser = {
      uid: firebaseUser.uid,
      name,
      email,
      skills: skillsArray,
      created_at: serverTimestamp(),
      profile_complete: false,
      profile_pic: '/images/user.jpg'
    };
    
    const userDocRef = await addDoc(collection(db, 'users'), newUser);
    newUser.user_id = userDocRef.id;
    
    // Set session
    req.session.user = {
      user_id: userDocRef.id,
      name: newUser.name,
      email: newUser.email,
      profile_complete: false,
      profile_pic: newUser.profile_pic
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
    
    // Sign in with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Get user data from Firestore
    const usersRef = collection(db, 'users');
    const userQuery = firestoreQuery(usersRef, where('uid', '==', firebaseUser.uid));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      return res.render("signin", {
        user: null,
        error: "User not found in database",
        success: null
      });
    }

    const userDoc = userSnapshot.docs[0];
    const user = {
      user_id: userDoc.id,
      ...userDoc.data()
    };
    
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
      error: "Invalid email or password",
      success: null
    });
  }
});

// Signout route
router.get("/signout", (req, res) => {
  auth.signOut().then(() => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
      res.redirect("/");
    });
  }).catch((error) => {
    console.error("Error signing out:", error);
    res.redirect("/");
  });
});

// Alias /logout to /signout for consistency with header.ejs
router.get("/logout", (req, res) => {
  res.redirect("/signout");
});

export default router;