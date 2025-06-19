import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Generate sample PDF files for testing
 */
async function generatePDFSamples() {
  // 1. Basic PDF with text
  const basicPdf = await PDFDocument.create();
  const page = basicPdf.addPage([600, 400]);
  const font = await basicPdf.embedFont(StandardFonts.Helvetica);
  
  page.drawText('FormatFuse Test PDF', {
    x: 50,
    y: 350,
    size: 30,
    font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText('This is a sample PDF file for testing the PDF to Word converter.', {
    x: 50,
    y: 300,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText('It contains multiple paragraphs and formatting.', {
    x: 50,
    y: 250,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  
  const basicPdfBytes = await basicPdf.save();
  await writeFile(resolve(__dirname, 'pdf/sample.pdf'), basicPdfBytes);
  
  // 2. Multi-page PDF
  const multiPagePdf = await PDFDocument.create();
  for (let i = 0; i < 3; i++) {
    const page = multiPagePdf.addPage([600, 400]);
    const font = await multiPagePdf.embedFont(StandardFonts.Helvetica);
    
    page.drawText(`Page ${i + 1}`, {
      x: 50,
      y: 350,
      size: 24,
      font,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Content for page ${i + 1}. This tests multi-page conversion.`, {
      x: 50,
      y: 300,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
  }
  
  const multiPagePdfBytes = await multiPagePdf.save();
  await writeFile(resolve(__dirname, 'pdf/multipage.pdf'), multiPagePdfBytes);
  
  // 3. Empty PDF
  const emptyPdf = await PDFDocument.create();
  emptyPdf.addPage([600, 400]); // Add blank page
  const emptyPdfBytes = await emptyPdf.save();
  await writeFile(resolve(__dirname, 'pdf/empty.pdf'), emptyPdfBytes);
  
  // 4. Large PDF (100 pages for performance testing)
  const largePdf = await PDFDocument.create();
  const largeFont = await largePdf.embedFont(StandardFonts.Helvetica);
  
  for (let i = 0; i < 100; i++) {
    const page = largePdf.addPage([600, 800]);
    
    page.drawText(`Performance Test - Page ${i + 1}`, {
      x: 50,
      y: 750,
      size: 20,
      font: largeFont,
      color: rgb(0, 0, 0),
    });
    
    // Add lots of text to make it substantial
    let yPosition = 700;
    for (let j = 0; j < 20; j++) {
      page.drawText(`Lorem ipsum dolor sit amet, consectetur adipiscing elit. ${j}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: largeFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 25;
    }
  }
  
  const largePdfBytes = await largePdf.save();
  await writeFile(resolve(__dirname, 'pdf/large.pdf'), largePdfBytes);
  
  console.log('✅ PDF samples generated successfully');
}

/**
 * Generate sample image files
 */
async function generateImageSamples() {
  // For now, we'll create placeholder text files
  // In a real scenario, you'd use a library like sharp or canvas to generate actual images
  
  await writeFile(
    resolve(__dirname, 'images/jpg/sample.jpg.placeholder'),
    'Placeholder for JPG image - replace with actual image file'
  );
  
  await writeFile(
    resolve(__dirname, 'images/png/sample.png.placeholder'),
    'Placeholder for PNG image - replace with actual image file'
  );
  
  console.log('✅ Image placeholders created (replace with actual images)');
}

/**
 * Generate sample JSON files
 */
async function generateJSONSamples() {
  // Valid JSON
  const validJson = {
    name: "FormatFuse Test",
    version: "1.0.0",
    features: ["pdf-to-word", "image-resize", "json-format"],
    nested: {
      deep: {
        value: 42
      }
    }
  };
  
  await writeFile(
    resolve(__dirname, 'developer/json/valid.json'),
    JSON.stringify(validJson, null, 2)
  );
  
  // Minified JSON
  await writeFile(
    resolve(__dirname, 'developer/json/minified.json'),
    JSON.stringify(validJson)
  );
  
  // Invalid JSON
  await writeFile(
    resolve(__dirname, 'developer/json/invalid.json'),
    '{ "name": "Invalid JSON", "missing": "closing brace"'
  );
  
  // Large JSON
  const largeJson = {
    items: Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random()
    }))
  };
  
  await writeFile(
    resolve(__dirname, 'developer/json/large.json'),
    JSON.stringify(largeJson)
  );
  
  console.log('✅ JSON samples generated');
}

// Run all generators
async function generateAllSamples() {
  try {
    await generatePDFSamples();
    await generateImageSamples();
    await generateJSONSamples();
    console.log('\n✨ All test samples generated successfully!');
  } catch (error) {
    console.error('Error generating samples:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllSamples();
}