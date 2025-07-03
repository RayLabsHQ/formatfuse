import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import Tar from "tar-js";
import pako from "pako";

// @vitest-environment jsdom

describe("TAR Extract", () => {
  let testTar: Uint8Array;
  let testTarGz: Uint8Array;
  let testTarBz2: Uint8Array;

  beforeAll(() => {
    // Load test fixtures
    testTar = new Uint8Array(
      readFileSync(join(__dirname, "../fixtures/archives/test.tar")),
    );
    testTarGz = new Uint8Array(
      readFileSync(join(__dirname, "../fixtures/archives/test.tar.gz")),
    );
    testTarBz2 = new Uint8Array(
      readFileSync(join(__dirname, "../fixtures/archives/test.tar.bz2")),
    );
  });

  describe("Basic TAR extraction", () => {
    it("should extract files from uncompressed TAR", () => {
      const tape = new Tar();
      tape.read(testTar);
      const files = tape.extract();

      expect(files.length).toBeGreaterThan(0);

      const fileNames = files.map((f) => f.name);
      expect(fileNames).toContain("test.txt");
      expect(fileNames).toContain("readme.md");
      expect(fileNames).toContain("data.json");
    });

    it("should extract file contents correctly", () => {
      const tape = new Tar();
      tape.read(testTar);
      const files = tape.extract();

      // Find and check test.txt
      const testFile = files.find((f) => f.name === "test.txt");
      expect(testFile).toBeDefined();
      const textContent = new TextDecoder().decode(testFile!.data);
      expect(textContent).toBe("Hello, World!\n");

      // Find and check data.json
      const jsonFile = files.find((f) => f.name === "data.json");
      expect(jsonFile).toBeDefined();
      const jsonContent = new TextDecoder().decode(jsonFile!.data);
      const jsonData = JSON.parse(jsonContent);
      expect(jsonData).toEqual({ test: true, value: 42 });
    });

    it("should handle nested files in directories", () => {
      const tape = new Tar();
      tape.read(testTar);
      const files = tape.extract();

      const nestedFile = files.find((f) => f.name.includes("nested.txt"));
      expect(nestedFile).toBeDefined();

      const content = new TextDecoder().decode(nestedFile!.data);
      expect(content).toBe("This is a nested file.\n");
    });
  });

  describe("Compressed TAR files", () => {
    it("should extract GZIP compressed TAR", () => {
      // Decompress first
      const decompressed = pako.ungzip(testTarGz);

      // Then extract TAR
      const tape = new Tar();
      tape.read(decompressed);
      const files = tape.extract();

      expect(files.length).toBeGreaterThan(0);

      const fileNames = files.map((f) => f.name);
      expect(fileNames).toContain("test.txt");
      expect(fileNames).toContain("readme.md");
    });

    it("should detect GZIP compression", () => {
      // Check GZIP magic number
      expect(testTarGz[0]).toBe(0x1f);
      expect(testTarGz[1]).toBe(0x8b);
    });

    it("should detect BZIP2 compression", () => {
      // Check BZIP2 magic number
      expect(testTarBz2[0]).toBe(0x42);
      expect(testTarBz2[1]).toBe(0x5a);
    });
  });

  describe("TAR file metadata", () => {
    it("should preserve file permissions", () => {
      const tape = new Tar();
      tape.read(testTar);
      const files = tape.extract();

      files.forEach((file) => {
        expect(file).toHaveProperty("mode");
        expect(typeof file.mode).toBe("number");
      });
    });

    it("should preserve file sizes", () => {
      const tape = new Tar();
      tape.read(testTar);
      const files = tape.extract();

      files.forEach((file) => {
        expect(file).toHaveProperty("size");
        expect(file.size).toBe(file.data.length);
      });
    });

    it("should identify file types", () => {
      const tape = new Tar();
      tape.read(testTar);
      const files = tape.extract();

      files.forEach((file) => {
        expect(file).toHaveProperty("type");
        // Type 0 or '0' is regular file, 5 is directory
        expect(["0", "5", 0, 5]).toContain(file.type);
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle empty TAR files", () => {
      // Create minimal empty TAR (512 bytes of zeros)
      const emptyTar = new Uint8Array(512);
      const tape = new Tar();
      tape.read(emptyTar);
      const files = tape.extract();

      expect(files.length).toBe(0);
    });

    it("should handle corrupted TAR data gracefully", () => {
      const corruptedTar = new Uint8Array([0xff, 0xff, 0xff, 0xff]);

      expect(() => {
        const tape = new Tar();
        tape.read(corruptedTar);
        tape.extract();
      }).not.toThrow(); // tar-js might return empty array instead of throwing
    });

    it("should detect non-TAR files", () => {
      const notATar = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP header

      const tape = new Tar();
      tape.read(notATar);
      const files = tape.extract();

      // Should either return empty array or malformed data
      expect(files.length).toBe(0);
    });
  });

  describe("Performance", () => {
    it("should extract files within reasonable time", () => {
      const start = performance.now();
      const tape = new Tar();
      tape.read(testTar);
      const files = tape.extract();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // Should extract within 1 second
      expect(files.length).toBeGreaterThan(0);
    });
  });
});
