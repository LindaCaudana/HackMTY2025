const express = require('express');
const path = require('path');
const router = express.Router();
const RealTimeService = require('../services/RealTimeErrorImportService');

// Import dataset from the datasets folder (sync for simplicity)
router.get('/import', (req, res) => {
  try {
    const repoRoot = path.join(__dirname, '..');
    const datasetPath = path.join(repoRoot, '..', 'datasets', '[HackMTY2025]_RealTimeErrorDetection_Dataset_v1.xlsx');
    const result = RealTimeService.importFromExcel(datasetPath);
    res.json({ ok: true, result });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/list', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const rows = RealTimeService.list(limit);
    res.json({ ok: true, rows });
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get data by Layout number
router.get('/by-layout/:layoutNumber', (req, res) => {
  try {
    const layoutNumber = parseInt(req.params.layoutNumber);
    const data = RealTimeService.getByLayout(layoutNumber);
    if (!data) {
      return res.status(404).json({ ok: false, error: 'Layout not found' });
    }
    res.json({ ok: true, data });
  } catch (err) {
    console.error('Get by layout error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
