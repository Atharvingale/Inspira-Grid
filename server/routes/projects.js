const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const ProjectModel = require('../models/Project');
const ApplicationModel = require('../models/Application');
const { requireAuth, createRateLimit, requireCompleteProfile } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Rate limiting for project creation
const createProjectLimit = createRateLimit(60 * 60 * 1000, 5); // 5 projects per hour

// Get all projects with enhanced filters and pagination
router.get('/', async (req, res) => {
  try {
    const {
      status,
      category,
      skills,
      search,
      page = 1,
      limit = 12,
      orderBy = 'createdAt',
      orderDirection = 'desc',
      difficulty,
      isRemote,
      hasGitHub,
      teamSizeMin,
      teamSizeMax,
      sortBy
    } = req.query;

    const filters = {
      status: status || 'approved',
      category,
      difficulty,
      isRemote: isRemote !== undefined ? isRemote === 'true' : undefined,
      hasGitHub: hasGitHub !== undefined ? hasGitHub === 'true' : undefined,
      teamSizeMin: teamSizeMin ? parseInt(teamSizeMin) : undefined,
      teamSizeMax: teamSizeMax ? parseInt(teamSizeMax) : undefined,
      limit: parseInt(limit) * 2, // Get more for better filtering
      orderBy,
      orderDirection,
      sortBy
    };

    if (skills) {
      filters.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
    }

    let projects;
    if (search && search.trim()) {
      console.log('🔍 Performing search with term:', search);
      projects = await ProjectModel.search(search.trim(), filters);
    } else {
      projects = await ProjectModel.getAll(filters);
    }

    // Add pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedProjects = projects.slice(startIndex, endIndex);

    // Add user-specific info if authenticated
    if (req.user) {
      for (let project of paginatedProjects) {
        try {
          project.hasApplied = await ApplicationModel.hasApplied(req.user.uid, project.id);
          project.isOwner = project.ownerId === req.user.uid;
          project.isTeamMember = project.teamMembers?.some(member => member.userId === req.user.uid);
        } catch (error) {
          console.error('Error adding user info to project:', error);
        }
      }
    }

    res.json({
      projects: paginatedProjects,
      pagination: {
        currentPage: parseInt(page),
        totalProjects: projects.length,
        totalPages: Math.ceil(projects.length / parseInt(limit)),
        hasNext: endIndex < projects.length,
        hasPrev: startIndex > 0
      },
      searchInfo: search ? {
        searchTerm: search,
        resultsFound: projects.length,
        hasRelevanceScoring: true
      } : null
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      message: error.message
    });
  }
});

// Get single project by ID
router.get('/:id', [
  param('id').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    console.log('Looking for project with ID:', req.params.id);
    const project = await ProjectModel.getById(req.params.id);
    console.log('Project lookup result:', project ? 'Found' : 'Not found');
    
    if (!project) {
      console.log('Project not found, returning 404');
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Add additional info if user is authenticated
    if (req.user) {
      // Check if user has applied
      const hasApplied = await ApplicationModel.hasApplied(req.user.uid, project.id);
      project.hasApplied = hasApplied;

      // Check if user is team member or owner
      project.isOwner = project.ownerId === req.user.uid;
      project.isTeamMember = project.teamMembers?.some(member => member.userId === req.user.uid);
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      message: error.message
    });
  }
});

// Create new project
router.post('/', [
  requireAuth,
  requireCompleteProfile,
  createProjectLimit,
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('skillsRequired').isArray({ min: 1, max: 10 }).withMessage('1-10 skills are required'),
  body('teamSize').isInt({ min: 2, max: 20 }).withMessage('Team size must be 2-20 members'),
  body('duration').optional().trim(),
  body('budget').optional().trim(),
  body('githubRepo').optional().isObject().withMessage('GitHub repository must be an object'),
  body('githubRepo.owner').optional().trim().notEmpty().withMessage('GitHub repository owner is required'),
  body('githubRepo.name').optional().trim().notEmpty().withMessage('GitHub repository name is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const projectData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      skillsRequired: req.body.skillsRequired,
      teamSize: parseInt(req.body.teamSize),
      duration: req.body.duration,
      budget: req.body.budget,
      ownerId: req.user.uid,
      ownerName: req.user.displayName,
      ownerEmail: req.user.email
    };
    
    // Add GitHub repository if provided
    if (req.body.githubRepo && req.body.githubRepo.owner && req.body.githubRepo.name) {
      projectData.githubRepo = {
        owner: req.body.githubRepo.owner,
        name: req.body.githubRepo.name,
        fullName: `${req.body.githubRepo.owner}/${req.body.githubRepo.name}`,
        url: `https://github.com/${req.body.githubRepo.owner}/${req.body.githubRepo.name}`,
        cloneUrl: `https://github.com/${req.body.githubRepo.owner}/${req.body.githubRepo.name}.git`,
        linkedAt: new Date().toISOString()
      };
    }

    const project = await ProjectModel.create(projectData);
    
    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      error: 'Failed to create project',
      message: error.message
    });
  }
});

// Update project (owner only)
router.put('/:id', [
  requireAuth,
  param('id').isString().notEmpty(),
  body('title').optional().trim().isLength({ min: 3, max: 100 }),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }),
  body('category').optional().trim().notEmpty(),
  body('skillsRequired').optional().isArray({ min: 1, max: 10 }),
  body('teamSize').optional().isInt({ min: 2, max: 20 }),
  body('duration').optional().trim(),
  body('budget').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await ProjectModel.getById(req.params.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user is owner
    if (project.ownerId !== req.user.uid) {
      return res.status(403).json({
        error: 'Only project owner can update this project'
      });
    }

    // Allow updates to projects by owners

    const updates = {};
    const allowedFields = ['title', 'description', 'category', 'skillsRequired', 'teamSize', 'duration', 'budget'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedProject = await ProjectModel.update(req.params.id, updates);
    
    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      error: 'Failed to update project',
      message: error.message
    });
  }
});

// Delete project (owner only)
router.delete('/:id', [
  requireAuth,
  param('id').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await ProjectModel.getById(req.params.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user is owner
    if (project.ownerId !== req.user.uid) {
      return res.status(403).json({
        error: 'Only project owner can delete this project'
      });
    }

    await ProjectModel.delete(req.params.id);
    
    res.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      message: error.message
    });
  }
});

// Get user's projects
router.get('/user/my-projects', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    
    const filters = {
      ownerId: req.user.uid,
      orderBy: 'updatedAt',
      orderDirection: 'desc'
    };

    if (status) {
      filters.status = status;
    }

    const projects = await ProjectModel.getAll(filters);
    
    res.json({
      projects
    });
  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      message: error.message
    });
  }
});

// Get projects user is a team member of
router.get('/user/team-projects', requireAuth, async (req, res) => {
  try {
    const projects = await ProjectModel.getByTeamMember(req.user.uid);
    
    res.json({
      projects
    });
  } catch (error) {
    console.error('Error fetching team projects:', error);
    res.status(500).json({
      error: 'Failed to fetch team projects',
      message: error.message
    });
  }
});

// Apply to project
router.post('/:id/apply', [
  requireAuth,
  requireCompleteProfile,
  param('id').isString().notEmpty(),
  body('message').trim().isLength({ min: 10, max: 500 }).withMessage('Application message must be 10-500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await ProjectModel.getById(req.params.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if project is approved or in-progress
    if (project.status !== 'approved' && project.status !== 'in-progress') {
      return res.status(400).json({
        error: 'Can only apply to approved or in-progress projects'
      });
    }

    // Check if user is not the owner
    if (project.ownerId === req.user.uid) {
      return res.status(400).json({
        error: 'Cannot apply to your own project'
      });
    }

    // Check if user hasn't already applied
    const hasApplied = await ApplicationModel.hasApplied(req.user.uid, project.id);
    if (hasApplied) {
      return res.status(400).json({
        error: 'You have already applied to this project'
      });
    }

    // Check if user is not already a team member
    const isTeamMember = project.teamMembers?.some(member => member.userId === req.user.uid);
    if (isTeamMember) {
      return res.status(400).json({
        error: 'You are already a member of this project'
      });
    }

    const applicationData = {
      projectId: project.id,
      projectTitle: project.title,
      applicantId: req.user.uid,
      applicantName: req.user.displayName,
      applicantEmail: req.user.email,
      message: req.body.message,
      skills: req.user.skills || []
    };

    const application = await ApplicationModel.create(applicationData);
    
    // Send notification to project owner
    try {
      await notificationService.notifyProjectApplication(
        project.ownerId,
        req.user.displayName || 'Someone',
        project.title,
        application.id
      );
    } catch (notificationError) {
      console.error('Failed to send application notification:', notificationError);
      // Don't fail the request if notification fails
    }
    
    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error('Error applying to project:', error);
    res.status(500).json({
      error: 'Failed to apply to project',
      message: error.message
    });
  }
});

// Get project applications (project owner only)
router.get('/:id/applications', [
  requireAuth,
  param('id').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await ProjectModel.getById(req.params.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user is owner
    if (project.ownerId !== req.user.uid) {
      return res.status(403).json({
        error: 'Only project owner can view applications'
      });
    }

    const applications = await ApplicationModel.getByProjectWithUserDetails(req.params.id);
    
    res.json({
      applications
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      error: 'Failed to fetch applications',
      message: error.message
    });
  }
});

// Update project status (admin only)
router.patch('/:id/status', [
  requireAuth,
  param('id').isString().notEmpty(),
  body('status').isIn(['approved', 'in-progress', 'completed', 'archived']),
  body('note').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if user is project owner
    const project = await ProjectModel.getById(req.params.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const isOwner = project.ownerId === req.user.uid;

    if (!isOwner) {
      return res.status(403).json({
        error: 'Only project owner can update project status'
      });
    }

    const updateData = {
      status: req.body.status,
      lastModifiedBy: req.user.uid,
      lastModifiedAt: new Date()
    };

    if (req.body.note) {
      updateData.statusNote = req.body.note;
    }

    const updatedProject = await ProjectModel.update(req.params.id, updateData);
    
    res.json({
      message: `Project status updated to ${req.body.status}`,
      project: updatedProject
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({
      error: 'Failed to update project status',
      message: error.message
    });
  }
});

// Remove team member from project
router.delete('/:id/team/:userId', [
  requireAuth,
  param('id').isString().notEmpty(),
  param('userId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await ProjectModel.getById(req.params.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user is project owner or removing themselves
    const isOwner = project.ownerId === req.user.uid;
    const isSelfRemoval = req.params.userId === req.user.uid;

    if (!isOwner && !isSelfRemoval) {
      return res.status(403).json({
        error: 'You can only remove yourself or be the project owner'
      });
    }

    const updatedProject = await ProjectModel.removeTeamMember(req.params.id, req.params.userId);
    
    res.json({
      message: 'Team member removed successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({
      error: 'Failed to remove team member',
      message: error.message
    });
  }
});

// ============================================================================
// Enhanced Discovery Endpoints
// ============================================================================

// Get trending projects
router.get('/discover/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const trendingProjects = await ProjectModel.getTrendingProjects(parseInt(limit));
    
    // Add user-specific info if authenticated
    if (req.user) {
      for (let project of trendingProjects) {
        try {
          project.hasApplied = await ApplicationModel.hasApplied(req.user.uid, project.id);
          project.isOwner = project.ownerId === req.user.uid;
          project.isTeamMember = project.teamMembers?.some(member => member.userId === req.user.uid);
        } catch (error) {
          console.error('Error adding user info to trending project:', error);
        }
      }
    }
    
    res.json({
      projects: trendingProjects,
      type: 'trending',
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching trending projects:', error);
    res.status(500).json({
      error: 'Failed to fetch trending projects',
      message: error.message
    });
  }
});

// Get recommended projects for authenticated user
router.get('/discover/recommended', requireAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userSkills = req.user.skills || [];
    const userInterests = req.user.interests || [];
    
    console.log('🎯 Getting recommendations for user:', {
      userId: req.user.uid,
      skills: userSkills,
      interests: userInterests
    });
    
    const recommendedProjects = await ProjectModel.getRecommendedProjects(
      userSkills, 
      userInterests, 
      parseInt(limit)
    );
    
    // Add user-specific info
    for (let project of recommendedProjects) {
      try {
        project.hasApplied = await ApplicationModel.hasApplied(req.user.uid, project.id);
        project.isOwner = project.ownerId === req.user.uid;
        project.isTeamMember = project.teamMembers?.some(member => member.userId === req.user.uid);
      } catch (error) {
        console.error('Error adding user info to recommended project:', error);
      }
    }
    
    res.json({
      projects: recommendedProjects,
      type: 'recommended',
      basedOn: {
        skills: userSkills,
        interests: userInterests
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching recommended projects:', error);
    res.status(500).json({
      error: 'Failed to fetch recommended projects',
      message: error.message
    });
  }
});

// Get similar projects to a given project
router.get('/:id/similar', [
  param('id').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { limit = 5 } = req.query;
    const similarProjects = await ProjectModel.getSimilarProjects(req.params.id, parseInt(limit));
    
    // Add user-specific info if authenticated
    if (req.user) {
      for (let project of similarProjects) {
        try {
          project.hasApplied = await ApplicationModel.hasApplied(req.user.uid, project.id);
          project.isOwner = project.ownerId === req.user.uid;
          project.isTeamMember = project.teamMembers?.some(member => member.userId === req.user.uid);
        } catch (error) {
          console.error('Error adding user info to similar project:', error);
        }
      }
    }
    
    res.json({
      projects: similarProjects,
      type: 'similar',
      basedOnProject: req.params.id,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching similar projects:', error);
    res.status(500).json({
      error: 'Failed to fetch similar projects',
      message: error.message
    });
  }
});

// Advanced search endpoint with detailed results
router.post('/search/advanced', async (req, res) => {
  try {
    const {
      searchTerm,
      filters = {},
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.body;
    
    console.log('🔍 Advanced search request:', {
      searchTerm,
      filters,
      sortBy
    });
    
    const enhancedFilters = {
      ...filters,
      sortBy,
      limit: parseInt(limit) * 2 // Get more for pagination
    };
    
    let projects = [];
    if (searchTerm && searchTerm.trim()) {
      projects = await ProjectModel.search(searchTerm.trim(), enhancedFilters);
    } else {
      projects = await ProjectModel.getAll(enhancedFilters);
    }
    
    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedProjects = projects.slice(startIndex, endIndex);
    
    // Add user-specific info if authenticated
    if (req.user) {
      for (let project of paginatedProjects) {
        try {
          project.hasApplied = await ApplicationModel.hasApplied(req.user.uid, project.id);
          project.isOwner = project.ownerId === req.user.uid;
          project.isTeamMember = project.teamMembers?.some(member => member.userId === req.user.uid);
        } catch (error) {
          console.error('Error adding user info to search result:', error);
        }
      }
    }
    
    // Generate search analytics
    const categoryDistribution = {};
    const skillsDistribution = {};
    
    projects.forEach(project => {
      // Count categories
      if (project.category) {
        categoryDistribution[project.category] = (categoryDistribution[project.category] || 0) + 1;
      }
      
      // Count skills
      if (project.skillsRequired) {
        project.skillsRequired.forEach(skill => {
          skillsDistribution[skill] = (skillsDistribution[skill] || 0) + 1;
        });
      }
    });
    
    res.json({
      projects: paginatedProjects,
      pagination: {
        currentPage: parseInt(page),
        totalProjects: projects.length,
        totalPages: Math.ceil(projects.length / parseInt(limit)),
        hasNext: endIndex < projects.length,
        hasPrev: startIndex > 0
      },
      searchAnalytics: {
        totalResults: projects.length,
        searchTerm: searchTerm || null,
        filtersApplied: Object.keys(filters).length,
        sortBy,
        categoryDistribution,
        topSkills: Object.entries(skillsDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([skill, count]) => ({ skill, count }))
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error performing advanced search:', error);
    res.status(500).json({
      error: 'Failed to perform advanced search',
      message: error.message
    });
  }
});

// Get projects by categories (bulk category filter)
router.post('/discover/categories', async (req, res) => {
  try {
    const { categories, limit = 20 } = req.body;
    
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        error: 'Categories array is required'
      });
    }
    
    const projects = await ProjectModel.getProjectsByCategories(categories, parseInt(limit));
    
    // Add user-specific info if authenticated
    if (req.user) {
      for (let project of projects) {
        try {
          project.hasApplied = await ApplicationModel.hasApplied(req.user.uid, project.id);
          project.isOwner = project.ownerId === req.user.uid;
          project.isTeamMember = project.teamMembers?.some(member => member.userId === req.user.uid);
        } catch (error) {
          console.error('Error adding user info to category project:', error);
        }
      }
    }
    
    res.json({
      projects,
      categories: categories,
      totalResults: projects.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching projects by categories:', error);
    res.status(500).json({
      error: 'Failed to fetch projects by categories',
      message: error.message
    });
  }
});

module.exports = router;
