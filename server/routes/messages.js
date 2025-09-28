const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const MessageModel = require('../models/Message');
const ProjectModel = require('../models/Project');
const { requireAuth, createRateLimit } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for message creation
const createMessageLimit = createRateLimit(60 * 1000, 60); // 60 messages per minute

// Get all conversations for current user
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const conversations = await MessageModel.getUserConversations(req.user.uid);
    
    res.json({
      conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      message: error.message
    });
  }
});

// Get messages for a specific conversation
router.get('/conversation/:conversationId', [
  requireAuth,
  param('conversationId').isString().notEmpty(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Check if user is part of this conversation
    const hasAccess = await MessageModel.checkConversationAccess(conversationId, req.user.uid);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied to this conversation'
      });
    }

    const { messages, totalCount } = await MessageModel.getConversationMessages(
      conversationId, 
      page, 
      limit
    );

    // Mark messages as read for current user
    await MessageModel.markMessagesAsRead(conversationId, req.user.uid);

    res.json({
      messages,
      pagination: {
        currentPage: page,
        totalMessages: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: (page * limit) < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({
      error: 'Failed to fetch messages',
      message: error.message
    });
  }
});

// Send a new message
router.post('/send', [
  requireAuth,
  createMessageLimit,
  body('conversationId').isString().notEmpty(),
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
  body('messageType').optional().isIn(['text', 'image', 'file']).withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { conversationId, message, messageType = 'text' } = req.body;

    // Check if user has access to this conversation
    const hasAccess = await MessageModel.checkConversationAccess(conversationId, req.user.uid);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied to this conversation'
      });
    }

    const messageData = {
      conversationId,
      senderId: req.user.uid,
      senderName: req.user.displayName || req.user.email.split('@')[0],
      message: message.trim(),
      messageType,
      timestamp: new Date(),
      readBy: [req.user.uid] // Mark as read by sender
    };

    const newMessage = await MessageModel.create(messageData);

    // Emit real-time message to conversation participants
    const io = req.app.get('socketio');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('new_message', newMessage);
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message
    });
  }
});

// Create a new conversation (direct message or project group)
router.post('/conversation', [
  requireAuth,
  createRateLimit(60 * 1000, 10), // 10 conversations per minute
  body('type').isIn(['direct', 'project_group']).withMessage('Type must be direct or project_group'),
  body('participantIds').isArray({ min: 1 }).withMessage('At least one participant required'),
  body('projectId').optional().isString(),
  body('name').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { type, participantIds, projectId, name } = req.body;

    // Validate project access if it's a project group
    if (type === 'project_group' && projectId) {
      const project = await ProjectModel.getById(projectId);
      if (!project) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }

      // Check if user is owner or team member
      const isOwner = project.ownerId === req.user.uid;
      const isTeamMember = project.teamMembers?.some(member => member.userId === req.user.uid);
      
      if (!isOwner && !isTeamMember) {
        return res.status(403).json({
          error: 'Access denied to project'
        });
      }
    }

    // Add current user to participants if not already included
    const allParticipants = [...new Set([req.user.uid, ...participantIds])];

    // For direct messages, check if conversation already exists
    if (type === 'direct' && allParticipants.length === 2) {
      const existingConversation = await MessageModel.findDirectConversation(allParticipants);
      if (existingConversation) {
        return res.json({
          message: 'Conversation already exists',
          conversation: existingConversation
        });
      }
    }

    const conversationData = {
      type,
      participantIds: allParticipants,
      projectId: projectId || null,
      name: name || null,
      createdBy: req.user.uid,
      createdAt: new Date(),
      lastMessageAt: new Date()
    };

    const conversation = await MessageModel.createConversation(conversationData);

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      error: 'Failed to create conversation',
      message: error.message
    });
  }
});

// Get project team members for messaging
router.get('/project/:projectId/members', [
  requireAuth,
  param('projectId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await ProjectModel.getById(req.params.projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user has access to project
    const isOwner = project.ownerId === req.user.uid;
    const isTeamMember = project.teamMembers?.some(member => member.userId === req.user.uid);
    
    if (!isOwner && !isTeamMember) {
      return res.status(403).json({
        error: 'Access denied to project'
      });
    }

    // Get all team members including owner
    const members = [
      {
        userId: project.ownerId,
        name: project.ownerName,
        email: project.ownerEmail,
        role: 'owner'
      },
      ...(project.teamMembers || [])
    ];

    res.json({
      members
    });
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({
      error: 'Failed to fetch project members',
      message: error.message
    });
  }
});

// Mark conversation as read
router.patch('/conversation/:conversationId/read', [
  requireAuth,
  param('conversationId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { conversationId } = req.params;

    // Check conversation access
    const hasAccess = await MessageModel.checkConversationAccess(conversationId, req.user.uid);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied to this conversation'
      });
    }

    await MessageModel.markMessagesAsRead(conversationId, req.user.uid);

    res.json({
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      error: 'Failed to mark messages as read',
      message: error.message
    });
  }
});

// Search messages in a conversation
router.get('/conversation/:conversationId/search', [
  requireAuth,
  param('conversationId').isString().notEmpty(),
  query('q').isString().isLength({ min: 1, max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { conversationId } = req.params;
    const { q: searchQuery } = req.query;
    const limit = parseInt(req.query.limit) || 20;

    // Check conversation access
    const hasAccess = await MessageModel.checkConversationAccess(conversationId, req.user.uid);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied to this conversation'
      });
    }

    const messages = await MessageModel.searchMessages(conversationId, searchQuery, limit);

    res.json({
      messages,
      searchQuery
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      error: 'Failed to search messages',
      message: error.message
    });
  }
});

module.exports = router;