const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Get token from cookie (New accessToken, or legacy "token")
  let token = req.cookies?.accessToken || req.cookies?.token;

  // Fallback: Check Headers (useful for testing)
  if (!token && req.header('Authorization')) {
    token = req.header('Authorization').replace('Bearer ', '');
  }

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    // Specific error code helps frontend know when to try refresh
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ msg: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
