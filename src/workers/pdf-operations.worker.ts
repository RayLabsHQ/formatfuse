import * as Comlink from "comlink";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Set up PDF.js worker (legacy build for better worker compatibility)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).toString();

// Ensure document is available globally for PDF.js
if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tagName: string) => {
      if (tagName === 'canvas') {
        return new OffscreenCanvas(300, 150);
      }
      throw new Error(`Cannot create element ${tagName} in worker`);
    }
  };
}

// Canvas factory implementation for Web Workers
class WorkerCanvasFactory {
  create(width: number, height: number) {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d') as any;
    
    // Add missing methods that PDF.js might need
    if (!context.drawFocusIfNeeded) {
      context.drawFocusIfNeeded = () => {};
    }
    if (!context.getContextAttributes) {
      context.getContextAttributes = () => ({ alpha: true });
    }
    
    return { canvas, context };
  }

  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}


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

interface CompressOptions {
  imageQuality: number;
  removeMetadata: boolean;
  optimizeImages: boolean;
  grayscale: boolean;
}

class PDFOperationsWorker {
  private canvasFactory = new WorkerCanvasFactory();

  private async loadPdfDocument(data: Uint8Array): Promise<PDFDocument> {
    return PDFDocument.load(data);
  }

  private async loadPdfJsDocument(data: Uint8Array) {
    const loadingTask = pdfjsLib.getDocument({ 
      data,
      isEvalSupported: false,
      disableWorker: true, // We're already in a worker
      disableFontFace: true, // Disable font face in worker
      useWorkerFetch: false,
      canvasFactory: this.canvasFactory,
    } as any);
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
    console.log('[PDF Worker] Rotate called with options:', options);
    onProgress?.(0);

    const pdfDoc = await this.loadPdfDocument(pdfData);
    const totalPages = pdfDoc.getPageCount();
    console.log('[PDF Worker] Total pages:', totalPages);
    
    const pagesToRotate =
      options.pages?.map((p) => p - 1) ||
      Array.from({ length: totalPages }, (_, i) => i);
    console.log('[PDF Worker] Pages to rotate:', pagesToRotate);

    let processed = 0;
    for (const pageIdx of pagesToRotate) {
      if (pageIdx >= 0 && pageIdx < totalPages) {
        const page = pdfDoc.getPage(pageIdx);
        const currentRotation = page.getRotation().angle;
        const newRotation = (currentRotation + options.angle) % 360;
        
        console.log(`[PDF Worker] Page ${pageIdx}: current rotation ${currentRotation}°, new rotation ${newRotation}°`);

        // Simply set the rotation - PDF viewers handle the transformation
        // Do NOT swap dimensions as this causes content to be cut off
        page.setRotation(degrees(newRotation));
        
        // Verify rotation was set
        const verifyRotation = page.getRotation().angle;
        console.log(`[PDF Worker] Page ${pageIdx}: rotation after setting: ${verifyRotation}°`);
      }
      processed++;
      onProgress?.((processed / pagesToRotate.length) * 100);
    }

    const pdfBytes = await pdfDoc.save();
    console.log('[PDF Worker] PDF saved, size:', pdfBytes.length);
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

      // Create canvas with proper dimensions
      const canvas = new OffscreenCanvas(
        Math.floor(viewport.width),
        Math.floor(viewport.height)
      );
      const context = canvas.getContext("2d", {
        alpha: false,
      }) as OffscreenCanvasRenderingContext2D;
      
      if (!context) throw new Error("Failed to create canvas context");

      // Add missing methods that PDF.js might need
      const ctx = context as any;
      if (!ctx.drawFocusIfNeeded) {
        ctx.drawFocusIfNeeded = () => {}; // No-op
      }
      if (!ctx.getContextAttributes) {
        ctx.getContextAttributes = () => ({ alpha: false });
      }

      // Set white background
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Create render context
      const renderContext = {
        canvasContext: ctx, // Use the enhanced context
        viewport: viewport,
        canvasFactory: this.canvasFactory,
      };

      // Render PDF page to canvas
      await page.render(renderContext).promise;

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

  async compress(
    pdfData: Uint8Array,
    options: CompressOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    // Load the PDF document
    const pdfDoc = await this.loadPdfDocument(pdfData);

    // Create a new PDF document for compressed output
    const compressedPdf = await PDFDocument.create();

    // Remove metadata if requested
    if (options.removeMetadata) {
      compressedPdf.setTitle("");
      compressedPdf.setAuthor("");
      compressedPdf.setSubject("");
      compressedPdf.setKeywords([]);
      compressedPdf.setProducer("FormatFuse");
      compressedPdf.setCreator("FormatFuse");
    } else {
      // Copy metadata from original
      compressedPdf.setTitle(pdfDoc.getTitle() || "");
      compressedPdf.setAuthor(pdfDoc.getAuthor() || "");
      compressedPdf.setSubject(pdfDoc.getSubject() || "");
      compressedPdf.setProducer("FormatFuse (compressed)");
      compressedPdf.setCreator(pdfDoc.getCreator() || "FormatFuse");
    }

    const totalPages = pdfDoc.getPageCount();

    // Process each page
    for (let i = 0; i < totalPages; i++) {
      const [page] = await compressedPdf.copyPages(pdfDoc, [i]);

      // Apply grayscale if requested
      if (options.grayscale) {
        // Note: pdf-lib doesn't have direct grayscale conversion
        // This would require more complex image processing
        // For now, we'll just copy the page as-is
      }

      compressedPdf.addPage(page);
      onProgress?.(((i + 1) / totalPages) * 90);
    }

    onProgress?.(95);

    // Save with compression options
    const pdfBytes = await compressedPdf.save({
      useObjectStreams: true, // Enables compression
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    onProgress?.(100);

    // Note: Real image compression would require parsing and re-encoding images
    // This basic implementation provides structure compression but not image recompression
    // For full image compression, we'd need to integrate image processing libraries

    return Comlink.transfer(new Uint8Array(pdfBytes), [pdfBytes.buffer]);
  }
}

Comlink.expose(new PDFOperationsWorker());
