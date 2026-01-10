const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        msg: 'Access denied: Insufficient permissions',
        required: allowedRoles,
        userRole: req.user.role
      });
    }
    next();
  };
};

module.exports = roleMiddleware;
