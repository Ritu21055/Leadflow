const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Login required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: payload.userId,
      role: payload.role,
      brokerageId: payload.brokerageId || null,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Login expired or invalid' });
  }
}

module.exports = auth;
