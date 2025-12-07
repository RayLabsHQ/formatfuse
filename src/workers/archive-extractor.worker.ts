import * as Comlink from "comlink";
import { detectArchiveFormat, inferOutputName, isSingleFileCompression, shouldTryLibarchiveFirst } from "../lib/archive/detect";
import type {
  ExtractRequest,
  ExtractResult,
  ExtractSuccess,
  ExtractFailure,
  WorkerArchiveEntry,
  ArchiveFormat,
  ArchiveEngine,
} from "../lib/archive/types";

import { ungzip } from "pako";
import type { LibarchiveWasm } from "libarchive-wasm";
import type { ArchiveReader as ArchiveReaderType } from "libarchive-wasm";
import type { SevenZipModule } from "7z-wasm";

/** Clone a Uint8Array's underlying buffer as a proper ArrayBuffer (not SharedArrayBuffer) */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(data.byteLength);
  new Uint8Array(buf).set(data);
  return buf;
}

export class ArchiveExtractorWorker {
  private libarchivePromise: Promise<LibarchiveWasm> | null = null;

  private sevenZipPromise: Promise<SevenZipModule> | null = null;

  private lastSevenZipStdout: string[] = [];

  private lastSevenZipStderr: string[] = [];

  private activeSession: {
    id: string;
    engine: ArchiveEngine;
    cleanup: () => void;
    fetch: (path: string) => ArrayBuffer | null;
  } | null = null;

  async warmup(): Promise<void> {
    await Promise.all([this.ensureLibarchive(), this.ensureSevenZip()]);
  }

  private nextSessionId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `sess-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  }

  private async peekStream(stream?: ReadableStream<Uint8Array> | null): Promise<Uint8Array | null> {
    if (!stream) return null;
    const reader = stream.getReader();
    const { done, value } = await reader.read();
    if (done || !value) {
      await reader.releaseLock();
      return null;
    }
    // Recreate a new stream with the peeked chunk + the rest
    const remaining = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(value);
        (async () => {
          while (true) {
            const { done: d, value: v } = await reader.read();
            if (d) {
              controller.close();
              break;
            }
            if (v) controller.enqueue(v);
          }
          await reader.releaseLock();
        })().catch(() => controller.error(new Error("Stream error")));
      },
    });
    // Replace the original stream reference with the reconstructed one
    (stream as any).getReader = remaining.getReader.bind(remaining);
    return value;
  }

  private async streamToUint8Array(stream?: ReadableStream<Uint8Array> | null, size?: number): Promise<Uint8Array> {
    if (!stream) throw new Error("No stream provided for archive data");
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
      }
      if (typeof size === "number" && total >= size) break;
    }
    await reader.releaseLock();
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  private async writeStreamToFs(module: SevenZipModule, path: string, request: ExtractRequest) {
    if (!request.stream) {
      throw new Error("No stream available for archive input");
    }
    const reader = request.stream.getReader();
    const CHUNK_SIZE = 128 * 1024;
    module.FS.writeFile(path, new Uint8Array());
    let position = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        module.FS.writeFile(path, value, { flags: "a" });
        position += value.byteLength;
      }
    }
    await reader.releaseLock();
    // Ensure file size is set (some FS impls need this)
    if (module.FS.truncate) {
      module.FS.truncate(path, position);
    }
  }

  private async ensureLibarchive(): Promise<LibarchiveWasm> {
    if (!this.libarchivePromise) {
      this.libarchivePromise = (async () => {
      const { libarchiveWasm } = await import("libarchive-wasm");
        const nodeWasmPath = typeof window === "undefined"
          ? new URL("../../public/libarchive.wasm", import.meta.url).pathname
          : null;
        return libarchiveWasm({
          locateFile: (path: string) => {
            if (path.endsWith(".wasm")) {
              if (typeof window === "undefined" && nodeWasmPath) {
                return nodeWasmPath;
              }
              return "/libarchive.wasm";
            }
            return path;
          },
        });
      })();
    }
    return this.libarchivePromise;
  }

  private async ensureSevenZip(): Promise<SevenZipModule> {
    if (!this.sevenZipPromise) {
      this.sevenZipPromise = (async () => {
        const { default: SevenZipFactory } = await import("7z-wasm");
        const wasmAsset = new URL("../../node_modules/7z-wasm/7zz.wasm", import.meta.url);
        const wasmPath =
          typeof window === "undefined" ? decodeURI(wasmAsset.pathname) : wasmAsset.href;

        return SevenZipFactory({
          locateFile: (path: string) => (path.endsWith(".wasm") ? wasmPath : path),
          print: (line: string) => {
            this.lastSevenZipStdout.push(line);
          },
          printErr: (line: string) => {
            this.lastSevenZipStderr.push(line);
          },
          quit: (status: number) => {
            throw Object.assign(new Error(`7zip exited with status ${status}`), {
              status,
            });
          },
          noInitialRun: true,
          noExitRuntime: true,
        } as any);
      })();
    }
    return this.sevenZipPromise;
  }

  async extract(request: ExtractRequest): Promise<ExtractResult> {
    try {
      this.releaseCurrentSession();
      return await this.handleExtract(request);
    } catch (error) {
      const failure: ExtractFailure = {
        ok: false,
        code: "EXTRACTION_FAILED",
        message: error instanceof Error ? error.message : "Extraction failed",
        recoverable: false,
      };
      return failure;
    }
  }

  private releaseCurrentSession() {
    if (this.activeSession) {
      try {
        this.activeSession.cleanup();
      } catch (err) {
        // ignore cleanup errors
      }
      this.activeSession = null;
    }
  }

  private async handleExtract(request: ExtractRequest): Promise<ExtractResult> {
    const sourceBuffer = request.buffer ? new Uint8Array(request.buffer) : null;
    const detectionSource = sourceBuffer ?? (request.stream ? await this.peekStream(request.stream) : null);
    if (!detectionSource) {
      throw new Error("No archive data provided");
    }
    const detection = detectArchiveFormat(detectionSource, request.fileName);

    if (isSingleFileCompression(detection.format) && detection.format.format === "gz") {
      const gzData = sourceBuffer ?? (await this.streamToUint8Array(request.stream, request.size));
      const single = await this.extractSingle(gzData, request, detection.format);
      return this.withTransfer(single);
    }

    const attempts: ExtractFailure[] = [];

    const tryLibarchiveFirst = shouldTryLibarchiveFirst(detection.format);

    if (isSingleFileCompression(detection.format) && detection.format.format !== "gz") {
      const sevenZipResult = await this.trySevenZip(sourceBuffer, request, detection.format);
      if (sevenZipResult.ok) {
        if (sevenZipResult.entries.length === 1) {
          const desiredName = inferOutputName(request.fileName);
          const [entry] = sevenZipResult.entries;
          const renamedEntry: WorkerArchiveEntry = {
            ...entry,
            path: desiredName,
          };
          return this.withTransfer({ ...sevenZipResult, entries: [renamedEntry] });
        }
        return this.withTransfer(sevenZipResult);
      }
      attempts.push(sevenZipResult);
      if (sevenZipResult.code === "PASSWORD_REQUIRED") {
        return sevenZipResult;
      }
    }

    if (tryLibarchiveFirst) {
      const libarchiveResult = await this.tryLibarchive(sourceBuffer, request, detection.format);
      if (libarchiveResult.ok) {
        return this.withTransfer(libarchiveResult);
      }
      attempts.push(libarchiveResult);
      if (libarchiveResult.code === "PASSWORD_REQUIRED") {
        return libarchiveResult;
      }
    }

    const sevenZipResult = await this.trySevenZip(sourceBuffer, request, detection.format);
    if (sevenZipResult.ok) {
      return this.withTransfer(sevenZipResult);
    }

    attempts.push(sevenZipResult);

    if (!tryLibarchiveFirst) {
      const libarchiveResult = await this.tryLibarchive(sourceBuffer, request, detection.format);
      if (libarchiveResult.ok) {
        return this.withTransfer(libarchiveResult);
      }
      attempts.push(libarchiveResult);
      if (libarchiveResult.code === "PASSWORD_REQUIRED") {
        return libarchiveResult;
      }
    }

    // Prefer password errors
    const passwordFailure = attempts.find((attempt) => attempt.code === "PASSWORD_REQUIRED");
    if (passwordFailure) {
      return passwordFailure;
    }

    const meaningful = attempts.find((attempt) => attempt.code !== "EXTRACTION_FAILED");
    if (meaningful) {
      return meaningful;
    }

    return attempts[0] ?? {
      ok: false,
      code: "EXTRACTION_FAILED",
      message: "Archive could not be extracted with the available engines.",
      recoverable: false,
    };
  }

  private withTransfer(result: ExtractSuccess): ExtractResult {
    const transferables: ArrayBuffer[] = [];
    const entriesWithTransfer: WorkerArchiveEntry[] = result.entries.map((entry) => {
      if (entry.data) {
        transferables.push(entry.data);
      }
      return entry;
    });

    return Comlink.transfer(
      {
        ...result,
        entries: entriesWithTransfer,
      },
      transferables,
    );
  }

  private async extractSingle(
    data: Uint8Array,
    request: ExtractRequest,
    format: ArchiveFormat,
  ): Promise<ExtractSuccess> {
    const sessionId = this.nextSessionId();
    const outputName = inferOutputName(request.fileName);
    let decompressed: Uint8Array;

    switch (format.format) {
      case "gz":
        decompressed = ungzip(data);
        break;
      default:
        throw new Error(`Unsupported single-file format ${format.format}`);
    }

    const dataBuffer = toArrayBuffer(decompressed);
    this.activeSession = {
      id: sessionId,
      engine: "native",
      cleanup: () => {
        // allow GC
      },
      fetch: (path: string) => {
        if (path === outputName) {
          return dataBuffer;
        }
        return null;
      },
    };

    const entry: WorkerArchiveEntry = {
      path: outputName,
      size: decompressed.byteLength,
      isDirectory: false,
      lastModified: Date.now(),
      data: dataBuffer,
    };

    return {
      ok: true,
      entries: [entry],
      engine: "native",
      format,
      warnings: [],
      sessionId,
    };
  }

  private async tryLibarchive(
    data: Uint8Array | null,
    request: ExtractRequest,
    format: ArchiveFormat,
  ): Promise<ExtractResult> {
    let reader: ArchiveReaderType | null = null;
    const dataMap = new Map<string, ArrayBuffer>();
    const sessionId = this.nextSessionId();

    try {
      const mod = await this.ensureLibarchive();
      const { ArchiveReader } = await import("libarchive-wasm");
      const archiveData = data ?? (await this.streamToUint8Array(request.stream, request.size));
      reader = new ArchiveReader(mod, new Int8Array(archiveData), request.password ?? undefined);

      const entries: WorkerArchiveEntry[] = [];
      for (const entry of reader.entries()) {
        const path = entry.getPathname();
        const size = entry.getSize();
        const type = entry.getFiletype();
        const isDirectory = type === "Directory" || path.endsWith("/");
        let payload: Uint8Array | undefined;

        if (!isDirectory && size >= 0) {
          try {
            const read = entry.readData();
            if (read) {
              payload = new Uint8Array(read);
              dataMap.set(path, toArrayBuffer(payload));
            }
          } catch (err) {
            entry.skipData();
            throw err;
          }
        } else {
          entry.skipData();
        }

        entries.push({
          path,
          size,
          isDirectory,
          lastModified: entry.getModificationTime?.() ?? null,
        });
      }

      reader.free();
      reader = null;

      this.activeSession = {
        id: sessionId,
        engine: "libarchive",
        cleanup: () => {
          dataMap.clear();
        },
        fetch: (path: string) => dataMap.get(path) ?? null,
      };

      return {
        ok: true,
        entries,
        engine: "libarchive",
        warnings: [],
        format,
        encrypted: Boolean(request.password && request.password.length > 0),
        sessionId,
      } satisfies ExtractSuccess;
    } catch (error) {
      if (reader) {
        try {
          reader.free();
        } catch (e) {
          // ignore
        }
      }
      const failure: ExtractFailure = this.classifyLibarchiveError(error as Error, format);
      return failure;
    }
  }

  private classifyLibarchiveError(error: Error, format: ArchiveFormat): ExtractFailure {
    const message = error.message || "libarchive failed";
    const normalized = message.toLowerCase();

    if (
      normalized.includes("incorrect password") ||
      normalized.includes("wrong password") ||
      normalized.includes("bad password") ||
      normalized.includes("incorrect passphrase")
    ) {
      return {
        ok: false,
        code: "PASSWORD_REQUIRED",
        message: "The password you entered is incorrect. Try again.",
        recoverable: true,
        format,
        engine: "libarchive",
      };
    }

    if (normalized.includes("password") || normalized.includes("passphrase")) {
      return {
        ok: false,
        code: "PASSWORD_REQUIRED",
        message: "This archive is encrypted. Provide a password to continue.",
        recoverable: true,
        format,
        engine: "libarchive",
      };
    }

    if (normalized.includes("memory access out of bounds")) {
      return {
        ok: false,
        code: "UNSUPPORTED_FORMAT",
        message: "This archive type isn\'t supported by the libarchive engine.",
        recoverable: true,
        format,
        engine: "libarchive",
      };
    }

    return {
      ok: false,
      code: "EXTRACTION_FAILED",
      message,
      recoverable: true,
      format,
      engine: "libarchive",
    };
  }

  private async trySevenZip(
    data: Uint8Array | null,
    request: ExtractRequest,
    format: ArchiveFormat,
  ): Promise<ExtractResult> {
    this.lastSevenZipStdout = [];
    this.lastSevenZipStderr = [];
    const module = await this.ensureSevenZip();

    const archiveName = `input-${Date.now()}.bin`;
    const outputDir = `/output-${Date.now().toString(16)}`;
    const sessionId = this.nextSessionId();

    try {
      if (data) {
        module.FS.writeFile(archiveName, data);
      } else {
        await this.writeStreamToFs(module, archiveName, request);
      }
      try {
        module.FS.mkdir(outputDir);
      } catch (error) {
        // directory might exist from previous runs; ignore
      }

      const args = ["x", archiveName, `-o${outputDir}`, "-y", "-bd", `-p${request.password ?? ""}`];

      try {
        module.callMain(args);
      } catch (error) {
        const failure = this.classifySevenZipError(error as Error, format);
        this.cleanupSevenZip(module, archiveName, outputDir);
        return failure;
      }

      const immediateFailure = this.analyzeSevenZipMessages(format);
      if (immediateFailure) {
        this.cleanupSevenZip(module, archiveName, outputDir);
        return immediateFailure;
      }

      const entries = this.collectSevenZipEntries(module, outputDir);
      if (entries.length === 0 && this.lastSevenZipStderr.length > 0) {
        const failure = this.analyzeSevenZipMessages(format) ?? {
          ok: false,
          code: "EXTRACTION_FAILED",
          message: this.lastSevenZipStderr.join("\n") || "7-Zip did not produce any files.",
          recoverable: true,
          format,
          engine: "sevenZip",
        };
        this.cleanupSevenZip(module, archiveName, outputDir);
        return failure;
      }
      try {
        module.FS.unlink(archiveName);
      } catch (err) {
        // ignore
      }

      this.activeSession = {
        id: sessionId,
        engine: "sevenZip",
        cleanup: () => {
          this.cleanupSevenZip(module, archiveName, outputDir);
        },
        fetch: (path: string) => {
          const normalized = path.replace(/\\+/g, "/");
          const fullPath = `${outputDir}/${normalized}`.replace(/\\+/g, "/");
          try {
            const stat = module.FS.stat(fullPath);
            if (module.FS.isDir(stat.mode)) {
              return null;
            }
            const fileData = module.FS.readFile(fullPath, { encoding: "binary" });
            return toArrayBuffer(fileData);
          } catch (err) {
            return null;
          }
        },
      };

      return {
        ok: true,
        entries,
        engine: "sevenZip",
        warnings: this.lastSevenZipStderr.slice(),
        format,
        encrypted: Boolean(request.password && request.password.length > 0),
        sessionId,
      } satisfies ExtractSuccess;
    } catch (error) {
      this.cleanupSevenZip(module, archiveName, outputDir);
      return this.classifySevenZipError(error as Error, format);
    }
  }

  private collectSevenZipEntries(module: SevenZipModule, outputDir: string): WorkerArchiveEntry[] {
    const entries: WorkerArchiveEntry[] = [];
    const walk = (dir: string, base: string) => {
      const items = module.FS.readdir(dir);
      for (const item of items) {
        if (item === "." || item === "..") continue;
        const fullPath = `${dir}/${item}`.replace(/\\+/g, "/");
        const stat = module.FS.stat(fullPath);
        const relative = `${base}${item}`;
        if (module.FS.isDir(stat.mode)) {
          entries.push({
            path: `${relative}/`,
            size: 0,
            isDirectory: true,
            lastModified: stat.mtime?.getTime?.() ?? null,
          });
          walk(fullPath, `${relative}/`);
        } else if (module.FS.isFile(stat.mode)) {
          const size = stat.size ?? 0;
          let data: ArrayBuffer | undefined;
          // Attach data for small files to reduce fetch round-trips, keep large files lazy
          if (size <= 5 * 1024 * 1024) {
            try {
              const fileData = module.FS.readFile(fullPath, { encoding: "binary" });
              data = toArrayBuffer(fileData);
            } catch (err) {
              // ignore, will be fetched on demand
            }
          }
          entries.push({
            path: relative,
            size,
            isDirectory: false,
            lastModified: stat.mtime?.getTime?.() ?? null,
            data,
          });
        }
      }
    };

    walk(outputDir, "");
    return entries;
  }

  private cleanupSevenZip(module: SevenZipModule, archiveName: string, outputDir: string) {
    try {
      module.FS.unlink(archiveName);
    } catch (error) {
      // ignore
    }
    this.removeDirRecursive(module, outputDir);
  }

  private removeDirRecursive(module: SevenZipModule, dir: string) {
    try {
      const items = module.FS.readdir(dir);
      for (const item of items) {
        if (item === "." || item === "..") continue;
        const fullPath = `${dir}/${item}`.replace(/\\+/g, "/");
        const stat = module.FS.lookupPath(fullPath).node;
        if (module.FS.isDir(stat.mode)) {
          this.removeDirRecursive(module, fullPath);
        } else {
          module.FS.unlink(fullPath);
        }
      }
      module.FS.rmdir(dir);
    } catch (error) {
      // ignore cleanup errors
    }
  }

  private classifySevenZipError(error: Error, format: ArchiveFormat): ExtractFailure {
    const stderr = this.lastSevenZipStderr.join("\n").toLowerCase();
    const stdout = this.lastSevenZipStdout.join("\n").toLowerCase();
    const combined = `${stderr}\n${stdout}`;
    const message = error.message || "";

    if (
      combined.includes("wrong password") ||
      combined.includes("can not open encrypted archive") ||
      combined.includes("incorrect password")
    ) {
      return {
        ok: false,
        code: "PASSWORD_REQUIRED",
        message: "The password you entered is incorrect. Try again.",
        recoverable: true,
        format,
        engine: "sevenZip",
      };
    }

    if (combined.includes("array buffer allocation failed") || message.toLowerCase().includes("array buffer allocation failed")) {
      return {
        ok: false,
        code: "EXTRACTION_FAILED",
        message: "Your device ran out of memory while opening this archive. Try closing other tabs or splitting the archive into smaller parts.",
        recoverable: true,
        format,
        engine: "sevenZip",
      };
    }

    if (combined.includes("unsupported")) {
      return {
        ok: false,
        code: "UNSUPPORTED_FORMAT",
        message: "7-Zip could not handle this archive format.",
        recoverable: true,
        format,
        engine: "sevenZip",
      };
    }

    return {
      ok: false,
      code: "EXTRACTION_FAILED",
      message: error.message || "7-Zip failed to extract this archive.",
      recoverable: true,
      format,
      engine: "sevenZip",
    };
  }

  private analyzeSevenZipMessages(format: ArchiveFormat): ExtractFailure | null {
    const stderr = this.lastSevenZipStderr.join("\n").toLowerCase();

    if (
      stderr.includes("wrong password") ||
      stderr.includes("data error in encrypted file") ||
      stderr.includes("incorrect password")
    ) {
      return {
        ok: false,
        code: "PASSWORD_REQUIRED",
        message: "The password you entered is incorrect. Try again.",
        recoverable: true,
        format,
        engine: "sevenZip",
      };
    }

    if (stderr.includes("error:")) {
      return {
        ok: false,
        code: "EXTRACTION_FAILED",
        message: this.lastSevenZipStderr.join("\n") || "7-Zip failed to extract this archive.",
        recoverable: true,
        format,
        engine: "sevenZip",
      };
    }

    return null;
  }

  async fetchEntry(sessionId: string, path: string) {
    if (!this.activeSession || this.activeSession.id !== sessionId) {
      return { ok: false, message: "This archive session is no longer available. Please reopen the file." };
    }
    try {
      const data =
        this.activeSession.fetch(path) ||
        (path.endsWith("/") ? null : this.activeSession.fetch(`${path}/`));
      if (!data) {
        return { ok: false, message: "That file is not available in the current archive." };
      }
      return Comlink.transfer({ ok: true, data }, [data]);
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to load file data.",
      };
    }
  }

  async release(sessionId: string) {
    if (this.activeSession && this.activeSession.id === sessionId) {
      this.releaseCurrentSession();
    }
  }
}

if (typeof self !== "undefined" && typeof (self as { postMessage?: unknown }).postMessage === "function") {
  Comlink.expose(new ArchiveExtractorWorker());
}
