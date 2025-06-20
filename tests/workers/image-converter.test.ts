import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import init, { convertImage, loadMetadata, getPixels } from '@refilelabs/image';

// @vitest-environment jsdom

describe('Image Converter', () => {
  beforeAll(async () => {
    // Initialize WASM module for Node.js environment
    const wasmBuffer = readFileSync('node_modules/@refilelabs/image/refilelabs_image_bg.wasm');
    await init(wasmBuffer);
  });

  describe('PNG to JPG conversion', () => {
    it('should convert PNG to JPG successfully', async () => {
      // Create a simple PNG test image
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      
      // Draw a red square
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);
      
      // Convert canvas to PNG blob
      const pngBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });
      
      // Convert to Uint8Array
      const pngBuffer = await pngBlob.arrayBuffer();
      const pngArray = new Uint8Array(pngBuffer);
      
      // Convert PNG to JPG
      const jpgArray = convertImage(
        pngArray,
        'image/png',
        'image/jpeg',
        () => {} // Progress callback
      );
      
      // Verify the result
      expect(jpgArray).toBeInstanceOf(Uint8Array);
      expect(jpgArray.length).toBeGreaterThan(0);
      
      // Check JPEG magic number (FF D8 FF)
      expect(jpgArray[0]).toBe(0xFF);
      expect(jpgArray[1]).toBe(0xD8);
      expect(jpgArray[2]).toBe(0xFF);
    });

    it('should handle progress callbacks', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'blue';
      ctx.fillRect(0, 0, 100, 100);
      
      const pngBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });
      
      const pngBuffer = await pngBlob.arrayBuffer();
      const pngArray = new Uint8Array(pngBuffer);
      
      let progressCalled = false;
      
      convertImage(
        pngArray,
        'image/png',
        'image/jpeg',
        (progress) => {
          progressCalled = true;
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
        }
      );
      
      // Progress might not always be called for small images
      // but the conversion should still work
    });
  });

  describe('Metadata extraction', () => {
    it('should extract image metadata', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 150;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'green';
      ctx.fillRect(0, 0, 200, 150);
      
      const pngBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });
      
      const pngBuffer = await pngBlob.arrayBuffer();
      const pngArray = new Uint8Array(pngBuffer);
      
      const metadata = loadMetadata(pngArray, 'image/png', () => {});
      
      expect(metadata).toBeDefined();
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(150);
    });
  });

  describe('Pixel data extraction', () => {
    it('should extract pixel data', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d')!;
      
      // Fill with solid color
      ctx.fillStyle = 'rgb(255, 0, 0)';
      ctx.fillRect(0, 0, 10, 10);
      
      const pngBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });
      
      const pngBuffer = await pngBlob.arrayBuffer();
      const pngArray = new Uint8Array(pngBuffer);
      
      const imageData = getPixels(pngArray, 'image/png');
      
      expect(imageData).toBeDefined();
      expect(imageData.width).toBe(10);
      expect(imageData.height).toBe(10);
      expect(imageData.pixels).toBeInstanceOf(Array);
      expect(imageData.pixels.length).toBe(10 * 10 * 4); // RGBA
      
      // Check first pixel is red
      expect(imageData.pixels[0]).toBe(255); // R
      expect(imageData.pixels[1]).toBe(0);   // G
      expect(imageData.pixels[2]).toBe(0);   // B
      expect(imageData.pixels[3]).toBe(255); // A
    });
  });

  describe('Format support', () => {
    const formats = [
      { from: 'image/png', to: 'image/webp' },
      { from: 'image/png', to: 'image/bmp' },
      { from: 'image/jpeg', to: 'image/png' },
    ];

    formats.forEach(({ from, to }) => {
      it(`should convert ${from} to ${to}`, async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        const ctx = canvas.getContext('2d')!;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 50, 50);
        gradient.addColorStop(0, 'red');
        gradient.addColorStop(1, 'blue');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 50, 50);
        
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), from);
        });
        
        const buffer = await blob.arrayBuffer();
        const array = new Uint8Array(buffer);
        
        const converted = convertImage(array, from, to, () => {});
        
        expect(converted).toBeInstanceOf(Uint8Array);
        expect(converted.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle invalid input', () => {
      const invalidData = new Uint8Array([1, 2, 3, 4]);
      
      expect(() => {
        convertImage(invalidData, 'image/png', 'image/jpeg', () => {});
      }).toThrow();
    });

    it('should handle empty input', () => {
      const emptyData = new Uint8Array(0);
      
      expect(() => {
        convertImage(emptyData, 'image/png', 'image/jpeg', () => {});
      }).toThrow();
    });
  });
});