import express from 'express';
const router = express.Router();
import { 
  collection, doc, getDoc, getDocs, query as firestoreQuery, where, 
  orderBy, limit, addDoc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

import { db } from '../config/firebase.js';

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/signin");
};

// Get all teams
router.get("/teams", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    // Get user information
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return res.redirect("/signin");
    }
    
    const user = {
      user_id: userSnap.id,
      ...userSnap.data()
    };

    // Get teams where user is a member
    const teamMembersRef = collection(db, 'team_members');
    const teamMemberQuery = firestoreQuery(teamMembersRef, where('user_id', '==', userId));
    const teamMemberSnapshot = await getDocs(teamMemberQuery);
    
    const teamIds = [];
    teamMemberSnapshot.forEach(doc => {
      teamIds.push(doc.data().team_id);
    });
    
    // Process teams
    const processTeams = async (teams) => {
      const processedTeams = [];
      
      for (const team of teams) {
        // Get team members
        const membersRef = collection(db, 'team_members');
        const membersQuery = firestoreQuery(membersRef, where('team_id', '==', team.id));
        const membersSnapshot = await getDocs(membersQuery);
        
        const members = [];
        for (const memberDoc of membersSnapshot.docs) {
          const memberData = memberDoc.data();
          const userRef = doc(db, 'users', memberData.user_id);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            members.push({
              ...memberData,
              name: userSnap.data().name,
              profile_pic: userSnap.data().profile_pic,
              email: userSnap.data().email,
              skills: userSnap.data().skills
            });
          }
        }
        
        processedTeams.push({
          id: team.id,
          ...team.data(),
          members,
          created_at_formatted: new Date(team.data().created_at?.toDate()).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        });
      }
      
      return processedTeams;
    };

    // Get my teams
    const myTeamsArray = [];
    for (const teamId of teamIds) {
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (teamSnap.exists()) {
        // Get project details
        const projectRef = doc(db, 'projects', teamSnap.data().project_id);
        const projectSnap = await getDoc(projectRef);
        
        if (projectSnap.exists()) {
          // Get owner details
          const ownerRef = doc(db, 'users', projectSnap.data().owner_id);
          const ownerSnap = await getDoc(ownerRef);
          
          myTeamsArray.push({
            ...teamSnap,
            data: () => ({
              ...teamSnap.data(),
              project_title: projectSnap.data().title,
              project_description: projectSnap.data().description,
              owner_name: ownerSnap.exists() ? ownerSnap.data().name : 'Unknown',
              owner_pic: ownerSnap.exists() ? ownerSnap.data().profile_pic : '/images/user.jpg'
            })
          });
        }
      }
    }
    
    const myTeams = await processTeams(myTeamsArray);
    
    // Get owned teams
    const projectsRef = collection(db, 'projects');
    const ownedProjectsQuery = firestoreQuery(projectsRef, where('owner_id', '==', userId));
    const ownedProjectsSnapshot = await getDocs(ownedProjectsQuery);
    
    const ownedTeamsArray = [];
    for (const projectDoc of ownedProjectsSnapshot.docs) {
      const teamsRef = collection(db, 'teams');
      const teamsQuery = firestoreQuery(teamsRef, where('project_id', '==', projectDoc.id));
      const teamsSnapshot = await getDocs(teamsQuery);
      
      teamsSnapshot.forEach(teamDoc => {
        ownedTeamsArray.push({
          ...teamDoc,
          data: () => ({
            ...teamDoc.data(),
            project_title: projectDoc.data().title,
            project_description: projectDoc.data().description
          })
        });
      });
    }
    
    const ownedTeams = await processTeams(ownedTeamsArray);
    
    // Get all teams
    const teamsRef = collection(db, 'teams');
    const allTeamsQuery = firestoreQuery(teamsRef, orderBy('created_at', 'desc'), limit(12));
    const allTeamsSnapshot = await getDocs(allTeamsQuery);
    
    const allTeamsArray = [];
    for (const teamDoc of allTeamsSnapshot.docs) {
      // Get project details
      const projectRef = doc(db, 'projects', teamDoc.data().project_id);
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        // Get owner details
        const ownerRef = doc(db, 'users', projectSnap.data().owner_id);
        const ownerSnap = await getDoc(ownerRef);
        
        // Check if user is a member
        const memberRef = collection(db, 'team_members');
        const memberQuery = firestoreQuery(memberRef, 
          where('team_id', '==', teamDoc.id), 
          where('user_id', '==', userId)
        );
        const memberSnap = await getDocs(memberQuery);
        
        // Get leader
        const leaderRef = collection(db, 'team_members');
        const leaderQuery = firestoreQuery(leaderRef, 
          where('team_id', '==', teamDoc.id), 
          where('role', '==', 'Leader')
        );
        const leaderSnap = await getDocs(leaderQuery);
        
        let leaderName = null;
        let leaderId = null;
        
        if (!leaderSnap.empty) {
          const leaderData = leaderSnap.docs[0].data();
          const leaderUserRef = doc(db, 'users', leaderData.user_id);
          const leaderUserSnap = await getDoc(leaderUserRef);
          
          if (leaderUserSnap.exists()) {
            leaderName = leaderUserSnap.data().name;
            leaderId = leaderUserSnap.id;
          }
        }
        
        allTeamsArray.push({
          ...teamDoc,
          data: () => ({
            ...teamDoc.data(),
            project_title: projectSnap.data().title,
            project_description: projectSnap.data().description,
            owner_name: ownerSnap.exists() ? ownerSnap.data().name : 'Unknown',
            owner_pic: ownerSnap.exists() ? ownerSnap.data().profile_pic : '/images/user.jpg',
            is_member: !memberSnap.empty,
            leader_name: leaderName,
            leader_id: leaderId
          })
        });
      }
    }
    
    const allTeams = await processTeams(allTeamsArray);
    
    // Get featured teams
    const featuredTeamsQuery = firestoreQuery(teamsRef, limit(6));
    const featuredTeamsSnapshot = await getDocs(featuredTeamsQuery);
    
    const featuredTeamsArray = [];
    for (const teamDoc of featuredTeamsSnapshot.docs) {
      // Get project details
      const projectRef = doc(db, 'projects', teamDoc.data().project_id);
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        // Get owner details
        const ownerRef = doc(db, 'users', projectSnap.data().owner_id);
        const ownerSnap = await getDoc(ownerRef);
        
        // Get leader
        const leaderRef = collection(db, 'team_members');
        const leaderQuery = firestoreQuery(leaderRef, 
          where('team_id', '==', teamDoc.id), 
          where('role', '==', 'Leader')
        );
        const leaderSnap = await getDocs(leaderQuery);
        
        let leaderName = null;
        let leaderId = null;
        
        if (!leaderSnap.empty) {
          const leaderData = leaderSnap.docs[0].data();
          const leaderUserRef = doc(db, 'users', leaderData.user_id);
          const leaderUserSnap = await getDoc(leaderUserRef);
          
          if (leaderUserSnap.exists()) {
            leaderName = leaderUserSnap.data().name;
            leaderId = leaderUserSnap.id;
          }
        }
        
        featuredTeamsArray.push({
          ...teamDoc,
          data: () => ({
            ...teamDoc.data(),
            project_title: projectSnap.data().title,
            project_description: projectSnap.data().description,
            owner_name: ownerSnap.exists() ? ownerSnap.data().name : 'Unknown',
            owner_pic: ownerSnap.exists() ? ownerSnap.data().profile_pic : '/images/user.jpg',
            leader_name: leaderName,
            leader_id: leaderId
          })
        });
      }
    }
    
    const featuredTeams = await processTeams(featuredTeamsArray);
    
    res.render("teams", {
      title: "My Teams",
      currentPage: "teams",
      user,
      myTeams,
      ownedTeams,
      allTeams,
      featuredTeams,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load teams. Please try again later.",
      title: "Error",
      currentPage: 'teams'
    });
  }
});

// Get team details
router.get("/teams/:id", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.session.user.user_id;
    
    // Get team details
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Team not found",
        title: "Error",
        currentPage: "teams"
      });
    }
    
    const teamData = teamSnap.data();
    
    // Get project details
    const projectRef = doc(db, 'projects', teamData.project_id);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Project not found",
        title: "Error",
        currentPage: "teams"
      });
    }
    
    const projectData = projectSnap.data();
    
    // Get owner details
    const ownerRef = doc(db, 'users', projectData.owner_id);
    const ownerSnap = await getDoc(ownerRef);
    
    const team = {
      id: teamSnap.id,
      ...teamData,
      project_name: projectData.title,
      project_description: projectData.description,
      owner_name: ownerSnap.exists() ? ownerSnap.data().name : 'Unknown',
      owner_pic: ownerSnap.exists() ? ownerSnap.data().profile_pic : '/images/user.jpg'
    };
    
    // Check if user is a member of this team
    const memberRef = collection(db, 'team_members');
    const memberQuery = firestoreQuery(memberRef, 
      where('team_id', '==', teamId), 
      where('user_id', '==', userId)
    );
    const memberSnap = await getDocs(memberQuery);
    
    team.isMember = !memberSnap.empty;
    
    if (team.isMember) {
      const memberData = memberSnap.docs[0].data();
      const roleRef = doc(db, 'roles', memberData.role);
      const roleSnap = await getDoc(roleRef);
      
      team.userRole = roleSnap.exists() ? roleSnap.data().role_name : memberData.role;
    } else {
      team.userRole = null;
    }
    
    // Get team members
    const membersRef = collection(db, 'team_members');
    const membersQuery = firestoreQuery(membersRef, where('team_id', '==', teamId));
    const membersSnapshot = await getDocs(membersQuery);
    
    const members = [];
    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data();
      const userRef = doc(db, 'users', memberData.user_id);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // Get role name
        let roleName = memberData.role;
        if (memberData.role) {
          const roleRef = doc(db, 'roles', memberData.role);
          const roleSnap = await getDoc(roleRef);
          
          if (roleSnap.exists()) {
            roleName = roleSnap.data().role_name;
          }
        }
        
        members.push({
          id: memberDoc.id,
          ...memberData,
          name: userData.name,
          profile_pic: userData.profile_pic,
          title: userData.title,
          role_name: roleName
        });
      }
    }
    
    team.members = members;
    
    // Get team skills
    const skillsRef = collection(db, 'team_skills');
    const skillsQuery = firestoreQuery(skillsRef, where('team_id', '==', teamId));
    const skillsSnapshot = await getDocs(skillsQuery);
    
    const skills = [];
    for (const skillDoc of skillsSnapshot.docs) {
      const skillData = skillDoc.data();
      const skillRef = doc(db, 'skills', skillData.skill_id);
      const skillSnap = await getDoc(skillRef);
      
      if (skillSnap.exists()) {
        skills.push({
          id: skillSnap.id,
          ...skillSnap.data()
        });
      }
    }
    
    team.skills = skills;
    
    // Render team details page
    res.render("team-details", {
      user: req.session.user,
      team,
      title: `Team: ${team.team_name}`,
      currentPage: "teams"
    });
  } catch (error) {
    console.error("Error in team details route:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "An error occurred while loading team details",
      title: "Error",
      currentPage: "teams"
    });
  }
});

// Remove team member
router.post("/teams/:teamId/remove-member/:userId", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const memberUserId = req.params.userId;
    const currentUserId = req.session.user.user_id;

    // Get team and project details
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }
    
    const teamData = teamSnap.data();
    const projectRef = doc(db, 'projects', teamData.project_id);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    // Check if user is project owner
    const isOwner = projectSnap.data().owner_id === currentUserId;
    
    // If not owner, check if user is team leader
    let isLeader = false;
    if (!isOwner) {
      const leaderRef = collection(db, 'team_members');
      const leaderQuery = firestoreQuery(leaderRef, 
        where('team_id', '==', teamId), 
        where('user_id', '==', currentUserId),
        where('role', '==', 'Leader')
      );
      const leaderSnap = await getDocs(leaderQuery);
      
      isLeader = !leaderSnap.empty;
    }
    
    if (!isOwner && !isLeader) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to remove team members"
      });
    }
    
    // Check if trying to remove the project owner
    if (projectSnap.data().owner_id === memberUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove the project owner from the team"
      });
    }
    
    // Find and remove the team member
    const memberRef = collection(db, 'team_members');
    const memberQuery = firestoreQuery(memberRef, 
      where('team_id', '==', teamId), 
      where('user_id', '==', memberUserId)
    );
    const memberSnap = await getDocs(memberQuery);
    
    if (memberSnap.empty) {
      return res.status(404).json({
        success: false,
        message: "Team member not found"
      });
    }
    
    // Delete the team member document
    await deleteDoc(doc(db, 'team_members', memberSnap.docs[0].id));
    
    // Log the activity
    await addDoc(collection(db, 'team_activities'), {
      team_id: teamId,
      user_id: currentUserId,
      activity_type: 'member_removed',
      description: 'Removed a team member',
      created_at: serverTimestamp()
    });
    
    // Create notification for the removed user
    await addDoc(collection(db, 'notifications'), {
      user_id: memberUserId,
      type: 'team_removed',
      content: `You have been removed from the team: ${teamData.team_name}`,
      related_id: teamData.project_id,
      is_read: false,
      created_at: serverTimestamp()
    });
    
    return res.status(200).json({
      success: true,
      message: "Team member removed successfully"
    });
  } catch (error) {
    console.error("Error removing team member:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove team member"
    });
  }
});

// Create team route would be implemented similarly

export default router;