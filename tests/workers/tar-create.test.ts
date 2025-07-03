import { describe, it, expect } from "vitest";
import Tar from "tar-js";
import pako from "pako";

describe("TAR Create", () => {
  describe("Basic TAR creation", () => {
    it("should create a TAR with single file", () => {
      const tape = new Tar();

      const content = new TextEncoder().encode("Hello, World!");
      tape.append("test.txt", content);

      const tarData = tape.out.slice(0, tape.written);

      expect(tarData).toBeInstanceOf(Uint8Array);
      expect(tarData.length).toBeGreaterThan(0);

      // TAR files are padded to 512-byte blocks
      expect(tarData.length % 512).toBe(0);
    });

    it("should create a TAR with multiple files", () => {
      const tape = new Tar();

      tape.append("file1.txt", new TextEncoder().encode("Content 1"));
      tape.append("file2.txt", new TextEncoder().encode("Content 2"));
      tape.append("data.json", new TextEncoder().encode('{"test": true}'));

      const tarData = tape.out.slice(0, tape.written);

      expect(tarData).toBeInstanceOf(Uint8Array);
      expect(tarData.length).toBeGreaterThan(0);
    });

    it("should create nested directory structure", () => {
      const tape = new Tar();

      tape.append("folder/file1.txt", new TextEncoder().encode("File in folder"));
      tape.append("folder/subfolder/file2.txt", new TextEncoder().encode("Nested file"));
      tape.append("root.txt", new TextEncoder().encode("Root file"));

      const tarData = tape.out.slice(0, tape.written);

      expect(tarData).toBeInstanceOf(Uint8Array);
      expect(tarData.length).toBeGreaterThan(0);
    });
  });

  describe("Compressed TAR creation", () => {
    it("should create GZIP compressed TAR", () => {
      const tape = new Tar();

      tape.append("test.txt", new TextEncoder().encode("Hello, compressed world!"));
      tape.append("data.json", new TextEncoder().encode('{"compressed": true}'));

      const tarData = tape.out.slice(0, tape.written);
      const compressed = pako.gzip(tarData);

      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed.length).toBeLessThan(tarData.length);

      // Verify GZIP magic number
      expect(compressed[0]).toBe(0x1f);
      expect(compressed[1]).toBe(0x8b);
    });
  });

  describe("TAR file metadata", () => {
    it("should set file permissions", () => {
      const tape = new Tar();

      const content = new TextEncoder().encode("Test content");
      tape.append("test.sh", content, {
        mode: parseInt("755", 8),
      });

      const tarData = tape.out.slice(0, tape.written);
      expect(tarData.length).toBeGreaterThan(0);
    });

    it("should handle binary files", () => {
      const tape = new Tar();

      // Create binary data
      const binaryData = new Uint8Array([0xff, 0xfe, 0x00, 0x01, 0x02, 0xff]);
      tape.append("binary.dat", binaryData);

      const tarData = tape.out.slice(0, tape.written);
      expect(tarData.length).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty files", () => {
      const tape = new Tar();

      tape.append("empty.txt", new Uint8Array(0));

      const tarData = tape.out.slice(0, tape.written);
      expect(tarData.length).toBeGreaterThan(0);
    });

    it("should handle long filenames", () => {
      const tape = new Tar();

      const longName = "very_long_filename_that_exceeds_normal_limits_" + "x".repeat(50) + ".txt";
      tape.append(longName, new TextEncoder().encode("Content"));

      const tarData = tape.out.slice(0, tape.written);
      expect(tarData.length).toBeGreaterThan(0);
    });

    it("should throw on invalid input type", () => {
      const tape = new Tar();

      expect(() => {
        // @ts-expect-error Testing invalid input
        tape.append("test.txt", { invalid: "data" });
      }).toThrow("Invalid input type");
    });
  });

  describe("Performance", () => {
    it("should handle large file contents", () => {
      const tape = new Tar();

      // Create 1MB of data
      const largeData = new Uint8Array(1024 * 1024);
      largeData.fill(65); // Fill with 'A'

      tape.append("large.txt", largeData);

      const tarData = tape.out.slice(0, tape.written);
      expect(tarData.length).toBeGreaterThan(largeData.length);
    });
  });
});