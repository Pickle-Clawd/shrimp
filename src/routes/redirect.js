const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/:slug', (req, res) => {
  const { slug } = req.params;

  const link = db.prepare('SELECT * FROM links WHERE slug = ?').get(slug);
  if (!link) {
    return res.status(404).send('Link not found');
  }

  // Record click
  const referrer = req.get('referer') || req.get('referrer') || '';
  const userAgent = req.get('user-agent') || '';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const country = req.headers['fly-client-country'] || req.headers['cf-ipcountry'] || '';
  const city = req.headers['fly-client-city'] || req.headers['cf-ipcity'] || '';

  db.prepare(`
    INSERT INTO clicks (link_id, referrer, user_agent, ip, country, city)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(link.id, referrer, userAgent, ip, country, city);

  res.redirect(301, link.url);
});

module.exports = router;
