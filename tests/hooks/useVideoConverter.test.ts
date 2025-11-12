import { describe, it, expect } from "vitest";
import type { VideoConversionOptions } from "../../src/workers/video-converter.worker";
import type { VideoMetadata } from "../../src/hooks/useVideoConverter";

describe("useVideoConverter Hook - Type Definitions", () => {
  describe("VideoConversionOptions interface", () => {
    it("should have correct option types", () => {
      const options: VideoConversionOptions = {
        codec: "avc",
        bitrate: 1000000,
        width: 1920,
        height: 1080,
        rotation: 90,
        startTime: 0,
        endTime: 10,
        quality: "high",
      };

      expect(options).toBeDefined();
      expect(typeof options.bitrate).toBe("number");
      expect(typeof options.width).toBe("number");
      expect(typeof options.height).toBe("number");
    });

    it("should allow partial options", () => {
      const minimalOptions: VideoConversionOptions = {};
      const partialOptions: VideoConversionOptions = {
        quality: "medium",
      };

      expect(minimalOptions).toBeDefined();
      expect(partialOptions.quality).toBe("medium");
    });
  });

  describe("VideoMetadata interface", () => {
    it("should have correct metadata structure", () => {
      const metadata: VideoMetadata = {
        duration: 10.5,
        width: 1920,
        height: 1080,
        rotation: 0,
        hasAudio: true,
        hasVideo: true,
      };

      expect(metadata).toBeDefined();
      expect(typeof metadata.duration).toBe("number");
      expect(typeof metadata.width).toBe("number");
      expect(typeof metadata.height).toBe("number");
      expect(typeof metadata.hasAudio).toBe("boolean");
      expect(typeof metadata.hasVideo).toBe("boolean");
    });
  });

  describe("Quality options", () => {
    it("should support all quality levels", () => {
      const qualities: Array<"low" | "medium" | "high" | "ultra"> = [
        "low",
        "medium",
        "high",
        "ultra",
      ];

      qualities.forEach((quality) => {
        const options: VideoConversionOptions = { quality };
        expect(options.quality).toBe(quality);
      });
    });
  });

  describe("Rotation options", () => {
    it("should support standard rotation angles", () => {
      const angles = [0, 90, 180, 270];

      angles.forEach((angle) => {
        const options: VideoConversionOptions = { rotation: angle };
        expect(options.rotation).toBe(angle);
      });
    });
  });

  describe("Video dimensions", () => {
    it("should support common video resolutions", () => {
      const resolutions = [
        { width: 1920, height: 1080 }, // 1080p
        { width: 1280, height: 720 }, // 720p
        { width: 854, height: 480 }, // 480p
        { width: 640, height: 360 }, // 360p
      ];

      resolutions.forEach((res) => {
        const options: VideoConversionOptions = res;
        expect(options.width).toBe(res.width);
        expect(options.height).toBe(res.height);
      });
    });
  });

  describe("Bitrate options", () => {
    it("should support various bitrate values", () => {
      const bitrates = [
        500_000, // 500 kbps
        1_000_000, // 1 Mbps
        2_500_000, // 2.5 Mbps
        5_000_000, // 5 Mbps
        10_000_000, // 10 Mbps
      ];

      bitrates.forEach((bitrate) => {
        const options: VideoConversionOptions = { bitrate };
        expect(options.bitrate).toBe(bitrate);
      });
    });
  });
});
