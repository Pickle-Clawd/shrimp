const BLOCKED_DOMAINS = require('../blocklist');

function validateUrl(req, res, next) {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL format
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Only allow http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http and https URLs are allowed' });
  }

  // Check against blocklist
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_DOMAINS.has(hostname)) {
    return res.status(400).json({ error: 'This URL is not allowed' });
  }

  next();
}

module.exports = validateUrl;
