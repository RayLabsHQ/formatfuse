// @vitest-environment node

import { describe, it, expect, beforeAll } from "vitest";
import { Buffer } from "node:buffer";

import { ArchiveCreatorWorker } from "../../src/workers/archive-creator.worker";
import { ArchiveExtractorWorker } from "../../src/workers/archive-extractor.worker";

function textBuffer(value: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(value);
  const buf = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buf).set(encoded);
  return buf;
}

function cloneBuffer(buffer: ArrayBuffer): ArrayBuffer {
  const clone = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(clone).set(new Uint8Array(buffer));
  return clone;
}

describe("ArchiveCreatorWorker", () => {
  let creator: ArchiveCreatorWorker;
  let extractor: ArchiveExtractorWorker;

  beforeAll(() => {
    creator = new ArchiveCreatorWorker();
    extractor = new ArchiveExtractorWorker();
  });

  it("creates AES-256 encrypted ZIP archives that unlock with the provided password", async () => {
    const files = [
      {
        path: "docs/readme.txt",
        data: textBuffer("Encrypted hello world"),
      },
      {
        path: "bin/data.bin",
        data: new Uint8Array([1, 2, 3, 4]).buffer,
      },
    ];

    const password = "topsecret";
    const result = await creator.create({
      format: "zip",
      files,
      password,
    });

    if (!result.ok) {
      console.error("Encrypted creation failed", result);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.passwordProtected).toBe(true);
    expect(result.engine).toBe("sevenZip");
    expect(result.warnings.length).toBeGreaterThanOrEqual(0);

    const wrongAttempt = await extractor.extract({
      fileName: "encrypted.zip",
      buffer: cloneBuffer(result.data),
      password: "incorrect",
    });

    expect(wrongAttempt.ok).toBe(false);
    if (wrongAttempt.ok) return;
    expect(wrongAttempt.code).toBe("PASSWORD_REQUIRED");
    expect(wrongAttempt.message.toLowerCase()).toContain("password");

    const successAttempt = await extractor.extract({
      fileName: "encrypted.zip",
      buffer: cloneBuffer(result.data),
      password,
    });
    if (!successAttempt.ok) {
      console.error("Encrypted extract failed", successAttempt);
    }

    expect(successAttempt.ok).toBe(true);
    if (!successAttempt.ok) return;

    const fileEntries = successAttempt.entries.filter((entry) => !entry.isDirectory);
    const paths = fileEntries.map((entry) => entry.path).sort();
    expect(paths).toEqual(["bin/data.bin", "docs/readme.txt"]);

    const textEntry = successAttempt.entries.find((entry) => entry.path === "docs/readme.txt");
    expect(textEntry).toBeDefined();
    if (!textEntry) return;
    const fetched = await extractor.fetchEntry(successAttempt.sessionId, textEntry.path);
    expect(fetched.ok).toBe(true);
    if (!fetched.ok) return;
    expect(Buffer.from((fetched as { ok: true; data: ArrayBuffer }).data).toString("utf8")).toBe("Encrypted hello world");
  });

  it("creates standard ZIP archives when no password is supplied", async () => {
    const files = [
      {
        path: "plain.txt",
        data: textBuffer("just text"),
      },
    ];

    const result = await creator.create({
      format: "zip",
      files,
    });

    if (!result.ok) {
      console.error("Plain creation failed", result);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.passwordProtected).toBe(false);

    const extracted = await extractor.extract({
      fileName: "plain.zip",
      buffer: cloneBuffer(result.data),
    });

    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;

    const extractedFiles = extracted.entries.filter((entry) => !entry.isDirectory);
    expect(extractedFiles).toHaveLength(1);
    expect(extractedFiles[0].path).toBe("plain.txt");
    const fetched = await extractor.fetchEntry(extracted.sessionId, extractedFiles[0].path);
    expect(fetched.ok).toBe(true);
    if (!fetched.ok) return;
    expect(Buffer.from((fetched as { ok: true; data: ArrayBuffer }).data).toString("utf8")).toBe("just text");
  });
});
