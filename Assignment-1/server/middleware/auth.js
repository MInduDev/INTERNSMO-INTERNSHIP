// middleware/auth.js
// JWT Authentication Middleware + Socket.io Handshake Validator
// PRD §10.1: WebSocket connections must be authenticated at handshake time using the same JWT
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!JWT_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_SECRET and REFRESH_SECRET must be configured in the environment.');
}

// ─── REST API Middleware ──────────────────────────────────────────────────────

// Protect routes — requires a valid JWT Bearer token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type !== 'access') {
        return res.status(401).json({ success: false, message: 'Invalid token type' });
      }

      if (!decoded || !decoded.id) {
        return res.status(401).json({ success: false, message: 'Invalid token payload' });
      }

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User no longer exists' });
      }

      next();
    } catch (error) {
      console.error('[Auth Error]:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed or expired' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

const optionalProtect = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return protect(req, res, next);
};

// Admin-only guard for RBAC (PRD §10.1)
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
  }
};

// Host-only guard — the user must have host or admin role
const hostOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'host' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied: Host or Admin role required' });
  }
};

// ─── Socket.io Handshake Middleware (PRD §10.1) ───────────────────────────────
// Only the current Host's token may issue playback update events
// Usage in socketService.js: io.use(socketAuthMiddleware)

const socketAuthMiddleware = async (socket, next) => {
  try {
    // Keep credentials out of query strings and logs.
    const authorization = socket.handshake.headers?.authorization;
    const token =
      socket.handshake.auth?.token ||
      (authorization?.startsWith('Bearer ') ? authorization.slice(7) : null);

    if (!token) return next(new Error('Authentication required'));

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'access') {
      return next(new Error('Invalid token type'));
    }
    const user = await User.findById(decoded.id).select('-password').lean();

    if (!user) {
      return next(new Error('User no longer exists'));
    }

    // Attach full user to socket for downstream event handlers
    socket.user = { ...user, authenticated: true };
    next();
  } catch (err) {
    console.warn('[Socket Auth]:', err.message);
    next(new Error('Not authorized'));
  }
};

module.exports = { protect, optionalProtect, adminOnly, hostOnly, socketAuthMiddleware };
