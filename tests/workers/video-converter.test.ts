import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import * as Comlink from "comlink";
import nodeEndpoint from "comlink/dist/esm/node-adapter.mjs";

const __dirname = join(fileURLToPath(import.meta.url), "../..");

// Helper to check if test videos exist
const hasTestVideos = () => {
  const mp4Path = join(__dirname, "fixtures/videos/test.mp4");
  return existsSync(mp4Path);
};
const skipSuite = !hasTestVideos();

describe.skipIf(skipSuite)("Video Converter Worker", () => {
  let worker: Worker;
  let VideoConverterClass: any;
  let converter: any;

  beforeAll(async () => {
    if (skipSuite) {
      console.warn(
        "⚠️  Video test fixtures not found. Run 'tests/fixtures/videos/generate-test-videos.sh' to generate them.",
      );
      return;
    }

    // Initialize the worker
    const { Worker } = await import("worker_threads");
    worker = new Worker(
      join(__dirname, "../src/workers/video-converter.worker.ts"),
      {
        type: "module",
      },
    ) as any;

    VideoConverterClass = Comlink.wrap(nodeEndpoint(worker));
    converter = await new VideoConverterClass();
  });

  afterAll(() => {
    if (skipSuite) return;
    if (converter) {
      converter[Comlink.releaseProxy]();
    }
    if (worker) {
      worker.terminate();
    }
  });

  describe("Basic format conversions", () => {
    it.skipIf(!hasTestVideos())(
      "should convert MP4 to WebM",
      async () => {
        const testMp4 = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mp4")),
        );

        const result = await converter.convert(
          testMp4,
          "webm",
          {},
          () => {}, // Progress callback
        );

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);

        // WebM files start with the EBML header (0x1A 0x45 0xDF 0xA3)
        expect(result[0]).toBe(0x1a);
        expect(result[1]).toBe(0x45);
        expect(result[2]).toBe(0xdf);
        expect(result[3]).toBe(0xa3);
      },
      30000,
    ); // 30s timeout for video processing

    it.skipIf(!hasTestVideos())(
      "should convert WebM to MP4",
      async () => {
        const testWebm = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.webm")),
        );

        const result = await converter.convert(
          testWebm,
          "mp4",
          {},
          () => {},
        );

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);

        // MP4 files have ftyp box early in the file
        const ftypIndex = findInBuffer(result, "ftyp");
        expect(ftypIndex).toBeGreaterThan(-1);
      },
      30000,
    );

    it.skipIf(!hasTestVideos())(
      "should convert MOV to MP4",
      async () => {
        const testMov = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mov")),
        );

        const result = await converter.convert(
          testMov,
          "mp4",
          {},
          () => {},
        );

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);

        // MP4 files have ftyp box
        const ftypIndex = findInBuffer(result, "ftyp");
        expect(ftypIndex).toBeGreaterThan(-1);
      },
      30000,
    );
  });

  describe("Metadata extraction", () => {
    it.skipIf(!hasTestVideos())(
      "should extract MP4 metadata",
      async () => {
        const testMp4 = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mp4")),
        );

        const metadata = await converter.getMetadata(testMp4, () => {});

        expect(metadata).toBeDefined();
        expect(metadata.duration).toBeGreaterThan(0);
        expect(metadata.duration).toBeLessThanOrEqual(4); // ~3 seconds + margin
        expect(metadata.width).toBe(320);
        expect(metadata.height).toBe(240);
        expect(metadata.hasVideo).toBe(true);
      },
      15000,
    );

    it.skipIf(!hasTestVideos())(
      "should extract WebM metadata",
      async () => {
        const testWebm = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.webm")),
        );

        const metadata = await converter.getMetadata(testWebm, () => {});

        expect(metadata).toBeDefined();
        expect(metadata.duration).toBeGreaterThan(0);
        expect(metadata.width).toBe(320);
        expect(metadata.height).toBe(240);
        expect(metadata.hasVideo).toBe(true);
      },
      15000,
    );
  });

  describe("Quality settings", () => {
    it.skipIf(!hasTestVideos())(
      "should compress video with low quality",
      async () => {
        const testMp4 = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mp4")),
        );

        const result = await converter.compress(testMp4, "low", () => {});

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
        // Low quality should produce smaller file (but not always guaranteed)
        // Just verify it completes successfully
      },
      30000,
    );

    it.skipIf(!hasTestVideos())(
      "should compress video with high quality",
      async () => {
        const testMp4 = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mp4")),
        );

        const result = await converter.compress(testMp4, "high", () => {});

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
      },
      30000,
    );

    it.skipIf(!hasTestVideos())(
      "should convert with custom bitrate",
      async () => {
        const testMp4 = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mp4")),
        );

        const result = await converter.convert(
          testMp4,
          "mp4",
          { bitrate: 500_000 }, // 500 kbps
          () => {},
        );

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
      },
      30000,
    );
  });

  describe("Video operations", () => {
    it.skipIf(!hasTestVideos())(
      "should resize video",
      async () => {
        const testMp4 = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mp4")),
        );

        const result = await converter.resize(testMp4, 160, 120, () => {});

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);

        // Verify the output has correct dimensions
        const metadata = await converter.getMetadata(result, () => {});
        expect(metadata.width).toBe(160);
        expect(metadata.height).toBe(120);
      },
      30000,
    );

    it.skipIf(!hasTestVideos())(
      "should rotate video",
      async () => {
        const testMp4 = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mp4")),
        );

        const result = await converter.rotate(testMp4, 90, () => {});

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
      },
      30000,
    );

    it.skipIf(!hasTestVideos())(
      "should trim video",
      async () => {
        const testMp4 = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mp4")),
        );

        // Trim from 0.5s to 2s (1.5s duration)
        const result = await converter.trim(testMp4, 0.5, 2, () => {});

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);

        // Verify trimmed duration
        const metadata = await converter.getMetadata(result, () => {});
        expect(metadata.duration).toBeLessThan(2);
        expect(metadata.duration).toBeGreaterThan(1);
      },
      30000,
    );
  });

  describe("Progress tracking", () => {
    it.skipIf(!hasTestVideos())(
      "should report progress during conversion",
      async () => {
        const testMp4 = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mp4")),
        );

        const progressUpdates: number[] = [];
        const progressCallback = Comlink.proxy((progress: number) => {
          progressUpdates.push(progress);
        });

        await converter.convert(testMp4, "webm", {}, progressCallback);

        // Should have received multiple progress updates
        expect(progressUpdates.length).toBeGreaterThan(3);

        // Progress should be increasing
        const isIncreasing = progressUpdates.every(
          (val, idx) => idx === 0 || val >= progressUpdates[idx - 1],
        );
        expect(isIncreasing).toBe(true);

        // Should reach 100%
        expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
      },
      30000,
    );
  });

  describe("Error handling", () => {
    it("should throw error on invalid video data", async () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5]);

      await expect(
        converter.convert(invalidData, "mp4", {}, () => {}),
      ).rejects.toThrow();
    });

    it("should throw error on empty data", async () => {
      const emptyData = new Uint8Array(0);

      await expect(
        converter.convert(emptyData, "mp4", {}, () => {}),
      ).rejects.toThrow();
    });

    it("should throw error on corrupted video data", async () => {
      // Create fake MP4 header but corrupted data
      const corruptedData = new Uint8Array(1024);
      corruptedData[4] = 0x66; // 'f'
      corruptedData[5] = 0x74; // 't'
      corruptedData[6] = 0x79; // 'y'
      corruptedData[7] = 0x70; // 'p'

      await expect(
        converter.convert(corruptedData, "webm", {}, () => {}),
      ).rejects.toThrow();
    });
  });

  describe("Edge cases", () => {
    it.skipIf(!hasTestVideos())(
      "should handle same-format conversion (compression)",
      async () => {
        const testMp4 = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mp4")),
        );

        const result = await converter.convert(testMp4, "mp4", {}, () => {});

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
      },
      30000,
    );

    it.skipIf(!hasTestVideos())(
      "should handle conversion with multiple options",
      async () => {
        const testMp4 = new Uint8Array(
          readFileSync(join(__dirname, "fixtures/videos/test.mp4")),
        );

        const result = await converter.convert(
          testMp4,
          "mp4",
          {
            width: 160,
            height: 120,
            quality: "medium",
            startTime: 0.5,
            endTime: 2,
          },
          () => {},
        );

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);

        // Verify combined operations
        const metadata = await converter.getMetadata(result, () => {});
        expect(metadata.width).toBe(160);
        expect(metadata.height).toBe(120);
        expect(metadata.duration).toBeLessThan(2);
      },
      30000,
    );
  });
});

// Helper function to find a string in a Uint8Array
function findInBuffer(buffer: Uint8Array, searchString: string): number {
  const searchBytes = new TextEncoder().encode(searchString);
  for (let i = 0; i <= buffer.length - searchBytes.length; i++) {
    let found = true;
    for (let j = 0; j < searchBytes.length; j++) {
      if (buffer[i + j] !== searchBytes[j]) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
}
