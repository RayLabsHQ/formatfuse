import * as Comlink from "comlink";
import { PDFDocument, PDFName } from "pdf-lib";

class PdfFlattenWorker {
  async flatten(
    pdfData: Uint8Array,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    const pdfDoc = await PDFDocument.load(pdfData);
    const form = pdfDoc.getForm();

    onProgress?.(30);

    // Flatten form fields to burn values into page content
    try {
      form.flatten();
    } catch (e) {
      console.warn("No form fields to flatten or error occurred:", e);
    }

    onProgress?.(70);

    // Remove annotations to avoid interactive remnants
    try {
      const pages = pdfDoc.getPages();
      pages.forEach((page) => {
        const annots = page.node.get(PDFName.of("Annots"));
        if (annots) {
          page.node.set(PDFName.of("Annots"), pdfDoc.context.obj([]));
        }
      });
    } catch (e) {
      console.warn("Failed to remove annotations:", e);
    }

    const pdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    onProgress?.(100);

    return Comlink.transfer(new Uint8Array(pdfBytes), [pdfBytes.buffer]);
  }
}

Comlink.expose(new PdfFlattenWorker());
