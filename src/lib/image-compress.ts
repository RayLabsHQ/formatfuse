import * as Comlink from "comlink";
import { captureError } from "./posthog";
import { encode as encodeJpeg } from "@jsquash/jpeg";
import { encode as encodeWebp } from "@jsquash/webp";
import { encode as encodePng } from "@jsquash/png";
import { encode as encodeAvif } from "@jsquash/avif";
import { decode as decodeJpeg } from "@jsquash/jpeg";
import { decode as decodePng } from "@jsquash/png";
import { decode as decodeWebp } from "@jsquash/webp";
import { decode as decodeAvif } from "@jsquash/avif";
import type {
  CompressOptions,
  CompressResult,
  CompressFormat,
} from "../workers/image-compress.worker";

const hasWindow = typeof window !== "undefined";
const supportsWorkerCompression =
  hasWindow &&
  typeof window.Worker !== "undefined" &&
  typeof window.OffscreenCanvas !== "undefined" &&
  typeof window.createImageBitmap === "function";

function getEnvironmentDiagnostics(extra: Record<string, unknown> = {}) {
  if (!hasWindow) return extra;

  const nav = window.navigator as Navigator & {
    deviceMemory?: number;
  };

  return {
    userAgent: nav?.userAgent,
    platform: nav?.platform,
    language: nav?.language,
    hardwareConcurrency: nav?.hardwareConcurrency,
    deviceMemory: nav?.deviceMemory,
    supportsOffscreenCanvas: "OffscreenCanvas" in window,
    supportsCreateImageBitmap: typeof window.createImageBitmap === "function",
    supportsWebAssembly: typeof WebAssembly !== "undefined",
    ...extra,
  };
}

class CanvasImageCompressor {
  private async decodeViaCanvas(blob: Blob): Promise<ImageData> {
    if (!hasWindow) {
      throw new Error("Canvas decode unavailable outside the browser");
    }

    if (typeof window.createImageBitmap === "function") {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      ctx.drawImage(bitmap, 0, 0);
      return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    }

    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      ctx.drawImage(image, 0, 0);
      return ctx.getImageData(0, 0, image.width, image.height);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private async decodeImage(blob: Blob): Promise<ImageData> {
    const arrayBuffer = await blob.arrayBuffer();
    const type = (blob.type || "").toLowerCase();

    try {
      if (type.includes("jpeg") || type.includes("jpg")) {
        return await decodeJpeg(new Uint8Array(arrayBuffer));
      }
      if (type.includes("png")) {
        return await decodePng(new Uint8Array(arrayBuffer));
      }
      if (type.includes("webp")) {
        return await decodeWebp(new Uint8Array(arrayBuffer));
      }
      if (type.includes("avif")) {
        return await decodeAvif(new Uint8Array(arrayBuffer));
      }
    } catch (error) {
      try {
        return await this.decodeViaCanvas(blob);
      } catch (_) {
        throw error;
      }
    }

    return this.decodeViaCanvas(blob);
  }

  private async resizeIfNeeded(
    imageData: ImageData,
    maxWidth?: number,
    maxHeight?: number,
  ): Promise<ImageData> {
    if (!maxWidth && !maxHeight) return imageData;

    const { width, height } = imageData;
    let newWidth = width;
    let newHeight = height;

    if (maxWidth && width > maxWidth) {
      newWidth = maxWidth;
      newHeight = Math.round((maxWidth / width) * height);
    }

    if (maxHeight && newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = Math.round((maxHeight / height) * width);
    }

    if (newWidth === width && newHeight === height) return imageData;

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceCtx = sourceCanvas.getContext("2d");
    if (!sourceCtx) throw new Error("Could not get source canvas context");
    sourceCtx.putImageData(imageData, 0, 0);

    const targetCanvas = document.createElement("canvas");
    targetCanvas.width = newWidth;
    targetCanvas.height = newHeight;
    const targetCtx = targetCanvas.getContext("2d");
    if (!targetCtx) throw new Error("Could not get target canvas context");

    targetCtx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);
    return targetCtx.getImageData(0, 0, newWidth, newHeight);
  }

  private normalizeQuality(quality: number | undefined, format: CompressFormat) {
    if (format === "png") return 100;
    const q = quality ?? 85;
    return Math.max(0, Math.min(100, q)) / 100;
  }

  async compress(
    blob: Blob,
    options: CompressOptions = {},
    onProgress?: (progress: number) => void,
  ): Promise<CompressResult> {
    onProgress?.(10);
    const imageData = await this.decodeImage(blob);
    onProgress?.(30);

    const resizedData = await this.resizeIfNeeded(
      imageData,
      options.maxWidth,
      options.maxHeight,
    );
    onProgress?.(50);

    let outputFormat: CompressFormat;
    if (options.maintainFormat !== false && !options.format) {
      const type = blob.type.toLowerCase();
      if (type.includes("jpeg") || type.includes("jpg")) {
        outputFormat = "jpeg";
      } else if (type.includes("webp")) {
        outputFormat = "webp";
      } else if (type.includes("avif")) {
        outputFormat = "avif";
      } else if (type.includes("png")) {
        outputFormat = "png";
      } else {
        outputFormat = "jpeg";
      }
    } else {
      outputFormat = options.format || "jpeg";
    }

    const quality = this.normalizeQuality(options.quality, outputFormat);
    let encoded: Uint8Array;

    if (outputFormat === "jpeg" || outputFormat === "jpg") {
      encoded = await encodeJpeg(resizedData, { quality });
    } else if (outputFormat === "webp") {
      encoded = await encodeWebp(resizedData, { quality });
    } else if (outputFormat === "avif") {
      encoded = await encodeAvif(resizedData, { quality });
    } else if (outputFormat === "png") {
      encoded = await encodePng(resizedData);
    } else {
      throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    onProgress?.(90);
    const mimeType = outputFormat === "jpg" ? "image/jpeg" : `image/${outputFormat}`;
    const compressedBlob = new Blob([encoded], { type: mimeType });
    onProgress?.(100);

    return {
      blob: compressedBlob,
      originalSize: blob.size,
      compressedSize: compressedBlob.size,
      compressionRatio:
        blob.size === 0
          ? 0
          : ((blob.size - compressedBlob.size) / blob.size) * 100,
      format: outputFormat,
    };
  }

  async compressBatch(
    blobs: Blob[],
    options: CompressOptions = {},
    onProgress?: (index: number, progress: number) => void,
  ): Promise<CompressResult[]> {
    const results: CompressResult[] = [];
    for (let i = 0; i < blobs.length; i++) {
      const result = await this.compress(blobs[i], options, (progress) =>
        onProgress?.(i, progress),
      );
      results.push(result);
    }
    return results;
  }

  destroy() {
    // no-op for compatibility with worker lifecycle
  }
}

export class ImageCompressor {
  private worker: Worker | null = null;
  private workerApi: any = null;
  private fallback: CanvasImageCompressor | null = null;
  private fallbackCaptured = false;

  constructor() {
    if (supportsWorkerCompression) {
      this.initializeWorker();
    } else {
      this.activateFallback("unsupported_environment");
    }
  }

  private async ensureWorkerReady() {
    if (!this.worker) {
      throw new Error("Worker not initialized");
    }
    if (!this.workerApi) {
      const ImageCompressWorker = Comlink.wrap<any>(this.worker);
      this.workerApi = await new (ImageCompressWorker as any)();
    }
  }

  private initializeWorker() {
    this.worker = new Worker(
      new URL("../workers/image-compress.worker.ts", import.meta.url),
      { type: "module" },
    );

    this.worker.addEventListener("error", (e: ErrorEvent) => {
      console.error("ImageCompress worker error:", e.message, e);
      try {
        captureError(e.error || e.message, {
          source: "ImageCompressor.worker.error",
          filename: (e as any).filename,
          lineno: (e as any).lineno,
          colno: (e as any).colno,
          ...getEnvironmentDiagnostics(),
        });
      } catch (_) {}
      this.activateFallback("worker_error", {
        errorMessage: e.message,
      });
    });

    this.worker.addEventListener("messageerror", (e: MessageEvent) => {
      console.error("ImageCompress worker messageerror:", e);
      try {
        captureError("Worker messageerror", {
          source: "ImageCompressor.worker.messageerror",
          ...getEnvironmentDiagnostics(),
        });
      } catch (_) {}
    });
  }

  private activateFallback(
    reason: string,
    details: Record<string, unknown> = {},
  ) {
    if (!this.fallback) {
      this.fallback = new CanvasImageCompressor();
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.workerApi = null;

    if (!this.fallbackCaptured) {
      this.fallbackCaptured = true;
      try {
        captureError("ImageCompressor fallback activated", {
          source: "ImageCompressor.fallback",
          reason,
          ...getEnvironmentDiagnostics(details),
        });
      } catch (_) {}
    }
  }

  private shouldFallbackFromError(error: unknown) {
    if (!error) return false;
    const message =
      error instanceof Error ? error.message : String(error ?? "");
    if (!message) return false;
    return (
      message.includes("OffscreenCanvas") ||
      message.includes("Canvas decode unavailable") ||
      message.includes("Could not get canvas context")
    );
  }

  async compress(
    file: File | Blob,
    options: CompressOptions = {},
    onProgress?: (progress: number) => void,
  ): Promise<CompressResult> {
    if (this.fallback) {
      return this.fallback.compress(file, options, onProgress);
    }

    try {
      await this.ensureWorkerReady();
    } catch (error) {
      this.activateFallback("worker_initialization_failed", {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      if (this.fallback) {
        return this.fallback.compress(file, options, onProgress);
      }
      throw error;
    }

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
    } catch (error) {
      if (this.shouldFallbackFromError(error)) {
        this.activateFallback("worker_runtime_error", {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        if (this.fallback) {
          return this.fallback.compress(file, options, onProgress);
        }
      }
      throw error;
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
    if (this.fallback) {
      return this.fallback.compressBatch(files, options, onProgress);
    }

    try {
      await this.ensureWorkerReady();
    } catch (error) {
      this.activateFallback("worker_initialization_failed", {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      if (this.fallback) {
        return this.fallback.compressBatch(files, options, onProgress);
      }
      throw error;
    }

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
    } catch (error) {
      if (this.shouldFallbackFromError(error)) {
        this.activateFallback("worker_runtime_error", {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        if (this.fallback) {
          return this.fallback.compressBatch(files, options, onProgress);
        }
      }
      throw error;
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
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.fallback) {
      this.fallback.destroy();
      this.fallback = null;
    }
  }
}

export type {
  CompressOptions,
  CompressResult,
  CompressFormat,
} from "../workers/image-compress.worker";
