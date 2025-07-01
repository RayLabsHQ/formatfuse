import { PDFDocument } from "pdf-lib";

interface ConversionMessage {
  type: "convert";
  images: Array<{ data: ArrayBuffer; name: string }>;
}

interface ProgressMessage {
  type: "progress";
  progress: number;
}

interface CompleteMessage {
  type: "complete";
  result: ArrayBuffer;
}

interface ErrorMessage {
  type: "error";
  error: string;
}

type WorkerMessage = ConversionMessage;
type ResponseMessage = ProgressMessage | CompleteMessage | ErrorMessage;

async function convertJpgToPdf(
  images: Array<{ data: ArrayBuffer; name: string }>,
): Promise<ArrayBuffer> {
  try {
    self.postMessage({ type: "progress", progress: 10 } as ProgressMessage);

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    const totalImages = images.length;
    let processedImages = 0;

    // Process each image
    for (const imageData of images) {
      // Embed the JPG image
      const jpgImage = await pdfDoc.embedJpg(imageData.data);

      // Add a page with the same dimensions as the image
      const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);

      // Draw the image on the page
      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: jpgImage.width,
        height: jpgImage.height,
      });

      processedImages++;
      const progress = 10 + (processedImages / totalImages) * 80;
      self.postMessage({
        type: "progress",
        progress: Math.round(progress),
      } as ProgressMessage);
    }

    self.postMessage({ type: "progress", progress: 95 } as ProgressMessage);

    // Save the PDF
    const pdfBytes = await pdfDoc.save();

    self.postMessage({ type: "progress", progress: 100 } as ProgressMessage);

    return pdfBytes.buffer as ArrayBuffer;
  } catch (error) {
    throw new Error(
      `Conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Worker message handler
self.addEventListener("message", async (event: MessageEvent<WorkerMessage>) => {
  const { type, images } = event.data;

  if (type === "convert") {
    try {
      const result = await convertJpgToPdf(images);
      self.postMessage({ type: "complete", result } as CompleteMessage);
    } catch (error) {
      self.postMessage({
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      } as ErrorMessage);
    }
  }
});

export {};
