const jwt = require('jsonwebtoken');
const { attachTenant } = require('./tenant');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const auth = [verifyToken, attachTenant];

// admin is always included unless explicitly excluded
const requireRole = (...roles) => (req, res, next) => {
  if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Access denied' });
};

module.exports = { auth, requireRole, verifyToken };
