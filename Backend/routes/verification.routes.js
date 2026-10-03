const express = require('express');
const router = express.Router();
const multer = require('multer');
const verificationController = require('../controllers/verification.controller');
const { verifyToken, requireRole } = require('../services/auth.service');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// Verify a credential by uploading its PDF (verifier)
router.post('/verify', verifyToken, requireRole('verifier'), upload.single('credentialFile'), verificationController.verifyCredential);


// router.post('/request', verifyToken, requireRole('verifier'), verificationController.createRequest);


// router.get('/my-requests', verifyToken, requireRole('verifier'), verificationController.getMyRequests);


// router.get('/incoming', verifyToken, requireRole('administrator'), verificationController.getIncomingRequests);


// router.patch('/respond/:id', verifyToken, requireRole('administrator'), verificationController.respondToRequest);

module.exports = router;