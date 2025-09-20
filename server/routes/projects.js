const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const ProjectModel = require('../models/Project');
const ApplicationModel = require('../models/Application');
const { requireAuth, requireCompleteProfile, createRateLimit } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for project creation
const createProjectLimit = createRateLimit(60 * 60 * 1000, 5); // 5 projects per hour

// Get all projects with filters and pagination
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
      orderDirection = 'desc'
    } = req.query;

    const filters = {
      status: status || 'approved', // Default to approved projects
      category,
      limit: parseInt(limit),
      orderBy,
      orderDirection
    };

    if (skills) {
      filters.skills = Array.isArray(skills) ? skills : skills.split(',');
    }

    let projects;
    if (search) {
      projects = await ProjectModel.search(search, filters);
    } else {
      projects = await ProjectModel.getAll(filters);
    }

    // Add pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedProjects = projects.slice(startIndex, endIndex);

    res.json({
      projects: paginatedProjects,
      pagination: {
        currentPage: parseInt(page),
        totalProjects: projects.length,
        totalPages: Math.ceil(projects.length / parseInt(limit)),
        hasNext: endIndex < projects.length,
        hasPrev: startIndex > 0
      }
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

    const project = await ProjectModel.getById(req.params.id);
    if (!project) {
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

    // Don't allow updates to approved projects unless admin
    if (project.status === 'approved' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Cannot update approved projects'
      });
    }

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

    // Check if user is owner or admin
    if (project.ownerId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Only project owner or admin can delete this project'
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

    // Check if project is approved
    if (project.status !== 'approved') {
      return res.status(400).json({
        error: 'Can only apply to approved projects'
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

module.exports = router;