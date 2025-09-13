import * as Comlink from "comlink";
import { captureError } from "./posthog";
import type {
  CompressOptions,
  CompressResult,
} from "../workers/image-compress.worker";

export class ImageCompressor {
  private worker: Worker;
  private workerApi: any = null;

  constructor() {
    this.worker = new Worker(
      new URL("../workers/image-compress.worker.ts", import.meta.url),
      { type: "module" },
    );

    // Surface low-level worker errors to PostHog and console
    this.worker.addEventListener("error", (e: ErrorEvent) => {
      console.error("ImageCompress worker error:", e.message, e);
      try {
        captureError(e.error || e.message, {
          source: "ImageCompressor.worker.error",
          filename: (e as any).filename,
          lineno: (e as any).lineno,
          colno: (e as any).colno,
        });
      } catch (_) {}
    });

    this.worker.addEventListener("messageerror", (e: MessageEvent) => {
      console.error("ImageCompress worker messageerror:", e);
      try {
        captureError("Worker messageerror", {
          source: "ImageCompressor.worker.messageerror",
        });
      } catch (_) {}
    });
  }

  private async ensureWorkerReady() {
    if (!this.workerApi) {
      const ImageCompressWorker = Comlink.wrap<any>(this.worker);
      this.workerApi = await new (ImageCompressWorker as any)();
    }
  }

  async compress(
    file: File | Blob,
    options: CompressOptions = {},
    onProgress?: (progress: number) => void,
  ): Promise<CompressResult> {
    await this.ensureWorkerReady();

    let progressProxy: any = undefined;

    try {
      if (onProgress) {
        progressProxy = Comlink.proxy(onProgress);
      }

      const result = await this.workerApi.compress(
        file,
        options,
        progressProxy,
      );
      return result;
    } finally {
      if (
        progressProxy &&
        typeof progressProxy[Comlink.releaseProxy] === "function"
      ) {
        progressProxy[Comlink.releaseProxy]();
      }
    }
  }

  async compressBatch(
    files: (File | Blob)[],
    options: CompressOptions = {},
    onProgress?: (index: number, progress: number) => void,
  ): Promise<CompressResult[]> {
    await this.ensureWorkerReady();

    let progressProxy: any = undefined;

    try {
      if (onProgress) {
        progressProxy = Comlink.proxy(onProgress);
      }

      const results = await this.workerApi.compressBatch(
        files,
        options,
        progressProxy,
      );
      return results;
    } finally {
      if (
        progressProxy &&
        typeof progressProxy[Comlink.releaseProxy] === "function"
      ) {
        progressProxy[Comlink.releaseProxy]();
      }
    }
  }

  destroy() {
    if (this.workerApi) {
      this.workerApi[Comlink.releaseProxy]();
      this.workerApi = null;
    }
    this.worker.terminate();
  }
}

export type {
  CompressOptions,
  CompressResult,
  CompressFormat,
} from "../workers/image-compress.worker";
