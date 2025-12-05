import * as Comlink from "comlink";

import type {
  CreateArchiveRequest,
  CreateArchiveResult,
  CreateArchiveSuccess,
  CreateArchiveFailure,
  ArchiveCreateFormat,
} from "../lib/archive/types";
import type { SevenZipModule } from "7z-wasm";

/** Clone a Uint8Array's underlying buffer as a proper ArrayBuffer (not SharedArrayBuffer) */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(data.byteLength);
  new Uint8Array(buf).set(data);
  return buf;
}

export class ArchiveCreatorWorker {
  private sevenZipPromise: Promise<SevenZipModule> | null = null;
  private lastStdout: string[] = [];
  private lastStderr: string[] = [];

  async warmup(): Promise<void> {
    await this.ensureSevenZip();
  }

  private async ensureSevenZip(): Promise<SevenZipModule> {
    if (!this.sevenZipPromise) {
      this.sevenZipPromise = (async () => {
        const { default: SevenZipFactory } = await import("7z-wasm");
        const wasmAsset = new URL("../../node_modules/7z-wasm/7zz.wasm", import.meta.url);
        const wasmPath = typeof window === "undefined" ? decodeURI(wasmAsset.pathname) : wasmAsset.href;

        return SevenZipFactory({
          locateFile: (path: string) => (path.endsWith(".wasm") ? wasmPath : path),
          print: (line: string) => {
            this.lastStdout.push(line);
          },
          printErr: (line: string) => {
            this.lastStderr.push(line);
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

  async create(request: CreateArchiveRequest): Promise<CreateArchiveResult> {
    if (!request.files || request.files.length === 0) {
      return {
        ok: false,
        code: "CREATE_FAILED",
        message: "Add at least one file before creating an archive.",
        recoverable: true,
      } satisfies CreateArchiveFailure;
    }

    if (!this.supportsFormat(request.format)) {
      return {
        ok: false,
        code: "UNSUPPORTED_FORMAT",
        message: `Archive format ${request.format} is not supported for browser-based creation.`,
        recoverable: false,
      } satisfies CreateArchiveFailure;
    }

    this.lastStdout = [];
    this.lastStderr = [];

    const module = await this.ensureSevenZip();
    const inputRoot = `input-${Date.now().toString(16)}`;
    const archiveBaseName = `output-${Date.now().toString(16)}.${this.getExtension(request.format)}`;
    const archivePath = `/${archiveBaseName}`;

    try {
      try {
        module.FS.mkdir(inputRoot);
      } catch (error) {
        // directory may already exist from previous runs
      }

      const writtenFiles: string[] = [];
      const relativePaths: string[] = [];
      for (const file of request.files) {
        const sanitizedPath = this.sanitizePath(file.path);
        if (!sanitizedPath) {
          return {
            ok: false,
            code: "CREATE_FAILED",
            message: "File paths cannot contain '..' or start from the root. Please rename and try again.",
            recoverable: true,
          } satisfies CreateArchiveFailure;
        }
        const fullPath = `${inputRoot}/${sanitizedPath}`;
        const directoryPath = fullPath.includes("/")
          ? fullPath.slice(0, fullPath.lastIndexOf("/"))
          : inputRoot;
        this.ensureDirectory(module, directoryPath);
        module.FS.writeFile(fullPath, new Uint8Array(file.data));
        writtenFiles.push(fullPath);
        relativePaths.push(sanitizedPath);
      }

      const args = this.buildCommandArgs(request, archivePath, relativePaths);
      const previousDir = module.FS.cwd?.() ?? "/";
      if (module.FS.chdir) {
        module.FS.chdir(inputRoot);
      }

      try {
        module.callMain(args);
      } catch (error) {
        if (module.FS.chdir && previousDir) {
          module.FS.chdir(previousDir);
        }
        this.cleanup(module, inputRoot, archivePath, writtenFiles);
        return this.classifySevenZipError(error as Error);
      }

      if (module.FS.chdir && previousDir) {
        module.FS.chdir(previousDir);
      }

      const archiveData = module.FS.readFile(archivePath, { encoding: "binary" });
      this.cleanup(module, inputRoot, archivePath, writtenFiles);

      return {
        ok: true,
        data: toArrayBuffer(archiveData),
        format: request.format,
        engine: "sevenZip",
        warnings: this.lastStderr.slice(),
        passwordProtected: Boolean(request.password && request.password.length > 0),
      } satisfies CreateArchiveSuccess;
    } catch (error) {
      this.cleanup(module, inputRoot, archivePath, []);
      return this.classifySevenZipError(error as Error);
    }
  }

  private supportsFormat(format: ArchiveCreateFormat): boolean {
    return format === "zip" || format === "sevenZip";
  }

  private getExtension(format: ArchiveCreateFormat): string {
    return format === "zip" ? "zip" : "7z";
  }

  private sanitizePath(path: string): string {
    const cleaned = path.replace(/\\+/g, "/").trim();
    if (!cleaned || cleaned.startsWith("/") || /^[A-Za-z]:/.test(cleaned)) {
      return "";
    }

    const parts = cleaned.split("/").filter(Boolean);
    const safeParts: string[] = [];
    for (const part of parts) {
      if (part === ".") continue;
      if (part === "..") {
        // Reject traversal attempts outright
        return "";
      }
      safeParts.push(part);
    }

    if (safeParts.length === 0) {
      return "file";
    }

    return safeParts.join("/");
  }

  private ensureDirectory(module: SevenZipModule, directory: string) {
    const normalized = directory.replace(/\\+/g, "/").replace(/^\/+/, "");
    if (!normalized) {
      return;
    }

    const segments = normalized.split("/").filter(Boolean);
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      try {
        module.FS.mkdir(current);
      } catch (error) {
        // ignore if directory already exists
      }
    }
  }

  private buildCommandArgs(
    request: CreateArchiveRequest,
    archivePath: string,
    filePaths: string[],
  ): string[] {
    const args = ["a"];
    const compressionLevel = this.normalizeCompressionLevel(request.compressionLevel);

    if (request.format === "zip") {
      args.push("-tzip", "-mm=Deflate", `-mx=${compressionLevel}`);
      if (request.password && request.password.length > 0) {
        args.push("-mem=AES256");
      }
    } else {
      args.push("-t7z", "-m0=lzma2", `-mx=${compressionLevel}`);
      if (request.encryptHeaders) {
        args.push("-mhe=on");
      }
    }

    args.push("-y", "-bd");

    if (request.password && request.password.length > 0) {
      args.push(this.buildPasswordArg(request.password));
    }

    args.push(archivePath);
    args.push(...filePaths);

    return args;
  }

  private buildPasswordArg(password: string): string {
    // 7-Zip expects the password immediately after -p with no space; argv items are not shell-split.
    const sanitized = password.replace(/"/g, "");
    return `-p${sanitized}`;
  }

  private normalizeCompressionLevel(level?: number): number {
    if (!Number.isFinite(level)) return 6;
    return Math.min(9, Math.max(0, Math.round(level as number)));
  }

  private cleanup(
    module: SevenZipModule,
    inputRoot: string,
    archivePath: string,
    writtenFiles: string[],
  ) {
    writtenFiles.forEach((path) => {
      try {
        module.FS.unlink(path);
      } catch (error) {
        // ignore
      }
    });

    this.removeDirRecursive(module, inputRoot);

    try {
      module.FS.unlink(archivePath);
    } catch (error) {
      // ignore cleanup failures
    }
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

  private classifySevenZipError(error: Error): CreateArchiveFailure {
    const stderr = this.lastStderr.join("\n").toLowerCase();
    const message = error.message || "Failed to create archive";

    if (stderr.includes("unsupported")) {
      return {
        ok: false,
        code: "UNSUPPORTED_FORMAT",
        message: "7-Zip could not create this archive format in the browser environment.",
        recoverable: false,
      } satisfies CreateArchiveFailure;
    }

    return {
      ok: false,
      code: "CREATE_FAILED",
      message,
      recoverable: true,
    } satisfies CreateArchiveFailure;
  }
}

if (
  typeof self !== "undefined" &&
  typeof (self as { postMessage?: unknown }).postMessage === "function"
) {
  Comlink.expose(new ArchiveCreatorWorker());
}

export default ArchiveCreatorWorker;
