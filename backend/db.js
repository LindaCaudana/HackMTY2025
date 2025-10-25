const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'app.db');
const db = new Database(DB_PATH);

// Initialize table for alcohol items (store data as JSON to be flexible)
db.exec(`
CREATE TABLE IF NOT EXISTS alcohol_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT,
  data TEXT,
  raw_text TEXT,
  inserted_at TEXT DEFAULT (datetime('now'))
);
`);

module.exports = db;
