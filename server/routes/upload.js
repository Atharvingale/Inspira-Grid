const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const { requireAuth, createRateLimit } = require('../middleware/auth');

const router = express.Router();

// Get Firebase Storage instance
const bucket = admin.storage().bucket();

// Rate limiting for uploads
const uploadLimit = createRateLimit(60 * 1000, 10); // 10 uploads per minute

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed'
      ]
    };

    const isImage = allowedTypes.image.includes(file.mimetype);
    const isDocument = allowedTypes.document.includes(file.mimetype);

    if (isImage || isDocument) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed'), false);
    }
  }
});

// Upload file endpoint
router.post('/', [
  requireAuth,
  uploadLimit,
  upload.single('file')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided'
      });
    }

    const { type = 'message' } = req.body; // 'message', 'avatar', 'project'
    
    // Validate type parameter
    const validTypes = ['message', 'avatar', 'project'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid type. Must be one of: message, avatar, project'
      });
    }

    // Check file type category
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const isImage = allowedImageTypes.includes(req.file.mimetype);

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `${type}s/${req.user.uid}/${fileName}`;

    // Create file reference
    const fileRef = bucket.file(filePath);

    // Upload file to Firebase Storage
    const stream = fileRef.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname,
          uploadedBy: req.user.uid,
          uploadedAt: new Date().toISOString(),
          type: isImage ? 'image' : 'document'
        }
      }
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        console.error('Upload error:', error);
        reject(error);
      });

      stream.on('finish', async () => {
        try {
          // Make file publicly accessible
          await fileRef.makePublic();

          // Get public URL
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

          resolve({
            url: publicUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            isImage,
            uploadPath: filePath
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.end(req.file.buffer);
    }).then((result) => {
      res.status(201).json(result);
    }).catch((error) => {
      console.error('Error finishing upload:', error);
      res.status(500).json({
        error: 'Failed to upload file',
        message: error.message
      });
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      message: error.message
    });
  }
});

// Delete file endpoint
router.delete('/', [
  requireAuth
], async (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({
        error: 'File path is required'
      });
    }

    // Verify user owns the file (basic check)
    if (!filePath.includes(`/${req.user.uid}/`)) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const fileRef = bucket.file(filePath);

    // Check if file exists
    const [exists] = await fileRef.exists();
    if (!exists) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // Delete the file
    await fileRef.delete();

    res.json({
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: error.message
    });
  }
});

// Get user's uploaded files
router.get('/user', [
  requireAuth
], async (req, res) => {
  try {
    const { type } = req.query; // Optional filter by type
    const userId = req.user.uid;

    let prefix = ``;
    if (type) {
      const validTypes = ['message', 'avatar', 'project'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: 'Invalid type. Must be one of: message, avatar, project'
        });
      }
      prefix = `${type}s/${userId}/`;
    } else {
      // Get all user files
      prefix = `messages/${userId}/`;
    }

    const [files] = await bucket.getFiles({
      prefix: prefix
    });

    const fileList = await Promise.all(
      files.map(async (file) => {
        try {
          const [metadata] = await file.getMetadata();
          const [publicUrl] = await file.publicUrl();
          
          return {
            name: file.name,
            url: publicUrl,
            size: parseInt(metadata.size),
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated,
            originalName: metadata.metadata?.originalName,
            type: metadata.metadata?.type
          };
        } catch (error) {
          console.error(`Error getting metadata for file ${file.name}:`, error);
          return null;
        }
      })
    );

    // Filter out null values (files with metadata errors)
    const validFiles = fileList.filter(file => file !== null);

    res.json({
      files: validFiles
    });

  } catch (error) {
    console.error('Error fetching user files:', error);
    res.status(500).json({
      error: 'Failed to fetch files',
      message: error.message
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size is 10MB'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Too many files. Only 1 file allowed'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: error.message
    });
  }

  next(error);
});

module.exports = router;