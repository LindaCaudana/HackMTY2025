const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');

async function readEmployeeEfficiencyData() {
  try {
  console.log('Reading Employee Efficiency data...\n');
    
    // Leer PDF
    const pdfPath = path.join(__dirname, '..', '..', 'hackmty', '[HackMTY2025]_EmployeeEfficiency_InfoPack_v1.pdf');
  console.log('Reading PDF:', pdfPath);
    
    if (fs.existsSync(pdfPath)) {
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(pdfBuffer);
      
  console.log('PDF read successfully');
  console.log('PDF content (first 2000 characters):');
      console.log('─'.repeat(80));
      console.log(pdfData.text.substring(0, 2000));
      console.log('─'.repeat(80));
  console.log(`Total pages: ${pdfData.numpages}`);
  console.log(`Total characters: ${pdfData.text.length}\n`);
    } else {
  console.log('PDF not found at:', pdfPath);
    }
    
    // Leer Excel
    const excelPath = path.join(__dirname, '..', '..', 'hackmty', '[HackMTY2025]_EmployeeEfficiency_Dataset_v1.xlsx');
  console.log('Reading Excel:', excelPath);
    
    if (fs.existsSync(excelPath)) {
      const workbook = XLSX.readFile(excelPath);
      
  console.log('Excel read successfully');
  console.log('Available sheets:', workbook.SheetNames);
      
      // Leer la primera hoja
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
  console.log(`Data from sheet "${sheetName}":`);
  console.log(`Total records: ${jsonData.length}`);
      
      if (jsonData.length > 0) {
  console.log('Available columns:', Object.keys(jsonData[0]));
  console.log('First 3 records:');
        console.log('─'.repeat(80));
        console.log(JSON.stringify(jsonData.slice(0, 3), null, 2));
        console.log('─'.repeat(80));
        
        // Análisis de datos
  console.log('\nData analysis:');
        const columns = Object.keys(jsonData[0]);
        columns.forEach(col => {
          const values = jsonData.map(row => row[col]).filter(val => val !== undefined && val !== '');
          const uniqueValues = [...new Set(values)];
          console.log(`  ${col}: ${uniqueValues.length} unique values`);
          if (uniqueValues.length <= 10) {
            console.log(`    Values: ${uniqueValues.join(', ')}`);
          }
        });
      }
      
      return {
        pdfContent: pdfData ? pdfData.text : '',
        excelData: jsonData,
        columns: jsonData.length > 0 ? Object.keys(jsonData[0]) : []
      };
    } else {
      console.log('❌ Excel no encontrado en:', excelPath);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error leyendo datos:', error);
    return null;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  readEmployeeEfficiencyData().then(result => {
    if (result) {
      console.log('\nProcess completed successfully');
    } else {
      console.log('\nProcess failed');
    }
  });
}

module.exports = readEmployeeEfficiencyData;
