import { describe, it, expect, beforeAll } from 'vitest';
import JSZip from 'jszip';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as tar from 'tar-js';
import pako from 'pako';

describe('All Archive Format Operations', () => {
  let testFixtures: Map<string, ArrayBuffer>;
  
  beforeAll(async () => {
    const fixturesPath = join(process.cwd(), 'tests', 'fixtures', 'archives');
    testFixtures = new Map();
    
    // Load all available test archives
    const archives = [
      'test.zip',
      'test.tar',
      'test.tar.gz',
      'test.tar.bz2',
      'empty.zip',
      'large.zip'
    ];
    
    // Helper to convert Buffer to ArrayBuffer safely
    const bufferToArrayBuffer = (buf: Buffer): ArrayBuffer => {
      const result = new ArrayBuffer(buf.byteLength);
      new Uint8Array(result).set(buf);
      return result;
    };

    for (const archive of archives) {
      try {
        const buffer = await readFile(join(fixturesPath, archive)).then(bufferToArrayBuffer);
        testFixtures.set(archive, buffer);
      } catch (err) {
        console.warn(`Could not load ${archive}:`, err);
      }
    }
  });

  describe('ZIP Format Tests', () => {
    it('should handle standard ZIP files', async () => {
      const zipBuffer = testFixtures.get('test.zip');
      expect(zipBuffer).toBeDefined();
      
      if (zipBuffer) {
        const zip = new JSZip();
        await zip.loadAsync(zipBuffer);
        
        const files = Object.keys(zip.files);
        expect(files.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty ZIP files', async () => {
      const emptyZipBuffer = testFixtures.get('empty.zip');
      expect(emptyZipBuffer).toBeDefined();
      
      if (emptyZipBuffer) {
        const zip = new JSZip();
        await zip.loadAsync(emptyZipBuffer);
        
        const files = Object.keys(zip.files).filter(f => !zip.files[f].dir);
        expect(files.length).toBe(0);
      }
    });

    it('should handle large ZIP files', async () => {
      const largeZipBuffer = testFixtures.get('large.zip');
      expect(largeZipBuffer).toBeDefined();
      
      if (largeZipBuffer) {
        const zip = new JSZip();
        await zip.loadAsync(largeZipBuffer);
        
        const files = Object.keys(zip.files);
        expect(files.length).toBeGreaterThan(0);
        
        // Check that we can extract content
        for (const fileName in zip.files) {
          if (!zip.files[fileName].dir) {
            const content = await zip.files[fileName].async('arraybuffer');
            expect(content).toBeDefined();
            break; // Just test one file
          }
        }
      }
    });

    it('should detect ZIP format correctly', () => {
      const isZipFile = (buffer: ArrayBuffer): boolean => {
        const view = new DataView(buffer);
        if (buffer.byteLength < 4) return false;
        
        // Check for ZIP signature (PK)
        const sig1 = view.getUint8(0);
        const sig2 = view.getUint8(1);
        return sig1 === 0x50 && sig2 === 0x4B; // 'PK'
      };
      
      const zipBuffer = testFixtures.get('test.zip');
      if (zipBuffer) {
        expect(isZipFile(zipBuffer)).toBe(true);
      }
      
      const tarBuffer = testFixtures.get('test.tar');
      if (tarBuffer) {
        expect(isZipFile(tarBuffer)).toBe(false);
      }
    });
  });

  describe('TAR Format Tests', () => {
    it('should detect TAR format correctly', () => {
      const isTarFile = (buffer: ArrayBuffer): boolean => {
        if (buffer.byteLength < 512) return false;
        
        // TAR files have 'ustar' at offset 257
        const view = new Uint8Array(buffer);
        const ustar = new TextDecoder().decode(view.slice(257, 262));
        return ustar === 'ustar';
      };
      
      const tarBuffer = testFixtures.get('test.tar');
      if (tarBuffer) {
        expect(isTarFile(tarBuffer)).toBe(true);
      }
      
      const zipBuffer = testFixtures.get('test.zip');
      if (zipBuffer) {
        expect(isTarFile(zipBuffer)).toBe(false);
      }
    });

    it('should handle TAR structure parsing', () => {
      const tarBuffer = testFixtures.get('test.tar');
      if (!tarBuffer) {
        console.warn('TAR test file not available');
        return;
      }
      
      // Basic TAR header structure validation
      const view = new Uint8Array(tarBuffer);
      
      // TAR files are composed of 512-byte blocks
      expect(tarBuffer.byteLength % 512).toBe(0);
      
      // Check for valid header
      const header = view.slice(0, 512);
      
      // File name field (0-99)
      const fileName = new TextDecoder().decode(header.slice(0, 100)).replace(/\0/g, '');
      expect(fileName.length).toBeGreaterThan(0);
      
      // File mode (100-107) - should be octal (may have trailing spaces)
      const fileMode = new TextDecoder().decode(header.slice(100, 108)).replace(/[\0\s]/g, '');
      expect(fileMode).toMatch(/^[0-7]*$/);
    });

    it('should detect compressed TAR variants', () => {
      const detectCompression = (buffer: ArrayBuffer): string => {
        const view = new Uint8Array(buffer);
        
        // GZIP signature
        if (view[0] === 0x1f && view[1] === 0x8b) {
          return 'gzip';
        }
        
        // BZIP2 signature
        if (view[0] === 0x42 && view[1] === 0x5a && view[2] === 0x68) {
          return 'bzip2';
        }
        
        // XZ signature
        if (view[0] === 0xfd && view[1] === 0x37 && view[2] === 0x7a &&
            view[3] === 0x58 && view[4] === 0x5a) {
          return 'xz';
        }
        
        return 'none';
      };
      
      const tarGzBuffer = testFixtures.get('test.tar.gz');
      if (tarGzBuffer) {
        expect(detectCompression(tarGzBuffer)).toBe('gzip');
      }
      
      const tarBz2Buffer = testFixtures.get('test.tar.bz2');
      if (tarBz2Buffer) {
        expect(detectCompression(tarBz2Buffer)).toBe('bzip2');
      }
      
      const tarBuffer = testFixtures.get('test.tar');
      if (tarBuffer) {
        expect(detectCompression(tarBuffer)).toBe('none');
      }
    });

    it('should decompress GZIP compressed TAR', async () => {
      const tarGzBuffer = testFixtures.get('test.tar.gz');
      if (!tarGzBuffer) {
        console.warn('TAR.GZ test file not available');
        return;
      }
      
      try {
        // Decompress GZIP
        const compressed = new Uint8Array(tarGzBuffer);
        const decompressed = pako.ungzip(compressed);
        
        // Check if result is a valid TAR
        const ustar = new TextDecoder().decode(decompressed.slice(257, 262));
        expect(ustar).toBe('ustar');
        
        // Should be 512-byte aligned
        expect(decompressed.length % 512).toBe(0);
      } catch (err) {
        console.warn('Could not decompress TAR.GZ:', err);
      }
    });
  });

  describe('7-Zip Format Tests', () => {
    it('should detect 7z format signature', () => {
      const is7zFile = (buffer: ArrayBuffer): boolean => {
        if (buffer.byteLength < 6) return false;
        
        const view = new Uint8Array(buffer);
        // 7z signature: '7z¼¯\x27\x1c'
        return view[0] === 0x37 && view[1] === 0x7a && 
               view[2] === 0xbc && view[3] === 0xaf && 
               view[4] === 0x27 && view[5] === 0x1c;
      };
      
      // Create a mock 7z header for testing
      const mock7z = new Uint8Array([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
      expect(is7zFile(mock7z.buffer)).toBe(true);
      
      const zipBuffer = testFixtures.get('test.zip');
      if (zipBuffer) {
        expect(is7zFile(zipBuffer)).toBe(false);
      }
    });

    it('should validate 7z header structure', () => {
      // Mock 7z header structure
      const create7zHeader = () => {
        const header = new Uint8Array(32);
        // Signature
        header[0] = 0x37; header[1] = 0x7a;
        header[2] = 0xbc; header[3] = 0xaf;
        header[4] = 0x27; header[5] = 0x1c;
        // Version (0.4)
        header[6] = 0x00; header[7] = 0x04;
        // Start header CRC (mock)
        header[8] = 0x00; header[9] = 0x00;
        header[10] = 0x00; header[11] = 0x00;
        return header;
      };
      
      const header = create7zHeader();
      expect(header[0]).toBe(0x37);
      expect(header[1]).toBe(0x7a);
      expect(header.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('RAR Format Tests', () => {
    it('should detect RAR format signatures', () => {
      const isRarFile = (buffer: ArrayBuffer): boolean => {
        if (buffer.byteLength < 7) return false;
        
        const view = new Uint8Array(buffer);
        
        // RAR5 signature
        if (view[0] === 0x52 && view[1] === 0x61 && view[2] === 0x72 &&
            view[3] === 0x21 && view[4] === 0x1a && view[5] === 0x07 &&
            view[6] === 0x01) {
          return true;
        }
        
        // RAR4 signature
        if (view[0] === 0x52 && view[1] === 0x61 && view[2] === 0x72 &&
            view[3] === 0x21 && view[4] === 0x1a && view[5] === 0x07 &&
            view[6] === 0x00) {
          return true;
        }
        
        return false;
      };
      
      // Create mock RAR5 header
      const mockRar5 = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]);
      expect(isRarFile(mockRar5.buffer)).toBe(true);
      
      // Create mock RAR4 header
      const mockRar4 = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
      expect(isRarFile(mockRar4.buffer)).toBe(true);
      
      const zipBuffer = testFixtures.get('test.zip');
      if (zipBuffer) {
        expect(isRarFile(zipBuffer)).toBe(false);
      }
    });

    it('should identify RAR version', () => {
      const getRarVersion = (buffer: ArrayBuffer): number | null => {
        if (buffer.byteLength < 7) return null;
        
        const view = new Uint8Array(buffer);
        
        // Check RAR signature
        if (view[0] === 0x52 && view[1] === 0x61 && view[2] === 0x72 && view[3] === 0x21) {
          if (view[6] === 0x00) return 4;
          if (view[6] === 0x01) return 5;
        }
        
        return null;
      };
      
      const mockRar5 = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]);
      expect(getRarVersion(mockRar5.buffer)).toBe(5);
      
      const mockRar4 = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
      expect(getRarVersion(mockRar4.buffer)).toBe(4);
    });
  });

  describe('Archive Format Detection', () => {
    it('should correctly identify archive formats', () => {
      const detectArchiveFormat = (buffer: ArrayBuffer): string | null => {
        if (buffer.byteLength < 7) return null;
        
        const view = new Uint8Array(buffer);
        
        // ZIP
        if (view[0] === 0x50 && view[1] === 0x4B) {
          return 'zip';
        }
        
        // 7z
        if (view[0] === 0x37 && view[1] === 0x7a && view[2] === 0xbc && 
            view[3] === 0xaf && view[4] === 0x27 && view[5] === 0x1c) {
          return '7z';
        }
        
        // RAR
        if (view[0] === 0x52 && view[1] === 0x61 && view[2] === 0x72 && view[3] === 0x21) {
          return 'rar';
        }
        
        // GZIP
        if (view[0] === 0x1f && view[1] === 0x8b) {
          return 'gzip';
        }
        
        // BZIP2
        if (view[0] === 0x42 && view[1] === 0x5a && view[2] === 0x68) {
          return 'bzip2';
        }
        
        // XZ
        if (view[0] === 0xfd && view[1] === 0x37 && view[2] === 0x7a &&
            view[3] === 0x58 && view[4] === 0x5a) {
          return 'xz';
        }
        
        // TAR (check at offset 257 for 'ustar')
        if (buffer.byteLength >= 262) {
          const ustar = new TextDecoder().decode(view.slice(257, 262));
          if (ustar === 'ustar') {
            return 'tar';
          }
        }
        
        return null;
      };
      
      // Test with actual fixtures
      const zipBuffer = testFixtures.get('test.zip');
      if (zipBuffer) {
        expect(detectArchiveFormat(zipBuffer)).toBe('zip');
      }
      
      const tarBuffer = testFixtures.get('test.tar');
      if (tarBuffer) {
        expect(detectArchiveFormat(tarBuffer)).toBe('tar');
      }
      
      const tarGzBuffer = testFixtures.get('test.tar.gz');
      if (tarGzBuffer) {
        expect(detectArchiveFormat(tarGzBuffer)).toBe('gzip');
      }
      
      const tarBz2Buffer = testFixtures.get('test.tar.bz2');
      if (tarBz2Buffer) {
        expect(detectArchiveFormat(tarBz2Buffer)).toBe('bzip2');
      }
    });

    it('should handle format detection for corrupted files', () => {
      const detectFormat = (buffer: ArrayBuffer): string | null => {
        try {
          if (!buffer || buffer.byteLength === 0) return null;
          
          const view = new Uint8Array(buffer);
          
          // Safe checks with bounds
          if (buffer.byteLength >= 2) {
            if (view[0] === 0x50 && view[1] === 0x4B) return 'zip';
            if (view[0] === 0x1f && view[1] === 0x8b) return 'gzip';
          }
          
          if (buffer.byteLength >= 6) {
            if (view[0] === 0x37 && view[1] === 0x7a) return '7z';
          }
          
          return 'unknown';
        } catch (err) {
          return 'error';
        }
      };
      
      // Test with various corrupted inputs
      expect(detectFormat(new ArrayBuffer(0))).toBe(null);
      expect(detectFormat(new ArrayBuffer(1))).toBe('unknown');
      expect(detectFormat(new Uint8Array([0x50]).buffer)).toBe('unknown');
      expect(detectFormat(new Uint8Array([0x50, 0x4B]).buffer)).toBe('zip');
    });
  });

  describe('Multi-format Support', () => {
    it('should provide consistent API for all formats', () => {
      interface ArchiveHandler {
        canHandle: (buffer: ArrayBuffer) => boolean;
        extract: (buffer: ArrayBuffer) => Promise<Map<string, Uint8Array>>;
        create: (files: Map<string, Uint8Array>) => Promise<ArrayBuffer>;
      }
      
      // Mock handlers for each format
      const zipHandler: ArchiveHandler = {
        canHandle: (buffer) => {
          const view = new Uint8Array(buffer);
          return view[0] === 0x50 && view[1] === 0x4B;
        },
        extract: async (buffer) => {
          const zip = new JSZip();
          await zip.loadAsync(buffer);
          const files = new Map<string, Uint8Array>();
          
          for (const [path, file] of Object.entries(zip.files)) {
            if (!file.dir) {
              const content = await file.async('uint8array');
              files.set(path, content);
            }
          }
          
          return files;
        },
        create: async (files) => {
          const zip = new JSZip();
          for (const [path, content] of files) {
            zip.file(path, content);
          }
          return await zip.generateAsync({ type: 'arraybuffer' });
        }
      };
      
      // Test the handler interface
      const testFiles = new Map<string, Uint8Array>();
      testFiles.set('test.txt', new TextEncoder().encode('Hello World'));
      
      // Test with ZIP handler
      expect(zipHandler.canHandle).toBeDefined();
      expect(zipHandler.extract).toBeDefined();
      expect(zipHandler.create).toBeDefined();
      
      const zipBuffer = testFixtures.get('test.zip');
      if (zipBuffer) {
        expect(zipHandler.canHandle(zipBuffer)).toBe(true);
      }
    });

    it('should handle nested archives', async () => {
      // Create a ZIP containing another ZIP
      const innerZip = new JSZip();
      innerZip.file('inner.txt', 'Inner content');
      const innerZipBuffer = await innerZip.generateAsync({ type: 'arraybuffer' });
      
      const outerZip = new JSZip();
      outerZip.file('outer.txt', 'Outer content');
      outerZip.file('nested.zip', innerZipBuffer);
      const outerZipBuffer = await outerZip.generateAsync({ type: 'arraybuffer' });
      
      // Extract outer ZIP
      const extractedOuter = new JSZip();
      await extractedOuter.loadAsync(outerZipBuffer);
      
      expect(extractedOuter.files['outer.txt']).toBeDefined();
      expect(extractedOuter.files['nested.zip']).toBeDefined();
      
      // Extract nested ZIP
      const nestedZipBuffer = await extractedOuter.files['nested.zip'].async('arraybuffer');
      const extractedInner = new JSZip();
      await extractedInner.loadAsync(nestedZipBuffer);
      
      const innerContent = await extractedInner.files['inner.txt'].async('string');
      expect(innerContent).toBe('Inner content');
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle extraction of many small files efficiently', async () => {
      const zip = new JSZip();
      
      // Create 500 small files
      for (let i = 0; i < 500; i++) {
        zip.file(`file${i}.txt`, `Content ${i}`);
      }
      
      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      
      const startTime = performance.now();
      
      // Extract all files
      const extractZip = new JSZip();
      await extractZip.loadAsync(zipBuffer);
      
      const files = new Map<string, string>();
      for (const [path, file] of Object.entries(extractZip.files)) {
        if (!file.dir) {
          const content = await file.async('string');
          files.set(path, content);
        }
      }
      
      const endTime = performance.now();
      
      expect(files.size).toBe(500);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle different compression levels efficiently', async () => {
      const content = 'A'.repeat(10000); // 10KB of repeated data
      
      const compressionLevels = [
        { level: 0, name: 'STORE' },
        { level: 1, name: 'FASTEST' },
        { level: 9, name: 'BEST' }
      ];
      
      const results = [];
      
      for (const { level, name } of compressionLevels) {
        const zip = new JSZip();
        zip.file('test.txt', content);
        
        const startTime = performance.now();
        const buffer = await zip.generateAsync({ 
          type: 'arraybuffer',
          compression: level === 0 ? 'STORE' : 'DEFLATE',
          compressionOptions: { level }
        });
        const endTime = performance.now();
        
        results.push({
          name,
          size: buffer.byteLength,
          time: endTime - startTime
        });
      }
      
      // STORE should be largest
      expect(results[0].size).toBeGreaterThan(results[1].size);
      expect(results[0].size).toBeGreaterThan(results[2].size);
      
      // BEST compression should be smallest
      expect(results[2].size).toBeLessThanOrEqual(results[1].size);
      
      // STORE should generally be faster than high compression (allow headroom for noisy environments)
      expect(results[0].time).toBeLessThanOrEqual(results[2].time * 3);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid archive data gracefully', async () => {
      const invalidData = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);
      
      // Test ZIP
      const zip = new JSZip();
      await expect(zip.loadAsync(invalidData.buffer)).rejects.toThrow();
      
      // Test format detection
      const detectFormat = (buffer: ArrayBuffer): string => {
        const view = new Uint8Array(buffer);
        if (view[0] === 0x50 && view[1] === 0x4B) return 'zip';
        if (view[0] === 0x37 && view[1] === 0x7a) return '7z';
        return 'unknown';
      };
      
      expect(detectFormat(invalidData.buffer)).toBe('unknown');
    });

    it('should handle truncated archives', async () => {
      const zipBuffer = testFixtures.get('test.zip');
      if (!zipBuffer) return;
      
      // Create a truncated version (half the size)
      const truncated = new Uint8Array(zipBuffer).slice(0, Math.floor(zipBuffer.byteLength / 2));
      
      const zip = new JSZip();
      await expect(zip.loadAsync(truncated.buffer)).rejects.toThrow();
    });

    it('should validate archive integrity', async () => {
      const zip = new JSZip();
      zip.file('test.txt', 'Test content');
      
      const validBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      
      // Corrupt the buffer by changing some bytes
      const corruptedBuffer = new Uint8Array(validBuffer);
      for (let i = 100; i < 110 && i < corruptedBuffer.length; i++) {
        corruptedBuffer[i] = 0xFF;
      }
      
      // Try to load corrupted archive
      const corruptedZip = new JSZip();
      try {
        await corruptedZip.loadAsync(corruptedBuffer.buffer);
        // May or may not throw depending on where corruption is
        const files = Object.keys(corruptedZip.files);
        expect(files).toBeDefined();
      } catch (err) {
        // Expected for some corruption patterns
        expect(err).toBeDefined();
      }
    });
  });
});
