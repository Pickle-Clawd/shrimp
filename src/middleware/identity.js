const crypto = require('crypto');

const COOKIE_NAME = 'shrimp_uid';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

function identityMiddleware(req, res, next) {
  let uid = parseCookie(req.headers.cookie, COOKIE_NAME);

  if (!uid) {
    uid = crypto.randomUUID();
    res.setHeader('Set-Cookie',
      `${COOKIE_NAME}=${uid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`
    );
  }

  req.creatorId = uid;
  next();
}

function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').find(c => c.trim().startsWith(name + '='));
  return match ? match.split('=')[1].trim() : null;
}

module.exports = identityMiddleware;
