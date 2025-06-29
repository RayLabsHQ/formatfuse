import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { ImageResizer } from '../../src/lib/image-resize';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Image Resizer', () => {
  let resizer: ImageResizer;
  let testImage: Blob;

  beforeAll(async () => {
    // Create a test image blob
    const imagePath = join(__dirname, '../fixtures/images/test.jpg');
    const imageBuffer = readFileSync(imagePath);
    testImage = new Blob([imageBuffer], { type: 'image/jpeg' });
  });

  it('should initialize the resizer', () => {
    expect(() => {
      resizer = new ImageResizer();
    }).not.toThrow();
  });

  it('should resize an image', async () => {
    resizer = new ImageResizer();
    
    const result = await resizer.resize(testImage, {
      width: 800,
      height: 600,
      maintainAspectRatio: true,
      format: 'jpeg',
      quality: 0.8
    });

    expect(result).toBeDefined();
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.width).toBeLessThanOrEqual(800);
    expect(result.height).toBeLessThanOrEqual(600);
    expect(result.format).toBe('jpeg');
  });

  it('should handle batch resize', async () => {
    resizer = new ImageResizer();
    
    const results = await resizer.resizeBatch([testImage, testImage], {
      width: 400,
      height: 300,
      maintainAspectRatio: true
    });

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.width).toBeLessThanOrEqual(400);
      expect(result.height).toBeLessThanOrEqual(300);
    });
  });

  afterEach(() => {
    if (resizer) {
      resizer.destroy();
    }
  });
});