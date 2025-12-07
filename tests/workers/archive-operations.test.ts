import { describe, it, expect, beforeAll } from 'vitest';
import JSZip from 'jszip';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('Archive Operations', () => {
  let testZipBuffer: ArrayBuffer;
  let nestedZipBuffer: ArrayBuffer;
  let sampleFiles: Map<string, ArrayBuffer>;

  beforeAll(async () => {
    // Load test fixtures
    const fixturesPath = join(process.cwd(), 'tests', 'fixtures', 'archives');

    // Helper to convert Buffer to ArrayBuffer safely
    const bufferToArrayBuffer = (buf: Buffer): ArrayBuffer => {
      const result = new ArrayBuffer(buf.byteLength);
      new Uint8Array(result).set(buf);
      return result;
    };

    // Load pre-made ZIP files
    testZipBuffer = await readFile(join(fixturesPath, 'test-archive.zip')).then(bufferToArrayBuffer);
    nestedZipBuffer = await readFile(join(fixturesPath, 'nested-archive.zip')).then(bufferToArrayBuffer);

    // Load sample files for ZIP creation tests
    sampleFiles = new Map();
    const files = [
      'sample-files/text-file.txt',
      'sample-files/data.json',
      'sample-files/styles.css',
      'sample-files/empty-file.txt'
    ];

    for (const file of files) {
      const buffer = await readFile(join(fixturesPath, file)).then(bufferToArrayBuffer);
      sampleFiles.set(file, buffer);
    }
  });

  describe('ZIP Extraction', () => {
    it('should extract files from a simple ZIP archive', async () => {
      const zip = new JSZip();
      await zip.loadAsync(testZipBuffer);
      
      // Check that all expected files are present
      const files = Object.keys(zip.files);
      expect(files).toContain('sample-files/text-file.txt');
      expect(files).toContain('sample-files/data.json');
      expect(files).toContain('sample-files/styles.css');
      expect(files).toContain('sample-files/empty-file.txt');
    });

    it('should correctly extract file contents', async () => {
      const zip = new JSZip();
      await zip.loadAsync(testZipBuffer);
      
      // Extract and verify text file
      const textContent = await zip.files['sample-files/text-file.txt'].async('string');
      expect(textContent).toContain('This is a sample text file');
      expect(textContent).toContain('Lorem ipsum dolor sit amet');
      
      // Extract and verify JSON file
      const jsonContent = await zip.files['sample-files/data.json'].async('string');
      const jsonData = JSON.parse(jsonContent);
      expect(jsonData.name).toBe('Test Data');
      expect(jsonData.version).toBe('1.0.0');
      expect(jsonData.data.items).toHaveLength(3);
      
      // Extract and verify CSS file
      const cssContent = await zip.files['sample-files/styles.css'].async('string');
      expect(cssContent).toContain('font-family');
      expect(cssContent).toContain('@media');
    });

    it('should handle empty files correctly', async () => {
      const zip = new JSZip();
      await zip.loadAsync(testZipBuffer);
      
      const emptyContent = await zip.files['sample-files/empty-file.txt'].async('string');
      expect(emptyContent).toBe('');
    });

    it('should extract nested directory structure', async () => {
      const zip = new JSZip();
      await zip.loadAsync(nestedZipBuffer);
      
      const files = Object.keys(zip.files);
      expect(files).toContain('nested-structure/root-file.md');
      expect(files).toContain('nested-structure/subfolder1/level1.txt');
      expect(files).toContain('nested-structure/subfolder1/subfolder2/level2.txt');
    });

    it('should preserve file metadata', async () => {
      const zip = new JSZip();
      await zip.loadAsync(testZipBuffer);
      
      const fileEntry = zip.files['sample-files/text-file.txt'];
      expect(fileEntry).toBeDefined();
      expect(fileEntry.date).toBeInstanceOf(Date);
    });

    it('should handle binary data extraction', async () => {
      const zip = new JSZip();
      await zip.loadAsync(testZipBuffer);
      
      // Extract as blob and verify it's valid
      const blob = await zip.files['sample-files/data.json'].async('blob');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
      
      // Extract as arraybuffer
      const buffer = await zip.files['sample-files/data.json'].async('arraybuffer');
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it('should correctly identify directories', async () => {
      const zip = new JSZip();
      await zip.loadAsync(nestedZipBuffer);
      
      const directories = Object.entries(zip.files)
        .filter(([_, file]) => file.dir)
        .map(([path]) => path);
      
      expect(directories).toContain('nested-structure/');
      expect(directories).toContain('nested-structure/subfolder1/');
      expect(directories).toContain('nested-structure/subfolder1/subfolder2/');
    });

    it('should handle corrupted ZIP gracefully', async () => {
      const corruptedBuffer = new ArrayBuffer(100);
      const view = new Uint8Array(corruptedBuffer);
      // Fill with random data that's not a valid ZIP
      for (let i = 0; i < view.length; i++) {
        view[i] = Math.floor(Math.random() * 256);
      }
      
      const zip = new JSZip();
      await expect(zip.loadAsync(corruptedBuffer)).rejects.toThrow();
    });

    it('should extract large number of files', async () => {
      // Create a ZIP with many files
      const zip = new JSZip();
      for (let i = 0; i < 100; i++) {
        zip.file(`file${i}.txt`, `Content of file ${i}`);
      }
      
      const generatedZip = await zip.generateAsync({ type: 'arraybuffer' });
      
      // Now extract and verify
      const extractZip = new JSZip();
      await extractZip.loadAsync(generatedZip);
      
      const files = Object.keys(extractZip.files);
      expect(files).toHaveLength(100);
      
      // Verify a few random files
      const content50 = await extractZip.files['file50.txt'].async('string');
      expect(content50).toBe('Content of file 50');
    });
  });

  describe('ZIP Creation', () => {
    it('should create a simple ZIP archive', async () => {
      const zip = new JSZip();
      
      // Add files to ZIP
      zip.file('test.txt', 'Hello World');
      zip.file('data.json', JSON.stringify({ test: true }));
      
      // Generate ZIP
      const content = await zip.generateAsync({ type: 'arraybuffer' });
      expect(content).toBeInstanceOf(ArrayBuffer);
      expect(content.byteLength).toBeGreaterThan(0);
      
      // Verify the created ZIP
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      
      const textContent = await verifyZip.files['test.txt'].async('string');
      expect(textContent).toBe('Hello World');
      
      const jsonContent = await verifyZip.files['data.json'].async('string');
      expect(JSON.parse(jsonContent)).toEqual({ test: true });
    });

    it('should create ZIP with folder structure', async () => {
      const zip = new JSZip();
      
      // Create folder structure
      zip.folder('documents');
      zip.file('documents/readme.txt', 'Documentation');
      zip.file('documents/guide.md', '# User Guide');
      
      zip.folder('images');
      zip.file('images/logo.txt', 'Logo placeholder');
      
      zip.file('root.txt', 'Root file');
      
      const content = await zip.generateAsync({ type: 'arraybuffer' });
      
      // Verify structure
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      
      const files = Object.keys(verifyZip.files);
      expect(files).toContain('documents/');
      expect(files).toContain('documents/readme.txt');
      expect(files).toContain('documents/guide.md');
      expect(files).toContain('images/');
      expect(files).toContain('images/logo.txt');
      expect(files).toContain('root.txt');
    });

    it('should handle binary data in ZIP creation', async () => {
      const zip = new JSZip();
      
      // Create binary data
      const binaryData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      zip.file('binary.dat', binaryData);
      
      const content = await zip.generateAsync({ type: 'arraybuffer' });
      
      // Verify binary data
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      
      const extractedBinary = await verifyZip.files['binary.dat'].async('uint8array');
      expect(extractedBinary).toEqual(binaryData);
    });

    it('should apply compression settings', async () => {
      const textContent = 'This is a test file with some repeated content. '.repeat(100);
      
      // Create ZIP with compression
      const compressedZip = new JSZip();
      compressedZip.file('test.txt', textContent);
      const compressedContent = await compressedZip.generateAsync({ 
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });
      
      // Create ZIP without compression
      const uncompressedZip = new JSZip();
      uncompressedZip.file('test.txt', textContent);
      const uncompressedContent = await uncompressedZip.generateAsync({ 
        type: 'arraybuffer',
        compression: 'STORE'
      });
      
      // Compressed should be smaller
      expect(compressedContent.byteLength).toBeLessThan(uncompressedContent.byteLength);
      
      // Both should extract to the same content
      const verifyCompressed = new JSZip();
      await verifyCompressed.loadAsync(compressedContent);
      const extractedCompressed = await verifyCompressed.files['test.txt'].async('string');
      
      const verifyUncompressed = new JSZip();
      await verifyUncompressed.loadAsync(uncompressedContent);
      const extractedUncompressed = await verifyUncompressed.files['test.txt'].async('string');
      
      expect(extractedCompressed).toBe(extractedUncompressed);
      expect(extractedCompressed).toBe(textContent);
    });

    it('should handle empty files in ZIP creation', async () => {
      const zip = new JSZip();
      zip.file('empty.txt', '');
      zip.file('not-empty.txt', 'content');
      
      const content = await zip.generateAsync({ type: 'arraybuffer' });
      
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      
      const emptyContent = await verifyZip.files['empty.txt'].async('string');
      expect(emptyContent).toBe('');
      
      const notEmptyContent = await verifyZip.files['not-empty.txt'].async('string');
      expect(notEmptyContent).toBe('content');
    });

    it('should preserve file dates', async () => {
      const zip = new JSZip();
      const customDate = new Date('2024-01-01T12:00:00Z');
      
      zip.file('test.txt', 'content', { date: customDate });
      
      const content = await zip.generateAsync({ type: 'arraybuffer' });
      
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      
      const fileEntry = verifyZip.files['test.txt'];
      // JSZip may not preserve exact milliseconds, so check within a reasonable range
      expect(Math.abs(fileEntry.date.getTime() - customDate.getTime())).toBeLessThan(2000);
    });

    it('should handle special characters in filenames', async () => {
      const zip = new JSZip();
      
      const specialNames = [
        'file with spaces.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt',
        'file.multiple.dots.txt',
        '文件.txt', // Unicode characters
        'café.txt' // Accented characters
      ];
      
      specialNames.forEach(name => {
        zip.file(name, `Content of ${name}`);
      });
      
      const content = await zip.generateAsync({ type: 'arraybuffer' });
      
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      
      for (const name of specialNames) {
        expect(verifyZip.files[name]).toBeDefined();
        const fileContent = await verifyZip.files[name].async('string');
        expect(fileContent).toBe(`Content of ${name}`);
      }
    });

    it('should create ZIP from real test fixtures', async () => {
      const zip = new JSZip();
      
      // Add all sample files to ZIP
      for (const [path, buffer] of sampleFiles.entries()) {
        zip.file(path, buffer);
      }
      
      const content = await zip.generateAsync({ type: 'arraybuffer' });
      
      // Verify all files are in the ZIP
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      
      for (const path of sampleFiles.keys()) {
        expect(verifyZip.files[path]).toBeDefined();
      }
      
      // Verify specific content
      const textContent = await verifyZip.files['sample-files/text-file.txt'].async('string');
      expect(textContent).toContain('This is a sample text file');
      
      const jsonContent = await verifyZip.files['sample-files/data.json'].async('string');
      const jsonData = JSON.parse(jsonContent);
      expect(jsonData.name).toBe('Test Data');
    });
  });

  describe('Performance Tests', () => {
    it('should extract files within reasonable time', async () => {
      const startTime = performance.now();
      
      const zip = new JSZip();
      await zip.loadAsync(testZipBuffer);
      
      // Extract all files
      for (const fileName in zip.files) {
        if (!zip.files[fileName].dir) {
          await zip.files[fileName].async('blob');
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 1 second for small archives
      expect(duration).toBeLessThan(1000);
    });

    it('should create ZIP within reasonable time', async () => {
      const startTime = performance.now();
      
      const zip = new JSZip();
      
      // Add 50 files
      for (let i = 0; i < 50; i++) {
        zip.file(`file${i}.txt`, `Content of file ${i}`.repeat(100));
      }
      
      await zip.generateAsync({ type: 'arraybuffer' });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should handle large files efficiently', async () => {
      const zip = new JSZip();
      
      // Create a 5MB file
      const largeContent = new Uint8Array(5 * 1024 * 1024);
      for (let i = 0; i < largeContent.length; i++) {
        largeContent[i] = i % 256;
      }
      
      zip.file('large.bin', largeContent);
      
      const startTime = performance.now();
      const content = await zip.generateAsync({ 
        type: 'arraybuffer',
        compression: 'DEFLATE'
      });
      const endTime = performance.now();
      
      expect(content.byteLength).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify extraction
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      const extracted = await verifyZip.files['large.bin'].async('uint8array');
      expect(extracted.length).toBe(largeContent.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle ZIP with no files', async () => {
      const zip = new JSZip();
      const content = await zip.generateAsync({ type: 'arraybuffer' });
      
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      expect(Object.keys(verifyZip.files)).toHaveLength(0);
    });

    it('should handle duplicate filenames gracefully', async () => {
      const zip = new JSZip();
      zip.file('test.txt', 'First content');
      zip.file('test.txt', 'Second content'); // Overwrites the first
      
      const content = await zip.generateAsync({ type: 'arraybuffer' });
      
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      
      const files = Object.keys(verifyZip.files);
      expect(files.filter(f => f === 'test.txt')).toHaveLength(1);
      
      const fileContent = await verifyZip.files['test.txt'].async('string');
      expect(fileContent).toBe('Second content');
    });

    it('should handle very long file paths', async () => {
      const zip = new JSZip();
      const longPath = 'folder1/folder2/folder3/folder4/folder5/folder6/folder7/folder8/very_long_filename_that_exceeds_normal_limits.txt';
      
      zip.file(longPath, 'Content');
      
      const content = await zip.generateAsync({ type: 'arraybuffer' });
      
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      
      expect(verifyZip.files[longPath]).toBeDefined();
      const fileContent = await verifyZip.files[longPath].async('string');
      expect(fileContent).toBe('Content');
    });

    it('should handle files with no extension', async () => {
      const zip = new JSZip();
      zip.file('README', 'No extension file');
      zip.file('Makefile', 'Another no extension file');
      
      const content = await zip.generateAsync({ type: 'arraybuffer' });
      
      const verifyZip = new JSZip();
      await verifyZip.loadAsync(content);
      
      expect(await verifyZip.files['README'].async('string')).toBe('No extension file');
      expect(await verifyZip.files['Makefile'].async('string')).toBe('Another no extension file');
    });
  });
});