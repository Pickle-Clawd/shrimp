const express = require('express');
const { nanoid } = require('nanoid');
const QRCode = require('qrcode');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Verify auth
router.post('/auth/verify', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'shrimp-admin';
  if (password === adminPassword) {
    return res.json({ success: true, token: adminPassword });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

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

// Create a new link
router.post('/links', authMiddleware, (req, res) => {
  const { url, slug } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const finalSlug = slug || nanoid(7);

  // Check if slug already exists
  const existing = db.prepare('SELECT id FROM links WHERE slug = ?').get(finalSlug);
  if (existing) {
    return res.status(409).json({ error: 'Slug already in use' });
  }

  try {
    const result = db.prepare('INSERT INTO links (slug, url) VALUES (?, ?)').run(finalSlug, url);
    const link = db.prepare('SELECT * FROM links WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(link);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create link' });
  }
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

  // Check slug uniqueness if changed
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
