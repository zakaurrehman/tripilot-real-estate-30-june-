// backend/src/middleware/auth.js

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // For development/demo, create a mock user
      if (process.env.NODE_ENV === 'development') {
        req.user = {
          id: 'demo-user-123',
          email: 'demo@tripilot.com',
          subscription: 'trial'
        };
        return next();
      }
      
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret');
    
    // Add user to request
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;