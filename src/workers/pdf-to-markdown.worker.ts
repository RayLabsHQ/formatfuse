import * as Comlink from "comlink";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).toString();

export class PdfToMarkdownWorker {
  async convert(
    pdfData: Uint8Array,
    options: {
      includePageBreaks?: boolean;
      preserveFormatting?: boolean;
    } = {},
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    try {
      onProgress?.(10);

      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: pdfData,
        isEvalSupported: false,
        disableWorker: true,
        disableFontFace: true,
        useWorkerFetch: false,
      } as any);

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      onProgress?.(20);

      let markdown = "";
      const progressPerPage = 70 / numPages;

      // Extract text from each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Process text items
        let pageText = "";
        let lastY: number | null = null;
        const lines: Array<{
          text: string;
          y: number;
          fontSize: number;
          lastX: number;
          lastXEnd: number;
        }> = [];

        // Group text items by line
        for (const item of textContent.items) {
          if ("str" in item && item.str) {
            const transform = item.transform;
            const y = transform[5];
            const fontSize = Math.abs(transform[0]);
            const x = transform[4];
            const itemWidth = typeof (item as any).width === "number" ? (item as any).width : 0;

            // Check if this is a new line
            if (lastY === null || Math.abs(y - lastY) > 2) {
              lines.push({
                text: item.str,
                y,
                fontSize,
                lastX: x,
                lastXEnd: x + itemWidth,
              });
              lastY = y;
            } else {
              // Append to the last line
              if (lines.length > 0) {
                const currentLine = lines[lines.length - 1];
                const gap = x - currentLine.lastXEnd;
                const spaceThreshold = Math.max(currentLine.fontSize, fontSize) * 0.15;

                if (gap > spaceThreshold) {
                  currentLine.text += " ";
                }

                currentLine.text += item.str;
                currentLine.fontSize = Math.max(currentLine.fontSize, fontSize);
                currentLine.lastX = x;
                currentLine.lastXEnd = x + itemWidth;
              }
            }
          }
        }

        // Sort lines by Y position (top to bottom)
        lines.sort((a, b) => b.y - a.y);

        // Convert lines to markdown
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const nextLine = lines[i + 1];
          let text = line.text.trim();

          if (!text) continue;

          // Detect headers based on font size
          if (options.preserveFormatting && line.fontSize > 0) {
            const avgFontSize =
              lines.reduce((sum, l) => sum + l.fontSize, 0) / lines.length;

            if (line.fontSize > avgFontSize * 1.8) {
              text = `# ${text}`;
            } else if (line.fontSize > avgFontSize * 1.5) {
              text = `## ${text}`;
            } else if (line.fontSize > avgFontSize * 1.3) {
              text = `### ${text}`;
            } else if (line.fontSize > avgFontSize * 1.15) {
              text = `#### ${text}`;
            }
          }

          // Detect list items
          if (text.match(/^[•·▪▫◦‣⁃]\s/)) {
            text = text.replace(/^[•·▪▫◦‣⁃]\s/, "- ");
          } else if (text.match(/^\d+\.\s/)) {
            // Already formatted as numbered list
          }

          // Detect bold text (all caps or significantly larger font)
          if (
            options.preserveFormatting &&
            text.length > 3 &&
            text === text.toUpperCase() &&
            !text.startsWith("#")
          ) {
            text = `**${text}**`;
          }

          pageText += text;

          // Add line breaks
          if (nextLine) {
            const lineGap = Math.abs(line.y - nextLine.y);
            const avgLineHeight = 12; // Approximate

            if (lineGap > avgLineHeight * 2) {
              // Large gap - paragraph break
              pageText += "\n\n";
            } else if (text.endsWith(".") || text.endsWith("!") || text.endsWith("?")) {
              // End of sentence
              pageText += "\n\n";
            } else if (text.match(/^#/) || (nextLine.text && nextLine.text.match(/^#/))) {
              // Headers
              pageText += "\n\n";
            } else {
              // Normal line break
              pageText += " ";
            }
          }

        }

        // Clean up extra whitespace
        pageText = pageText
          .replace(/\n{3,}/g, "\n\n")
          .replace(/[ \t]+/g, " ")
          .trim();

        if (pageText) {
          markdown += pageText;

          // Add page break if requested
          if (options.includePageBreaks && pageNum < numPages) {
            markdown += "\n\n---\n\n";
          } else if (pageNum < numPages) {
            markdown += "\n\n";
          }
        }

        onProgress?.(20 + pageNum * progressPerPage);
      }

      // Clean up the final markdown
      markdown = markdown
        .replace(/\n{3,}/g, "\n\n") // Remove excessive line breaks
        .replace(/[ \t]+/g, " ") // Normalize spaces
        .replace(/\n +/g, "\n") // Remove leading spaces on lines
        .trim();

      // Post-processing to improve markdown quality
      markdown = this.postProcessMarkdown(markdown);

      onProgress?.(100);

      // Clean up
      await pdf.destroy();

      return markdown;
    } catch (error) {
      console.error("Error converting PDF to Markdown:", error);
      throw error;
    }
  }

  private postProcessMarkdown(markdown: string): string {
    // Fix common issues
    let processed = markdown;

    // Fix numbered lists that might be broken
    processed = processed.replace(/(\d+)\.\s+([^\n]+)\n(\d+)\./g, "$1. $2\n$3.");

    // Fix bullet points
    processed = processed.replace(/^-\s+/gm, "- ");

    // Ensure headers have proper spacing
    processed = processed.replace(/^(#{1,6}\s+[^\n]+)$/gm, "\n$1\n");

    // Remove duplicate blank lines
    processed = processed.replace(/\n{3,}/g, "\n\n");

    // Fix broken words (common in PDFs)
    processed = processed.replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2");

    // Ensure proper spacing after punctuation
    processed = processed.replace(/([.!?])([A-Z])/g, "$1 $2");

    // Clean up quotes
    processed = processed.replace(/[""]/g, '"');
    processed = processed.replace(/['']/g, "'");

    return processed.trim();
  }
}

Comlink.expose(PdfToMarkdownWorker);
