// backend/src/routes/index.js - FIXED FILE FILTER

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const searchController    = require('../controllers/searchController');
const automateController  = require('../controllers/automateController');
const snapshotController  = require('../controllers/snapshotController');
const chatController      = require('../controllers/chatController');
const userController      = require('../controllers/userController');
const authMiddleware      = require('../middleware/auth');

const router = express.Router();

// FIXED: More permissive file filter for PDFs and images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 3 // Max 3 files at once
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File filter check:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });

    // Accept PDFs and common image formats
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // Check by MIME type (more reliable)
    if (allowedMimeTypes.includes(file.mimetype)) {
      console.log('✅ File accepted by MIME type:', file.mimetype);
      return cb(null, true);
    }

    // Fallback: Check by file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx'];
    
    if (allowedExtensions.includes(fileExtension)) {
      console.log('✅ File accepted by extension:', fileExtension);
      return cb(null, true);
    }

    // Log rejection details for debugging
    console.log('❌ File rejected:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      extension: fileExtension,
      allowedMimeTypes,
      allowedExtensions
    });

    cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`));
  }
});

// Rest of your routes remain the same...

// Health check (moved to root level)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root health check for /api/health
router.get('/', (req, res) => {
  res.json({ 
    status: 'TriPilot Backend API Running', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/** 
 * SEARCH ROUTES 
 */
router.post(
  '/search/upload',
  authMiddleware,
  upload.array('files', 3),
  searchController.uploadDocuments
);

router.post(
  '/search/query',
  authMiddleware,
  searchController.searchDocuments
);

router.get(
  '/search/documents',
  authMiddleware,
  searchController.getDocumentFields
);

router.put(
  '/search/document/:documentId/field',
  authMiddleware,
  searchController.updateField
);

router.delete(
  '/search/document/:documentId',
  authMiddleware,
  searchController.deleteDocument
);

router.get(
  '/search/export',
  authMiddleware,
  searchController.exportTable
);

/** 
 * AUTOMATE ROUTES 
 */
router.post(
  '/automate/renovation-roi',
  authMiddleware,
  automateController.generateRenovationROI
);

router.post(
  '/automate/gc-match',
  authMiddleware,
  automateController.executeGCMatch
);

router.get(
  '/automate/download/:filename',
  authMiddleware,
  automateController.downloadReport
);

router.get(
  '/automate/history',
  authMiddleware,
  automateController.getRehabHistory
);

/** 
 * SNAPSHOT ROUTES 
 */
router.post(
  '/snapshot/fact-sheet',
  authMiddleware,
  snapshotController.generateFactSheet
);

router.get(
  '/snapshot/history',
  authMiddleware,
  snapshotController.getFactSheetHistory
);

router.post(
  '/snapshot/quick',
  authMiddleware,
  snapshotController.quickSnapshot
);

/** 
 * CHAT ROUTES 
 */
router.post(
  '/chat/message',
  authMiddleware,
  chatController.sendMessage
);

router.get(
  '/chat/conversation/:conversationId',
  authMiddleware,
  chatController.getConversationHistory
);

router.post(
  '/chat/similar-questions',
  authMiddleware,
  chatController.getSimilarQuestions
);

router.delete(
  '/chat/conversation/:conversationId',
  authMiddleware,
  chatController.clearConversation
);

/** 
 * USER ROUTES 
 */
router.get(
  '/user/lapis-usage',
  authMiddleware,
  userController.getLapisUsage
);

router.post(
  '/user/top-up',
  authMiddleware,
  userController.topUpLapis
);

router.post(
  '/user/upgrade',
  authMiddleware,
  userController.upgradeSubscription
);

router.get(
  '/user/profile',
  authMiddleware,
  userController.getProfile
);

/** 
 * DOWNLOAD GENERATED PDF 
 */
router.get(
  '/download/:filename',
  authMiddleware,
  (req, res) => {
    const { filename } = req.params;
    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filepath = path.join(__dirname, '../../outputs', filename);
    res.download(filepath);
  }
);

module.exports = router;