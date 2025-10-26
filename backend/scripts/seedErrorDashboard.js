const db = require('../db');
const xlsx = require('xlsx');
const path = require('path');

// Función para leer el dataset
function getDatasetData() {
  const datasetPath = path.join(__dirname, '..', '..', 'datasets', '[HackMTY2025]_RealTimeErrorDetection_Dataset_v1.xlsx');
  const wb = xlsx.readFile(datasetPath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: null });
}

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

function seedErrorDashboard() {
  // Delete existing rows in realtime_error_items
  db.prepare('DELETE FROM realtime_error_items').run();

  const insert = db.prepare('INSERT INTO realtime_error_items (source, data, raw_text) VALUES (?, ?, ?)');

  // Definir los 6 registros exactos
  const records = [
    {
      Layout: "Layout_6",
      Stream_ID: "STREAM_06",
      Timestamp: "2025-10-26 07:55:17",
      Station_ID: "QC01",
      Drawer_ID: "DRW_038",
      Spec_ID: "SPEC_20251013_11",
      Barcode: "LB068",
      RFID: "TRL219",
      Weight: "3.71 kg",
      Sensor_Type: "Camera",
      Deviation_Score: 0,
      Alert_Flag: "OK",
      Operator_ID: "EMP047",
      Flight_Number: "LX321",
      Customer_Name: "Swiss International Air Lines"
    },
    {
      Layout: "Layout_5",
      Stream_ID: "STREAM_05",
      Timestamp: "2025-10-26 07:55:17",
      Station_ID: "PK01",
      Drawer_ID: "DRW_014",
      Spec_ID: "SPEC_20251013_15",
      Barcode: "LB098",
      RFID: "TRL018",
      Weight: "4.74 kg",
      Sensor_Type: "Camera",
      Deviation_Score: 0,
      Alert_Flag: "OK",
      Operator_ID: "EMP050",
      Flight_Number: "DL045",
      Customer_Name: "Delta Air Lines"
    },
    {
      Layout: "Layout_4",
      Stream_ID: "STREAM_04",
      Timestamp: "2025-10-26 07:55:17",
      Station_ID: "PK04",
      Drawer_ID: "DRW_050",
      Spec_ID: "SPEC_20251013_04",
      Barcode: "SNK079",
      RFID: "TRL211",
      Weight: "3.63 kg",
      Sensor_Type: "Camera",
      Deviation_Score: 0,
      Alert_Flag: "OK",
      Operator_ID: "EMP029",
      Flight_Number: "QR117",
      Customer_Name: "Qatar Airways"
    },
    {
      Layout: "Layout_3",
      Stream_ID: "STREAM_03",
      Timestamp: "2025-10-26 07:55:17",
      Station_ID: "PK04",
      Drawer_ID: "DRW_050",
      Spec_ID: "SPEC_20251013_04",
      Barcode: "DRK024",
      RFID: "TRL146",
      Weight: "4.18 kg",
      Sensor_Type: "Camera",
      Deviation_Score: 0,
      Alert_Flag: "OK",
      Operator_ID: "EMP029",
      Flight_Number: "QR117",
      Customer_Name: "Qatar Airways"
    },
    {
      Layout: "Layout_2",
      Stream_ID: "STREAM_02",
      Timestamp: "2025-10-26 07:55:17",
      Station_ID: "PK02",
      Drawer_ID: "DRW_013",
      Spec_ID: "SPEC_20251013_14",
      Barcode: "DRK038",
      RFID: "TRL215",
      Weight: "4.77 kg",
      Sensor_Type: "Camera",
      Deviation_Score: 0,
      Alert_Flag: "OK",
      Operator_ID: "EMP044",
      Flight_Number: "QR117",
      Customer_Name: "Qatar Airways"
    },
    {
      Layout: "Layout_1",
      Stream_ID: "STREAM_01",
      Timestamp: "2025-10-26 07:55:17",
      Station_ID: "PK04",
      Drawer_ID: "DRW_050",
      Spec_ID: "SPEC_20251013_04",
      Barcode: "DRK038",
      RFID: "TRL146",
      Weight: "3.63 kg",
      Sensor_Type: "Camera",
      Deviation_Score: 0,
      Alert_Flag: "OK",
      Operator_ID: "EMP029",
      Flight_Number: "QR117",
      Customer_Name: "Qatar Airways"
    }
  ];

  // Insertar cada registro
  for (const obj of records) {
    const raw = Object.values(obj).join(' | ');
    insert.run('ErrorDashboardSeeded', JSON.stringify(obj), raw);
  }

  const count = db.prepare('SELECT COUNT(*) as c FROM realtime_error_items').get().c;
  console.log(`Seeding complete. Rows in realtime_error_items: ${count}`);
  console.log('Created 6 records for ErrorDashboard (one for each Layout_1 to Layout_6)');
}

if (require.main === module) {
  try {
    seedErrorDashboard();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

module.exports = { seedErrorDashboard };

