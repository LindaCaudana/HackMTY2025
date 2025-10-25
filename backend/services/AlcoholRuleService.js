const db = require('../db');

function normalizeKey(k) {
  return String(k).trim().toLowerCase();
}

function mapHeaderToBottleField(header) {
  const h = header.toLowerCase();
  if (h.includes('fill')) return 'fillLevel';
  if (h.includes('seal')) return 'sealStatus';
  if (h.includes('label')) return 'labelStatus';
  if (h.includes('clean')) return 'cleanliness';
  if (h.includes('customer') || h.includes('airline')) return 'customerCode';
  return header; // fallback
}

function parseNumericCondition(ruleVal) {
  if (ruleVal === null || ruleVal === undefined) return null;
  const s = String(ruleVal).trim();
  // range e.g. 30-70
  const rangeMatch = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) return { type: 'range', min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };
  const lt = s.match(/^<\s*=?\s*(\d+)/);
  if (lt) return { type: 'lt', value: Number(lt[1]) };
  const gt = s.match(/^>\s*=?\s*(\d+)/);
  if (gt) return { type: 'gt', value: Number(gt[1]) };
  const ge = s.match(/^>=\s*(\d+)/);
  if (ge) return { type: 'ge', value: Number(ge[1]) };
  const le = s.match(/^<=\s*(\d+)/);
  if (le) return { type: 'le', value: Number(le[1]) };
  // plain number
  const num = Number(s.replace('%',''));
  if (!isNaN(num)) return { type: 'lt', value: num }; // convention: numeric means '< value'
  return null;
}

function matchValue(ruleVal, actualVal, header) {
  if (ruleVal === null || ruleVal === undefined || String(ruleVal).trim().toLowerCase() === 'any') return true;
  const mapped = mapHeaderToBottleField(header);
  if (mapped === 'fillLevel') {
    const cond = parseNumericCondition(ruleVal);
    const actual = Number(actualVal || 0);
    if (!cond) return false;
    switch (cond.type) {
      case 'range': return actual >= cond.min && actual <= cond.max;
      case 'lt': return actual < cond.value;
      case 'le': return actual <= cond.value;
      case 'gt': return actual > cond.value;
      case 'ge': return actual >= cond.value;
      default: return false;
    }
  }

  // string matching: allow comma/pipe separated values
  const s = String(ruleVal);
  const options = s.split(/[,|\/\\]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
  const actualStr = String(actualVal || '').toLowerCase();
  if (options.length === 0) return false;
  return options.some(opt => actualStr === opt || actualStr.includes(opt));
}

function getActionFromRow(row) {
  // try common columns
  const keys = Object.keys(row);
  for (const k of keys) {
    const kl = k.toLowerCase();
    if (kl.includes('action') || kl.includes('decision') || kl.includes('result')) return row[k];
  }
  // fallback: if there's a column named 'suggested' or 'outcome'
  for (const k of keys) {
    const kl = k.toLowerCase();
    if (kl.includes('suggest') || kl.includes('outcome')) return row[k];
  }
  return null;
}

function getReasonFromRow(row) {
  const keys = Object.keys(row);
  for (const k of keys) {
    const kl = k.toLowerCase();
    if (kl.includes('reason') || kl.includes('comment') || kl.includes('justif')) return row[k];
  }
  return null;
}

function evaluateBottle(bottle) {
  // load excel rows from DB
  const rows = db.prepare("SELECT data FROM alcohol_items WHERE source='excel'").all();
  for (const r of rows) {
    let obj;
    try { obj = JSON.parse(r.data); } catch { continue; }
    // for each key in obj, check match
    let allMatch = true;
    for (const key of Object.keys(obj)) {
      const ruleVal = obj[key];
      // map header to bottle field
      const mapped = mapHeaderToBottleField(key);
      const actual = bottle[mapped];
      if (!matchValue(ruleVal, actual, key)) { allMatch = false; break; }
    }
    if (allMatch) {
      const action = getActionFromRow(obj) || 'Keep';
      const reason = getReasonFromRow(obj) || 'Matched rule from dataset';
      return { action, reason };
    }
  }
  return null;
}

module.exports = { evaluateBottle };
