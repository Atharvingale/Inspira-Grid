import express from 'express';
const router = express.Router();
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { collection, query as firestoreQuery, where, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

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
    success: req.query.success || null,
    title: "Sign Up" // Add title parameter
  });
});

// Signup route - POST
router.post("/signup", async (req, res) => {
  // Log the received email at the start of the request
  console.log("Signup attempt received for email:", req.body.email); // Log incoming email

  try {
    const { name, email, password, confirmPassword, skills } = req.body;

    // Validate input
    if (!name || !email || !password) {
      console.log("Validation failed: Missing required fields"); // Log validation failure
      return res.render("signup", {
        user: null,
        error: "Please fill in all required fields",
        title: "Sign Up",
        success: null
      });
    }

    if (password !== confirmPassword) {
      console.log("Validation failed: Passwords do not match"); // Log validation failure
      return res.render("signup", {
        user: null,
        error: "Passwords do not match",
        title: "Sign Up",
        success: null
      });
    }

    console.log(`Attempting Firebase Auth creation for: ${email}`); // Log before Firebase call
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log(`Firebase Auth user created successfully: ${user.uid} for email: ${email}`); // Log success

    // Process skills
    let skillsArray = [];
    if (skills) {
      skillsArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill);
    }

    console.log(`Attempting Firestore doc creation for user: ${user.uid}`); // Log before Firestore call
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      name,
      email,
      skills: skillsArray,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    console.log(`Firestore doc created successfully for user: ${user.uid}`); // Log success

    // Set session
    req.session.user = {
      user_id: user.uid,
      name,
      email
    };
    console.log(`Session set for user: ${user.uid}`); // Log success

    // Redirect to dashboard
    console.log(`Redirecting user ${user.uid} to dashboard`); // Log before redirect
    res.redirect("/dashboard");

  } catch (error) {
    // Log the detailed error object from Firebase for better diagnosis
    console.error("Detailed Signup Error Object:", JSON.stringify(error, null, 2)); // Log the full error object

    let errorMessage = "An error occurred during signup. Please try again.";

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = "This email is already registered. Please sign in or use a different email address.";
      console.log(`Error identified as: auth/email-already-in-use for email: ${req.body.email}`); // Log specific error
    } else if (error.code === 'auth/weak-password') {
      errorMessage = "Password should be at least 6 characters";
      console.log(`Error identified as: auth/weak-password`); // Log specific error
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = "Please enter a valid email address";
      console.log(`Error identified as: auth/invalid-email for email: ${req.body.email}`); // Log specific error
    } else {
      // Log if it's an unexpected error code
      console.log(`Unexpected error code during signup: ${error.code}`);
    }

    res.render("signup", {
      user: null,
      error: errorMessage,
      title: "Sign Up",
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