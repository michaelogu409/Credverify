const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register a new user with a hashed password
const registerUser = async (role, name, email, password, extra = {}) => {
  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    throw new Error('Email already registered.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    role,
    name,
    email,
    password: hashedPassword,
    ...extra,
  });

  return user;
};

// Verify email + password and return a JWT if valid
const loginWithPassword = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  const token = jwt.sign(
    {
      walletAddress: user.walletAddress,
      role: user.role,
      userId: user._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      walletAddress: user.walletAddress,
      role: user.role,
      name: user.name,
      email: user.email,
    },
  };
};

// Verify JWT middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// Role-based access middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
};
// Link a wallet address to the logged-in user, and issue a fresh token
const linkWallet = async (userId, walletAddress) => {
  const address = walletAddress.toLowerCase();

  const existing = await User.findOne({ walletAddress: address });
  if (existing && existing._id.toString() !== userId) {
    throw new Error('This wallet is already linked to another account.');
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { walletAddress: address },
    { new: true }
  );

  if (!user) {
    throw new Error('User not found.');
  }

  const token = jwt.sign(
    {
      walletAddress: user.walletAddress,
      role: user.role,
      userId: user._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { token, walletAddress: user.walletAddress };
};
module.exports = {
  registerUser,
  loginWithPassword,
  linkWallet,
  verifyToken,
  requireRole,
};