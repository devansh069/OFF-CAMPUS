const jwt = require('jsonwebtoken');
const { User, Session } = require('../models');

/**
 * Middleware to extract and validate bearer token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];

    // Find session
    const session = await Session.findOne({
      where: { session_token: token }
    });

    if (!session) {
      return res.status(401).json({ detail: 'Invalid session' });
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ detail: 'Session expired' });
    }

    // Get user
    const user = await User.findByPk(session.user_id);
    if (!user) {
      return res.status(401).json({ detail: 'User not found' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ detail: 'Authentication error' });
  }
};

/**
 * Middleware to verify admin permissions via JWT
 */
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Admin authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'change-me';

    try {
      const decoded = jwt.verify(token, secret);
      if (decoded.role !== 'admin') {
        return res.status(403).json({ detail: 'Not authorized as admin' });
      }
      req.adminEmail = decoded.sub;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ detail: 'Admin token expired' });
      }
      return res.status(401).json({ detail: 'Invalid admin token' });
    }
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ detail: 'Admin authentication error' });
  }
};

module.exports = { authenticate, verifyAdmin };
