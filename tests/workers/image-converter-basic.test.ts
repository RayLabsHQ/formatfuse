import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import init from '@refilelabs/image';

describe('Image Converter - Basic Loading', () => {
  it('should initialize WASM module', async () => {
    // Initialize WASM module for Node.js environment
    const wasmBuffer = readFileSync('node_modules/@refilelabs/image/refilelabs_image_bg.wasm');
    
    // This should not throw
    await expect(init(wasmBuffer)).resolves.not.toThrow();
  });

  it('should have convertImage function after init', async () => {
    const wasmBuffer = readFileSync('node_modules/@refilelabs/image/refilelabs_image_bg.wasm');
    await init(wasmBuffer);
    
    // Import functions after init
    const { convertImage, loadMetadata, getPixels } = await import('@refilelabs/image');
    
    expect(typeof convertImage).toBe('function');
    expect(typeof loadMetadata).toBe('function');
    expect(typeof getPixels).toBe('function');
  });
});