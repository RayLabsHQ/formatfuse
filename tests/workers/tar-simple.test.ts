import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import Tar from "tar-js";
import pako from "pako";

describe("TAR Operations", () => {
  let testTar: Uint8Array;
  let testTarGz: Uint8Array;

  beforeAll(() => {
    // Load test fixtures
    testTar = new Uint8Array(
      readFileSync(join(__dirname, "../fixtures/archives/test.tar")),
    );
    testTarGz = new Uint8Array(
      readFileSync(join(__dirname, "../fixtures/archives/test.tar.gz")),
    );
  });

  describe("TAR Creation", () => {
    it("should create a TAR file", () => {
      const tar = new Tar();

      // Add files
      tar.append("test.txt", new TextEncoder().encode("Hello, World!"));
      tar.append("data.json", new TextEncoder().encode('{"test": true}'));

      // Get output - need to slice to actual written length
      const output = tar.out.slice(0, tar.written);

      expect(output).toBeInstanceOf(Uint8Array);
      expect(output.length).toBeGreaterThan(0);
      expect(output.length % 512).toBe(0); // TAR files are padded to 512 bytes
    });

    it("should create compressed TAR.GZ", () => {
      const tar = new Tar();

      tar.append("test.txt", new TextEncoder().encode("Hello, World!"));

      const tarData = tar.out.slice(0, tar.written);
      const compressed = pako.gzip(tarData);

      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed[0]).toBe(0x1f); // GZIP header
      expect(compressed[1]).toBe(0x8b);
    });

    it("should handle empty TAR", () => {
      const tar = new Tar();
      // For an empty TAR, written is 0, but we need to check the buffer
      const output = tar.out;

      expect(output).toBeInstanceOf(Uint8Array);
      // The buffer is pre-allocated
      expect(output.length).toBeGreaterThanOrEqual(1024);
    });

    it("should add multiple files with paths", () => {
      const tar = new Tar();

      tar.append("file1.txt", new TextEncoder().encode("Content 1"));
      tar.append("folder/file2.txt", new TextEncoder().encode("Content 2"));
      tar.append(
        "folder/subfolder/file3.txt",
        new TextEncoder().encode("Content 3"),
      );

      const output = tar.out.slice(0, tar.written);
      expect(output.length).toBeGreaterThan(1024);
    });

    it("should handle binary files", () => {
      const tar = new Tar();

      const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
      tar.append("image.png", binaryData);

      const output = tar.out.slice(0, tar.written);
      expect(output).toBeInstanceOf(Uint8Array);
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe("TAR Structure", () => {
    it("should verify TAR has correct structure", () => {
      // TAR files should have specific structure
      expect(testTar.length % 512).toBe(0);

      // Check for file header (filename should be readable)
      const headerText = new TextDecoder().decode(testTar.slice(0, 100));
      expect(headerText).toContain(".txt");
    });

    it("should detect GZIP compression", () => {
      expect(testTarGz[0]).toBe(0x1f);
      expect(testTarGz[1]).toBe(0x8b);

      // Decompress and check it's a valid TAR
      const decompressed = pako.ungzip(testTarGz);
      expect(decompressed.length % 512).toBe(0);
    });
  });

  describe("Performance", () => {
    it("should create TAR files efficiently", () => {
      const tar = new Tar();

      const start = performance.now();

      // Add 100 files
      for (let i = 0; i < 100; i++) {
        tar.append(`file${i}.txt`, new TextEncoder().encode(`Content ${i}`));
      }

      const output = tar.out.slice(0, tar.written);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(output.length).toBeGreaterThan(0);
    });
  });
});