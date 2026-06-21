const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Access token is required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key-change-me');
    
    req.user = {
      user_id: decoded.user_id,
      phone_number: decoded.phone_number
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error.message);
    return res.status(401).json({ detail: 'Invalid or expired session token' });
  }
};

module.exports = authMiddleware;
