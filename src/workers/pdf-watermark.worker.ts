import * as Comlink from "comlink";
import { PDFDocument, rgb, degrees } from "pdf-lib";

export interface WatermarkOptions {
  type: "text" | "image";
  text?: string;
  fontSize?: number;
  opacity?: number;
  rotation?: number;
  color?: { r: number; g: number; b: number };
  imageData?: Uint8Array;
  imageType?: "png" | "jpg";
  position?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

class PdfWatermarkWorker {
  async addWatermark(
    pdfData: Uint8Array,
    options: WatermarkOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    const pdfDoc = await PDFDocument.load(pdfData);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    if (options.type === "text" && options.text) {
      const font = await pdfDoc.embedFont("Helvetica");
      const fontSize = options.fontSize || 48;
      const opacity = options.opacity !== undefined ? options.opacity : 0.5;
      const rotationAngle = options.rotation || 0;
      const color = options.color || { r: 0.5, g: 0.5, b: 0.5 };

      for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(options.text, fontSize);

        // Calculate position based on option
        let x = width / 2 - textWidth / 2;
        let y = height / 2;

        if (options.position === "top-left") {
          x = 50;
          y = height - 50;
        } else if (options.position === "top-right") {
          x = width - textWidth - 50;
          y = height - 50;
        } else if (options.position === "bottom-left") {
          x = 50;
          y = 50;
        } else if (options.position === "bottom-right") {
          x = width - textWidth - 50;
          y = 50;
        }

        page.drawText(options.text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
          opacity,
          rotate: degrees(rotationAngle),
        });

        onProgress?.(((i + 1) / totalPages) * 90);
      }
    } else if (options.type === "image" && options.imageData) {
      let image;
      if (options.imageType === "png") {
        image = await pdfDoc.embedPng(options.imageData);
      } else {
        image = await pdfDoc.embedJpg(options.imageData);
      }

      const opacity = options.opacity !== undefined ? options.opacity : 0.5;
      const rotationAngle = options.rotation || 0;

      for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        const scaledWidth = image.width * 0.5;
        const scaledHeight = image.height * 0.5;

        // Calculate position based on option
        let x = width / 2 - scaledWidth / 2;
        let y = height / 2 - scaledHeight / 2;

        if (options.position === "top-left") {
          x = 50;
          y = height - scaledHeight - 50;
        } else if (options.position === "top-right") {
          x = width - scaledWidth - 50;
          y = height - scaledHeight - 50;
        } else if (options.position === "bottom-left") {
          x = 50;
          y = 50;
        } else if (options.position === "bottom-right") {
          x = width - scaledWidth - 50;
          y = 50;
        }

        page.drawImage(image, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
          opacity,
          rotate: degrees(rotationAngle),
        });

        onProgress?.(((i + 1) / totalPages) * 90);
      }
    }

    onProgress?.(95);

    const pdfBytes = await pdfDoc.save();
    onProgress?.(100);

    return Comlink.transfer(new Uint8Array(pdfBytes), [pdfBytes.buffer]);
  }
}

Comlink.expose(new PdfWatermarkWorker());
