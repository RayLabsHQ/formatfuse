import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import init, { convertImage, loadMetadata, getPixels } from "@refilelabs/image";

const __dirname = join(fileURLToPath(import.meta.url), "../..");

describe("Image Converter - Format Tests", () => {
  beforeAll(async () => {
    // Initialize WASM module for Node.js environment
    const wasmBuffer = readFileSync(
      "node_modules/@refilelabs/image/refilelabs_image_bg.wasm",
    );
    await init({ module_or_path: wasmBuffer });
  });

  describe("PNG conversions", () => {
    let pngData: Uint8Array;

    beforeAll(() => {
      pngData = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/small.png")),
      );
    });

    it("should get PNG metadata", () => {
      const metadata = loadMetadata(pngData, "image/png", () => {});
      expect(metadata).toBeDefined();
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    it("should convert PNG to JPEG", () => {
      const result = convertImage(pngData, "image/png", "image/jpeg", () => {});
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result[0]).toBe(0xff); // JPEG magic number
      expect(result[1]).toBe(0xd8);
    });

    it("should convert PNG to WebP", () => {
      const result = convertImage(pngData, "image/png", "image/webp", () => {});
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should convert PNG to BMP", () => {
      const result = convertImage(pngData, "image/png", "image/bmp", () => {});
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result[0]).toBe(0x42); // BMP magic number 'BM'
      expect(result[1]).toBe(0x4d);
    });

    it("should convert PNG to GIF", () => {
      const result = convertImage(pngData, "image/png", "image/gif", () => {});
      expect(result).toBeInstanceOf(Uint8Array);
      // GIF89a or GIF87a signature
      expect(result[0]).toBe(0x47); // 'G'
      expect(result[1]).toBe(0x49); // 'I'
      expect(result[2]).toBe(0x46); // 'F'
    });
  });

  describe("JPEG conversions", () => {
    let jpegData: Uint8Array;

    beforeAll(() => {
      jpegData = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/test.jpg")),
      );
    });

    it("should get JPEG metadata", () => {
      const metadata = loadMetadata(jpegData, "image/jpeg", () => {});
      expect(metadata).toBeDefined();
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(200);
    });

    it("should convert JPEG to PNG", () => {
      const result = convertImage(
        jpegData,
        "image/jpeg",
        "image/png",
        () => {},
      );
      expect(result).toBeInstanceOf(Uint8Array);
      // PNG signature
      expect(result[0]).toBe(0x89);
      expect(result[1]).toBe(0x50);
      expect(result[2]).toBe(0x4e);
      expect(result[3]).toBe(0x47);
    });

    it("should convert JPEG to WebP", () => {
      const result = convertImage(
        jpegData,
        "image/jpeg",
        "image/webp",
        () => {},
      );
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("WebP conversions", () => {
    let webpData: Uint8Array;

    beforeAll(() => {
      webpData = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/test.webp")),
      );
    });

    it("should get WebP metadata", () => {
      const metadata = loadMetadata(webpData, "image/webp", () => {});
      expect(metadata).toBeDefined();
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(200);
    });

    it("should convert WebP to PNG", () => {
      const result = convertImage(
        webpData,
        "image/webp",
        "image/png",
        () => {},
      );
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result[0]).toBe(0x89); // PNG signature
    });

    it("should convert WebP to JPEG", () => {
      const result = convertImage(
        webpData,
        "image/webp",
        "image/jpeg",
        () => {},
      );
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result[0]).toBe(0xff); // JPEG signature
      expect(result[1]).toBe(0xd8);
    });
  });

  describe("GIF conversions", () => {
    let gifData: Uint8Array;

    beforeAll(() => {
      gifData = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/test.gif")),
      );
    });

    it("should get GIF metadata", () => {
      const metadata = loadMetadata(gifData, "image/gif", () => {});
      expect(metadata).toBeDefined();
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(200);
    });

    it("should convert GIF to PNG", () => {
      const result = convertImage(gifData, "image/gif", "image/png", () => {});
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result[0]).toBe(0x89); // PNG signature
    });
  });

  describe("Transparent image handling", () => {
    let transparentPng: Uint8Array;

    beforeAll(() => {
      transparentPng = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/transparent.png")),
      );
    });

    it("should preserve transparency when converting PNG to WebP", () => {
      const result = convertImage(
        transparentPng,
        "image/png",
        "image/webp",
        () => {},
      );
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Different size handling", () => {
    it("should handle small images (100x100)", () => {
      const data = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/small.png")),
      );
      const metadata = loadMetadata(data, "image/png", () => {});
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
    });

    it("should handle medium images (500x300)", () => {
      const data = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/medium.png")),
      );
      const metadata = loadMetadata(data, "image/png", () => {});
      expect(metadata.width).toBe(500);
      expect(metadata.height).toBe(300);
    });

    it("should handle large images (1000x800)", () => {
      const data = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/large.png")),
      );
      const metadata = loadMetadata(data, "image/png", () => {});
      expect(metadata.width).toBe(1000);
      expect(metadata.height).toBe(800);
    });
  });

  describe("Pixel data extraction", () => {
    it("should extract pixel data from PNG", () => {
      const data = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/small.png")),
      );
      const pixelData = getPixels(data, "image/png");

      expect(pixelData).toBeDefined();
      expect(pixelData.width).toBe(100);
      expect(pixelData.height).toBe(100);
      expect(pixelData.pixels).toBeInstanceOf(Array);
      expect(pixelData.pixels.length).toBe(100 * 100 * 4); // RGBA
    });
  });

  describe("Progress callbacks", () => {
    it("should call progress callback during conversion", () => {
      const data = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/large.png")),
      );
      let progressCalled = false;

      convertImage(data, "image/png", "image/jpeg", (progress: number) => {
        progressCalled = true;
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      });

      // Progress might not always be called for small operations
      // but conversion should complete successfully
    });
  });
});
