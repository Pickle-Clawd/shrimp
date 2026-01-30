const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'shrimp.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER NOT NULL,
    clicked_at TEXT DEFAULT (datetime('now')),
    referrer TEXT,
    user_agent TEXT,
    ip TEXT,
    country TEXT,
    city TEXT,
    FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
  CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
`);

module.exports = db;
