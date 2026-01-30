const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'shrimp-admin';

function authMiddleware(req, res, next) {
  // Check for session token in cookie or Authorization header
  const token = req.headers['x-admin-token'] || req.query.token;

  if (token === ADMIN_PASSWORD) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

module.exports = authMiddleware;
