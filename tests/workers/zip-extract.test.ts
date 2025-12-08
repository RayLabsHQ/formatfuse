import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import JSZip from "jszip";

describe("ZIP Extract", () => {
  let testZip: Uint8Array;
  let emptyZip: Uint8Array;
  let largeZip: Uint8Array;

  beforeAll(() => {
    // Load test fixtures
    testZip = new Uint8Array(
      readFileSync(join(__dirname, "../fixtures/archives/test.zip")),
    );
    emptyZip = new Uint8Array(
      readFileSync(join(__dirname, "../fixtures/archives/empty.zip")),
    );
    largeZip = new Uint8Array(
      readFileSync(join(__dirname, "../fixtures/archives/large.zip")),
    );
  });

  describe("Basic ZIP extraction", () => {
    it("should extract files from a standard ZIP", async () => {
      const zip = await JSZip.loadAsync(testZip);
      const files = Object.keys(zip.files);

      expect(files.length).toBeGreaterThan(0);
      expect(files).toContain("test.txt");
      expect(files).toContain("readme.md");
      expect(files).toContain("data.json");
      expect(files.some((f) => f.includes("subfolder"))).toBe(true);
    });

    it("should extract file contents correctly", async () => {
      const zip = await JSZip.loadAsync(testZip);

      // Extract text file
      const textContent = await zip.file("test.txt")?.async("string");
      expect(textContent).toBe("Hello, World!\n");

      // Extract JSON file
      const jsonContent = await zip.file("data.json")?.async("string");
      const jsonData = JSON.parse(jsonContent!);
      expect(jsonData).toEqual({ test: true, value: 42 });

      // Extract markdown file
      const mdContent = await zip.file("readme.md")?.async("string");
      expect(mdContent).toContain("# Test Archive");
    });

    it("should handle nested files", async () => {
      const zip = await JSZip.loadAsync(testZip);

      const nestedFile = Object.keys(zip.files).find((f) =>
        f.includes("nested.txt"),
      );
      expect(nestedFile).toBeDefined();

      const content = await zip.file(nestedFile!)?.async("string");
      expect(content).toBe("This is a nested file.\n");
    });

    it("should extract binary files correctly", async () => {
      const zip = await JSZip.loadAsync(testZip);

      const imageFile = Object.keys(zip.files).find((f) => f.endsWith(".png"));
      if (imageFile) {
        const imageData = await zip.file(imageFile)?.async("uint8array");
        expect(imageData).toBeInstanceOf(Uint8Array);
        expect(imageData!.length).toBeGreaterThan(0);

        // Check PNG magic number
        expect(imageData![0]).toBe(0x89);
        expect(imageData![1]).toBe(0x50);
        expect(imageData![2]).toBe(0x4e);
        expect(imageData![3]).toBe(0x47);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle empty ZIP files", async () => {
      const zip = await JSZip.loadAsync(emptyZip);
      const files = Object.keys(zip.files);

      expect(files.length).toBe(0);
    });

    it("should handle large ZIP files with many entries", async () => {
      const zip = await JSZip.loadAsync(largeZip);
      const files = Object.keys(zip.files);

      expect(files.length).toBeGreaterThan(100);

      // Check that we can still extract files
      const sampleFile = files.find((f) => f.includes("file50.txt"));
      const content = await zip.file(sampleFile!)?.async("string");
      expect(content).toContain("File 50 content");
    });

    it("should handle corrupted ZIP data gracefully", async () => {
      const corruptedZip = new Uint8Array([0x50, 0x4b, 0x00, 0x00, 0xff, 0xff]);

      await expect(JSZip.loadAsync(corruptedZip)).rejects.toThrow();
    });

    it("should detect non-ZIP files", async () => {
      const notAZip = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header

      await expect(JSZip.loadAsync(notAZip)).rejects.toThrow();
    });
  });

  describe("File metadata", () => {
    it("should preserve file dates", async () => {
      const zip = await JSZip.loadAsync(testZip);

      const file = zip.file("test.txt");
      expect(file).toBeDefined();
      expect(file!.date).toBeInstanceOf(Date);
    });

    it("should identify directories correctly", async () => {
      const zip = await JSZip.loadAsync(testZip);

      const dirs = Object.keys(zip.files).filter((name) => zip.files[name].dir);
      const files = Object.keys(zip.files).filter(
        (name) => !zip.files[name].dir,
      );

      expect(dirs.length).toBeGreaterThan(0);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    it("should extract large files within reasonable time", async () => {
      const start = performance.now();
      const zip = await JSZip.loadAsync(largeZip);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // Should load within 5 seconds

      // Extract a few files to ensure it works
      const files = Object.keys(zip.files).slice(0, 10);
      for (const file of files) {
        const content = await zip.file(file)?.async("string");
        expect(content).toBeDefined();
      }
    });
  });
});
