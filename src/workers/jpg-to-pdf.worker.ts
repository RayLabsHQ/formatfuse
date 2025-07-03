import { PDFDocument, PageSizes } from "pdf-lib";

interface ConversionOptions {
  quality: number;
  pageSize: "a4" | "letter" | "legal" | "auto";
  orientation: "portrait" | "landscape";
  margin: number;
}

interface ConversionMessage {
  type: "convert";
  images: Array<{ data: ArrayBuffer; name: string }>;
  options: ConversionOptions;
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

// Page size mappings in points (1 point = 1/72 inch)
const pageSizes = {
  a4: PageSizes.A4,
  letter: PageSizes.Letter,
  legal: PageSizes.Legal,
};

async function convertJpgToPdf(
  images: Array<{ data: ArrayBuffer; name: string }>,
  options: ConversionOptions,
): Promise<ArrayBuffer> {
  try {
    self.postMessage({ type: "progress", progress: 10 } as ProgressMessage);

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    const totalImages = images.length;
    let processedImages = 0;

    // Process each image
    for (const imageData of images) {
      let jpgImage;
      try {
        // Try to embed as JPG first
        jpgImage = await pdfDoc.embedJpg(imageData.data);
      } catch {
        // If JPG embedding fails, try as PNG
        try {
          jpgImage = await pdfDoc.embedPng(imageData.data);
        } catch {
          throw new Error(`Failed to process image: ${imageData.name}`);
        }
      }

      let pageWidth, pageHeight;

      if (options.pageSize === "auto") {
        // Use image dimensions
        pageWidth = jpgImage.width;
        pageHeight = jpgImage.height;
      } else {
        // Use standard page size
        const [standardWidth, standardHeight] = pageSizes[options.pageSize];
        if (options.orientation === "landscape") {
          pageWidth = standardHeight;
          pageHeight = standardWidth;
        } else {
          pageWidth = standardWidth;
          pageHeight = standardHeight;
        }
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Calculate image dimensions to fit within page with margins
      const availableWidth = pageWidth - options.margin * 2;
      const availableHeight = pageHeight - options.margin * 2;

      let drawWidth, drawHeight;
      const imageAspectRatio = jpgImage.width / jpgImage.height;
      const pageAspectRatio = availableWidth / availableHeight;

      if (options.pageSize === "auto") {
        // For auto mode, use full page
        drawWidth = pageWidth;
        drawHeight = pageHeight;
      } else {
        // For standard sizes, fit image within available space
        if (imageAspectRatio > pageAspectRatio) {
          // Image is wider than page
          drawWidth = availableWidth;
          drawHeight = availableWidth / imageAspectRatio;
        } else {
          // Image is taller than page
          drawHeight = availableHeight;
          drawWidth = availableHeight * imageAspectRatio;
        }
      }

      // Center the image on the page
      const x = options.pageSize === "auto" ? 0 : (pageWidth - drawWidth) / 2;
      const y = options.pageSize === "auto" ? 0 : (pageHeight - drawHeight) / 2;

      // Draw the image on the page
      page.drawImage(jpgImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });

      processedImages++;
      const progress = 10 + (processedImages / totalImages) * 80;
      self.postMessage({
        type: "progress",
        progress: Math.round(progress),
      } as ProgressMessage);
    }

    self.postMessage({ type: "progress", progress: 95 } as ProgressMessage);

    // Save the PDF with quality settings
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false,
    });

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
  const { type, images, options } = event.data;

  if (type === "convert") {
    try {
      const result = await convertJpgToPdf(images, options);
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
