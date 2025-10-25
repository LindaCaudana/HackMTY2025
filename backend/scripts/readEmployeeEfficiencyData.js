const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');

async function readEmployeeEfficiencyData() {
  try {
    console.log('📊 Leyendo datos de Employee Efficiency...\n');
    
    // Leer PDF
    const pdfPath = path.join(__dirname, '..', '..', 'hackmty', '[HackMTY2025]_EmployeeEfficiency_InfoPack_v1.pdf');
    console.log('📄 Leyendo PDF:', pdfPath);
    
    if (fs.existsSync(pdfPath)) {
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(pdfBuffer);
      
      console.log('✅ PDF leído exitosamente');
      console.log('📄 Contenido del PDF (primeros 2000 caracteres):');
      console.log('─'.repeat(80));
      console.log(pdfData.text.substring(0, 2000));
      console.log('─'.repeat(80));
      console.log(`📊 Total de páginas: ${pdfData.numpages}`);
      console.log(`📊 Total de caracteres: ${pdfData.text.length}\n`);
    } else {
      console.log('❌ PDF no encontrado en:', pdfPath);
    }
    
    // Leer Excel
    const excelPath = path.join(__dirname, '..', '..', 'hackmty', '[HackMTY2025]_EmployeeEfficiency_Dataset_v1.xlsx');
    console.log('📊 Leyendo Excel:', excelPath);
    
    if (fs.existsSync(excelPath)) {
      const workbook = XLSX.readFile(excelPath);
      
      console.log('✅ Excel leído exitosamente');
      console.log('📊 Hojas disponibles:', workbook.SheetNames);
      
      // Leer la primera hoja
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`📊 Datos de la hoja "${sheetName}":`);
      console.log(`📊 Total de registros: ${jsonData.length}`);
      
      if (jsonData.length > 0) {
        console.log('📊 Columnas disponibles:', Object.keys(jsonData[0]));
        console.log('📊 Primeros 3 registros:');
        console.log('─'.repeat(80));
        console.log(JSON.stringify(jsonData.slice(0, 3), null, 2));
        console.log('─'.repeat(80));
        
        // Análisis de datos
        console.log('\n📈 Análisis de datos:');
        const columns = Object.keys(jsonData[0]);
        columns.forEach(col => {
          const values = jsonData.map(row => row[col]).filter(val => val !== undefined && val !== '');
          const uniqueValues = [...new Set(values)];
          console.log(`  ${col}: ${uniqueValues.length} valores únicos`);
          if (uniqueValues.length <= 10) {
            console.log(`    Valores: ${uniqueValues.join(', ')}`);
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
      console.log('\n✅ Proceso completado exitosamente');
    } else {
      console.log('\n❌ Error en el proceso');
    }
  });
}

module.exports = readEmployeeEfficiencyData;
