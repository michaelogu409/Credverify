const express = require('express');
const router = express.Router();
const multer = require('multer');
const credentialController = require('../controllers/credential.controller');
const { verifyToken, requireRole } = require('../services/auth.service');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// Issue a new credential (Administrator only)
router.post(
  '/issue',
  verifyToken,
  requireRole('administrator'),
  upload.single('credentialFile'),
  credentialController.issueCredential
);

// Get all credentials for a student (Student only)
router.get(
  '/my-credentials',
  verifyToken,
  requireRole('student'),
  credentialController.getMyCredentials
);

// Get all credentials issued by an institution (Administrator only)
router.get(
  '/issued',
  verifyToken,
  requireRole('administrator'),
  credentialController.getIssuedCredentials
);

// Record academic progress (Administrator only)
router.post(
  '/record-progress',
  verifyToken,
  requireRole('administrator'),
  credentialController.recordProgress
);

module.exports = router;