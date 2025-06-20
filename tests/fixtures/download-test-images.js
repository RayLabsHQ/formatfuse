import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create directory
const dir = path.join(__dirname, 'images');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Test images to download
const testImages = [
  // Different formats
  { url: 'https://placehold.co/200x200/FF0000/FFFFFF/png?text=PNG+Test', file: 'test.png' },
  { url: 'https://placehold.co/200x200/00FF00/000000/jpeg?text=JPEG+Test', file: 'test.jpg' },
  { url: 'https://placehold.co/200x200/0000FF/FFFFFF/webp?text=WebP+Test', file: 'test.webp' },
  { url: 'https://placehold.co/200x200/FFFF00/000000/gif?text=GIF+Test', file: 'test.gif' },
  { url: 'https://placehold.co/200x200/FF00FF/FFFFFF/avif?text=AVIF+Test', file: 'test.avif' },
  
  // Different sizes
  { url: 'https://placehold.co/100x100/orange/white/png?text=Small', file: 'small.png' },
  { url: 'https://placehold.co/500x300/purple/white/png?text=Medium', file: 'medium.png' },
  { url: 'https://placehold.co/1000x800/teal/white/png?text=Large', file: 'large.png' },
  
  // Transparent background
  { url: 'https://placehold.co/200x200/transparent/000000/png?text=Transparent', file: 'transparent.png' },
  
  // Retina
  { url: 'https://placehold.co/200x200@2x/navy/white/png?text=Retina+2x', file: 'retina-2x.png' },
  { url: 'https://placehold.co/200x200@3x/brown/white/png?text=Retina+3x', file: 'retina-3x.png' },
];

// Download function
async function downloadImage(url, filepath) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    console.log(`✓ Downloaded: ${path.basename(filepath)}`);
  } catch (error) {
    console.error(`✗ Failed to download ${path.basename(filepath)}: ${error.message}`);
  }
}

// Download all test images
console.log('Downloading test images from placehold.co...\n');

for (const image of testImages) {
  const filepath = path.join(dir, image.file);
  await downloadImage(image.url, filepath);
}

console.log('\nTest images download complete!');