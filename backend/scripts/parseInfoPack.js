const fs = require('fs');
const pdf = require('pdf-parse');

const file = '../datasets/[HackMTY2025]_RealTimeErrorDetection_InfoPack_v1.pdf';
const keys = ['threshold', 'deviation', 'tolerance', 'alert', 'weight', 'barcode', 'rfid', 'allowed', 'limit'];

pdf(fs.readFileSync(file)).then(d => {
  const text = d.text;
  console.log('--- InfoPack excerpt (first 2000 chars) ---\n');
  console.log(text.slice(0, 2000));
  console.log('\n--- Keyword matches ---\n');
  const lower = text.toLowerCase();
  for (const k of keys) {
    let idx = lower.indexOf(k);
    if (idx === -1) {
      console.log(`${k}: not found`);
      continue;
    }
    const start = Math.max(0, idx - 80);
    const excerpt = text.slice(start, start + 240).replace(/\n/g, ' ');
    console.log(`${k}: ...${excerpt}...`);
  }
}).catch(err => {
  console.error('Failed to parse PDF:', err);
});
