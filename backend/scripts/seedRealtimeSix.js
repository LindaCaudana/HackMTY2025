const db = require('../db');

function randomDigits(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += String(Math.floor(Math.random() * 10));
  return s;
}

function randomAlphaNum(n) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

function seedSix() {
  // Delete existing rows in realtime_error_items
  db.prepare('DELETE FROM realtime_error_items').run();

  const insert = db.prepare('INSERT INTO realtime_error_items (source, data, raw_text) VALUES (?, ?, ?)');

  for (let i = 1; i <= 6; i++) {
    const obj = {
      Layout: `Layout_${i}`,
      Barcode: `BC${randomDigits(8)}`,
      RFID: `RF${randomAlphaNum(6)}`,
      Weight: `${(Math.random() * 5 + 0.5).toFixed(2)} kg`
    };
    const raw = Object.values(obj).join(' | ');
    insert.run('SeededRealtime', JSON.stringify(obj), raw);
  }

  const count = db.prepare('SELECT COUNT(*) as c FROM realtime_error_items').get().c;
  console.log(`Seeding complete. Rows in realtime_error_items: ${count}`);
}

if (require.main === module) {
  try {
    seedSix();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

module.exports = { seedSix };
