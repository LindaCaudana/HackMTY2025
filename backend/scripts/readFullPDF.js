const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function readFullPDF() {
  try {
    const pdfPath = path.join(__dirname, '..', '..', 'hackmty', '[HackMTY2025]_EmployeeEfficiency_InfoPack_v1.pdf');
  console.log('Reading full PDF...');
    
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    
  console.log('PDF read successfully');
  console.log(`Total pages: ${pdfData.numpages}`);
  console.log(`Total characters: ${pdfData.text.length}\n`);
    
    // Dividir por páginas aproximadas (asumiendo ~2300 caracteres por página)
    const pages = [];
    const charsPerPage = Math.ceil(pdfData.text.length / pdfData.numpages);
    
    for (let i = 0; i < pdfData.numpages; i++) {
      const start = i * charsPerPage;
      const end = Math.min(start + charsPerPage, pdfData.text.length);
      pages.push(pdfData.text.substring(start, end));
    }
    
  console.log('Full PDF content:');
    console.log('═'.repeat(100));
    
    pages.forEach((page, index) => {
  console.log(`\nPAGE ${index + 1}:`);
      console.log('─'.repeat(80));
      console.log(page);
      console.log('─'.repeat(80));
    });
    
    console.log('\n═'.repeat(100));
    
    return pdfData.text;
    
  } catch (error) {
  console.error('Error reading PDF:', error);
    return null;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  readFullPDF().then(result => {
      if (result) {
      console.log('\nPDF read completely');
    } else {
      console.log('\nError reading PDF');
    }
  });
}

module.exports = readFullPDF;


