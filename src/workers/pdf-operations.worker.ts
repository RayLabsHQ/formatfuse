import * as Comlink from "comlink";
import { PDFDocument, rgb, degrees, PDFPage } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

interface SplitOptions {
  pageRanges: Array<{ start: number; end: number }>;
}

interface MergeOptions {
  files: Uint8Array[];
}

interface RotateOptions {
  pages?: number[]; // If not specified, rotate all pages
  angle: 90 | 180 | 270;
}

interface ExtractOptions {
  pages: number[];
}

interface PdfToImageOptions {
  pages?: number[]; // If not specified, convert all pages
  format: "png" | "jpeg";
  quality?: number; // For JPEG, 0-1
  scale?: number; // Default 1.5 for good quality
}

class PDFOperationsWorker {
  private async loadPdfDocument(data: Uint8Array): Promise<PDFDocument> {
    return PDFDocument.load(data);
  }

  private async loadPdfJsDocument(data: Uint8Array) {
    const loadingTask = pdfjsLib.getDocument({ data });
    return loadingTask.promise;
  }

  async split(
    pdfData: Uint8Array,
    options: SplitOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array[]> {
    onProgress?.(0);

    const pdfDoc = await this.loadPdfDocument(pdfData);
    const totalPages = pdfDoc.getPageCount();
    const results: Uint8Array[] = [];

    let processed = 0;
    const totalRanges = options.pageRanges.length;

    for (const range of options.pageRanges) {
      const newPdf = await PDFDocument.create();

      // Adjust page numbers (user provides 1-based, pdf-lib uses 0-based)
      const startIdx = Math.max(0, range.start - 1);
      const endIdx = Math.min(totalPages - 1, range.end - 1);

      const pageIndices: number[] = [];
      for (let i = startIdx; i <= endIdx; i++) {
        pageIndices.push(i);
      }

      const pages = await newPdf.copyPages(pdfDoc, pageIndices);
      pages.forEach((page) => newPdf.addPage(page));

      // Copy metadata
      newPdf.setTitle(pdfDoc.getTitle() || "");
      newPdf.setAuthor(pdfDoc.getAuthor() || "");
      newPdf.setSubject(pdfDoc.getSubject() || "");
      newPdf.setCreator("FormatFuse");
      newPdf.setProducer("FormatFuse (pdf-lib)");

      const pdfBytes = await newPdf.save();
      results.push(new Uint8Array(pdfBytes));

      processed++;
      onProgress?.((processed / totalRanges) * 100);
    }

    return results;
  }

  async merge(
    options: MergeOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    const mergedPdf = await PDFDocument.create();
    const totalFiles = options.files.length;

    for (let i = 0; i < totalFiles; i++) {
      const pdfDoc = await this.loadPdfDocument(options.files[i]);
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

      pages.forEach((page) => mergedPdf.addPage(page));

      onProgress?.(((i + 1) / totalFiles) * 100);
    }

    mergedPdf.setCreator("FormatFuse");
    mergedPdf.setProducer("FormatFuse (pdf-lib)");

    const pdfBytes = await mergedPdf.save();
    return Comlink.transfer(new Uint8Array(pdfBytes), [pdfBytes.buffer]);
  }

  async rotate(
    pdfData: Uint8Array,
    options: RotateOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    const pdfDoc = await this.loadPdfDocument(pdfData);
    const totalPages = pdfDoc.getPageCount();
    const pagesToRotate =
      options.pages?.map((p) => p - 1) ||
      Array.from({ length: totalPages }, (_, i) => i);

    let processed = 0;
    for (const pageIdx of pagesToRotate) {
      if (pageIdx >= 0 && pageIdx < totalPages) {
        const page = pdfDoc.getPage(pageIdx);
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + options.angle));
      }
      processed++;
      onProgress?.((processed / pagesToRotate.length) * 100);
    }

    const pdfBytes = await pdfDoc.save();
    return Comlink.transfer(new Uint8Array(pdfBytes), [pdfBytes.buffer]);
  }

  async extract(
    pdfData: Uint8Array,
    options: ExtractOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    const pdfDoc = await this.loadPdfDocument(pdfData);
    const newPdf = await PDFDocument.create();

    // Convert 1-based page numbers to 0-based indices
    const pageIndices = options.pages
      .map((p) => p - 1)
      .filter((idx) => idx >= 0 && idx < pdfDoc.getPageCount());

    const pages = await newPdf.copyPages(pdfDoc, pageIndices);
    pages.forEach((page, idx) => {
      newPdf.addPage(page);
      onProgress?.(((idx + 1) / pages.length) * 100);
    });

    // Copy metadata
    newPdf.setTitle(pdfDoc.getTitle() || "");
    newPdf.setAuthor(pdfDoc.getAuthor() || "");
    newPdf.setSubject(pdfDoc.getSubject() || "");
    newPdf.setCreator("FormatFuse");
    newPdf.setProducer("FormatFuse (pdf-lib)");

    const pdfBytes = await newPdf.save();
    return Comlink.transfer(new Uint8Array(pdfBytes), [pdfBytes.buffer]);
  }

  async pdfToImages(
    pdfData: Uint8Array,
    options: PdfToImageOptions,
    onProgress?: (progress: number) => void,
  ): Promise<{ page: number; data: Uint8Array; mimeType: string }[]> {
    onProgress?.(0);

    const pdf = await this.loadPdfJsDocument(pdfData);
    const numPages = pdf.numPages;
    const pagesToConvert =
      options.pages || Array.from({ length: numPages }, (_, i) => i + 1);
    const results: { page: number; data: Uint8Array; mimeType: string }[] = [];

    const scale = options.scale || 1.5;
    const format = options.format || "png";
    const quality = options.quality || 0.92;

    for (let i = 0; i < pagesToConvert.length; i++) {
      const pageNum = pagesToConvert[i];
      if (pageNum < 1 || pageNum > numPages) continue;

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Create canvas
      const canvas = new OffscreenCanvas(viewport.width, viewport.height);
      const context = canvas.getContext(
        "2d",
      ) as OffscreenCanvasRenderingContext2D;
      if (!context) throw new Error("Failed to create canvas context");

      // Render PDF page to canvas
      await page.render({
        canvasContext: context as any,
        viewport: viewport,
      }).promise;

      // Convert canvas to blob
      const blob = await canvas.convertToBlob({
        type: format === "png" ? "image/png" : "image/jpeg",
        quality: format === "jpeg" ? quality : undefined,
      });

      // Convert blob to Uint8Array
      const arrayBuffer = await blob.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      results.push({
        page: pageNum,
        data: Comlink.transfer(data, [data.buffer]),
        mimeType: blob.type,
      });

      onProgress?.(((i + 1) / pagesToConvert.length) * 100);
    }

    // Clean up
    await pdf.destroy();

    return results;
  }

  async getPageCount(pdfData: Uint8Array): Promise<number> {
    const pdfDoc = await this.loadPdfDocument(pdfData);
    return pdfDoc.getPageCount();
  }

  async getMetadata(pdfData: Uint8Array): Promise<{
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
    pageCount: number;
  }> {
    const pdfDoc = await this.loadPdfDocument(pdfData);

    return {
      title: pdfDoc.getTitle(),
      author: pdfDoc.getAuthor(),
      subject: pdfDoc.getSubject(),
      creator: pdfDoc.getCreator(),
      producer: pdfDoc.getProducer(),
      creationDate: pdfDoc.getCreationDate(),
      modificationDate: pdfDoc.getModificationDate(),
      pageCount: pdfDoc.getPageCount(),
    };
  }
}

Comlink.expose(new PDFOperationsWorker());
