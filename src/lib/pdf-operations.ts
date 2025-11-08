import * as Comlink from "comlink";
import type { Remote } from "comlink";

export interface SplitOptions {
  pageRanges: Array<{ start: number; end: number }>;
}

export interface MergeOptions {
  files: Uint8Array[];
}

export interface RotateOptions {
  pages?: number[];
  angle: 90 | 180 | 270;
}

export interface ExtractOptions {
  pages: number[];
}

export interface PdfToImageOptions {
  pages?: number[];
  format: "png" | "jpeg";
  quality?: number;
  scale?: number;
}

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
}

export interface CompressOptions {
  imageQuality: number;
  removeMetadata: boolean;
  optimizeImages: boolean;
  grayscale: boolean;
  level?: "balanced" | "high-quality" | "small-size" | "extreme";
}

interface PDFOperationsWorkerAPI {
  split(
    pdfData: Uint8Array,
    options: SplitOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array[]>;
  merge(
    options: MergeOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array>;
  rotate(
    pdfData: Uint8Array,
    options: RotateOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array>;
  extract(
    pdfData: Uint8Array,
    options: ExtractOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array>;
  pdfToImages(
    pdfData: Uint8Array,
    options: PdfToImageOptions,
    onProgress?: (progress: number) => void,
  ): Promise<{ page: number; data: Uint8Array; mimeType: string }[]>;
  getPageCount(pdfData: Uint8Array): Promise<number>;
  getMetadata(pdfData: Uint8Array): Promise<PdfMetadata>;
  compress(
    pdfData: Uint8Array,
    options: CompressOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array>;
}

export class PDFOperations {
  private worker: Worker;
  private api: Remote<PDFOperationsWorkerAPI>;

  constructor() {
    this.worker = new Worker(
      new URL("../workers/pdf-operations.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.api = Comlink.wrap<PDFOperationsWorkerAPI>(this.worker);
  }

  async split(
    pdfData: Uint8Array,
    options: SplitOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array[]> {
    // Create a copy to avoid transferring the original
    const dataCopy = new Uint8Array(pdfData);
    return this.api.split(
      dataCopy,
      options,
      onProgress ? Comlink.proxy(onProgress) : undefined,
    );
  }

  async merge(
    options: MergeOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    return this.api.merge(
      options,
      onProgress ? Comlink.proxy(onProgress) : undefined,
    );
  }

  async rotate(
    pdfData: Uint8Array,
    options: RotateOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    // Create a copy to avoid transferring the original
    const dataCopy = new Uint8Array(pdfData);
    return this.api.rotate(
      dataCopy,
      options,
      onProgress ? Comlink.proxy(onProgress) : undefined,
    );
  }

  async extract(
    pdfData: Uint8Array,
    options: ExtractOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    // Create a copy to avoid transferring the original
    const dataCopy = new Uint8Array(pdfData);
    return this.api.extract(
      dataCopy,
      options,
      onProgress ? Comlink.proxy(onProgress) : undefined,
    );
  }

  async pdfToImages(
    pdfData: Uint8Array,
    options: PdfToImageOptions,
    onProgress?: (progress: number) => void,
  ): Promise<{ page: number; data: Uint8Array; mimeType: string }[]> {
    // Create a copy to avoid transferring the original
    const dataCopy = new Uint8Array(pdfData);
    return this.api.pdfToImages(
      dataCopy,
      options,
      onProgress ? Comlink.proxy(onProgress) : undefined,
    );
  }

  async getPageCount(pdfData: Uint8Array): Promise<number> {
    // Create a copy to avoid transferring the original
    const dataCopy = new Uint8Array(pdfData);
    return this.api.getPageCount(dataCopy);
  }

  async getMetadata(pdfData: Uint8Array): Promise<PdfMetadata> {
    // Create a copy to avoid transferring the original
    const dataCopy = new Uint8Array(pdfData);
    return this.api.getMetadata(dataCopy);
  }

  async compress(
    pdfData: Uint8Array,
    options: CompressOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    const dataCopy = new Uint8Array(pdfData);
    return this.api.compress(
      dataCopy,
      options,
      onProgress ? Comlink.proxy(onProgress) : undefined,
    );
  }

  dispose(): void {
    this.worker.terminate();
  }
}

// Utility function to parse page ranges from user input
export function parsePageRanges(
  input: string,
  maxPages?: number,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const parts = input.split(",").map((s) => s.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((s) => s.trim());
      const start = parseInt(startStr);
      const end = parseInt(endStr);

      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
        ranges.push({
          start,
          end: maxPages ? Math.min(end, maxPages) : end,
        });
      }
    } else {
      const page = parseInt(part);
      if (!isNaN(page) && page > 0) {
        if (!maxPages || page <= maxPages) {
          ranges.push({ start: page, end: page });
        }
      }
    }
  }

  // Sort and merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const range of ranges) {
    if (merged.length === 0) {
      merged.push(range);
    } else {
      const last = merged[merged.length - 1];
      if (range.start <= last.end + 1) {
        last.end = Math.max(last.end, range.end);
      } else {
        merged.push(range);
      }
    }
  }

  return merged;
}

// Utility function to format page ranges for display
export function formatPageRanges(
  ranges: Array<{ start: number; end: number }>,
): string {
  return ranges
    .map((range) =>
      range.start === range.end
        ? `${range.start}`
        : `${range.start}-${range.end}`,
    )
    .join(", ");
}
