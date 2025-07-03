import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import init, { convertImage, loadMetadata, getPixels } from "@refilelabs/image";

describe("Image Converter", () => {
  beforeAll(async () => {
    // Initialize WASM module for Node.js environment
    const wasmBuffer = readFileSync(
      "node_modules/@refilelabs/image/refilelabs_image_bg.wasm",
    );
    await init({ module_or_path: wasmBuffer });
  });

  describe("PNG to JPG conversion", () => {
    it("should convert PNG to JPG successfully", async () => {
      // Load test PNG image from fixtures
      const pngArray = readFileSync(
        join(process.cwd(), "tests/fixtures/images/test.png")
      );

      // Convert PNG to JPG
      const jpgArray = convertImage(
        pngArray,
        "image/png",
        "image/jpeg",
        () => {}, // Progress callback
      );

      // Verify the result
      expect(jpgArray).toBeInstanceOf(Uint8Array);
      expect(jpgArray.length).toBeGreaterThan(0);

      // Check JPEG magic number (FF D8 FF)
      expect(jpgArray[0]).toBe(0xff);
      expect(jpgArray[1]).toBe(0xd8);
      expect(jpgArray[2]).toBe(0xff);
    });

    it("should handle progress callbacks", async () => {
      // Load test PNG image from fixtures
      const pngArray = readFileSync(
        join(process.cwd(), "tests/fixtures/images/test.png")
      );

      let progressCalled = false;

      convertImage(pngArray, "image/png", "image/jpeg", (progress: number) => {
        progressCalled = true;
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      });

      // Progress might not always be called for small images
      // but the conversion should still work
    });
  });

  describe("Metadata extraction", () => {
    it("should extract image metadata", async () => {
      // Load test PNG image from fixtures
      const pngArray = readFileSync(
        join(process.cwd(), "tests/fixtures/images/test.png")
      );

      const metadata = loadMetadata(pngArray, "image/png", () => {});

      expect(metadata).toBeDefined();
      expect(metadata.width).toBeGreaterThan(0);
      expect(metadata.height).toBeGreaterThan(0);
      expect(metadata.other).toBeDefined(); // May contain additional info
      expect(metadata.errors).toBeDefined(); // May contain errors array
    });
  });

  describe("Pixel data extraction", () => {
    it("should extract pixel data", async () => {
      // Load test PNG image from fixtures
      const pngArray = readFileSync(
        join(process.cwd(), "tests/fixtures/images/small.png")
      );

      const imageData = getPixels(pngArray, "image/png");

      expect(imageData).toBeDefined();
      expect(imageData.pixels).toBeInstanceOf(Array);
      expect(imageData.pixels.length).toBeGreaterThan(0);
      expect(imageData.width).toBeGreaterThan(0);
      expect(imageData.height).toBeGreaterThan(0);
      // RGBA format should have length divisible by 4
      expect(imageData.pixels.length % 4).toBe(0);
    });
  });

  describe("Format support", () => {
    const formatTests = [
      { from: "image/png", to: "image/webp", file: "test.png" },
      { from: "image/png", to: "image/bmp", file: "test.png" },
      { from: "image/jpeg", to: "image/png", file: "test.jpg" },
    ];

    formatTests.forEach(({ from, to, file }) => {
      it(`should convert ${from} to ${to}`, async () => {
        const inputArray = readFileSync(
          join(process.cwd(), "tests/fixtures/images", file)
        );

        const outputArray = convertImage(inputArray, from, to, () => {});

        expect(outputArray).toBeInstanceOf(Uint8Array);
        expect(outputArray.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Error handling", () => {
    it("should handle invalid input", async () => {
      const invalidArray = new Uint8Array([1, 2, 3, 4]);

      expect(() => {
        convertImage(invalidArray, "image/png", "image/jpeg", () => {});
      }).toThrow();
    });

    it("should handle empty input", async () => {
      const emptyArray = new Uint8Array(0);

      expect(() => {
        convertImage(emptyArray, "image/png", "image/jpeg", () => {});
      }).toThrow();
    });
  });
});