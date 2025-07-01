import * as Comlink from "comlink";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export class MarkdownToPdfWorker {
  async convert(
    markdownText: string,
    options: {
      fontSize?: number;
      lineHeight?: number;
      margins?: { top: number; bottom: number; left: number; right: number };
      fontFamily?: "Helvetica" | "Times" | "Courier";
    } = {},
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    try {
      onProgress?.(10);

      // Default options
      const fontSize = options.fontSize || 12;
      const lineHeight = options.lineHeight || 1.5;
      const margins = options.margins || {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72,
      };
      const fontFamily = options.fontFamily || "Helvetica";

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      onProgress?.(20);

      // Embed fonts
      const regularFont = await pdfDoc.embedFont(
        fontFamily === "Times"
          ? StandardFonts.TimesRoman
          : fontFamily === "Courier"
            ? StandardFonts.Courier
            : StandardFonts.Helvetica,
      );

      const boldFont = await pdfDoc.embedFont(
        fontFamily === "Times"
          ? StandardFonts.TimesRomanBold
          : fontFamily === "Courier"
            ? StandardFonts.CourierBold
            : StandardFonts.HelveticaBold,
      );

      const italicFont = await pdfDoc.embedFont(
        fontFamily === "Times"
          ? StandardFonts.TimesRomanItalic
          : fontFamily === "Courier"
            ? StandardFonts.CourierOblique
            : StandardFonts.HelveticaOblique,
      );

      onProgress?.(30);

      // Parse markdown (basic implementation)
      const lines = markdownText.split("\n");
      let currentPage = pdfDoc.addPage();
      const { width, height } = currentPage.getSize();

      let yPosition = height - margins.top;
      const maxWidth = width - margins.left - margins.right;
      const lineSpacing = fontSize * lineHeight;

      onProgress?.(40);

      // Process each line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let text = line;
        let currentFont = regularFont;
        let currentFontSize = fontSize;
        let isHeader = false;

        // Basic markdown parsing
        if (line.startsWith("# ")) {
          text = line.substring(2);
          currentFont = boldFont;
          currentFontSize = fontSize * 2;
          isHeader = true;
        } else if (line.startsWith("## ")) {
          text = line.substring(3);
          currentFont = boldFont;
          currentFontSize = fontSize * 1.5;
          isHeader = true;
        } else if (line.startsWith("### ")) {
          text = line.substring(4);
          currentFont = boldFont;
          currentFontSize = fontSize * 1.2;
          isHeader = true;
        } else if (
          line.startsWith("**") &&
          line.endsWith("**") &&
          line.length > 4
        ) {
          text = line.substring(2, line.length - 2);
          currentFont = boldFont;
        } else if (
          line.startsWith("*") &&
          line.endsWith("*") &&
          line.length > 2
        ) {
          text = line.substring(1, line.length - 1);
          currentFont = italicFont;
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
          text = "• " + line.substring(2);
        }

        // Check if we need a new page
        if (yPosition < margins.bottom + currentFontSize) {
          currentPage = pdfDoc.addPage();
          yPosition = height - margins.top;
        }

        // Draw text with word wrapping
        if (text.trim()) {
          const words = text.split(" ");
          let currentLine = "";

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = currentFont.widthOfTextAtSize(
              testLine,
              currentFontSize,
            );

            if (textWidth > maxWidth && currentLine) {
              // Draw current line
              currentPage.drawText(currentLine, {
                x: margins.left,
                y: yPosition,
                size: currentFontSize,
                font: currentFont,
                color: rgb(0, 0, 0),
              });

              yPosition -= lineSpacing;
              currentLine = word;

              // Check if we need a new page
              if (yPosition < margins.bottom + currentFontSize) {
                currentPage = pdfDoc.addPage();
                yPosition = height - margins.top;
              }
            } else {
              currentLine = testLine;
            }
          }

          // Draw remaining text
          if (currentLine) {
            currentPage.drawText(currentLine, {
              x: margins.left,
              y: yPosition,
              size: currentFontSize,
              font: currentFont,
              color: rgb(0, 0, 0),
            });
            yPosition -= lineSpacing;
          }
        } else {
          // Empty line
          yPosition -= lineSpacing * 0.5;
        }

        // Add extra space after headers
        if (isHeader) {
          yPosition -= lineSpacing * 0.5;
        }

        // Update progress
        if (i % 10 === 0) {
          onProgress?.(40 + (i / lines.length) * 50);
        }
      }

      onProgress?.(90);

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      onProgress?.(100);

      return new Uint8Array(pdfBytes);
    } catch (error) {
      console.error("Error converting markdown to PDF:", error);
      throw error;
    }
  }
}

Comlink.expose(MarkdownToPdfWorker);
