import * as Comlink from "comlink";
import { PDFDocument } from "pdf-lib";

export interface ProtectOptions {
  userPassword: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
    fillingForms?: boolean;
    contentAccessibility?: boolean;
    documentAssembly?: boolean;
  };
}

class PdfProtectWorker {
  async protect(
    pdfData: Uint8Array,
    options: ProtectOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    // pdf-lib does not support applying real PDF encryption. Surface that
    // limitation instead of claiming the file is protected.
    try {
      await PDFDocument.load(pdfData);
    } catch (error) {
      throw new Error("Unable to read PDF for protection.");
    }

    onProgress?.(50);

    throw new Error(
      "Password protection isn't available in this browser build yet. Please use a desktop PDF tool for encryption.",
    );
  }

  async unlock(
    pdfData: Uint8Array,
    password: string,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    try {
      const pdfDoc = await PDFDocument.load(pdfData);

      onProgress?.(50);

      // File wasn't encrypted; just return original content
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
      });

      onProgress?.(100);

      return Comlink.transfer(new Uint8Array(pdfBytes), [pdfBytes.buffer]);
    } catch (error) {
      throw new Error(
        "Unlocking encrypted PDFs isn't supported in this browser build. Use a desktop PDF tool to remove passwords.",
      );
    }
  }
}

Comlink.expose(new PdfProtectWorker());
