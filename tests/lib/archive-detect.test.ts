import { describe, expect, it } from "vitest";

import {
  detectArchiveFormat,
  shouldTryLibarchiveFirst,
} from "../../src/lib/archive/detect";

const toUint8 = (length: number, fill = 0): Uint8Array => {
  const array = new Uint8Array(length);
  if (fill !== 0) {
    array.fill(fill);
  }
  return array;
};

describe("archive format detection", () => {
  it("detects TAR.ZST archives via extension", () => {
    const buffer = toUint8(16);
    const detection = detectArchiveFormat(buffer, "sample.tar.zst");

    expect(detection.format.kind).toBe("archive");
    if (detection.format.kind === "archive") {
      expect(detection.format.format).toBe("tarZst");
    }
    expect(shouldTryLibarchiveFirst(detection.format)).toBe(false);
  });

  it("detects ISO images with secondary descriptor offsets", () => {
    const offset = 0x9001;
    const buffer = toUint8(offset + 6);
    buffer.set([0x43, 0x44, 0x30, 0x30, 0x31], offset); // "CD001"

    const detection = detectArchiveFormat(buffer, "disk.iso");
    expect(detection.format.kind).toBe("archive");
    if (detection.format.kind === "archive") {
      expect(detection.format.format).toBe("iso");
    }
    expect(detection.confidence).toBeGreaterThan(0.8);
  });
});
