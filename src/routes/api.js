const express = require('express');
const { nanoid } = require('nanoid');
const QRCode = require('qrcode');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const createRateLimiter = require('../middleware/rateLimit');
const validateUrl = require('../middleware/validateUrl');

const router = express.Router();

// Rate limiters
const shortenLimiter = createRateLimiter({ windowMs: 60000, max: 10, message: 'Rate limit exceeded. Try again in a minute.' });
const reportLimiter = createRateLimiter({ windowMs: 60000, max: 5, message: 'Too many reports. Try again later.' });

// ──────────────────────────────────────
// PUBLIC ENDPOINTS (no auth required)
// ──────────────────────────────────────

// Public link creation
router.post('/shorten', shortenLimiter, validateUrl, (req, res) => {
  const { url, slug, expires_in } = req.body;
  const finalSlug = slug || nanoid(7);

  const existing = db.prepare('SELECT id FROM links WHERE slug = ?').get(finalSlug);
  if (existing) {
    return res.status(409).json({ error: 'Slug already in use' });
  }

  // Calculate expiration if provided (hours from now)
  let expiresAt = null;
  if (expires_in && Number(expires_in) > 0) {
    const hours = Number(expires_in);
    const expDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    expiresAt = expDate.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  }

  try {
    const result = db.prepare('INSERT INTO links (slug, url, expires_at) VALUES (?, ?, ?)').run(finalSlug, url, expiresAt);
    const link = db.prepare('SELECT id, slug, url, created_at, expires_at FROM links WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(link);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// Report a link for abuse
router.post('/report/:slug', reportLimiter, (req, res) => {
  const { slug } = req.params;
  const link = db.prepare('SELECT id FROM links WHERE slug = ?').get(slug);
  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  db.prepare("UPDATE links SET reported = 1, updated_at = datetime('now') WHERE id = ?").run(link.id);
  res.json({ success: true, message: 'Link has been reported for review.' });
});

// Verify auth
router.post('/auth/verify', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'shrimp-admin';
  if (password === adminPassword) {
    return res.json({ success: true, token: adminPassword });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

// ──────────────────────────────────────
// ADMIN ENDPOINTS (auth required)
// ──────────────────────────────────────

// List all links
router.get('/links', authMiddleware, (req, res) => {
  const links = db.prepare(`
    SELECT l.*, COUNT(c.id) as click_count
    FROM links l
    LEFT JOIN clicks c ON c.link_id = l.id
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `).all();
  res.json(links);
});

// Create a new link (admin — no rate limit, no URL validation)
router.post('/links', authMiddleware, (req, res) => {
  const { url, slug, expires_in } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const finalSlug = slug || nanoid(7);

  const existing = db.prepare('SELECT id FROM links WHERE slug = ?').get(finalSlug);
  if (existing) {
    return res.status(409).json({ error: 'Slug already in use' });
  }

  let expiresAt = null;
  if (expires_in && Number(expires_in) > 0) {
    const hours = Number(expires_in);
    const expDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    expiresAt = expDate.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  }

  try {
    const result = db.prepare('INSERT INTO links (slug, url, expires_at) VALUES (?, ?, ?)').run(finalSlug, url, expiresAt);
    const link = db.prepare('SELECT * FROM links WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(link);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// Toggle disabled status on a link
router.patch('/links/:id/disable', authMiddleware, (req, res) => {
  const { id } = req.params;
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  const newDisabled = link.disabled ? 0 : 1;
  db.prepare("UPDATE links SET disabled = ?, updated_at = datetime('now') WHERE id = ?").run(newDisabled, id);

  // If re-enabling, also clear reported flag
  if (!newDisabled) {
    db.prepare("UPDATE links SET reported = 0 WHERE id = ?").run(id);
  }

  const updated = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
  res.json(updated);
});

// Update a link
router.put('/links/:id', authMiddleware, (req, res) => {
  const { url, slug } = req.body;
  const { id } = req.params;

  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  const newUrl = url || link.url;
  const newSlug = slug || link.slug;

  if (newSlug !== link.slug) {
    const existing = db.prepare('SELECT id FROM links WHERE slug = ? AND id != ?').get(newSlug, id);
    if (existing) {
      return res.status(409).json({ error: 'Slug already in use' });
    }
  }

  db.prepare("UPDATE links SET url = ?, slug = ?, updated_at = datetime('now') WHERE id = ?").run(newUrl, newSlug, id);
  const updated = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
  res.json(updated);
});

// Delete a link
router.delete('/links/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  db.prepare('DELETE FROM clicks WHERE link_id = ?').run(id);
  db.prepare('DELETE FROM links WHERE id = ?').run(id);
  res.json({ success: true });
});

// Get analytics for a link
router.get('/links/:id/analytics', authMiddleware, (req, res) => {
  const { id } = req.params;
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  const clickCount = db.prepare('SELECT COUNT(*) as count FROM clicks WHERE link_id = ?').get(id).count;
  const recentClicks = db.prepare(`
    SELECT clicked_at, referrer, user_agent, country, city
    FROM clicks WHERE link_id = ?
    ORDER BY clicked_at DESC LIMIT 50
  `).all(id);

  const referrers = db.prepare(`
    SELECT referrer, COUNT(*) as count
    FROM clicks WHERE link_id = ? AND referrer IS NOT NULL AND referrer != ''
    GROUP BY referrer ORDER BY count DESC LIMIT 10
  `).all(id);

  const countries = db.prepare(`
    SELECT country, COUNT(*) as count
    FROM clicks WHERE link_id = ? AND country IS NOT NULL AND country != ''
    GROUP BY country ORDER BY count DESC LIMIT 10
  `).all(id);

  res.json({
    link,
    clickCount,
    recentClicks,
    referrers,
    countries,
  });
});

// Generate QR code for a link
router.get('/links/:id/qr', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const shortUrl = `${baseUrl}/${link.slug}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(shortUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#1a3a4a', light: '#f0f8ff' },
    });
    res.json({ qr: qrDataUrl, url: shortUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

module.exports = router;
