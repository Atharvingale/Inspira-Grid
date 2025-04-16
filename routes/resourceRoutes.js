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

// Helper function to get event color
const getEventColor = (type, status) => {
  if (type === 'project') {
    switch (status) {
      case 'Open': return '#4CAF50';
      case 'In Progress': return '#2196F3';
      case 'Completed': return '#9E9E9E';
      case 'On Hold': return '#FFC107';
      default: return '#2196F3';
    }
  } else if (type === 'task') {
    switch (status) {
      case 'To Do': return '#FF5722';
      case 'In Progress': return '#2196F3';
      case 'Completed': return '#4CAF50';
      default: return '#FF5722';
    }
  } else if (type === 'meeting') {
    return '#9C27B0';
  }
  return '#2196F3';
};

// Resources route
router.get("/resources", isAuthenticated, async (req, res) => {
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

    // Get resources
    const resourcesRef = collection(db, 'resources');
    const resourcesQuery = query(
      resourcesRef,
      orderBy('created_at', 'desc')
    );
    const resourcesSnapshot = await getDocs(resourcesQuery);

    // Get user's bookmarked resources
    const bookmarksRef = collection(db, 'resource_bookmarks');
    const bookmarksQuery = query(
      bookmarksRef,
      where('user_id', '==', userId)
    );
    const bookmarksSnapshot = await getDocs(bookmarksQuery);

    const bookmarkedIds = bookmarksSnapshot.docs.map(doc => doc.data().resource_id);

    // Process resources
    const resources = [];
    for (const resourceDoc of resourcesSnapshot.docs) {
      const resourceData = resourceDoc.data();
      
      // Get creator info
      const creatorRef = doc(db, 'users', resourceData.creator_id);
      const creatorSnap = await getDoc(creatorRef);
      
      // Get like count
      const likesRef = collection(db, 'resource_likes');
      const likesQuery = query(likesRef, where('resource_id', '==', resourceDoc.id));
      const likesSnapshot = await getDocs(likesQuery);
      
      resources.push({
        resource_id: resourceDoc.id,
        ...resourceData,
        creator_name: creatorSnap.exists() ? creatorSnap.data().name : 'Unknown',
        creator_pic: creatorSnap.exists() ? creatorSnap.data().profile_pic : '/images/user.jpg',
        like_count: likesSnapshot.size,
        created_at_formatted: resourceData.created_at ? 
          new Date(resourceData.created_at.toDate()).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : 'recently',
        is_bookmarked: bookmarkedIds.includes(resourceDoc.id)
      });
    }

    // Group resources by category
    const resourcesByCategory = {};
    resources.forEach(resource => {
      if (!resourcesByCategory[resource.category]) {
        resourcesByCategory[resource.category] = [];
      }
      resourcesByCategory[resource.category].push(resource);
    });

    res.render("resources", {
      title: "Resources",
      currentPage: "resources",
      user,
      resourcesByCategory,
      resources,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load resources. Please try again later.",
      title: "Error",
      currentPage: 'resources'
    });
  }
});

// Documentation route
router.get("/resources/documentation", isAuthenticated, async (req, res) => {
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

    // Get documentation resources
    const resourcesRef = collection(db, 'resources');
    const docsQuery = query(
      resourcesRef,
      where('category', '==', 'Documentation'),
      orderBy('created_at', 'desc')
    );
    const docsSnapshot = await getDocs(docsQuery);

    // Process documentation
    const documentation = [];
    for (const docDoc of docsSnapshot.docs) {
      const docData = docDoc.data();
      
      // Get creator info
      const creatorRef = doc(db, 'users', docData.creator_id);
      const creatorSnap = await getDoc(creatorRef);
      
      documentation.push({
        resource_id: docDoc.id,
        ...docData,
        creator_name: creatorSnap.exists() ? creatorSnap.data().name : 'Unknown',
        creator_pic: creatorSnap.exists() ? creatorSnap.data().profile_pic : '/images/user.jpg',
        created_at_formatted: docData.created_at ? 
          new Date(docData.created_at.toDate()).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : 'recently'
      });
    }

    res.render("documentation", {
      title: "Documentation",
      currentPage: "resources",
      user,
      documentation,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching documentation:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load documentation. Please try again later.",
      title: "Error",
      currentPage: 'resources'
    });
  }
});

// Calendar route
router.get("/calendar", isAuthenticated, async (req, res) => {
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

    // Get user's projects with deadlines
    const events = [];
    
    // Get projects where user is owner
    const projectsRef = collection(db, 'projects');
    const ownerProjectsQuery = query(
      projectsRef,
      where('owner_id', '==', userId)
    );
    const ownerProjectsSnapshot = await getDocs(ownerProjectsQuery);
    
    // Process owner projects
    for (const projectDoc of ownerProjectsSnapshot.docs) {
      const projectData = projectDoc.data();
      
      if (projectData.deadline) {
        const deadline = projectData.deadline.toDate ? 
          projectData.deadline.toDate() : new Date(projectData.deadline);
        
        events.push({
          id: `project-${projectDoc.id}`,
          title: projectData.title,
          start: deadline.toISOString(),
          end: deadline.toISOString(),
          allDay: true,
          type: 'project',
          status: projectData.status,
          color: getEventColor('project', projectData.status)
        });
      }
    }
    
    // Get team projects
    const teamMembersRef = collection(db, 'team_members');
    const teamMemberQuery = query(teamMembersRef, where('user_id', '==', userId));
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
          
          if (projectData.deadline) {
            const deadline = projectData.deadline.toDate ? 
              projectData.deadline.toDate() : new Date(projectData.deadline);
            
            events.push({
              id: `project-${projectSnap.id}`,
              title: projectData.title,
              start: deadline.toISOString(),
              end: deadline.toISOString(),
              allDay: true,
              type: 'project',
              status: projectData.status,
              color: getEventColor('project', projectData.status)
            });
          }
        }
      }
    }
    
    // Get user's tasks
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(
      tasksRef,
      where('assigned_to', '==', userId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    
    // Process tasks
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      
      if (taskData.due_date) {
        const dueDate = taskData.due_date.toDate ? 
          taskData.due_date.toDate() : new Date(taskData.due_date);
        
        events.push({
          id: `task-${taskDoc.id}`,
          title: taskData.title,
          start: dueDate.toISOString(),
          end: dueDate.toISOString(),
          allDay: true,
          type: 'task',
          status: taskData.status,
          color: getEventColor('task', taskData.status)
        });
      }
    }
    
    // Get user's meetings
    const meetingsRef = collection(db, 'meetings');
    const meetingsQuery = query(
      meetingsRef,
      where('participants', 'array-contains', userId)
    );
    const meetingsSnapshot = await getDocs(meetingsQuery);
    
    // Process meetings
    for (const meetingDoc of meetingsSnapshot.docs) {
      const meetingData = meetingDoc.data();
      
      if (meetingData.start_time && meetingData.end_time) {
        const startTime = meetingData.start_time.toDate ? 
          meetingData.start_time.toDate() : new Date(meetingData.start_time);
        
        const endTime = meetingData.end_time.toDate ? 
          meetingData.end_time.toDate() : new Date(meetingData.end_time);
        
        events.push({
          id: `meeting-${meetingDoc.id}`,
          title: meetingData.title,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          allDay: false,
          type: 'meeting',
          color: getEventColor('meeting')
        });
      }
    }

    res.render("calendar", {
      title: "Calendar",
      currentPage: "resources",
      user,
      events: JSON.stringify(events),
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load calendar. Please try again later.",
      title: "Error",
      currentPage: 'resources'
    });
  }
});

// Add resource route - GET
router.get("/resources/add", isAuthenticated, async (req, res) => {
  try {
    res.render("resource-form", {
      title: "Add Resource",
      currentPage: "resources",
      user: req.session.user,
      resource: {},
      isNew: true,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error loading resource form:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load resource form. Please try again later.",
      title: "Error",
      currentPage: 'resources'
    });
  }
});

// Add resource route - POST
router.post("/resources/add", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { title, description, category, url, tags } = req.body;
    
    // Validate required fields
    if (!title || !description || !category) {
      return res.render("resource-form", {
        title: "Add Resource",
        currentPage: "resources",
        user: req.session.user,
        resource: req.body,
        isNew: true,
        error: "Title, description, and category are required",
        success: null
      });
    }
    
    // Process tags if provided
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
    
    // Insert the new resource
    const resourceData = {
      title,
      description,
      category,
      url: url || null,
      tags: tagsArray,
      creator_id: userId,
      created_at: serverTimestamp()
    };
    
    await addDoc(collection(db, 'resources'), resourceData);
    
    // Redirect to resources page
    res.redirect("/resources?success=Resource added successfully");
  } catch (error) {
    console.error("Error adding resource:", error);
    res.render("resource-form", {
      title: "Add Resource",
      currentPage: "resources",
      user: req.session.user,
      resource: req.body,
      isNew: true,
      error: "An error occurred while adding the resource. Please try again.",
      success: null
    });
  }
});

// Bookmark resource route
router.post("/resources/:id/bookmark", isAuthenticated, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const userId = req.session.user.user_id;
    
    // Check if resource exists
    const resourceRef = doc(db, 'resources', resourceId);
    const resourceSnap = await getDoc(resourceRef);
    
    if (!resourceSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }
    
    // Check if already bookmarked
    const bookmarksRef = collection(db, 'resource_bookmarks');
    const bookmarkQuery = query(
      bookmarksRef,
      where('resource_id', '==', resourceId),
      where('user_id', '==', userId)
    );
    const bookmarkSnapshot = await getDocs(bookmarkQuery);
    
    if (!bookmarkSnapshot.empty) {
      // Already bookmarked, remove bookmark
      await deleteDoc(bookmarkSnapshot.docs[0].ref);
      
      return res.status(200).json({
        success: true,
        message: "Bookmark removed",
        isBookmarked: false
      });
    }
    
    // Add bookmark
    await addDoc(collection(db, 'resource_bookmarks'), {
      resource_id: resourceId,
      user_id: userId,
      created_at: serverTimestamp()
    });
    
    return res.status(200).json({
      success: true,
      message: "Resource bookmarked",
      isBookmarked: true
    });
  } catch (error) {
    console.error("Error bookmarking resource:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bookmark resource"
    });
  }
});

// Like resource route
router.post("/resources/:id/like", isAuthenticated, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const userId = req.session.user.user_id;
    
    // Check if resource exists
    const resourceRef = doc(db, 'resources', resourceId);
    const resourceSnap = await getDoc(resourceRef);
    
    if (!resourceSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }
    
    // Check if already liked
    const likesRef = collection(db, 'resource_likes');
    const likeQuery = query(
      likesRef,
      where('resource_id', '==', resourceId),
      where('user_id', '==', userId)
    );
    const likeSnapshot = await getDocs(likeQuery);
    
    if (!likeSnapshot.empty) {
      // Already liked, remove like
      await deleteDoc(likeSnapshot.docs[0].ref);
      
      // Get updated like count
      const updatedLikeQuery = query(likesRef, where('resource_id', '==', resourceId));
      const updatedLikeSnapshot = await getDocs(updatedLikeQuery);
      
      return res.status(200).json({
        success: true,
        message: "Like removed",
        isLiked: false,
        likeCount: updatedLikeSnapshot.size
      });
    }
    
    // Add like
    await addDoc(collection(db, 'resource_likes'), {
      resource_id: resourceId,
      user_id: userId,
      created_at: serverTimestamp()
    });
    
    // Get updated like count
    const updatedLikeQuery = query(likesRef, where('resource_id', '==', resourceId));
    const updatedLikeSnapshot = await getDocs(updatedLikeQuery);
    
    return res.status(200).json({
      success: true,
      message: "Resource liked",
      isLiked: true,
      likeCount: updatedLikeSnapshot.size
    });
  } catch (error) {
    console.error("Error liking resource:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to like resource"
    });
  }
});

export default router;