// routes/authRoutes.js
// Authentication Routes (Register, Login, Me, Update Profile, Refresh Token)
// PRD §10.1: Tokens must be short-lived (≤ 1 hour) with a refresh-token flow
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!JWT_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_SECRET and REFRESH_SECRET must be configured in the environment.');
}

// Helper: Generate short-lived access token (1 hour — PRD §10.1)
const generateAccessToken = (id) => {
  return jwt.sign({ id, type: 'access' }, JWT_SECRET, { expiresIn: '1h' });
};

// Helper: Generate long-lived refresh token (7 days)
const generateRefreshToken = (id) => {
  return jwt.sign({ id, type: 'refresh' }, REFRESH_SECRET, { expiresIn: '7d' });
};

// Input sanitizer — prevent stored XSS & injection via user inputs (PRD §10.1)
function sanitizeInput(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen).replace(/<[^>]*>/g, '');
}

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // Sanitize inputs (PRD §10.1)
    name = sanitizeInput(name, 100);
    email = sanitizeInput(email, 200).toLowerCase();

    if (!name || !email || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (password.length < 6 || password.length > 256) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'viewer'
    });

    res.status(201).json({
      success: true,
      accessToken: generateAccessToken(user._id),
      refreshToken: generateRefreshToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        stats: user.stats,
        genres: user.genres,
        subtitleLanguage: user.subtitleLanguage
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Authenticate user & get access + refresh tokens
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    // Sanitize and normalize inputs (PRD §10.1)
    email = sanitizeInput(email, 200).toLowerCase().trim();
    if (typeof password !== 'string' || password.length > 256) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email and password' });
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Case-insensitive user lookup
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } 
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user._id);
    res.json({
      success: true,
      accessToken,
      refreshToken: generateRefreshToken(user._id),
      // Keep 'token' field for backward compat with existing frontend
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        stats: user.stats,
        genres: user.genres,
        subtitleLanguage: user.subtitleLanguage
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Refresh access token using a valid refresh token (PRD §10.1)
// @route   POST /api/auth/refresh
// @access  Public (requires valid refreshToken in body)
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    // Confirm user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    // Issue fresh access token
    const accessToken = generateAccessToken(user._id);
    res.json({
      success: true,
      accessToken,
      token: accessToken // backward compat alias
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// @desc    Update user profile / preferences
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Sanitize all user-controlled inputs (PRD §10.1)
    user.name = req.body.name ? sanitizeInput(req.body.name, 100) : user.name;
    if (req.body.avatar && typeof req.body.avatar === 'string') {
      if (req.body.avatar.startsWith('data:image/')) {
        user.avatar = req.body.avatar;
      } else {
        user.avatar = sanitizeInput(req.body.avatar, 1000);
      }
    }
    if (req.body.genres && Array.isArray(req.body.genres)) {
      user.genres = req.body.genres.map(g => sanitizeInput(g, 50)).slice(0, 10);
    }
    if (req.body.subtitleLanguage) {
      user.subtitleLanguage = sanitizeInput(req.body.subtitleLanguage, 50);
    }
    if (req.body.email && req.body.email.toLowerCase().trim() !== user.email) {
      const newEmail = sanitizeInput(req.body.email.toLowerCase().trim(), 200);
      const emailTaken = await User.findOne({ email: newEmail });
      if (emailTaken) {
        return res.status(400).json({ success: false, message: 'Email is already in use by another account' });
      }
      user.email = newEmail;
    }
    if (req.body.password && typeof req.body.password === 'string' && req.body.password.trim()) {
      if (req.body.password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        stats: updatedUser.stats,
        genres: updatedUser.genres,
        subtitleLanguage: updatedUser.subtitleLanguage
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get all registered users (Admin only)
// @route   GET /api/auth/users
// @access  Private / Admin
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Update user role (Admin only)
// @route   PUT /api/auth/users/:id/role
// @access  Private / Admin
router.put('/users/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['viewer', 'host', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Safety check: Prevent demoting the last admin if only 1 admin exists
    if (role !== 'admin') {
      const targetUser = await User.findById(req.params.id);
      if (targetUser && targetUser.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot demote the only remaining System Administrator'
          });
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
