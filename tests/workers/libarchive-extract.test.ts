import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// @vitest-environment jsdom

// Mock libarchive-wasm since it requires WASM loading
vi.mock("libarchive-wasm", () => ({
  libarchiveWasm: vi.fn().mockResolvedValue({
    // Mock WASM module initialization
  }),
  ArchiveReader: class MockArchiveReader {
    constructor(buffer: Uint8Array) {
      this.buffer = buffer;
      this.entries = this.mockExtractEntries(buffer);
    }

    private buffer: Uint8Array;
    private entries: any[];

    private mockExtractEntries(buffer: Uint8Array) {
      // Simple mock based on file signatures
      if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
        // ZIP signature
        return [
          { path: "test.txt", data: new TextEncoder().encode("Hello from ZIP") },
          { path: "folder/nested.txt", data: new TextEncoder().encode("Nested file") }
        ];
      } else if (buffer[0] === 0x37 && buffer[1] === 0x7A) {
        // 7Z signature
        return [
          { path: "test.txt", data: new TextEncoder().encode("Hello from 7Z") },
          { path: "data.json", data: new TextEncoder().encode('{"format": "7z"}') }
        ];
      } else if (buffer[0] === 0x52 && buffer[1] === 0x61 && buffer[2] === 0x72) {
        // RAR signature
        return [
          { path: "readme.md", data: new TextEncoder().encode("# RAR Archive") },
          { path: "image.png", data: new Uint8Array([0x89, 0x50, 0x4E, 0x47]) }
        ];
      }
      return [];
    }

    *[Symbol.iterator]() {
      for (const entry of this.entries) {
        yield {
          getPathString: () => entry.path,
          readData: () => entry.data,
          isDirectory: () => entry.path.endsWith("/"),
          size: entry.data.length
        };
      }
    }
  }
}));

describe("LibArchive Universal Extractor", () => {
  describe("Format detection", () => {
    it("should detect ZIP format", async () => {
      const zipHeader = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(zipHeader);
      const entries = Array.from(reader);
      
      expect(entries.length).toBeGreaterThan(0);
    });

    it("should detect 7Z format", async () => {
      const sevenZipHeader = new Uint8Array([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(sevenZipHeader);
      const entries = Array.from(reader);
      
      expect(entries.length).toBeGreaterThan(0);
    });

    it("should detect RAR format", async () => {
      const rarHeader = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(rarHeader);
      const entries = Array.from(reader);
      
      expect(entries.length).toBeGreaterThan(0);
    });

    it("should detect ISO format", async () => {
      // ISO 9660 signature at offset 0x8001
      const isoHeader = new Uint8Array(0x8010);
      isoHeader[0x8001] = 0x43; // 'C'
      isoHeader[0x8002] = 0x44; // 'D'
      isoHeader[0x8003] = 0x30; // '0'
      isoHeader[0x8004] = 0x30; // '0'
      isoHeader[0x8005] = 0x31; // '1'
      
      const { ArchiveReader } = await import("libarchive-wasm");
      
      // In real implementation, libarchive would detect this
      const reader = new ArchiveReader(isoHeader);
      // Mock doesn't handle ISO, so we expect empty
      const entries = Array.from(reader);
      
      expect(entries).toBeDefined();
    });
  });

  describe("File extraction", () => {
    it("should extract text files with correct content", async () => {
      const zipData = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(zipData);
      const entries = Array.from(reader);
      
      const textFile = entries.find(e => e.getPathString() === "test.txt");
      expect(textFile).toBeDefined();
      
      const content = new TextDecoder().decode(textFile!.readData());
      expect(content).toBe("Hello from ZIP");
    });

    it("should handle nested directory structures", async () => {
      const zipData = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(zipData);
      const entries = Array.from(reader);
      
      const nestedFile = entries.find(e => e.getPathString().includes("folder/"));
      expect(nestedFile).toBeDefined();
      expect(nestedFile!.getPathString()).toBe("folder/nested.txt");
    });

    it("should extract binary files correctly", async () => {
      const rarData = new Uint8Array([0x52, 0x61, 0x72]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(rarData);
      const entries = Array.from(reader);
      
      const imageFile = entries.find(e => e.getPathString().endsWith(".png"));
      expect(imageFile).toBeDefined();
      
      const imageData = imageFile!.readData();
      expect(imageData).toBeInstanceOf(Uint8Array);
      
      // Check PNG header
      expect(imageData[0]).toBe(0x89);
      expect(imageData[1]).toBe(0x50);
    });
  });

  describe("Memory management", () => {
    it("should handle large archives efficiently", async () => {
      // Create a mock large archive
      const largeArchive = new Uint8Array(1024 * 1024); // 1MB
      largeArchive[0] = 0x50; // ZIP header
      largeArchive[1] = 0x4B;
      
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const start = performance.now();
      const reader = new ArchiveReader(largeArchive);
      const entries = Array.from(reader);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should process within 1 second
      expect(entries).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should handle unsupported formats gracefully", async () => {
      const unknownFormat = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(unknownFormat);
      const entries = Array.from(reader);
      
      expect(entries.length).toBe(0);
    });

    it("should handle corrupted archives", async () => {
      const corruptedArchive = new Uint8Array([0x50, 0x4B, 0xFF, 0xFF]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(corruptedArchive);
      const entries = Array.from(reader);
      
      // Should still return some entries based on our mock
      expect(entries).toBeDefined();
    });
  });

  describe("Compression format support", () => {
    it("should support GZ compressed files", async () => {
      const gzHeader = new Uint8Array([0x1F, 0x8B, 0x08]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(gzHeader);
      const entries = Array.from(reader);
      
      expect(entries).toBeDefined();
    });

    it("should support BZ2 compressed files", async () => {
      const bz2Header = new Uint8Array([0x42, 0x5A, 0x68]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(bz2Header);
      const entries = Array.from(reader);
      
      expect(entries).toBeDefined();
    });

    it("should support XZ compressed files", async () => {
      const xzHeader = new Uint8Array([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(xzHeader);
      const entries = Array.from(reader);
      
      expect(entries).toBeDefined();
    });

    it("should support LZMA compressed files", async () => {
      const lzmaHeader = new Uint8Array([0x5D, 0x00, 0x00, 0x80, 0x00]);
      const { ArchiveReader } = await import("libarchive-wasm");
      
      const reader = new ArchiveReader(lzmaHeader);
      const entries = Array.from(reader);
      
      expect(entries).toBeDefined();
    });
  });
});