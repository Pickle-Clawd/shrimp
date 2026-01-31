const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'tide-charts.db');

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL CHECK(status IN ('active', 'idle')),
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    count INTEGER NOT NULL DEFAULT 1,
    session_id TEXT,
    direction TEXT CHECK(direction IN ('inbound', 'outbound'))
  );

  CREATE TABLE IF NOT EXISTS tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    tool_name TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    messages_count INTEGER DEFAULT 0,
    tools_count INTEGER DEFAULT 0,
    sub_agents_spawned INTEGER DEFAULT 0
  );
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// POST /api/stats/activity
app.post('/api/stats/activity', (req, res) => {
  const { status, details, timestamp } = req.body;
  if (!status || !['active', 'idle'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be "active" or "idle".' });
  }
  const ts = timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19);
  const stmt = db.prepare('INSERT INTO activity (timestamp, status, details) VALUES (?, ?, ?)');
  const result = stmt.run(ts, status, details || null);
  res.json({ id: result.lastInsertRowid });
});

// POST /api/stats/messages
app.post('/api/stats/messages', (req, res) => {
  const { count, session_id, direction, timestamp } = req.body;
  const ts = timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19);
  const stmt = db.prepare('INSERT INTO messages (timestamp, count, session_id, direction) VALUES (?, ?, ?, ?)');
  const result = stmt.run(ts, count || 1, session_id || null, direction || null);
  res.json({ id: result.lastInsertRowid });
});

// POST /api/stats/tools
app.post('/api/stats/tools', (req, res) => {
  const { tool_name, count, timestamp } = req.body;
  if (!tool_name) {
    return res.status(400).json({ error: 'tool_name is required.' });
  }
  const ts = timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19);
  const stmt = db.prepare('INSERT INTO tools (timestamp, tool_name, count) VALUES (?, ?, ?)');
  const result = stmt.run(ts, tool_name, count || 1);
  res.json({ id: result.lastInsertRowid });
});

// POST /api/stats/sessions
app.post('/api/stats/sessions', (req, res) => {
  const { session_id, started_at, ended_at, messages_count, tools_count, sub_agents_spawned } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: 'session_id is required.' });
  }
  const stmt = db.prepare(`
    INSERT INTO sessions (session_id, started_at, ended_at, messages_count, tools_count, sub_agents_spawned)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      started_at = COALESCE(excluded.started_at, sessions.started_at),
      ended_at = COALESCE(excluded.ended_at, sessions.ended_at),
      messages_count = COALESCE(excluded.messages_count, sessions.messages_count),
      tools_count = COALESCE(excluded.tools_count, sessions.tools_count),
      sub_agents_spawned = COALESCE(excluded.sub_agents_spawned, sessions.sub_agents_spawned)
  `);
  const result = stmt.run(session_id, started_at || null, ended_at || null, messages_count || 0, tools_count || 0, sub_agents_spawned || 0);
  res.json({ id: result.lastInsertRowid });
});

// Helper: get time filter SQL
function timeFilter(table, range) {
  if (range === 'today') {
    return `WHERE ${table}.timestamp >= datetime('now', 'start of day')`;
  } else if (range === 'week') {
    return `WHERE ${table}.timestamp >= datetime('now', '-7 days')`;
  }
  return '';
}

function sessionTimeFilter(range) {
  if (range === 'today') {
    return `WHERE sessions.started_at >= datetime('now', 'start of day')`;
  } else if (range === 'week') {
    return `WHERE sessions.started_at >= datetime('now', '-7 days')`;
  }
  return '';
}

// GET /api/stats
app.get('/api/stats', (req, res) => {
  const range = req.query.range || 'all';

  const activityFilter = timeFilter('activity', range);
  const messagesFilter = timeFilter('messages', range);
  const toolsFilter = timeFilter('tools', range);
  const sessionsFilter = sessionTimeFilter(range);

  const totalActivity = db.prepare(`SELECT COUNT(*) as count FROM activity ${activityFilter}`).get();
  const activeCount = db.prepare(`SELECT COUNT(*) as count FROM activity ${activityFilter ? activityFilter + " AND" : "WHERE"} status = 'active'`).get();
  const idleCount = db.prepare(`SELECT COUNT(*) as count FROM activity ${activityFilter ? activityFilter + " AND" : "WHERE"} status = 'idle'`).get();

  const totalMessages = db.prepare(`SELECT COALESCE(SUM(count), 0) as total FROM messages ${messagesFilter}`).get();
  const inboundMessages = db.prepare(`SELECT COALESCE(SUM(count), 0) as total FROM messages ${messagesFilter ? messagesFilter + " AND" : "WHERE"} direction = 'inbound'`).get();
  const outboundMessages = db.prepare(`SELECT COALESCE(SUM(count), 0) as total FROM messages ${messagesFilter ? messagesFilter + " AND" : "WHERE"} direction = 'outbound'`).get();

  const toolsUsed = db.prepare(`SELECT tool_name, SUM(count) as total FROM tools ${toolsFilter} GROUP BY tool_name ORDER BY total DESC`).all();

  const totalSessions = db.prepare(`SELECT COUNT(*) as count FROM sessions ${sessionsFilter}`).get();
  const totalSubAgents = db.prepare(`SELECT COALESCE(SUM(sub_agents_spawned), 0) as total FROM sessions ${sessionsFilter}`).get();

  const lastActivity = db.prepare('SELECT * FROM activity ORDER BY timestamp DESC LIMIT 1').get();

  res.json({
    activity: {
      total: totalActivity.count,
      active: activeCount.count,
      idle: idleCount.count,
      last: lastActivity || null
    },
    messages: {
      total: totalMessages.total,
      inbound: inboundMessages.total,
      outbound: outboundMessages.total
    },
    tools: toolsUsed,
    sessions: {
      total: totalSessions.count,
      sub_agents_spawned: totalSubAgents.total
    }
  });
});

// GET /api/stats/timeline
app.get('/api/stats/timeline', (req, res) => {
  const range = req.query.range || 'all';

  let groupBy, timeExpr;
  if (range === 'today') {
    groupBy = "strftime('%H:00', timestamp)";
    timeExpr = "timestamp >= datetime('now', 'start of day')";
  } else if (range === 'week') {
    groupBy = "date(timestamp)";
    timeExpr = "timestamp >= datetime('now', '-7 days')";
  } else {
    groupBy = "date(timestamp)";
    timeExpr = "1=1";
  }

  const activityTimeline = db.prepare(`
    SELECT ${groupBy} as period,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle
    FROM activity WHERE ${timeExpr}
    GROUP BY period ORDER BY period
  `).all();

  const messageTimeline = db.prepare(`
    SELECT ${groupBy} as period, SUM(count) as total
    FROM messages WHERE ${timeExpr}
    GROUP BY period ORDER BY period
  `).all();

  res.json({
    activity: activityTimeline,
    messages: messageTimeline
  });
});

app.listen(PORT, () => {
  console.log(`Tide Charts running on port ${PORT}`);
});
