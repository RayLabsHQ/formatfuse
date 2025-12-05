// @vitest-environment node

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ArchiveExtractorWorker } from "../../src/workers/archive-extractor.worker";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const result = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(result).set(buffer);
  return result;
}

function fixturePath(name: string): string {
  return resolve(__dirname, "../fixtures/archives", name);
}

describe("ArchiveExtractorWorker", () => {
  let worker: ArchiveExtractorWorker;

  beforeAll(() => {
    worker = new ArchiveExtractorWorker();
  });

  it("extracts plain BZ2 files using the native decoder", async () => {
    const buffer = readFileSync(fixturePath("single.txt.bz2"));
    const result = await worker.extract({
      fileName: "single.txt.bz2",
      buffer: toArrayBuffer(buffer),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.engine).toBe("sevenZip");
    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0];
    expect(entry.path).toBe("single.txt");
    let dataBuffer: ArrayBuffer | undefined = entry.data;
    if (!dataBuffer) {
      const fetched = await worker.fetchEntry(result.sessionId, entry.path);
      if (fetched.ok) {
        dataBuffer = (fetched as { ok: true; data: ArrayBuffer }).data;
      }
    }
    expect(dataBuffer).toBeDefined();
    if (!dataBuffer) return;
    expect(Buffer.from(dataBuffer).toString("utf8")).toContain("Single file test data");
  });

  it("extracts ZIP archives via libarchive", async () => {
    const buffer = readFileSync(fixturePath("test.zip"));
    const result = await worker.extract({
      fileName: "test.zip",
      buffer: toArrayBuffer(buffer),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.engine).toBe("libarchive");
    const paths = result.entries.map((entry) => entry.path).sort();
    expect(paths).toContain("test.txt");
  });

  it("falls back to the 7-Zip engine for .7z archives", async () => {
    const buffer = readFileSync(fixturePath("sample.7z"));
    const result = await worker.extract({
      fileName: "sample.7z",
      buffer: toArrayBuffer(buffer),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.engine).toBe("sevenZip");
    const [entry] = result.entries;
    expect(entry.path).toBe("input.txt");
    const fetched = await worker.fetchEntry(result.sessionId, entry.path);
    expect(fetched.ok).toBe(true);
    if (!fetched.ok) return;
    expect(Buffer.from((fetched as { ok: true; data: ArrayBuffer }).data).toString("utf8")).toContain("7z sample content");
  });

  it("prompts for a password when encountering encrypted archives", async () => {
    const buffer = readFileSync(fixturePath("protected.7z"));
    const initialAttempt = await worker.extract({
      fileName: "protected.7z",
      buffer: toArrayBuffer(buffer),
    });

    expect(initialAttempt.ok).toBe(false);
    if (initialAttempt.ok) return;
    expect(initialAttempt.code).toBe("PASSWORD_REQUIRED");

    const secondAttempt = await worker.extract({
      fileName: "protected.7z",
      buffer: toArrayBuffer(buffer),
      password: "secret",
    });

    expect(secondAttempt.ok).toBe(true);
    if (!secondAttempt.ok) return;
    expect(secondAttempt.engine).toBe("sevenZip");
    expect(secondAttempt.entries[0].path).toBe("secret.txt");
  });
});
