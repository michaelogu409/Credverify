const authService = require('../services/auth.service');
const User = require('../models/User');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { role, name, email, password, institutionName, studentId, organization } = req.body;

    if (!role || !name || !email || !password) {
      return res.status(400).json({ error: 'role, name, email, and password are required.' });
    }

    const validRoles = ['administrator', 'student', 'verifier'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be administrator, student, or verifier.' });
    }

    const extra = {};
    if (institutionName) extra.institutionName = institutionName;
    if (studentId) extra.studentId = studentId;
    if (organization) extra.organization = organization;

    const user = await authService.registerUser(role, name, email, password, extra);

    res.status(201).json({
      message: 'User registered successfully.',
      user: {
        role: user.role,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const result = await authService.loginWithPassword(email, password);

    res.json({
      message: 'Login successful.',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

// GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ walletAddress: req.user.walletAddress }).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// PATCH /api/auth/wallet
const connectWallet = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required.' });
    }

    const result = await authService.linkWallet(req.user.userId, walletAddress);

    res.json({
      message: 'Wallet connected successfully.',
      token: result.token,
      walletAddress: result.walletAddress,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
module.exports = { register, login, getProfile, connectWallet };