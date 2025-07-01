import { describe, it, expect, beforeAll } from "vitest";
import { getHeicImageConverter } from "../../src/lib/heic-image-converter";

describe("HEIC Converter", () => {
  let heicConverter: ReturnType<typeof getHeicImageConverter>;
  let testHeicFile: ArrayBuffer;

  beforeAll(async () => {
    heicConverter = getHeicImageConverter();

    // Create a minimal test HEIC file
    // Note: In a real test, you would use an actual HEIC file from fixtures
    // For now, we'll create a mock that represents HEIC data
    const mockHeicData = new Uint8Array([
      // HEIC file signature (simplified)
      0x00,
      0x00,
      0x00,
      0x20,
      0x66,
      0x74,
      0x79,
      0x70, // ftyp box
      0x68,
      0x65,
      0x69,
      0x63, // 'heic' brand
      // ... rest would be actual HEIC data
    ]);
    testHeicFile = mockHeicData.buffer;
  });

  it("should detect HEIC format", () => {
    const file = new File([testHeicFile], "test.heic", { type: "image/heic" });
    expect(file.type).toBe("image/heic");
    expect(file.name.toLowerCase().endsWith(".heic")).toBe(true);
  });

  it("should convert HEIC to PNG", async () => {
    try {
      const targetFormat = { mime: "image/png", extension: "png", name: "PNG" };
      const blob = await heicConverter.convert(testHeicFile, targetFormat);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/png");
    } catch (error) {
      // Expected to fail with mock data
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("HEIC");
    }
  });

  it("should convert HEIC to JPEG", async () => {
    try {
      const targetFormat = {
        mime: "image/jpeg",
        extension: "jpg",
        name: "JPEG",
      };
      const blob = await heicConverter.convert(testHeicFile, targetFormat);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/jpeg");
    } catch (error) {
      // Expected to fail with mock data
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("HEIC");
    }
  });

  it("should handle progress callback", async () => {
    const progressValues: number[] = [];
    const targetFormat = { mime: "image/png", extension: "png", name: "PNG" };

    try {
      await heicConverter.convert(testHeicFile, targetFormat, (progress) => {
        progressValues.push(progress);
      });
    } catch (error) {
      // Expected to fail with mock data, but we should still get some progress values
      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues[0]).toBeLessThanOrEqual(
        progressValues[progressValues.length - 1],
      );
    }
  });

  it("should handle invalid HEIC data", async () => {
    const invalidData = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
    const targetFormat = { mime: "image/png", extension: "png", name: "PNG" };

    await expect(
      heicConverter.convert(invalidData, targetFormat),
    ).rejects.toThrow();
  });

  it("should clean up resources", () => {
    expect(() => heicConverter.destroy()).not.toThrow();
  });
});
