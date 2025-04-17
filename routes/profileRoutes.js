import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const router = express.Router();

// Import Firebase configuration
import { db } from '../config/firebase.js';
import { 
  collection, doc, getDoc, getDocs, query as firestoreQuery, where, 
  orderBy, limit, addDoc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

// Remove the enableIndexedDbPersistence code since it's causing issues

// Import Cloudinary configuration
import { storage } from '../config/cloudinary.js';

// Import middleware
import { isAuthenticated } from '../middleware/auth.js';

// Set up multer with Cloudinary storage
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
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return res.redirect("/signin");
    }
    
    const userData = userSnap.data();
    
    // If profile is already complete, redirect to dashboard
    if (userData.title && userData.bio) {
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
router.post("/profile/complete", isAuthenticated, upload.single('profile_pic'), async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { title, bio, skills, location, website, phone } = req.body;
    
    // Validate required fields
    if (!title || !bio) {
      return res.redirect("/profile/complete?error=Title and bio are required");
    }
    
    // Process skills if provided
    const skillsArray = skills ? skills.split(',').map(skill => skill.trim()) : [];
    
    // Update user profile
    const userRef = doc(db, 'users', userId);
    
    const updateData = {
      title,
      bio,
      skills: skillsArray,
      location: location || null,
      website: website || null,
      phone: phone || null,
      profile_complete: true,
      updated_at: serverTimestamp()
    };
    
    // If a profile picture was uploaded, add it to the update data
    if (req.file) {
      updateData.profile_pic = req.file.path; // Cloudinary returns the URL in req.file.path
    }
    
    await updateDoc(userRef, updateData);
    
    // Update session data
    req.session.user.profile_complete = true;
    
    // Redirect to dashboard
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error completing profile:", error);
    res.redirect("/profile/complete?error=An error occurred. Please try again.");
  }
});

// Profile update route - POST
router.post("/profile/update", isAuthenticated, upload.single('profile_pic'), async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { name, title, bio, skills, location, website, phone } = req.body;
    
    // Validate required fields
    if (!name || !title || !bio) {
      return res.redirect("/profile?error=Name, title, and bio are required");
    }
    
    // Process skills if provided
    const skillsArray = skills ? skills.split(',').map(skill => skill.trim()) : [];
    
    // Update user profile
    const userRef = doc(db, 'users', userId);
    
    const updateData = {
      name,
      title,
      bio,
      skills: skillsArray,
      location: location || null,
      website: website || null,
      phone: phone || null,
      updated_at: serverTimestamp()
    };
    
    // If a profile picture was uploaded, add it to the update data
    if (req.file) {
      updateData.profile_pic = req.file.path; // Cloudinary returns the URL in req.file.path
    }
    
    await updateDoc(userRef, updateData);
    
    // Update session data
    req.session.user.name = name;
    
    // Redirect to profile with success message
    res.redirect("/profile?success=Profile updated successfully");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.redirect("/profile?error=An error occurred. Please try again.");
  }
});

// Profile view route
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    
    // Get complete user profile information
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return res.redirect("/signin");
    }
    
    const userProfile = {
      user_id: userSnap.id,
      ...userSnap.data()
    };
    
    // Get project count
    const projectsRef = collection(db, 'projects');
    const projectQuery = firestoreQuery(projectsRef, where('owner_id', '==', userId));
    const projectSnapshot = await getDocs(projectQuery);
    userProfile.projectCount = projectSnapshot.size;
    
    // Get team count
    const teamMembersRef = collection(db, 'team_members');
    const teamQuery = firestoreQuery(teamMembersRef, where('user_id', '==', userId));
    const teamSnapshot = await getDocs(teamQuery);
    userProfile.teamCount = teamSnapshot.size;
    
    // Get task count
    const tasksRef = collection(db, 'tasks');
    const taskQuery = firestoreQuery(tasksRef, where('assigned_to', '==', userId));
    const taskSnapshot = await getDocs(taskQuery);
    userProfile.taskCount = taskSnapshot.size;
    
    // Get user skills
    const userSkillsRef = collection(db, 'user_skills');
    const skillsQuery = firestoreQuery(userSkillsRef, where('user_id', '==', userId));
    const skillsSnapshot = await getDocs(skillsQuery);
    
    const skills = [];
    for (const skillDoc of skillsSnapshot.docs) {
      const skillData = skillDoc.data();
      const skillRef = doc(db, 'skills', skillData.skill_id);
      const skillSnap = await getDoc(skillRef);
      
      if (skillSnap.exists()) {
        skills.push({
          name: skillSnap.data().skill_name,
          level: skillData.proficiency_level
        });
      }
    }
    
    // Get user education
    const educationRef = collection(db, 'user_education');
    const educationQuery = firestoreQuery(
      educationRef, 
      where('user_id', '==', userId),
      orderBy('start_date', 'desc')
    );
    const educationSnapshot = await getDocs(educationQuery);
    
    const education = educationSnapshot.docs.map(doc => {
      const data = doc.data();
      const startDate = data.start_date ? data.start_date.toDate() : null;
      const endDate = data.end_date ? data.end_date.toDate() : null;
      
      return {
        institution: data.institution_name,
        degree: data.degree,
        field_of_study: data.field_of_study,
        start_date: startDate,
        end_date: endDate,
        grade: data.grade,
        activities: data.activities,
        description: data.description,
        startYear: startDate ? startDate.getFullYear() : null,
        endYear: endDate ? endDate.getFullYear() : null
      };
    });
    
    // Get recent activities
    const activitiesRef = collection(db, 'activity_log');
    const activitiesQuery = firestoreQuery(
      activitiesRef,
      where('user_id', '==', userId),
      orderBy('created_at', 'desc'),
      limit(5)
    );
    const activitiesSnapshot = await getDocs(activitiesQuery);
    
    const recentActivities = activitiesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        type: data.type,
        description: data.description,
        created_at: data.created_at ? data.created_at.toDate() : new Date(),
        timeAgo: data.created_at ? 
          new Date(data.created_at.toDate()).toLocaleDateString('en-US') : 
          new Date().toLocaleDateString('en-US')
      };
    });
    
    // Get user work experience
    const experienceRef = collection(db, 'user_experience');
    const experienceQuery = firestoreQuery(
      experienceRef, 
      where('user_id', '==', userId),
      orderBy('start_date', 'desc')
    );
    const experienceSnapshot = await getDocs(experienceQuery);
    
    const workExperience = experienceSnapshot.docs.map(doc => {
      const data = doc.data();
      const startDate = data.start_date ? data.start_date.toDate() : null;
      const endDate = data.end_date ? data.end_date.toDate() : null;
      
      return {
        id: doc.id,
        company: data.company,
        position: data.position,
        location: data.location,
        start_date: startDate,
        end_date: endDate,
        current_job: data.current_job,
        description: data.description,
        startYear: startDate ? startDate.getFullYear() : null,
        startMonth: startDate ? startDate.toLocaleString('default', { month: 'short' }) : null,
        endYear: endDate ? endDate.getFullYear() : null,
        endMonth: endDate ? endDate.toLocaleString('default', { month: 'short' }) : null
      };
    });
    
    // Combine all data
    const userData = {
      ...userProfile,
      skills,
      education,
      workExperience,  // Now this variable is defined
      recentActivities
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
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return res.redirect("/signin");
    }
    
    const userData = userSnap.data();
    
    // Get user skills
    const userSkillsRef = collection(db, 'user_skills');
    const userSkillsQuery = firestoreQuery(userSkillsRef, where('user_id', '==', userId));
    const userSkillsSnapshot = await getDocs(userSkillsQuery);
    
    const userSkills = [];
    for (const skillDoc of userSkillsSnapshot.docs) {
      const skillData = skillDoc.data();
      const skillRef = doc(db, 'skills', skillData.skill_id);
      const skillSnap = await getDoc(skillRef);
      
      if (skillSnap.exists()) {
        userSkills.push({
          skill_id: skillData.skill_id,
          skill_name: skillSnap.data().skill_name,
          proficiency_level: skillData.proficiency_level
        });
      }
    }
    
    // Get all available skills for dropdown
    const skillsRef = collection(db, 'skills');
    const allSkillsQuery = firestoreQuery(skillsRef, orderBy('category'), orderBy('skill_name'));
    const allSkillsSnapshot = await getDocs(allSkillsQuery);
    
    const allSkills = allSkillsSnapshot.docs.map(doc => ({
      skill_id: doc.id,
      skill_name: doc.data().skill_name,
      category: doc.data().category
    }));
    
    // Render edit profile page
    res.render("edit-profile", {
      user: {
        ...req.session.user,
        ...userData,
        skills: userSkills
      },
      allSkills,
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
    
    // Update user profile in Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      name,
      title,
      bio,
      location,
      phone,
      website,
      updated_at: serverTimestamp()
    });
    
    // Handle skills update if provided
    if (skills) {
      // First delete existing skills
      const userSkillsRef = collection(db, 'user_skills');
      const userSkillsQuery = firestoreQuery(userSkillsRef, where('user_id', '==', userId));
      const userSkillsSnapshot = await getDocs(userSkillsQuery);
      
      const deletePromises = userSkillsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);
      
      // Then add new skills
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      
      const addPromises = skillsArray.map(skillId => 
        addDoc(collection(db, 'user_skills'), {
          user_id: userId,
          skill_id: skillId,
          proficiency_level: "70",
          created_at: serverTimestamp()
        })
      );
      await Promise.all(addPromises);
    }
    
    // Update session user data
    req.session.user.name = name;
    
    // Redirect back to profile
    res.redirect("/profile?success=Profile updated successfully");
  } catch (error) {
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
    
    // With Cloudinary, the file path is already in req.file.path
    const imageUrl = req.file.path;
    
    // Update user profile picture in Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      profile_pic: imageUrl,
      updated_at: serverTimestamp()
    });
    
    // Update session
    req.session.user.profile_pic = imageUrl;
    
    res.json({ 
      success: true, 
      message: "Profile picture updated successfully",
      filePath: imageUrl
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
    
    // Get user profile picture URL from Firestore
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists() || !userSnap.data().profile_pic) {
      // Return default profile picture
      return res.sendFile(path.join(__dirname, '../public/images/user.jpg'));
    }
    
    // Redirect to the Firebase Storage URL
    return res.redirect(userSnap.data().profile_pic);
  } catch (error) {
    console.error("Error serving profile picture:", error);
    res.sendFile(path.join(__dirname, '../public/images/user.jpg'));
  }
});

// Add Work Experience route
router.post("/profile/add-experience", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { 
      company, position, location, start_date, end_date, 
      current_job, description 
    } = req.body;
    
    // Validate required fields
    if (!company || !position || !start_date) {
      return res.status(400).json({ 
        success: false, 
        message: "Company, position, and start date are required" 
      });
    }
    
    // Add work experience to Firestore
    await addDoc(collection(db, 'user_experience'), {
      user_id: userId,
      company,
      position,
      location: location || null,
      start_date: new Date(start_date),
      end_date: current_job ? null : (end_date ? new Date(end_date) : null),
      current_job: current_job === 'on',
      description: description || null,
      created_at: serverTimestamp()
    });
    
    // Add activity log
    await addDoc(collection(db, 'activity_log'), {
      user_id: userId,
      type: 'experience_added',
      description: `Added work experience at ${company}`,
      created_at: serverTimestamp()
    });
    
    res.redirect("/profile?success=Work experience added successfully");
  } catch (error) {
    console.error("Error adding work experience:", error);
    res.redirect("/profile?error=An error occurred while adding work experience");
  }
});

// Delete Work Experience route
router.post("/profile/delete-experience/:id", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const experienceId = req.params.id;
    
    // Get experience to verify ownership
    const experienceRef = doc(db, 'user_experience', experienceId);
    const experienceSnap = await getDoc(experienceRef);
    
    if (!experienceSnap.exists()) {
      return res.status(404).json({ success: false, message: "Experience not found" });
    }
    
    // Verify ownership
    if (experienceSnap.data().user_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    
    // Delete experience
    await deleteDoc(experienceRef);
    
    res.redirect("/profile?success=Work experience deleted successfully");
  } catch (error) {
    console.error("Error deleting work experience:", error);
    res.redirect("/profile?error=An error occurred while deleting work experience");
  }
});

// Add Education route
router.post("/profile/add-education", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { 
      institution_name, degree, field_of_study, start_date, end_date, 
      current_education, grade, activities, description 
    } = req.body;
    
    // Validate required fields
    if (!institution_name || !degree || !start_date) {
      return res.status(400).json({ 
        success: false, 
        message: "Institution, degree, and start date are required" 
      });
    }
    
    // Add education to Firestore
    await addDoc(collection(db, 'user_education'), {
      user_id: userId,
      institution_name,
      degree,
      field_of_study: field_of_study || null,
      start_date: new Date(start_date),
      end_date: current_education ? null : (end_date ? new Date(end_date) : null),
      current_education: current_education === 'on',
      grade: grade || null,
      activities: activities || null,
      description: description || null,
      created_at: serverTimestamp()
    });
    
    // Add activity log
    await addDoc(collection(db, 'activity_log'), {
      user_id: userId,
      type: 'education_added',
      description: `Added education at ${institution_name}`,
      created_at: serverTimestamp()
    });
    
    res.redirect("/profile?success=Education added successfully");
  } catch (error) {
    console.error("Error adding education:", error);
    res.redirect("/profile?error=An error occurred while adding education");
  }
});

// Delete Education route
router.post("/profile/delete-education/:id", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const educationId = req.params.id;
    
    // Get education to verify ownership
    const educationRef = doc(db, 'user_education', educationId);
    const educationSnap = await getDoc(educationRef);
    
    if (!educationSnap.exists()) {
      return res.status(404).json({ success: false, message: "Education not found" });
    }
    
    // Verify ownership
    if (educationSnap.data().user_id !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    
    // Delete education
    await deleteDoc(educationRef);
    
    res.redirect("/profile?success=Education deleted successfully");
  } catch (error) {
    console.error("Error deleting education:", error);
    res.redirect("/profile?error=An error occurred while deleting education");
  }
});

export default router;