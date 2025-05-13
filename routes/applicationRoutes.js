import express from 'express';
const router = express.Router();
import { 
  collection, addDoc, query as firestoreQuery, where, getDocs, doc, getDoc, 
  updateDoc, serverTimestamp 
} from 'firebase/firestore';

import { db } from '../config/firebase.js';

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/signin");
};

// Apply to project (alternative route that matches client URL pattern)
router.post("/projects/:id/apply", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { cover_letter, relevant_skills, availability } = req.body;
    const userId = req.session.user.user_id;

    // Check if user already applied to this project
    const applicationsRef = collection(db, 'project_applications');
    const q = firestoreQuery(applicationsRef, 
      where('project_id', '==', projectId), 
      where('user_id', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return res.status(400).json({ 
        success: false, 
        message: "You have already applied to this project" 
      });
    }

    // Convert skills to array format if it's not already
    const skillsArray = typeof relevant_skills === 'string' ? 
      JSON.parse(relevant_skills) : 
      relevant_skills;

    // Insert the application
    const applicationData = {
      project_id: projectId,
      user_id: userId,
      cover_letter: cover_letter || null,
      relevant_skills: skillsArray,
      availability: availability,
      status: "Pending",
      created_at: serverTimestamp()
    };
    
    await addDoc(collection(db, 'project_applications'), applicationData);

    // Get project owner to send notification
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (projectSnap.exists()) {
      const projectData = projectSnap.data();
      const ownerId = projectData.owner_id;
      const projectTitle = projectData.title;
      
      // Create notification for project owner
      await addDoc(collection(db, 'notifications'), {
        user_id: ownerId,
        type: 'project_application',
        content: `New application for your project: ${projectTitle}`,
        related_id: projectId,
        is_read: false,
        created_at: serverTimestamp()
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Application submitted successfully" 
    });
  } catch (err) {
    console.error("Error submitting application:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to submit application" 
    });
  }
});

// Update application status
router.post("/applications/update", isAuthenticated, async (req, res) => {
  try {
    const { applicationId, status } = req.body;
    const userId = req.session.user.user_id;

    // Get application details
    const applicationRef = doc(db, 'project_applications', applicationId);
    const applicationSnap = await getDoc(applicationRef);

    if (!applicationSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    const application = applicationSnap.data();

    // Get project to check ownership
    const projectRef = doc(db, 'projects', application.project_id);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    const project = projectSnap.data();

    // Check if user is the project owner
    if (project.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this application"
      });
    }

    // Update application status
    await updateDoc(applicationRef, {
      status: status,
      updated_at: serverTimestamp()
    });

    // If application is accepted, add user to project team
    if (status === "accepted") {
      // Get or create team for this project
      const teamsRef = collection(db, 'teams');
      const teamQuery = query(teamsRef, where('project_id', '==', application.project_id));
      const teamSnapshot = await getDocs(teamQuery);
      
      let teamId;
      
      if (teamSnapshot.empty) {
        // Create new team
        const newTeamData = {
          project_id: application.project_id,
          team_name: `${project.title} Team`,
          created_at: serverTimestamp()
        };
        const newTeamRef = await addDoc(collection(db, 'teams'), newTeamData);
        teamId = newTeamRef.id;
      } else {
        teamId = teamSnapshot.docs[0].id;
      }

      // Check if user is already a team member
      const teamMembersRef = collection(db, 'team_members');
      const memberQuery = query(teamMembersRef, 
        where('team_id', '==', teamId), 
        where('user_id', '==', application.user_id)
      );
      const memberSnapshot = await getDocs(memberQuery);

      if (memberSnapshot.empty) {
        // Add user to team
        await addDoc(collection(db, 'team_members'), {
          team_id: teamId,
          user_id: application.user_id,
          role: 'Member',
          joined_at: serverTimestamp()
        });
      }

      // Create notification for the applicant
      await addDoc(collection(db, 'notifications'), {
        user_id: application.user_id,
        type: 'application_accepted',
        content: `Your application for project "${project.title}" has been accepted!`,
        related_id: application.project_id,
        is_read: false,
        created_at: serverTimestamp()
      });
    } else if (status === "rejected") {
      // Create notification for the applicant
      await addDoc(collection(db, 'notifications'), {
        user_id: application.user_id,
        type: 'application_rejected',
        content: `Your application for project "${project.title}" has been rejected.`,
        related_id: application.project_id,
        is_read: false,
        created_at: serverTimestamp()
      });
    }

    return res.status(200).json({
      success: true,
      message: `Application ${status} successfully`
    });
  } catch (error) {
    console.error("Error updating application:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update application"
    });
  }
});

export default router;