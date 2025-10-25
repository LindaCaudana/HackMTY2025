const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const tmpDir = path.join(__dirname, '..', '..', 'tmp_uploads');
const fs = require('fs');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({ dest: tmpDir });
const alcoholService = require('../services/AlcoholImportService');
const alcoholRuleService = require('../services/AlcoholRuleService');
const alcoholImportService = require('../services/AlcoholImportService');

// GET /api/alcohol/list -> list imported items
router.get('/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const items = alcoholService.listAlcoholItems(limit);
    res.json({ success: true, items });
  } catch (err) {
    console.error('List error', err);
    res.status(500).json({ error: err.message });
  }
});

// GET fields metadata
router.get('/fields', async (req, res) => {
  try {
    const meta = alcoholService.getFieldsFromDB();
    res.json({ success: true, fields: meta.fields });
  } catch (err) {
    console.error('Fields error', err);
    res.status(500).json({ error: err.message });
  }
});

// GET mappings (customerName->customerCode, product->brand)
router.get('/mappings', async (req, res) => {
  try {
    const map = alcoholImportService.getMappingsFromDB();
    res.json({ success: true, mappings: map });
  } catch (err) {
    console.error('Mappings error', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alcohol/import -> accepts optional uploaded excel/pdf; if none provided, uses files in /hackmty folder
router.post('/import', upload.fields([{ name: 'excel' }, { name: 'pdf' }]), async (req, res) => {
  try {
    const uploaded = req.files || {};

    const repoRoot = path.join(__dirname, '..', '..');
    const defaultExcel = path.join(repoRoot, 'hackmty', '[HackMTY2025]_AlcoholBottleHandling_Dataset_v1.xlsx');
    const defaultPdf = path.join(repoRoot, 'hackmty', '[HackMTY2025]_AlcoholBottleHandling_InfoPack_v1.pdf');

    const excelPath = (uploaded.excel && uploaded.excel[0] && uploaded.excel[0].path) || (fsExists(defaultExcel) ? defaultExcel : null);
    const pdfPath = (uploaded.pdf && uploaded.pdf[0] && uploaded.pdf[0].path) || (fsExists(defaultPdf) ? defaultPdf : null);

    if (!excelPath && !pdfPath) {
      return res.status(400).json({ error: 'No excel or pdf provided and default files not found.' });
    }

    const result = await alcoholService.importAlcohol({ excelPath, pdfPath });
    res.json({ success: true, result });
  } catch (err) {
    console.error('Import error', err);
    res.status(500).json({ error: err.message });
  }
});

function fsExists(p) {
  try { return require('fs').existsSync(p); } catch { return false; }
}

module.exports = router;

// POST /api/alcohol/save-input -> save manual user input into DB
router.post('/save-input', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || Object.keys(payload).length === 0) return res.status(400).json({ success: false, error: 'Empty payload' });
    const result = await alcoholImportService.saveManualInput(payload);
    if (result.success) return res.json({ success: true });
    return res.status(500).json({ success: false, error: result.error });
  } catch (err) {
    console.error('Save input error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
