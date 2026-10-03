function requireRole(...roles) {
  return function checkRole(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that' });
    }

    next();
  };
}

module.exports = requireRole;
