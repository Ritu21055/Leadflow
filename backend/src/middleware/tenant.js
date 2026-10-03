// Brokerage-owned routes must use the brokerage from the login token.
// Callers cannot pick a brokerage by sending brokerageId in the body.
function requireTenant(req, res, next) {
  if (!req.user || !req.user.brokerageId) {
    return res.status(403).json({
      message: 'This action is only available to users inside a brokerage',
    });
  }

  req.brokerageId = req.user.brokerageId;
  next();
}

module.exports = requireTenant;
