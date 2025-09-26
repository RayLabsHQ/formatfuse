import * as Comlink from "comlink";
import { detectArchiveFormat, inferOutputName, isSingleFileCompression, shouldTryLibarchiveFirst } from "../lib/archive/detect";
import type {
  ExtractRequest,
  ExtractResult,
  ExtractSuccess,
  ExtractFailure,
  WorkerArchiveEntry,
  ArchiveFormat,
} from "../lib/archive/types";

import { ungzip } from "pako";
import type { LibarchiveWasm } from "libarchive-wasm";
import type { ArchiveReader as ArchiveReaderType } from "libarchive-wasm";
import type { SevenZipModule } from "7z-wasm";

export class ArchiveExtractorWorker {
  private libarchivePromise: Promise<LibarchiveWasm> | null = null;

  private sevenZipPromise: Promise<SevenZipModule> | null = null;

  private lastSevenZipStdout: string[] = [];

  private lastSevenZipStderr: string[] = [];

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

  private async handleExtract(request: ExtractRequest): Promise<ExtractResult> {
    const data = new Uint8Array(request.buffer);
    const detection = detectArchiveFormat(data, request.fileName);

    if (isSingleFileCompression(detection.format) && detection.format.format === "gz") {
      const single = await this.extractSingle(data, request, detection.format);
      return this.withTransfer(single);
    }

    const attempts: ExtractFailure[] = [];

    const tryLibarchiveFirst = shouldTryLibarchiveFirst(detection.format);

    if (isSingleFileCompression(detection.format) && detection.format.format !== "gz") {
      const sevenZipResult = await this.trySevenZip(data, request, detection.format);
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
      const libarchiveResult = await this.tryLibarchive(data, request, detection.format);
      if (libarchiveResult.ok) {
        return this.withTransfer(libarchiveResult);
      }
      attempts.push(libarchiveResult);
      if (libarchiveResult.code === "PASSWORD_REQUIRED") {
        return libarchiveResult;
      }
    }

    const sevenZipResult = await this.trySevenZip(data, request, detection.format);
    if (sevenZipResult.ok) {
      return this.withTransfer(sevenZipResult);
    }

    attempts.push(sevenZipResult);

    if (!tryLibarchiveFirst) {
      const libarchiveResult = await this.tryLibarchive(data, request, detection.format);
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
    const outputName = inferOutputName(request.fileName);
    let decompressed: Uint8Array;

    switch (format.format) {
      case "gz":
        decompressed = ungzip(data);
        break;
      default:
        throw new Error(`Unsupported single-file format ${format.format}`);
    }

    const entry: WorkerArchiveEntry = {
      path: outputName,
      size: decompressed.byteLength,
      isDirectory: false,
      lastModified: Date.now(),
      data: decompressed.buffer,
    };

    return {
      ok: true,
      entries: [entry],
      engine: "native",
      format,
      warnings: [],
    };
  }

  private async tryLibarchive(
    data: Uint8Array,
    request: ExtractRequest,
    format: ArchiveFormat,
  ): Promise<ExtractResult> {
    let reader: ArchiveReaderType | null = null;

    try {
      const mod = await this.ensureLibarchive();
      const { ArchiveReader } = await import("libarchive-wasm");
      reader = new ArchiveReader(mod, new Int8Array(data), request.password ?? undefined);

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
          data: payload?.buffer,
        });
      }

      reader.free();
      reader = null;

      return {
        ok: true,
        entries,
        engine: "libarchive",
        warnings: [],
        format,
        encrypted: Boolean(request.password && request.password.length > 0),
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
      };
    }

    if (normalized.includes("password") || normalized.includes("passphrase")) {
      return {
        ok: false,
        code: "PASSWORD_REQUIRED",
        message: "This archive is encrypted. Provide a password to continue.",
        recoverable: true,
        format,
      };
    }

    if (normalized.includes("memory access out of bounds")) {
      return {
        ok: false,
        code: "UNSUPPORTED_FORMAT",
        message: "This archive type isn\'t supported by the libarchive engine.",
        recoverable: true,
        format,
      };
    }

    return {
      ok: false,
      code: "EXTRACTION_FAILED",
      message,
      recoverable: true,
      format,
    };
  }

  private async trySevenZip(
    data: Uint8Array,
    request: ExtractRequest,
    format: ArchiveFormat,
  ): Promise<ExtractResult> {
    this.lastSevenZipStdout = [];
    this.lastSevenZipStderr = [];
    const module = await this.ensureSevenZip();

    const archiveName = `input-${Date.now()}.bin`;
    const outputDir = `/output-${Date.now().toString(16)}`;

    try {
      module.FS.writeFile(archiveName, data);
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
        };
        this.cleanupSevenZip(module, archiveName, outputDir);
        return failure;
      }
      this.cleanupSevenZip(module, archiveName, outputDir);

      return {
        ok: true,
        entries,
        engine: "sevenZip",
        warnings: this.lastSevenZipStderr.slice(),
        format,
        encrypted: Boolean(request.password && request.password.length > 0),
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
          const fileData = module.FS.readFile(fullPath, { encoding: "binary" });
          entries.push({
            path: relative,
            size: fileData.byteLength,
            isDirectory: false,
            lastModified: stat.mtime?.getTime?.() ?? null,
            data: fileData.buffer,
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
      };
    }

    if (combined.includes("unsupported")) {
      return {
        ok: false,
        code: "UNSUPPORTED_FORMAT",
        message: "7-Zip could not handle this archive format.",
        recoverable: true,
        format,
      };
    }

    return {
      ok: false,
      code: "EXTRACTION_FAILED",
      message: error.message || "7-Zip failed to extract this archive.",
      recoverable: true,
      format,
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
      };
    }

    if (stderr.includes("error:")) {
      return {
        ok: false,
        code: "EXTRACTION_FAILED",
        message: this.lastSevenZipStderr.join("\n") || "7-Zip failed to extract this archive.",
        recoverable: true,
        format,
      };
    }

    return null;
  }
}

if (typeof self !== "undefined" && typeof (self as { postMessage?: unknown }).postMessage === "function") {
  Comlink.expose(new ArchiveExtractorWorker());
}
