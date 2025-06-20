import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create directory
const dir = path.join(__dirname, 'images');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Additional format test images we need
const additionalFormats = [
  // ICO format (Windows icon)
  { url: 'https://placehold.co/32x32/blue/white/png?text=ICO', file: 'icon-32.png', note: 'Will convert to ICO' },
  { url: 'https://placehold.co/256x256/blue/white/png?text=ICO', file: 'icon-256.png', note: 'Max ICO size' },
  
  // TIFF format test source
  { url: 'https://placehold.co/200x200/green/white/png?text=TIFF', file: 'test-tiff-source.png', note: 'For TIFF conversion' },
  
  // BMP format test source  
  { url: 'https://placehold.co/200x200/red/white/png?text=BMP', file: 'test-bmp-source.png', note: 'For BMP conversion' },
  
  // Different aspect ratios for testing
  { url: 'https://placehold.co/400x200/purple/white/png?text=Wide', file: 'wide.png', note: 'Wide aspect ratio' },
  { url: 'https://placehold.co/200x400/orange/white/png?text=Tall', file: 'tall.png', note: 'Tall aspect ratio' },
  
  // Edge cases
  { url: 'https://placehold.co/10x10/black/white/png?text=.', file: 'tiny.png', note: 'Minimum size (10x10)' },
  { url: 'https://placehold.co/1x1/red/red/png', file: 'pixel.png', note: 'Single pixel' },
];

// Download function
async function downloadImage(url, filepath, note) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    console.log(`✓ Downloaded: ${path.basename(filepath)} - ${note}`);
  } catch (error) {
    console.error(`✗ Failed to download ${path.basename(filepath)}: ${error.message}`);
  }
}

// Create test data for formats that can't be downloaded
function createTestFiles() {
  // Create a simple PNM (Portable Anymap) P6 format - PPM binary
  const pnmData = Buffer.concat([
    Buffer.from('P6\n'),           // Magic number for PPM binary
    Buffer.from('2 2\n'),          // Width Height
    Buffer.from('255\n'),          // Max color value
    Buffer.from([                  // RGB pixel data (2x2 pixels)
      255, 0, 0,    // Red pixel
      0, 255, 0,    // Green pixel
      0, 0, 255,    // Blue pixel
      255, 255, 0   // Yellow pixel
    ])
  ]);
  fs.writeFileSync(path.join(dir, 'test.pnm'), pnmData);
  console.log('✓ Created: test.pnm - Portable Pixmap (2x2)');

  // Create TGA test data (very basic uncompressed TGA)
  const tgaHeader = Buffer.from([
    0, 0, 2,       // ID length, Color map type, Image type (uncompressed RGB)
    0, 0, 0, 0, 0, // Color map specification
    0, 0, 0, 0,    // X-origin, Y-origin
    2, 0, 2, 0,    // Width (2), Height (2)
    24, 0          // Pixel depth (24-bit), Image descriptor
  ]);
  const tgaPixels = Buffer.from([
    255, 0, 0,     // Blue, Green, Red (TGA uses BGR order)
    0, 255, 0,     
    0, 0, 255,     
    255, 255, 0    
  ]);
  const tgaData = Buffer.concat([tgaHeader, tgaPixels]);
  fs.writeFileSync(path.join(dir, 'test.tga'), tgaData);
  console.log('✓ Created: test.tga - Targa format (2x2)');

  // Note about other formats
  console.log('\n📝 Notes on other formats:');
  console.log('- QOI: Quite OK Image format - relatively new, need special tools to create');
  console.log('- Farbfeld: Simple format, need special tools to create');
  console.log('- HDR: High Dynamic Range - need special tools to create');
  console.log('- EXR: OpenEXR - need special tools to create');
  console.log('- DDS: DirectDraw Surface - decode only, primarily for game textures');
  console.log('- SVG: Vector format - decode only via resvg');
}

// Main execution
console.log('Downloading additional test images...\n');

for (const image of additionalFormats) {
  const filepath = path.join(dir, image.file);
  await downloadImage(image.url, filepath, image.note);
}

console.log('\nCreating format-specific test files...\n');
createTestFiles();

console.log('\n✅ Additional test files ready!');

// Create format reference
const formatReference = `# Additional Image Format Test Files

## Downloaded from placehold.co
- icon-32.png - For ICO conversion testing (32x32)
- icon-256.png - For ICO conversion testing (256x256 max)
- test-tiff-source.png - Source for TIFF conversion
- test-bmp-source.png - Source for BMP conversion
- wide.png - Wide aspect ratio (400x200)
- tall.png - Tall aspect ratio (200x400)
- tiny.png - Minimum size test (10x10)
- pixel.png - Single pixel test (1x1)

## Created Programmatically
- test.pnm - Portable Pixmap format (2x2 pixels)
- test.tga - Targa format (2x2 pixels)

## Formats Requiring Special Tools
These formats need specialized tools to create proper test files:
- **QOI** (.qoi) - Quite OK Image format
- **Farbfeld** (.ff) - Simple uncompressed format
- **HDR** (.hdr) - Radiance HDR format
- **EXR** (.exr) - OpenEXR format
- **DDS** (.dds) - DirectDraw Surface (decode only)

## Format Support Notes
- **ICO**: Max 256x256, automatically resized when encoding
- **SVG**: Decode only, rasterized via resvg
- **JPEG/QOI/Farbfeld/PNM/TGA**: No alpha channel (converted to RGB8)
- **HDR/EXR**: High dynamic range, special color handling
- **AVIF**: Lossy encoding only (with avif-native feature)
- **WebP**: Lossless encoding only
`;

fs.writeFileSync(path.join(dir, 'FORMATS.md'), formatReference);
console.log('\n📄 Created FORMATS.md with format reference');