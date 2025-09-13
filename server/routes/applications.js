const express = require('express');
const { body, validationResult, param } = require('express-validator');
const ApplicationModel = require('../models/Application');
const ProjectModel = require('../models/Project');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get user's applications
router.get('/my-applications', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    
    const applications = await ApplicationModel.getByUser(req.user.uid, status);
    
    // Get project details for each application
    const applicationsWithProjects = await Promise.all(
      applications.map(async (app) => {
        const project = await ProjectModel.getById(app.projectId);
        return {
          ...app,
          projectDetails: project ? {
            title: project.title,
            description: project.description,
            category: project.category,
            status: project.status,
            ownerName: project.ownerName
          } : null
        };
      })
    );
    
    res.json({
      applications: applicationsWithProjects
    });
  } catch (error) {
    console.error('Error fetching user applications:', error);
    res.status(500).json({
      error: 'Failed to fetch applications',
      message: error.message
    });
  }
});

// Get single application by ID
router.get('/:id', [
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

    const application = await ApplicationModel.getById(req.params.id);
    if (!application) {
      return res.status(404).json({
        error: 'Application not found'
      });
    }

    // Check if user owns the application or the project
    const project = await ProjectModel.getById(application.projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Associated project not found'
      });
    }

    const isOwner = application.applicantId === req.user.uid;
    const isProjectOwner = project.ownerId === req.user.uid;

    if (!isOwner && !isProjectOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'You do not have permission to view this application'
      });
    }

    // Add project details
    application.projectDetails = {
      title: project.title,
      description: project.description,
      category: project.category,
      ownerName: project.ownerName
    };

    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      error: 'Failed to fetch application',
      message: error.message
    });
  }
});

// Update application status (project owner only)
router.patch('/:id/status', [
  requireAuth,
  param('id').isString().notEmpty(),
  body('status').isIn(['accepted', 'rejected']).withMessage('Status must be accepted or rejected'),
  body('reviewNote').optional().trim().isLength({ max: 500 }).withMessage('Review note must not exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const application = await ApplicationModel.getById(req.params.id);
    if (!application) {
      return res.status(404).json({
        error: 'Application not found'
      });
    }

    // Check if application is still pending
    if (application.status !== 'pending') {
      return res.status(400).json({
        error: 'Application has already been reviewed'
      });
    }

    // Get project to verify ownership
    const project = await ProjectModel.getById(application.projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Associated project not found'
      });
    }

    // Check if user is project owner
    if (project.ownerId !== req.user.uid) {
      return res.status(403).json({
        error: 'Only project owner can review applications'
      });
    }

    const updatedApplication = await ApplicationModel.updateStatus(
      req.params.id,
      req.body.status,
      req.user.uid,
      req.body.reviewNote
    );

    res.json({
      message: `Application ${req.body.status} successfully`,
      application: updatedApplication
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      error: 'Failed to update application status',
      message: error.message
    });
  }
});

// Withdraw application (applicant only)
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

    const application = await ApplicationModel.getById(req.params.id);
    if (!application) {
      return res.status(404).json({
        error: 'Application not found'
      });
    }

    // Check if user owns the application
    if (application.applicantId !== req.user.uid) {
      return res.status(403).json({
        error: 'You can only withdraw your own applications'
      });
    }

    // Check if application is still pending
    if (application.status !== 'pending') {
      return res.status(400).json({
        error: 'Cannot withdraw application that has already been reviewed'
      });
    }

    await ApplicationModel.delete(req.params.id);
    
    res.json({
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({
      error: 'Failed to withdraw application',
      message: error.message
    });
  }
});

// Get application statistics (admin only)
router.get('/stats/overview', requireAuth, async (req, res) => {
  try {
    // For now, allow any authenticated user to see basic stats
    // In a real app, you might want to restrict this to admins
    const stats = await ApplicationModel.getStats();
    
    res.json({
      stats
    });
  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({
      error: 'Failed to fetch application statistics',
      message: error.message
    });
  }
});

module.exports = router;