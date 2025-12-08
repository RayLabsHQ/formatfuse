import { describe, it, expect } from "vitest";
import JSZip from "jszip";

describe("ZIP Create", () => {
  describe("Basic ZIP creation", () => {
    it("should create a ZIP with single file", async () => {
      const zip = new JSZip();
      zip.file("test.txt", "Hello, World!");

      const content = await zip.generateAsync({ type: "uint8array" });

      expect(content).toBeInstanceOf(Uint8Array);
      expect(content.length).toBeGreaterThan(0);

      // Verify ZIP header
      expect(content[0]).toBe(0x50);
      expect(content[1]).toBe(0x4b);

      // Verify we can read it back
      const readZip = await JSZip.loadAsync(content);
      const files = Object.keys(readZip.files);
      expect(files).toContain("test.txt");

      const fileContent = await readZip.file("test.txt")?.async("string");
      expect(fileContent).toBe("Hello, World!");
    });

    it("should create a ZIP with multiple files", async () => {
      const zip = new JSZip();
      zip.file("file1.txt", "Content 1");
      zip.file("file2.txt", "Content 2");
      zip.file("data.json", JSON.stringify({ test: true }));

      const content = await zip.generateAsync({ type: "uint8array" });

      const readZip = await JSZip.loadAsync(content);
      const files = Object.keys(readZip.files);

      expect(files.length).toBe(3);
      expect(files).toContain("file1.txt");
      expect(files).toContain("file2.txt");
      expect(files).toContain("data.json");
    });

    it("should create nested directory structure", async () => {
      const zip = new JSZip();
      zip.file("root.txt", "Root file");
      zip.folder("folder1")?.file("nested1.txt", "Nested 1");
      zip.folder("folder1")?.folder("subfolder")?.file("deep.txt", "Deep file");
      zip.folder("folder2")?.file("nested2.txt", "Nested 2");

      const content = await zip.generateAsync({ type: "uint8array" });

      const readZip = await JSZip.loadAsync(content);
      const files = Object.keys(readZip.files);

      expect(files).toContain("root.txt");
      expect(files).toContain("folder1/nested1.txt");
      expect(files).toContain("folder1/subfolder/deep.txt");
      expect(files).toContain("folder2/nested2.txt");
    });
  });

  describe("Binary file handling", () => {
    it("should add binary files correctly", async () => {
      const zip = new JSZip();

      // Create a simple binary data (PNG header)
      const binaryData = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      zip.file("image.png", binaryData);

      const content = await zip.generateAsync({ type: "uint8array" });

      const readZip = await JSZip.loadAsync(content);
      const imageData = await readZip.file("image.png")?.async("uint8array");

      expect(imageData).toEqual(binaryData);
    });

    it("should handle base64 encoded data", async () => {
      const zip = new JSZip();

      // Small base64 encoded image
      const base64Data =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      zip.file("pixel.png", base64Data, { base64: true });

      const content = await zip.generateAsync({ type: "uint8array" });

      const readZip = await JSZip.loadAsync(content);
      const imageData = await readZip.file("pixel.png")?.async("uint8array");

      expect(imageData).toBeInstanceOf(Uint8Array);
      expect(imageData!.length).toBeGreaterThan(0);

      // Verify PNG header
      expect(imageData![0]).toBe(0x89);
      expect(imageData![1]).toBe(0x50);
    });
  });

  describe("Compression options", () => {
    it("should create uncompressed ZIP", async () => {
      const zip = new JSZip();
      const testContent = "This is a test file that should not be compressed.";
      zip.file("test.txt", testContent);

      const uncompressed = await zip.generateAsync({
        type: "uint8array",
        compression: "STORE",
      });

      const compressed = await zip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
      });

      // With small content, compression might not make much difference
      // Just verify both were created successfully
      expect(uncompressed.length).toBeGreaterThan(0);
      expect(compressed.length).toBeGreaterThan(0);
    });

    it("should apply different compression levels", async () => {
      const zip = new JSZip();
      const largeContent = "Lorem ipsum dolor sit amet, ".repeat(1000);
      zip.file("large.txt", largeContent);

      const level1 = await zip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
        compressionOptions: { level: 1 },
      });

      const level9 = await zip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
      });

      // Higher compression should result in smaller file
      expect(level9.length).toBeLessThan(level1.length);
    });
  });

  describe("File metadata", () => {
    it("should preserve file dates", async () => {
      const zip = new JSZip();
      const customDate = new Date("2023-01-01T12:00:00Z");

      zip.file("test.txt", "Content", { date: customDate });

      const content = await zip.generateAsync({ type: "uint8array" });

      const readZip = await JSZip.loadAsync(content);
      const file = readZip.file("test.txt");

      expect(file?.date).toEqual(customDate);
    });

    it("should add file comments", async () => {
      const zip = new JSZip();
      zip.file("test.txt", "Content", { comment: "This is a test file" });

      const content = await zip.generateAsync({ type: "uint8array" });

      const readZip = await JSZip.loadAsync(content);
      const file = readZip.file("test.txt");

      expect(file?.comment).toBe("This is a test file");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty ZIP creation", async () => {
      const zip = new JSZip();
      const content = await zip.generateAsync({ type: "uint8array" });

      expect(content).toBeInstanceOf(Uint8Array);
      expect(content.length).toBeGreaterThan(0);

      const readZip = await JSZip.loadAsync(content);
      const files = Object.keys(readZip.files);
      expect(files.length).toBe(0);
    });

    it("should handle files with same name", async () => {
      const zip = new JSZip();
      zip.file("test.txt", "First content");
      zip.file("test.txt", "Second content"); // Should overwrite

      const content = await zip.generateAsync({ type: "uint8array" });

      const readZip = await JSZip.loadAsync(content);
      const files = Object.keys(readZip.files);
      expect(files.length).toBe(1);

      const fileContent = await readZip.file("test.txt")?.async("string");
      expect(fileContent).toBe("Second content");
    });

    it("should handle special characters in filenames", async () => {
      const zip = new JSZip();
      zip.file("file with spaces.txt", "Content 1");
      zip.file("文件.txt", "Content 2"); // Unicode filename
      zip.file("special!@#$%.txt", "Content 3");

      const content = await zip.generateAsync({ type: "uint8array" });

      const readZip = await JSZip.loadAsync(content);
      const files = Object.keys(readZip.files);

      expect(files).toContain("file with spaces.txt");
      expect(files).toContain("文件.txt");
      expect(files).toContain("special!@#$%.txt");
    });
  });

  describe("Performance", () => {
    it("should create large ZIPs efficiently", async () => {
      const zip = new JSZip();

      // Add 100 files
      for (let i = 0; i < 100; i++) {
        zip.file(`file${i}.txt`, `This is file ${i} with some content.`);
      }

      const start = performance.now();
      const content = await zip.generateAsync({ type: "uint8array" });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(content.length).toBeGreaterThan(0);

      // Verify all files are present
      const readZip = await JSZip.loadAsync(content);
      const files = Object.keys(readZip.files);
      expect(files.length).toBe(100);
    });
  });
});
