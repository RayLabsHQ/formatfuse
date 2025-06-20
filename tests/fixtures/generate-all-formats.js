import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import init, { convertImage, loadMetadata } from '@refilelabs/image';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateAllFormats() {
  // Initialize WASM
  const wasmBuffer = fs.readFileSync('node_modules/@refilelabs/image/refilelabs_image_bg.wasm');
  await init(wasmBuffer);

  // Source image - using our test PNG
  const sourceFile = path.join(__dirname, 'images/test.png');
  const sourceData = new Uint8Array(fs.readFileSync(sourceFile));
  
  // Get source metadata
  const metadata = loadMetadata(sourceData, 'image/png', () => {});
  console.log(`Source image: ${metadata.width}x${metadata.height} PNG\n`);

  // Output directory
  const outputDir = path.join(__dirname, 'images/generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Define all format conversions to test
  const formats = [
    // Common formats (already tested)
    { mime: 'image/jpeg', ext: 'jpg', name: 'JPEG' },
    { mime: 'image/png', ext: 'png', name: 'PNG' },
    { mime: 'image/webp', ext: 'webp', name: 'WebP' },
    { mime: 'image/gif', ext: 'gif', name: 'GIF' },
    { mime: 'image/bmp', ext: 'bmp', name: 'BMP' },
    
    // Less common formats
    { mime: 'image/tiff', ext: 'tiff', name: 'TIFF' },
    { mime: 'image/x-icon', ext: 'ico', name: 'ICO' },
    { mime: 'image/avif', ext: 'avif', name: 'AVIF' },
    
    // Specialized formats
    { mime: 'image/x-targa', ext: 'tga', name: 'TGA' },
    { mime: 'image/x-portable-anymap', ext: 'pnm', name: 'PNM' },
    { mime: 'image/x-qoi', ext: 'qoi', name: 'QOI' },
    { mime: 'image/farbfeld', ext: 'ff', name: 'Farbfeld' },
    { mime: 'image/vnd.radiance', ext: 'hdr', name: 'HDR' },
    { mime: 'image/x-exr', ext: 'exr', name: 'EXR' },
  ];

  console.log('Generating test files in all supported formats...\n');

  const results = [];

  for (const format of formats) {
    const outputFile = path.join(outputDir, `test.${format.ext}`);
    
    try {
      console.log(`Converting to ${format.name} (${format.mime})...`);
      
      const converted = convertImage(
        sourceData,
        'image/png',
        format.mime,
        (progress) => {
          // Progress callback
        }
      );

      fs.writeFileSync(outputFile, converted);
      
      // Verify the conversion by reading metadata
      try {
        const verifyMetadata = loadMetadata(converted, format.mime, () => {});
        console.log(`✓ ${format.name}: ${verifyMetadata.width}x${verifyMetadata.height} - ${converted.length} bytes`);
        results.push({
          format: format.name,
          mime: format.mime,
          ext: format.ext,
          size: converted.length,
          width: verifyMetadata.width,
          height: verifyMetadata.height,
          status: 'success'
        });
      } catch (e) {
        console.log(`✓ ${format.name}: Generated ${converted.length} bytes (metadata not readable)`);
        results.push({
          format: format.name,
          mime: format.mime,
          ext: format.ext,
          size: converted.length,
          status: 'success-no-metadata'
        });
      }
      
    } catch (error) {
      console.error(`✗ ${format.name}: ${error.message}`);
      results.push({
        format: format.name,
        mime: format.mime,
        ext: format.ext,
        status: 'failed',
        error: error.message
      });
    }
  }

  // Generate summary report
  const report = `# Generated Format Test Files

Generated on: ${new Date().toISOString()}
Source: test.png (${metadata.width}x${metadata.height})

## Results

| Format | Extension | MIME Type | Size | Status |
|--------|-----------|-----------|------|--------|
${results.map(r => `| ${r.format} | .${r.ext} | ${r.mime} | ${r.size || 'N/A'} | ${r.status} |`).join('\n')}

## File Locations

All generated files are in: \`tests/fixtures/images/generated/\`

## Notes

- Files marked "success-no-metadata" were generated but metadata couldn't be read back
- Some formats may have specific limitations (e.g., ICO max 256x256, JPEG no alpha)
- HDR and EXR formats store high dynamic range data
- AVIF encoding is lossy only
- WebP encoding is lossless only

## Next Steps

Please manually verify these files:
1. Open them in image viewers
2. Check if they display correctly
3. Verify format-specific features work as expected
`;

  fs.writeFileSync(path.join(outputDir, 'REPORT.md'), report);
  console.log('\n📄 Generated REPORT.md with conversion summary');
  console.log(`\n✅ Conversion complete! Check ${outputDir} for generated files.`);
}

// Run the generator
generateAllFormats().catch(console.error);