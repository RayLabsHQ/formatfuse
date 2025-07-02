import { describe, it, expect } from "vitest";
import Tar from "tar-js";
import pako from "pako";

// @vitest-environment jsdom

describe("TAR Create", () => {
  describe("Basic TAR creation", () => {
    it("should create a TAR with single file", () => {
      const tape = new Tar();
      
      const content = new TextEncoder().encode("Hello, World!");
      tape.append("test.txt", content);
      
      const tarData = tape.save();
      
      expect(tarData).toBeInstanceOf(Uint8Array);
      expect(tarData.length).toBeGreaterThan(0);
      
      // TAR files are padded to 512-byte blocks
      expect(tarData.length % 512).toBe(0);
      
      // Verify we can read it back
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      
      expect(files.length).toBe(1);
      expect(files[0].name).toBe("test.txt");
      expect(new TextDecoder().decode(files[0].data)).toBe("Hello, World!");
    });

    it("should create a TAR with multiple files", () => {
      const tape = new Tar();
      
      tape.append("file1.txt", new TextEncoder().encode("Content 1"));
      tape.append("file2.txt", new TextEncoder().encode("Content 2"));
      tape.append("data.json", new TextEncoder().encode('{"test": true}'));
      
      const tarData = tape.save();
      
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      
      expect(files.length).toBe(3);
      expect(files.map(f => f.name)).toContain("file1.txt");
      expect(files.map(f => f.name)).toContain("file2.txt");
      expect(files.map(f => f.name)).toContain("data.json");
    });

    it("should create nested directory structure", () => {
      const tape = new Tar();
      
      tape.append("root.txt", new TextEncoder().encode("Root file"));
      tape.append("folder1/nested1.txt", new TextEncoder().encode("Nested 1"));
      tape.append("folder1/subfolder/deep.txt", new TextEncoder().encode("Deep file"));
      tape.append("folder2/nested2.txt", new TextEncoder().encode("Nested 2"));
      
      const tarData = tape.save();
      
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      
      const fileNames = files.map(f => f.name);
      expect(fileNames).toContain("root.txt");
      expect(fileNames).toContain("folder1/nested1.txt");
      expect(fileNames).toContain("folder1/subfolder/deep.txt");
      expect(fileNames).toContain("folder2/nested2.txt");
    });
  });

  describe("Binary file handling", () => {
    it("should add binary files correctly", () => {
      const tape = new Tar();
      
      // Create a simple binary data (PNG header)
      const binaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      tape.append("image.png", binaryData);
      
      const tarData = tape.save();
      
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      
      expect(files.length).toBe(1);
      expect(files[0].name).toBe("image.png");
      expect(files[0].data).toEqual(binaryData);
    });

    it("should handle large binary files", () => {
      const tape = new Tar();
      
      // Create a larger binary file (1KB)
      const largeData = new Uint8Array(1024);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }
      
      tape.append("large.bin", largeData);
      
      const tarData = tape.save();
      
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      
      expect(files[0].data).toEqual(largeData);
    });
  });

  describe("TAR compression", () => {
    it("should create GZIP compressed TAR", () => {
      const tape = new Tar();
      
      // Add some compressible content
      const content = "This is a test file with repeated content. ".repeat(100);
      tape.append("test.txt", new TextEncoder().encode(content));
      
      const tarData = tape.save();
      const compressedData = pako.gzip(tarData);
      
      expect(compressedData).toBeInstanceOf(Uint8Array);
      expect(compressedData.length).toBeLessThan(tarData.length);
      
      // Verify GZIP header
      expect(compressedData[0]).toBe(0x1f);
      expect(compressedData[1]).toBe(0x8b);
      
      // Verify we can decompress and read
      const decompressed = pako.ungzip(compressedData);
      const readTape = new tar.Tape(decompressed);
      const files = readTape.extract();
      
      expect(files.length).toBe(1);
      expect(new TextDecoder().decode(files[0].data)).toBe(content);
    });

    it("should handle different compression levels", () => {
      const tape = new Tar();
      
      const content = "Lorem ipsum dolor sit amet, ".repeat(500);
      tape.append("large.txt", new TextEncoder().encode(content));
      
      const tarData = tape.save();
      
      const level1 = pako.gzip(tarData, { level: 1 });
      const level9 = pako.gzip(tarData, { level: 9 });
      
      // Higher compression should result in smaller file
      expect(level9.length).toBeLessThan(level1.length);
    });
  });

  describe("File metadata", () => {
    it("should set file permissions", () => {
      const tape = new Tar();
      
      tape.append("executable.sh", new TextEncoder().encode("#!/bin/bash\necho 'Hello'"), {
        mode: 0o755
      });
      
      tape.append("readonly.txt", new TextEncoder().encode("Read only"), {
        mode: 0o444
      });
      
      const tarData = tape.save();
      
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      
      const executable = files.find(f => f.name === "executable.sh");
      const readonly = files.find(f => f.name === "readonly.txt");
      
      expect(executable?.mode).toBe(0o755);
      expect(readonly?.mode).toBe(0o444);
    });

    it("should set file ownership", () => {
      const tape = new Tar();
      
      tape.append("test.txt", new TextEncoder().encode("Test"), {
        uid: 1000,
        gid: 1000,
        uname: "user",
        gname: "user"
      });
      
      const tarData = tape.save();
      
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      
      expect(files[0].uid).toBe(1000);
      expect(files[0].gid).toBe(1000);
      expect(files[0].uname).toBe("user");
      expect(files[0].gname).toBe("user");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty TAR creation", () => {
      const tape = new Tar();
      const tarData = tape.save();
      
      expect(tarData).toBeInstanceOf(Uint8Array);
      expect(tarData.length).toBe(1024); // Two 512-byte end blocks
      
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      expect(files.length).toBe(0);
    });

    it("should handle long filenames", () => {
      const tape = new Tar();
      
      const longName = "a".repeat(100) + "/deep/nested/path/file.txt";
      tape.append(longName, new TextEncoder().encode("Content"));
      
      const tarData = tape.save();
      
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      
      expect(files.length).toBe(1);
      expect(files[0].name).toBe(longName);
    });

    it("should handle special characters in filenames", () => {
      const tape = new Tar();
      
      tape.append("file with spaces.txt", new TextEncoder().encode("Content 1"));
      tape.append("special!@#$%.txt", new TextEncoder().encode("Content 2"));
      
      const tarData = tape.save();
      
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      
      const fileNames = files.map(f => f.name);
      expect(fileNames).toContain("file with spaces.txt");
      expect(fileNames).toContain("special!@#$%.txt");
    });
  });

  describe("Performance", () => {
    it("should create large TARs efficiently", () => {
      const tape = new Tar();
      
      // Add 100 files
      for (let i = 0; i < 100; i++) {
        tape.append(`file${i}.txt`, new TextEncoder().encode(`This is file ${i} content.`));
      }
      
      const start = performance.now();
      const tarData = tape.save();
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(tarData.length).toBeGreaterThan(0);
      
      // Verify all files are present
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      expect(files.length).toBe(100);
    });

    it("should handle large file contents", () => {
      const tape = new Tar();
      
      // Create 1MB file
      const largeContent = new Uint8Array(1024 * 1024);
      for (let i = 0; i < largeContent.length; i++) {
        largeContent[i] = i % 256;
      }
      
      const start = performance.now();
      tape.append("large.bin", largeContent);
      const tarData = tape.save();
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1000);
      expect(tarData.length).toBeGreaterThan(largeContent.length);
      
      // Verify content
      const readTape = new Tar();
      readTape.read(tarData);
      const files = readTape.extract();
      expect(files[0].data).toEqual(largeContent);
    });
  });
});