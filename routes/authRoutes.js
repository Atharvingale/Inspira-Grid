import express from 'express';
const router = express.Router();
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { collection, query as firestoreQuery, where, getDocs, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';

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

// I'll fix the signin route POST handler that has the timeout implementation
// but is currently incomplete

// Signin route - POST
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Set a timeout for Firebase authentication
    const authTimeout = setTimeout(() => {
      return res.status(503).render("signin", {
        user: null,
        error: "Authentication service is taking too long. Please try again.",
        title: "Sign In"
      });
    }, 8000); // 8 seconds timeout
    
    // Attempt to sign in
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Clear the timeout if authentication succeeds
      clearTimeout(authTimeout);
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        return res.render("signin", {
          user: null,
          error: "User account not found. Please sign up.",
          title: "Sign In"
        });
      }
      
      const userData = userDoc.data();
      
      // Set session data
      req.session.user = {
        user_id: user.uid,
        name: userData.name,
        email: userData.email,
        profile_pic: userData.profile_pic || null,
        profile_complete: userData.profile_complete || false
      };
      
      // Redirect to dashboard
      res.redirect("/dashboard");
    } catch (authError) {
      // Clear the timeout if authentication fails
      clearTimeout(authTimeout);
      
      // Handle authentication error
      let errorMessage = "Invalid email or password. Please try again.";
      
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (authError.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed login attempts. Please try again later or reset your password.";
      } else {
        console.error("Firebase auth error:", authError);
      }
      
      res.render("signin", {
        user: null,
        error: errorMessage,
        title: "Sign In"
      });
    }
  } catch (error) {
    console.error("Signin error:", error);
    res.render("signin", {
      user: null,
      error: "An error occurred during sign in. Please try again.",
      title: "Sign In"
    });
  }
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

// Signout route
router.get("/signout", (req, res) => {
  // Clear the backup cookie
  res.clearCookie('user_basic');
  
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