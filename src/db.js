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
    updated_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    disabled INTEGER DEFAULT 0,
    reported INTEGER DEFAULT 0
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

// Migrations: add columns if they don't exist (for existing databases)
const columns = db.prepare("PRAGMA table_info(links)").all().map(c => c.name);
if (!columns.includes('expires_at')) {
  db.exec("ALTER TABLE links ADD COLUMN expires_at TEXT");
}
if (!columns.includes('disabled')) {
  db.exec("ALTER TABLE links ADD COLUMN disabled INTEGER DEFAULT 0");
}
if (!columns.includes('reported')) {
  db.exec("ALTER TABLE links ADD COLUMN reported INTEGER DEFAULT 0");
}

// Cleanup expired links on startup
db.prepare("DELETE FROM links WHERE expires_at IS NOT NULL AND expires_at < datetime('now')").run();

// Periodic cleanup every 10 minutes
setInterval(() => {
  try {
    db.prepare("DELETE FROM links WHERE expires_at IS NOT NULL AND expires_at < datetime('now')").run();
  } catch (e) {
    // DB may be closed during shutdown
  }
}, 10 * 60 * 1000);

module.exports = db;
