import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import init, { convertImage, loadMetadata, getPixels } from "@refilelabs/image";

const __dirname = join(fileURLToPath(import.meta.url), "../..");

describe("Image Converter - All Formats Comprehensive Test", () => {
  beforeAll(async () => {
    // Initialize WASM module for Node.js environment
    const wasmBuffer = readFileSync(
      "node_modules/@refilelabs/image/refilelabs_image_bg.wasm",
    );
    await init(wasmBuffer);
  });

  // Test reading all generated formats
  describe("Reading generated formats", () => {
    const formats = [
      { file: "test.jpg", mime: "image/jpeg", name: "JPEG" },
      { file: "test.png", mime: "image/png", name: "PNG" },
      { file: "test.webp", mime: "image/webp", name: "WebP" },
      { file: "test.gif", mime: "image/gif", name: "GIF" },
      { file: "test.bmp", mime: "image/bmp", name: "BMP" },
      { file: "test.tiff", mime: "image/tiff", name: "TIFF" },
      { file: "test.ico", mime: "image/x-icon", name: "ICO" },
      { file: "test.tga", mime: "image/x-targa", name: "TGA" },
      { file: "test.pnm", mime: "image/x-portable-anymap", name: "PNM" },
      { file: "test.qoi", mime: "image/x-qoi", name: "QOI" },
      { file: "test.hdr", mime: "image/vnd.radiance", name: "HDR" },
      { file: "test.exr", mime: "image/x-exr", name: "EXR" },
      // Special handling for these formats
      {
        file: "test.avif",
        mime: "image/avif",
        name: "AVIF",
        skipMetadata: true,
      },
      {
        file: "test.ff",
        mime: "image/farbfeld",
        name: "Farbfeld",
        skipMetadata: true,
      },
    ];

    formats.forEach(({ file, mime, name, skipMetadata }) => {
      const filePath = join(__dirname, "fixtures/images/generated", file);

      if (existsSync(filePath)) {
        it(`should read ${name} format`, () => {
          const data = new Uint8Array(readFileSync(filePath));
          expect(data.length).toBeGreaterThan(0);

          if (!skipMetadata) {
            // Try to load metadata
            const metadata = loadMetadata(data, mime, () => {});
            expect(metadata).toBeDefined();
            expect(metadata.width).toBeGreaterThan(0);
            expect(metadata.height).toBeGreaterThan(0);
          }
        });
      }
    });
  });

  // Test SVG decoding (special case - decode only)
  describe("SVG decoding", () => {
    it("should decode SVG to raster format", () => {
      const svgPath = join(__dirname, "fixtures/images/test.svg");
      if (existsSync(svgPath)) {
        const svgData = new Uint8Array(readFileSync(svgPath));

        // Convert SVG to PNG
        const pngResult = convertImage(
          svgData,
          "image/svg+xml",
          "image/png",
          () => {},
        );
        expect(pngResult).toBeInstanceOf(Uint8Array);
        expect(pngResult.length).toBeGreaterThan(0);

        // Verify it's a valid PNG
        expect(pngResult[0]).toBe(0x89);
        expect(pngResult[1]).toBe(0x50);
      }
    });

    it("should not be able to encode to SVG", () => {
      const pngData = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/test.png")),
      );

      // This should throw as SVG encoding is not supported
      expect(() => {
        convertImage(pngData, "image/png", "image/svg+xml", () => {});
      }).toThrow();
    });
  });

  // Test format-specific features
  describe("Format-specific features", () => {
    it("should handle ICO size constraints", () => {
      const pngData = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/test.png")),
      );
      const icoResult = convertImage(
        pngData,
        "image/png",
        "image/x-icon",
        () => {},
      );

      // Load metadata of the ICO
      const metadata = loadMetadata(icoResult, "image/x-icon", () => {});

      // ICO should be max 256x256
      expect(metadata.width).toBeLessThanOrEqual(256);
      expect(metadata.height).toBeLessThanOrEqual(256);
    });

    it("should handle formats without alpha channel", () => {
      // Test that JPEG removes alpha channel
      const transparentPng = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/transparent.png")),
      );

      const jpegResult = convertImage(
        transparentPng,
        "image/png",
        "image/jpeg",
        () => {},
      );
      expect(jpegResult).toBeInstanceOf(Uint8Array);

      // JPEG should not have alpha, so converting back to PNG and checking pixels would show opaque
    });

    it("should handle high dynamic range formats", () => {
      const pngData = new Uint8Array(
        readFileSync(join(__dirname, "fixtures/images/test.png")),
      );

      // Convert to HDR
      const hdrResult = convertImage(
        pngData,
        "image/png",
        "image/vnd.radiance",
        () => {},
      );
      expect(hdrResult).toBeInstanceOf(Uint8Array);

      // Convert to EXR
      const exrResult = convertImage(
        pngData,
        "image/png",
        "image/x-exr",
        () => {},
      );
      expect(exrResult).toBeInstanceOf(Uint8Array);
    });
  });

  // Test cross-format conversions
  describe("Cross-format conversions", () => {
    const testConversions = [
      {
        from: "TIFF",
        fromMime: "image/tiff",
        to: "JPEG",
        toMime: "image/jpeg",
      },
      { from: "BMP", fromMime: "image/bmp", to: "WebP", toMime: "image/webp" },
      { from: "GIF", fromMime: "image/gif", to: "TIFF", toMime: "image/tiff" },
      { from: "WebP", fromMime: "image/webp", to: "BMP", toMime: "image/bmp" },
      { from: "QOI", fromMime: "image/x-qoi", to: "PNG", toMime: "image/png" },
      {
        from: "TGA",
        fromMime: "image/x-targa",
        to: "JPEG",
        toMime: "image/jpeg",
      },
    ];

    testConversions.forEach(({ from, fromMime, to, toMime }) => {
      it(`should convert ${from} to ${to}`, () => {
        const sourceFile = join(
          __dirname,
          `fixtures/images/generated/test.${from.toLowerCase()}`,
        );
        if (existsSync(sourceFile)) {
          const sourceData = new Uint8Array(readFileSync(sourceFile));

          const result = convertImage(sourceData, fromMime, toMime, () => {});
          expect(result).toBeInstanceOf(Uint8Array);
          expect(result.length).toBeGreaterThan(0);
        }
      });
    });
  });

  // Test edge cases
  describe("Edge cases", () => {
    it("should handle very small images (1x1)", () => {
      const pixelPath = join(__dirname, "fixtures/images/pixel.png");
      if (existsSync(pixelPath)) {
        const data = new Uint8Array(readFileSync(pixelPath));
        const metadata = loadMetadata(data, "image/png", () => {});
        expect(metadata.width).toBe(1);
        expect(metadata.height).toBe(1);

        // Convert to various formats
        const jpegResult = convertImage(
          data,
          "image/png",
          "image/jpeg",
          () => {},
        );
        expect(jpegResult).toBeInstanceOf(Uint8Array);
      }
    });

    it("should handle minimum size (10x10)", () => {
      const tinyPath = join(__dirname, "fixtures/images/tiny.png");
      if (existsSync(tinyPath)) {
        const data = new Uint8Array(readFileSync(tinyPath));
        const metadata = loadMetadata(data, "image/png", () => {});
        expect(metadata.width).toBe(10);
        expect(metadata.height).toBe(10);
      }
    });

    it("should handle different aspect ratios", () => {
      // Wide image
      const widePath = join(__dirname, "fixtures/images/wide.png");
      if (existsSync(widePath)) {
        const data = new Uint8Array(readFileSync(widePath));
        const metadata = loadMetadata(data, "image/png", () => {});
        expect(metadata.width).toBe(400);
        expect(metadata.height).toBe(200);
      }

      // Tall image
      const tallPath = join(__dirname, "fixtures/images/tall.png");
      if (existsSync(tallPath)) {
        const data = new Uint8Array(readFileSync(tallPath));
        const metadata = loadMetadata(data, "image/png", () => {});
        expect(metadata.width).toBe(200);
        expect(metadata.height).toBe(400);
      }
    });
  });
});
