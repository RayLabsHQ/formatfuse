import * as Comlink from "comlink";
import { PDFDocument } from "pdf-lib";

class PdfFlattenWorker {
  async flatten(
    pdfData: Uint8Array,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    const pdfDoc = await PDFDocument.load(pdfData);
    const form = pdfDoc.getForm();

    onProgress?.(30);

    // Flatten form fields by removing interactivity
    try {
      const fields = form.getFields();

      // This will make form fields non-editable
      fields.forEach((field) => {
        try {
          (field as any).acroField.dict.delete((field as any).acroField.dict.context.obj('Ff'));
          (field as any).acroField.dict.set(
            (field as any).acroField.dict.context.obj('Ff'),
            (field as any).acroField.dict.context.obj(1)
          );
        } catch (e) {
          // Field might not support flattening
          console.warn('Could not flatten field:', e);
        }
      });
    } catch (e) {
      console.warn('No form fields to flatten or error occurred:', e);
    }

    onProgress?.(70);

    const pdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    onProgress?.(100);

    return Comlink.transfer(new Uint8Array(pdfBytes), [pdfBytes.buffer]);
  }
}

Comlink.expose(new PdfFlattenWorker());
