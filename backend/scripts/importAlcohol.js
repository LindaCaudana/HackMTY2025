const path = require('path');
const alcoholService = require('../services/AlcoholImportService');

async function run() {
  try {
    const repoRoot = path.join(__dirname, '..', '..');
    const excel = path.join(repoRoot, 'hackmty', '[HackMTY2025]_AlcoholBottleHandling_Dataset_v1.xlsx');
    const pdf = path.join(repoRoot, 'hackmty', '[HackMTY2025]_AlcoholBottleHandling_InfoPack_v1.pdf');

    console.log('Importing from:');
    console.log(' Excel:', excel);
    console.log(' PDF:', pdf);

    const result = await alcoholService.importAlcohol({ excelPath: excel, pdfPath: pdf });
    console.log('Import result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  }
}

run();
