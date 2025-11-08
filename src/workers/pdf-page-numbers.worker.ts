import * as Comlink from "comlink";
import { PDFDocument, rgb } from "pdf-lib";

export interface PageNumberOptions {
  position: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  fontSize: number;
  format: "number" | "page-of-total" | "text-number" | "text-page-of-total";
  startPage: number;
  color?: { r: number; g: number; b: number };
  marginX?: number;
  marginY?: number;
}

class PdfPageNumbersWorker {
  async addPageNumbers(
    pdfData: Uint8Array,
    options: PageNumberOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    const pdfDoc = await PDFDocument.load(pdfData);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;
    const font = await pdfDoc.embedFont("Helvetica");

    const fontSize = options.fontSize || 12;
    const color = options.color || { r: 0, g: 0, b: 0 };
    const marginX = options.marginX || 50;
    const marginY = options.marginY || 30;
    const startPage = options.startPage || 1;

    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();

      const pageNumber = startPage + i;
      let text = "";

      switch (options.format) {
        case "number":
          text = `${pageNumber}`;
          break;
        case "page-of-total":
          text = `${pageNumber} / ${totalPages}`;
          break;
        case "text-number":
          text = `Page ${pageNumber}`;
          break;
        case "text-page-of-total":
          text = `Page ${pageNumber} of ${totalPages}`;
          break;
      }

      const textWidth = font.widthOfTextAtSize(text, fontSize);
      let x = marginX;
      let y = marginY;

      // Calculate position
      switch (options.position) {
        case "top-left":
          x = marginX;
          y = height - marginY;
          break;
        case "top-center":
          x = width / 2 - textWidth / 2;
          y = height - marginY;
          break;
        case "top-right":
          x = width - textWidth - marginX;
          y = height - marginY;
          break;
        case "bottom-left":
          x = marginX;
          y = marginY;
          break;
        case "bottom-center":
          x = width / 2 - textWidth / 2;
          y = marginY;
          break;
        case "bottom-right":
          x = width - textWidth - marginX;
          y = marginY;
          break;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
      });

      onProgress?.(((i + 1) / totalPages) * 90);
    }

    onProgress?.(95);

    const pdfBytes = await pdfDoc.save();
    onProgress?.(100);

    return Comlink.transfer(new Uint8Array(pdfBytes), [pdfBytes.buffer]);
  }
}

Comlink.expose(new PdfPageNumbersWorker());
