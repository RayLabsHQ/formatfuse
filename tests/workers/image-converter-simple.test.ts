import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import init, { convertImage, loadMetadata, getPixels } from '@refilelabs/image';

const __dirname = join(fileURLToPath(import.meta.url), '../..');

describe('Image Converter - Simple Tests', () => {
  let testPng: Uint8Array;
  let testJpg: Uint8Array;

  beforeAll(async () => {
    // Initialize WASM module for Node.js environment
    const wasmBuffer = readFileSync('node_modules/@refilelabs/image/refilelabs_image_bg.wasm');
    await init(wasmBuffer);

    // Load test images
    testPng = new Uint8Array(readFileSync(join(__dirname, 'fixtures/images/test.png')));
    testJpg = new Uint8Array(readFileSync(join(__dirname, 'fixtures/images/test.jpg')));
  });

  describe('Basic conversions', () => {
    it('should convert PNG to JPEG', async () => {
      const result = convertImage(
        testPng,
        'image/png',
        'image/jpeg',
        () => {} // Progress callback
      );

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
      
      // Check JPEG magic number
      expect(result[0]).toBe(0xFF);
      expect(result[1]).toBe(0xD8);
    });

    it('should convert JPEG to PNG', async () => {
      const result = convertImage(
        testJpg,
        'image/jpeg',
        'image/png',
        () => {}
      );

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
      
      // Check PNG signature
      expect(result[0]).toBe(0x89);
      expect(result[1]).toBe(0x50);
      expect(result[2]).toBe(0x4E);
      expect(result[3]).toBe(0x47);
    });
  });

  describe('Metadata extraction', () => {
    it('should extract PNG metadata', () => {
      const metadata = loadMetadata(testPng, 'image/png', () => {});
      
      expect(metadata).toBeDefined();
      expect(metadata.width).toBe(1);
      expect(metadata.height).toBe(1);
    });

    it('should extract JPEG metadata', () => {
      const metadata = loadMetadata(testJpg, 'image/jpeg', () => {});
      
      expect(metadata).toBeDefined();
      expect(metadata.width).toBeGreaterThan(0);
      expect(metadata.height).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should throw on invalid image data', () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5]);
      
      expect(() => {
        convertImage(invalidData, 'image/png', 'image/jpeg', () => {});
      }).toThrow();
    });

    it('should throw on empty data', () => {
      const emptyData = new Uint8Array(0);
      
      expect(() => {
        convertImage(emptyData, 'image/png', 'image/jpeg', () => {});
      }).toThrow();
    });
  });
});