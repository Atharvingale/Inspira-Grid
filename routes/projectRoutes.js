import express from 'express';
const router = express.Router();
import { 
  collection, doc, getDoc, getDocs, query as firestoreQuery, where, 
  orderBy, limit, addDoc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

// Import Firebase configuration
import { db } from '../config/firebase.js';

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/signin");
};

// Projects route
router.get("/projects", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    // Get complete user information first
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return res.redirect("/signin");
    }
    
    const userInfo = {
      user_id: userSnap.id,
      ...userSnap.data()
    };
    
    // Fetch different types of projects
    // My projects (where user is owner)
    const myProjectsRef = collection(db, 'projects');
    // Change 'query' to 'firestoreQuery' here
    const myProjectsQuery = firestoreQuery(
      myProjectsRef,
      where('owner_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    const myProjectsSnapshot = await getDocs(myProjectsQuery);
    
    // Process my projects
    const myProjects = [];
    for (const projectDoc of myProjectsSnapshot.docs) {
      const projectData = projectDoc.data();
      
      // Get team size for this project
      let teamSize = 0;
      try {
        const teamsRef = collection(db, 'teams');
        const teamQuery = firestoreQuery(teamsRef, where('project_id', '==', projectDoc.id));
        const teamSnapshot = await getDocs(teamQuery);
        
        if (!teamSnapshot.empty) {
          const teamDoc = teamSnapshot.docs[0];
          
          const teamMembersRef = collection(db, 'team_members');
          const teamMembersQuery = firestoreQuery(teamMembersRef, where('team_id', '==', teamDoc.id));
          const teamMembersSnapshot = await getDocs(teamMembersQuery);
          
          teamSize = teamMembersSnapshot.size;
        }
      } catch (error) {
        console.error(`Error getting team size for project ${projectDoc.id}:`, error);
      }
      
      myProjects.push({
        project_id: projectDoc.id,
        ...projectData,
        team_size: teamSize
      });
    }
    
    // Team projects (where user is a team member but not owner)
    const teamProjects = [];
    
    // First get teams where user is a member
    const teamMembersRef = collection(db, 'team_members');
    const teamMemberQuery = firestoreQuery(teamMembersRef, where('user_id', '==', userId));
    const teamMemberSnapshot = await getDocs(teamMemberQuery);
    
    // For each team, get the project
    for (const teamMemberDoc of teamMemberSnapshot.docs) {
      const teamId = teamMemberDoc.data().team_id;
      
      // Get team details
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        const projectId = teamData.project_id;
        
        // Get project details
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        
        if (projectSnap.exists()) {
          const projectData = projectSnap.data();
          
          // Only include if user is not the owner
          if (projectData.owner_id !== userId) {
            // Get team size
            const teamMembersCountQuery = firestoreQuery(
              collection(db, 'team_members'), 
              where('team_id', '==', teamId)
            );
            const teamMembersCountSnapshot = await getDocs(teamMembersCountQuery);
            
            teamProjects.push({
              project_id: projectSnap.id,
              ...projectData,
              team_name: teamData.team_name,
              team_size: teamMembersCountSnapshot.size
            });
          }
        }
      }
    }
    
    // Discover projects (projects user is not involved in)
    const discoverProjectsRef = collection(db, 'projects');
    const discoverProjectsQuery = firestoreQuery(
      discoverProjectsRef,
      where('owner_id', '!=', userId),
      orderBy('owner_id'),
      orderBy('created_at', 'desc'),
      limit(30)
    );
    const discoverProjectsSnapshot = await getDocs(discoverProjectsQuery);
    
    // Process discover projects
    const discoverProjects = [];
    for (const projectDoc of discoverProjectsSnapshot.docs) {
      const projectData = projectDoc.data();
      
      // Check if user is already a team member
      let isTeamMember = false;
      
      // Get teams for this project
      const teamsRef = collection(db, 'teams');
      const teamQuery = firestoreQuery(teamsRef, where('project_id', '==', projectDoc.id));
      const teamSnapshot = await getDocs(teamQuery);
      
      if (!teamSnapshot.empty) {
        for (const teamDoc of teamSnapshot.docs) {
          // Check if user is a member of this team
          const teamMembersRef = collection(db, 'team_members');
          const memberQuery = firestoreQuery(
            teamMembersRef, 
            where('team_id', '==', teamDoc.id),
            where('user_id', '==', userId)
          );
          const memberSnapshot = await getDocs(memberQuery);
          
          if (!memberSnapshot.empty) {
            isTeamMember = true;
            break;
          }
        }
      }
      
      // Only include if user is not a team member
      if (!isTeamMember) {
        // Get creator info
        const creatorRef = doc(db, 'users', projectData.owner_id);
        const creatorSnap = await getDoc(creatorRef);
        
        // Get team size
        let teamSize = 0;
        if (!teamSnapshot.empty) {
          const teamDoc = teamSnapshot.docs[0];
          
          const teamMembersRef = collection(db, 'team_members');
          const teamMembersQuery = firestoreQuery(teamMembersRef, where('team_id', '==', teamDoc.id));
          const teamMembersSnapshot = await getDocs(teamMembersQuery);
          
          teamSize = teamMembersSnapshot.size;
        }
        
        // Get pending applications count
        const applicationsRef = collection(db, 'project_applications');
        const pendingAppsQuery = firestoreQuery(
          applicationsRef,
          where('project_id', '==', projectDoc.id),
          where('status', '==', 'pending')
        );
        const pendingAppsSnapshot = await getDocs(pendingAppsQuery);
        
        discoverProjects.push({
          project_id: projectDoc.id,
          ...projectData,
          creator_name: creatorSnap.exists() ? creatorSnap.data().name : 'Unknown',
          creator_pic: creatorSnap.exists() ? creatorSnap.data().profile_pic : '/images/user.jpg',
          team_size: teamSize,
          pending_applications: pendingAppsSnapshot.size
        });
      }
    }
    
    // Get user's applications
    const applicationsRef = collection(db, 'project_applications');
    const applicationsQuery = firestoreQuery(
      applicationsRef,
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    const applicationsSnapshot = await getDocs(applicationsQuery);
    
    // Process applications
    const applications = [];
    for (const appDoc of applicationsSnapshot.docs) {
      const appData = appDoc.data();
      
      // Get project details
      const projectRef = doc(db, 'projects', appData.project_id);
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        
        // Get project owner details
        const ownerRef = doc(db, 'users', projectData.owner_id);
        const ownerSnap = await getDoc(ownerRef);
        
        applications.push({
          application_id: appDoc.id,
          ...appData,
          project_name: projectData.title,
          project_category: projectData.category,
          project_description: projectData.description,
          project_owner_name: ownerSnap.exists() ? ownerSnap.data().name : 'Unknown',
          project_owner_pic: ownerSnap.exists() ? ownerSnap.data().profile_pic : '/images/user.jpg',
          created_at_formatted: appData.created_at ? 
            new Date(appData.created_at.toDate()).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : 'recently'
        });
      }
    }

    // Process projects function
    const processProjects = (projects) => {
      return projects.map(project => {
        try {
          // Handle required_skills
          let requiredSkills = [];
          if (project.required_skills) {
            if (typeof project.required_skills === 'string') {
              try {
                requiredSkills = JSON.parse(project.required_skills);
              } catch (e) {
                requiredSkills = project.required_skills.split(',').map(s => s.trim());
              }
            } else if (Array.isArray(project.required_skills)) {
              requiredSkills = project.required_skills;
            }
          }
          
          // Handle milestones
          let milestones = [];
          if (project.milestones) {
            if (typeof project.milestones === 'string') {
              try {
                milestones = JSON.parse(project.milestones);
              } catch (e) {
                milestones = [];
              }
            } else if (Array.isArray(project.milestones)) {
              milestones = project.milestones;
            }
          }
          
          // Handle milestone_status
          let milestoneStatus = [];
          if (project.milestone_status) {
            if (typeof project.milestone_status === 'string') {
              try {
                milestoneStatus = JSON.parse(project.milestone_status);
              } catch (e) {
                milestoneStatus = [];
              }
            } else if (Array.isArray(project.milestone_status)) {
              milestoneStatus = project.milestone_status;
            }
          }
          
          return {
            ...project,
            required_skills: requiredSkills,
            milestones: milestones,
            milestone_status: milestoneStatus,
            created_at_formatted: project.created_at ? 
              new Date(project.created_at.toDate()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'recently'
          };
        } catch (error) {
          console.error(`Error processing project ${project.project_id}:`, error);
          return {
            ...project,
            required_skills: [],
            milestones: [],
            milestone_status: [],
            created_at_formatted: project.created_at ? 
              new Date(project.created_at.toDate()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'recently'
          };
        }
      });
    };

    // Process all project types
    const processedMyProjects = processProjects(myProjects);
    const processedTeamProjects = processProjects(teamProjects);
    const processedDiscoverProjects = processProjects(discoverProjects);

    // Log counts to help with debugging
    console.log(`Found ${processedMyProjects.length} my projects`);
    console.log(`Found ${processedTeamProjects.length} team projects`);
    console.log(`Found ${processedDiscoverProjects.length} discover projects`);

    res.render("projects", {
      title: "Projects",
      currentPage: "projects",
      user: req.session.user,
      myProjects: processedMyProjects,
      teamProjects: processedTeamProjects,
      discoverProjects: processedDiscoverProjects,
      applications: applications,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load projects. Please try again later.",
      title: "Error",
      currentPage: 'projects'
    });
  }
});

// GET route to display the new project form
router.get("/projects/new", isAuthenticated, async (req, res) => {
  try {
    // Render the project form with empty project data
    res.render("project-form", {
      user: req.session.user,
      project: {},
      isNew: true,
      error: null,
      success: null,
      currentPage: 'projects',
      title: 'Create New Project'
    });
  } catch (error) {
    console.error("Error displaying new project form:", error);
    res.status(500).send("Server error");
  }
});

// POST route to create a new project
router.post("/projects/new", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { title, description, category, status, required_skills, milestones, milestone_status } = req.body;
    
    // Validate required fields
    if (!title || !description) {
      return res.render("project-form", {
        user: req.session.user,
        project: req.body,
        isNew: true,
        error: "Project title and description are required",
        success: null,
        currentPage: 'projects',
        title: 'Create New Project'
      });
    }
    
    // Process skills if provided
    let skillsArray = [];
    if (required_skills) {
      // Handle both array and single value
      skillsArray = Array.isArray(required_skills) ? required_skills : [required_skills];
    }
    
    // Process milestones if provided
    let milestonesArray = [];
    let milestoneStatusArray = [];
    
    if (milestones) {
      // Handle both array and single value
      milestonesArray = Array.isArray(milestones) ? milestones : [milestones];
      
      if (milestone_status) {
        milestoneStatusArray = Array.isArray(milestone_status) ? milestone_status : [milestone_status];
      } else {
        // Default all milestones to pending if no status provided
        milestoneStatusArray = milestonesArray.map(() => 'pending');
      }
    }
    
    // Insert the new project
    const projectData = {
      title,
      description,
      category: category || 'Other',
      status: status || 'Open',
      owner_id: userId,
      required_skills: skillsArray,
      milestones: milestonesArray,
      milestone_status: milestoneStatusArray,
      created_at: serverTimestamp()
    };
    
    const projectRef = await addDoc(collection(db, 'projects'), projectData);
    
    // Redirect to the newly created project
    res.redirect(`/projects/${projectRef.id}`);
    
  } catch (error) {
    console.error("Error creating new project:", error);
    res.render("project-form", {
      user: req.session.user,
      project: req.body,
      isNew: true,
      error: "An error occurred while creating the project. Please try again.",
      success: null,
      currentPage: 'projects',
      title: 'Create New Project'
    });
  }
});

// Project Details Route
router.get("/projects/:id", async (req, res) => {
  if (!req.session.user) return res.redirect("/signin");

  try {
    const projectId = req.params.id;
    const userId = req.session.user.user_id;

    // Get project details
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Project not found",
        title: "Error",
        currentPage: "projects"
      });
    }
    
    const projectData = {
      project_id: projectSnap.id,
      ...projectSnap.data()
    };
    
    // Get project owner details
    const ownerRef = doc(db, 'users', projectData.owner_id);
    const ownerSnap = await getDoc(ownerRef);
    
    if (ownerSnap.exists()) {
      projectData.owner_name = ownerSnap.data().name;
      projectData.owner_pic = ownerSnap.data().profile_pic;
    }
    
    // Check if user has already applied
    const applicationsRef = collection(db, 'project_applications');
    const applicationQuery = firestoreQuery(
      applicationsRef,
      where('project_id', '==', projectId),
      where('user_id', '==', userId)
    );
    const applicationSnapshot = await getDocs(applicationQuery);
    
    projectData.hasApplied = !applicationSnapshot.empty;
    
    if (projectData.hasApplied) {
      const applicationDoc = applicationSnapshot.docs[0];
      projectData.application = {
        application_id: applicationDoc.id,
        ...applicationDoc.data()
      };
    }
    
    // Get team information
    const teamsRef = collection(db, 'teams');
    const teamQuery = firestoreQuery(teamsRef, where('project_id', '==', projectId));
    const teamSnapshot = await getDocs(teamQuery);
    
    if (!teamSnapshot.empty) {
      const teamDoc = teamSnapshot.docs[0];
      const teamData = teamDoc.data();
      
      projectData.team = {
        team_id: teamDoc.id,
        ...teamData
      };
      
      // Get team members
      const teamMembersRef = collection(db, 'team_members');
      const teamMembersQuery = firestoreQuery(teamMembersRef, where('team_id', '==', teamDoc.id));
      const teamMembersSnapshot = await getDocs(teamMembersQuery);
      
      const teamMembers = [];
      for (const memberDoc of teamMembersSnapshot.docs) {
        const memberData = memberDoc.data();
        
        // Get user details
        const memberUserRef = doc(db, 'users', memberData.user_id);
        const memberUserSnap = await getDoc(memberUserRef);
        
        if (memberUserSnap.exists()) {
          teamMembers.push({
            member_id: memberDoc.id,
            ...memberData,
            name: memberUserSnap.data().name,
            profile_pic: memberUserSnap.data().profile_pic,
            title: memberUserSnap.data().title
          });
        }
      }
      
      projectData.team.members = teamMembers;
      projectData.team.size = teamMembers.length;
      
      // Check if user is a team member
      projectData.isTeamMember = teamMembers.some(member => member.user_id === userId);
    } else {
      projectData.team = null;
      projectData.isTeamMember = false;
    }
    
    // Get project applications if user is the owner
    if (projectData.owner_id === userId) {
      const applicationsRef = collection(db, 'project_applications');
      const applicationsQuery = firestoreQuery(
        applicationsRef,
        where('project_id', '==', projectId),
        orderBy('created_at', 'desc')
      );
      const applicationsSnapshot = await getDocs(applicationsQuery);
      
      const applications = [];
      for (const appDoc of applicationsSnapshot.docs) {
        const appData = appDoc.data();
        
        // Get applicant details
        const applicantRef = doc(db, 'users', appData.user_id);
        const applicantSnap = await getDoc(applicantRef);
        
        if (applicantSnap.exists()) {
          applications.push({
            application_id: appDoc.id,
            ...appData,
            applicant_name: applicantSnap.data().name,
            applicant_pic: applicantSnap.data().profile_pic,
            applicant_title: applicantSnap.data().title,
            created_at_formatted: appData.created_at ? 
              new Date(appData.created_at.toDate()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'recently'
          });
        }
      }
      
      projectData.applications = applications;
    }
    
    // Initialize updates array
    const updates = [];
    
    // Process project data
    const processedProject = {
      ...projectData,
      isOwner: projectData.owner_id === userId,
      created_at_formatted: projectData.created_at ? 
        new Date(projectData.created_at.toDate()).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'recently',
      deadline_formatted: projectData.deadline ? 
        new Date(projectData.deadline.toDate()).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : null
    };
    
    // Initialize empty comments array
    const comments = [];
    
    // Calculate progress based on milestones
    let progress = 0;
    if (projectData.milestones && projectData.milestone_status) {
      const completedMilestones = projectData.milestone_status.filter(status => status === 'completed').length;
      progress = projectData.milestones.length > 0 ? 
        Math.round((completedMilestones / projectData.milestones.length) * 100) : 0;
    }
    
    // Format dates for display
    const formatted_created_at = projectData.created_at ? 
      new Date(projectData.created_at.toDate()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'recently';
    
    const formatted_updated_at = projectData.updated_ayt ? 
      new Date(projectData.updated_at.toDate()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'recently';
    
    // Add formatted dates to processed project
    processedProject.formatted_created_at = formatted_created_at;
    processedProject.formatted_updated_at = formatted_updated_at;
    
    // Fetch project comments
    const commentsRef = collection(db, 'project_comments');
    const commentsQuery = firestoreQuery(
      commentsRef,
      where('project_id', '==', projectId),
      orderBy('created_at', 'desc')
    );
    const commentsSnapshot = await getDocs(commentsQuery);
    
    // Use the existing comments array instead of declaring a new one
    for (const commentDoc of commentsSnapshot.docs) {
      const commentData = commentDoc.data();
      
      // Get comment author details
      const authorRef = doc(db, 'users', commentData.user_id);
      const authorSnap = await getDoc(authorRef);
      
      comments.push({
        comment_id: commentDoc.id,
        ...commentData,
        author_name: authorSnap.exists() ? authorSnap.data().name : 'Unknown User',
        profile_pic: authorSnap.exists() ? authorSnap.data().profile_pic : '/images/user.jpg',
        formatted_date: commentData.created_at ? 
          new Date(commentData.created_at.toDate()).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          }) : 'recently'
      });
    }
    
    // Generate URLs for sharing
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const projectUrl = `${baseUrl}/projects/${projectId}`;
    
    res.render("project-details", {
      title: projectData.title,
      currentPage: "projects",
      user: req.session.user,
      project: processedProject,
      updates: updates,
      comments: comments,
      isMember: projectData.isTeamMember,
      team: projectData.team ? projectData.team.members : [], // Add team members array
      progress: progress,
      hasPendingApplication: projectData.hasApplied, // Add this line
      relatedProjects: [], // Add empty related projects array
      baseUrl: baseUrl,
      projectUrl: projectUrl,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching project details:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load project details. Please try again later.",
      title: "Error",
      currentPage: 'projects'
    });
  }
});
router.get("/projects/:id/edit", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.session.user.user_id;

    // Get project details
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Project not found",
        title: "Error",
        currentPage: "projects"
      });
    }
    
    const projectData = {
      project_id: projectSnap.id,
      ...projectSnap.data()
    };
    
    // Check if user is the owner of the project
    if (projectData.owner_id !== userId) {
      return res.status(403).render("error", {
        user: req.session.user,
        error: "You don't have permission to edit this project",
        title: "Error",
        currentPage: "projects"
      });
    }
    
    // Render the project form with the project data
    res.render("project-form", {
      user: req.session.user,
      project: projectData,
      isNew: false,
      error: null,
      success: null,
      currentPage: 'projects',
      title: 'Edit Project'
    });
  } catch (error) {
    console.error("Error displaying edit project form:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load project edit form. Please try again later.",
      title: "Error",
      currentPage: 'projects'
    });
  }
});

// POST route to update an existing project
// POST route to update a project
router.post("/projects/:id/update", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.session.user.user_id;
    const { title, description, category, status, required_skills, milestones, milestone_status } = req.body;
    
    // Get project to check ownership
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Project not found",
        title: "Error",
        currentPage: "projects"
      });
    }
    
    const projectData = projectSnap.data();
    
    // Check if user is the owner of the project
    if (projectData.owner_id !== userId) {
      return res.status(403).render("error", {
        user: req.session.user,
        error: "You don't have permission to update this project",
        title: "Error",
        currentPage: "projects"
      });
    }
    
    // Validate required fields
    if (!title || !description) {
      return res.render("project-form", {
        user: req.session.user,
        project: {...req.body, project_id: projectId},
        isNew: false,
        error: "Project title and description are required",
        success: null,
        currentPage: 'projects',
        title: 'Edit Project'
      });
    }
    
    // Process skills if provided
    let skillsArray = [];
    if (required_skills) {
      // Handle both array and single value
      skillsArray = Array.isArray(required_skills) ? required_skills : [required_skills];
    }
    
    // Process milestones if provided
    let milestonesArray = [];
    let milestoneStatusArray = [];
    
    if (milestones) {
      // Handle both array and single value
      milestonesArray = Array.isArray(milestones) ? milestones : [milestones];
      
      if (milestone_status) {
        milestoneStatusArray = Array.isArray(milestone_status) ? milestone_status : [milestone_status];
      } else {
        // Keep existing milestone statuses if available, otherwise default to pending
        milestoneStatusArray = projectData.milestone_status && projectData.milestone_status.length === milestonesArray.length ? 
          projectData.milestone_status : milestonesArray.map(() => 'pending');
      }
    }
    
    // Update the project
    const updateData = {
      title,
      description,
      category: category || 'Other',
      status: status || 'Open',
      required_skills: skillsArray,
      milestones: milestonesArray,
      milestone_status: milestoneStatusArray,
      updated_at: serverTimestamp()
    };
    
    await updateDoc(projectRef, updateData);
    
    // Redirect to project details with success message
    res.redirect(`/projects/${projectId}?success=Project updated successfully`);
    
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "An error occurred while updating the project. Please try again.",
      title: "Error",
      currentPage: 'projects'
    });
  }
});


// POST route to delete a project
router.post("/projects/:id/delete", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.session.user.user_id;

    // Get project to check ownership
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Project not found",
        title: "Error",
        currentPage: "projects"
      });
    }
    
    const projectData = projectSnap.data();
    
    // Check if user is the owner of the project
    if (projectData.owner_id !== userId) {
      return res.status(403).render("error", {
        user: req.session.user,
        error: "You don't have permission to delete this project",
        title: "Error",
        currentPage: "projects"
      });
    }
    
    // Delete team members first if a team exists
    const teamsRef = collection(db, 'teams');
    const teamQuery = firestoreQuery(teamsRef, where('project_id', '==', projectId));
    const teamSnapshot = await getDocs(teamQuery);
    
    if (!teamSnapshot.empty) {
      const teamDoc = teamSnapshot.docs[0];
      const teamId = teamDoc.id;
      
      // Delete team members
      const teamMembersRef = collection(db, 'team_members');
      const teamMembersQuery = firestoreQuery(teamMembersRef, where('team_id', '==', teamId));
      const teamMembersSnapshot = await getDocs(teamMembersQuery);
      
      const deleteTeamMembersPromises = teamMembersSnapshot.docs.map(memberDoc => 
        deleteDoc(doc(db, 'team_members', memberDoc.id))
      );
      
      await Promise.all(deleteTeamMembersPromises);
      
      // Delete the team
      await deleteDoc(doc(db, 'teams', teamId));
    }
    
    // Delete project applications
    const applicationsRef = collection(db, 'project_applications');
    const applicationsQuery = firestoreQuery(applicationsRef, where('project_id', '==', projectId));
    const applicationsSnapshot = await getDocs(applicationsQuery);
    
    const deleteApplicationsPromises = applicationsSnapshot.docs.map(appDoc => 
      deleteDoc(doc(db, 'project_applications', appDoc.id))
    );
    
    await Promise.all(deleteApplicationsPromises);
    
    // Finally, delete the project
    await deleteDoc(projectRef);
    
    // Redirect to projects page with success message
    res.redirect('/projects?success=Project deleted successfully');
    
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to delete project. Please try again later.",
      title: "Error",
      currentPage: 'projects'
    });
  }
});

// POST route to add a comment to a project
router.post("/projects/:id/comment", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.session.user.user_id;
    const { comment } = req.body;

    // Validate comment
    if (!comment || comment.trim() === '') {
      return res.redirect(`/projects/${projectId}?error=Comment cannot be empty`);
    }

    // Check if project exists
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Project not found",
        title: "Error",
        currentPage: "projects"
      });
    }

    // Create comment document
    const commentData = {
      project_id: projectId,
      user_id: userId,
      content: comment,
      created_at: serverTimestamp()
    };

    // Add comment to comments collection
    await addDoc(collection(db, 'project_comments'), commentData);
    
    // Redirect back to project details
    res.redirect(`/projects/${projectId}#comments`);
    
  } catch (error) {
    console.error("Error adding comment:", error);
    res.redirect(`/projects/${req.params.id}?error=Failed to add comment`);
  }
});

// POST route to add a project update
router.post("/projects/:id/update-status", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.session.user.user_id;
    const { update_content } = req.body;

    // Validate update content
    if (!update_content || update_content.trim() === '') {
      return res.redirect(`/projects/${projectId}?error=Update content cannot be empty`);
    }

    // Check if project exists
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Project not found",
        title: "Error",
        currentPage: "projects"
      });
    }
    
    const projectData = projectSnap.data();
    
    // Check if user is the owner or team member
    if (projectData.owner_id !== userId) {
      // Check if user is a team member
      const teamsRef = collection(db, 'teams');
      const teamQuery = firestoreQuery(teamsRef, where('project_id', '==', projectId));
      const teamSnapshot = await getDocs(teamQuery);
      
      let isTeamMember = false;
      
      if (!teamSnapshot.empty) {
        const teamDoc = teamSnapshot.docs[0];
        
        const teamMembersRef = collection(db, 'team_members');
        const teamMembersQuery = firestoreQuery(
          teamMembersRef, 
          where('team_id', '==', teamDoc.id),
          where('user_id', '==', userId)
        );
        const teamMembersSnapshot = await getDocs(teamMembersQuery);
        
        isTeamMember = !teamMembersSnapshot.empty;
      }
      
      if (!isTeamMember) {
        return res.status(403).render("error", {
          user: req.session.user,
          error: "You don't have permission to add updates to this project",
          title: "Error",
          currentPage: "projects"
        });
      }
    }

    // Create update document
    const updateData = {
      project_id: projectId,
      user_id: userId,
      content: update_content,
      created_at: serverTimestamp()
    };

    // Add update to project_updates collection
    await addDoc(collection(db, 'project_updates'), updateData);
    
    // Redirect back to project details
    res.redirect(`/projects/${projectId}?success=Update added successfully#updates`);
    
  } catch (error) {
    console.error("Error adding project update:", error);
    res.redirect(`/projects/${req.params.id}?error=Failed to add update`);
  }
});

export default router;