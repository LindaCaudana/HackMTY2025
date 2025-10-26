// Simple CLI to import the RealTimeError dataset
const path = require('path');
const RealTime = require('../services/RealTimeErrorImportService');

const datasetPath = path.join(__dirname, '..', '..', 'datasets', '[HackMTY2025]_RealTimeErrorDetection_Dataset_v1.xlsx');
try {
  const r = RealTime.importFromExcel(datasetPath);
  console.log('Import result:', r);
} catch (err) {
  console.error('Import failed:', err);
  process.exit(1);
}
