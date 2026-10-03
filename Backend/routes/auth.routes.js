const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../services/auth.service');

// Register a new user
router.post('/register', authController.register);

// Login with email + password
router.post('/login', authController.login);

// Get current user profile (protected)
router.get('/profile', verifyToken, authController.getProfile);

// Connect/link a MetaMask wallet to the logged-in user (protected)
router.patch('/wallet', verifyToken, authController.connectWallet);

module.exports = router;

module.exports = router;