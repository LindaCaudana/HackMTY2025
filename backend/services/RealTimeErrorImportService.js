const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const db = require('../db');

// Ensure table exists - same format as alcohol_items for compatibility
db.exec(`
CREATE TABLE IF NOT EXISTS realtime_error_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT,
  data TEXT,
  raw_text TEXT,
  inserted_at TEXT DEFAULT (datetime('now'))
);
`);

function importFromExcel(filePath, sourceName = 'RealTimeErrorDataset') {
  if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath);
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

  const insert = db.prepare(`INSERT INTO realtime_error_items (source, data, raw_text) VALUES (?, ?, ?)`);
  const insertMany = db.transaction((items) => {
    for (const r of items) {
      const raw = Object.values(r).map(v => (v === null || v === undefined) ? '' : String(v)).join(' | ');
      insert.run(sourceName, JSON.stringify(r), raw);
    }
  });

  insertMany(rows);
  return { imported: rows.length };
}

function list(limit = 100) {
  const stmt = db.prepare('SELECT id, source, data, raw_text, inserted_at FROM realtime_error_items ORDER BY id DESC LIMIT ?');
  return stmt.all(limit).map(r => ({ ...r, data: JSON.parse(r.data) }));
}

function getByLayout(layoutNumber) {
  const stmt = db.prepare('SELECT id, source, data, raw_text, inserted_at FROM realtime_error_items');
  const rows = stmt.all();
  
  // Buscar un registro donde el campo Layout coincida
  const layoutData = rows.find(r => {
    const data = JSON.parse(r.data);
    return data.Layout === `Layout_${layoutNumber}`;
  });
  
  if (!layoutData) {
    return null;
  }
  
  return { ...layoutData, data: JSON.parse(layoutData.data) };
}

module.exports = { importFromExcel, list, getByLayout };
