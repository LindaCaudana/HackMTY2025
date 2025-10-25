const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pdf = require('pdf-parse');
const db = require('../db');

function sanitizeHeader(h) {
  return String(h).trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

async function importFromExcel(filePath) {
  if (!fs.existsSync(filePath)) {
    return { inserted: 0, errors: [`Excel file not found: ${filePath}`] };
  }

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(sheet, { defval: null });

  let inserted = 0;
  const errors = [];

  const insertStmt = db.prepare('INSERT INTO alcohol_items (source, data, raw_text) VALUES (?, ?, ?)');

  for (const row of json) {
    try {
      // store entire row as JSON string so we keep all columns
      insertStmt.run('excel', JSON.stringify(row), null);
      inserted++;
    } catch (err) {
      errors.push(`Row insert error: ${err.message}`);
    }
  }

  return { inserted, errors };
}

async function importFromPDF(filePath) {
  if (!fs.existsSync(filePath)) {
    return { inserted: 0, errors: [`PDF file not found: ${filePath}`] };
  }

  const dataBuffer = fs.readFileSync(filePath);
  const parsed = await pdf(dataBuffer);
  const text = parsed.text || '';

  // Heuristic: find the "Inspiration and Example ideas" section and ignore point 4
  const lower = text.toLowerCase();
  const sectionTitle = 'inspiration and example ideas';
  let sectionStart = lower.indexOf(sectionTitle);
  let sectionText = text;
  if (sectionStart >= 0) {
    sectionText = text.substring(sectionStart);
    // remove point 4 if present (look for '\n4.' and remove until next numbered point or end)
    const regexPoint4 = /\n\s*4\.[\s\S]*?(?=\n\s*[5-9]\.|\n\s*\d{2}\.|$)/i;
    sectionText = sectionText.replace(regexPoint4, '\n');
  }

  // Extract lines containing 'alcohol' (case-insensitive)
  const lines = sectionText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  const alcoholLines = lines.filter(l => /alcohol/i.test(l));

  let inserted = 0;
  const errors = [];
  const insertStmt = db.prepare('INSERT INTO alcohol_items (source, data, raw_text) VALUES (?, ?, ?)');

  for (const line of alcoholLines) {
    try {
      // try to parse CSV-like line (comma or tab separated) into object if possible
      let dataObj = null;
      if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim());
        dataObj = { parts };
      } else if (line.includes(',')) {
        const parts = line.split(',').map(p => p.trim());
        dataObj = { parts };
      } else {
        dataObj = { text: line };
      }

      insertStmt.run('pdf', JSON.stringify(dataObj), line);
      inserted++;
    } catch (err) {
      errors.push(`PDF line insert error: ${err.message}`);
    }
  }

  return { inserted, errors };
}

async function importAlcohol({ excelPath, pdfPath }) {
  const report = { excel: null, pdf: null, totalInserted: 0, errors: [] };

  if (excelPath) {
    const res = await importFromExcel(excelPath);
    report.excel = res;
    report.totalInserted += res.inserted || 0;
    report.errors.push(...(res.errors || []));
  }

  if (pdfPath) {
    const res2 = await importFromPDF(pdfPath);
    report.pdf = res2;
    report.totalInserted += res2.inserted || 0;
    report.errors.push(...(res2.errors || []));
  }

  return report;
}

module.exports = { importAlcohol };

function listAlcoholItems(limit = 100) {
  const rows = db.prepare('SELECT id, source, data, raw_text, inserted_at FROM alcohol_items ORDER BY inserted_at DESC LIMIT ?').all(limit);
  return rows.map(r => {
    let parsed = null;
    try { parsed = JSON.parse(r.data); } catch { parsed = r.data; }
    return { id: r.id, source: r.source, data: parsed, raw_text: r.raw_text, inserted_at: r.inserted_at };
  });
}

module.exports = { importAlcohol, listAlcoholItems };

function getFieldsFromDB(limit = 500) {
  const rows = db.prepare("SELECT data FROM alcohol_items WHERE source='excel' LIMIT ?").all(limit);
  const parsed = rows.map(r => {
    try { return JSON.parse(r.data); } catch { return null; }
  }).filter(r => r && typeof r === 'object');

  if (parsed.length === 0) return { fields: [] };

  const headers = Object.keys(parsed[0]);
  const fields = headers.map(h => {
    const samples = new Set();
    for (const row of parsed) {
      const v = row[h];
      if (v !== null && v !== undefined) {
        samples.add(String(v));
        if (samples.size >= 10) break;
      }
    }
    // detect type
    let type = 'string';
    const sampleArray = Array.from(samples);
    if (sampleArray.length > 0 && sampleArray.every(s => !isNaN(Number(String(s).replace('%','').replace(',',''))))) {
      type = 'number';
    }
    return { name: h, sampleValues: sampleArray.slice(0,10), type };
  });

  return { fields };
}

module.exports = { importAlcohol, listAlcoholItems, getFieldsFromDB };

function getMappingsFromDB(limit = 500) {
  const rows = db.prepare("SELECT data FROM alcohol_items WHERE source='excel' LIMIT ?").all(limit);
  const parsed = rows.map(r => {
    try { return JSON.parse(r.data); } catch { return null; }
  }).filter(r => r && typeof r === 'object');

  if (parsed.length === 0) return { customerNameKey: null, customerCodeKey: null, productKey: null, brandKey: null, customerNameToCode: {}, productToBrand: {} };

  const headers = Object.keys(parsed[0]);
  // detect header keys
  const findKey = (pred) => headers.find(h => pred(h.toLowerCase())) || null;
  const customerNameKey = findKey(h => h.includes('customer') && h.includes('name')) || findKey(h => h === 'customer' || h.includes('customer_name'));
  const customerCodeKey = findKey(h => h.includes('customer') && h.includes('code')) || findKey(h => h.includes('airline') && h.includes('code')) || findKey(h => h === 'customercode');
  const productKey = findKey(h => h.includes('product')) || findKey(h => h.includes('product_name'));
  const brandKey = findKey(h => h.includes('brand')) || findKey(h => h.includes('marca'));

  const customerNameToCode = {};
  const productToBrand = {};

  for (const row of parsed) {
    if (customerNameKey && customerCodeKey && row[customerNameKey] && row[customerCodeKey]) {
      customerNameToCode[String(row[customerNameKey]).trim()] = String(row[customerCodeKey]).trim();
    }
    if (productKey && brandKey && row[productKey] && row[brandKey]) {
      productToBrand[String(row[productKey]).trim()] = String(row[brandKey]).trim();
    }
  }

  return { customerNameKey, customerCodeKey, productKey, brandKey, customerNameToCode, productToBrand };
}

module.exports.getMappingsFromDB = getMappingsFromDB;

async function saveManualInput(data) {
  try {
    const insertStmt = db.prepare('INSERT INTO alcohol_items (source, data, raw_text) VALUES (?, ?, ?)');
    insertStmt.run('manual', JSON.stringify(data), null);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports.saveManualInput = saveManualInput;
