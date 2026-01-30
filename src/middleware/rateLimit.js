// Simple in-memory rate limiter per IP
// No external dependencies — uses a Map with TTL cleanup

const stores = new Map();

function createRateLimiter({ windowMs = 60000, max = 10, message = 'Too many requests, please try again later.' } = {}) {
  const store = new Map();
  const storeId = Symbol('rateLimit');
  stores.set(storeId, store);

  // Cleanup expired entries every windowMs
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.resetTime > 0) {
        store.delete(key);
      }
    }
  }, windowMs);
  cleanup.unref();

  return function rateLimit(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = store.get(ip);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));

    if (entry.count > max) {
      return res.status(429).json({ error: message });
    }

    next();
  };
}

module.exports = createRateLimiter;
