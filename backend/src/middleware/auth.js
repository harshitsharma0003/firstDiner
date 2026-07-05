'use strict';
const { verifyToken } = require('../auth/auth');

/** Reads the Bearer token, attaches req.user = { sub, role, ... }. */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token.' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token.' });
  req.user = payload;
  next();
}

/** Restricts a route to one or more roles: requireRole('admin'). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not allowed for this account type.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
