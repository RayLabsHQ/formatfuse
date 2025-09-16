import * as Comlink from "comlink";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { PDFFont } from "pdf-lib";

type FontFamilyOption = "Helvetica" | "Times" | "Courier" | "NotoSans";

type UnicodeFontData = {
  regular: Uint8Array;
  bold: Uint8Array;
  italic: Uint8Array;
  emoji?: Uint8Array;
};

type EmbeddedFonts = {
  regularFont: PDFFont;
  boldFont: PDFFont;
  italicFont: PDFFont;
  emojiFont: PDFFont | null;
};

let unicodeFontDataPromise: Promise<UnicodeFontData> | null = null;

async function fetchFont(path: string): Promise<Uint8Array> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load font at ${path}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function loadUnicodeFontData(): Promise<UnicodeFontData> {
  if (!unicodeFontDataPromise) {
    unicodeFontDataPromise = Promise.all([
      fetchFont("/fonts/NotoSans-Regular.ttf"),
      fetchFont("/fonts/NotoSans-Bold.ttf"),
      fetchFont("/fonts/NotoSans-Italic.ttf"),
      fetchFont("/fonts/NotoEmoji-Regular.ttf").catch(() => null),
    ]).then(([regular, bold, italic, emoji]) => ({
      regular,
      bold,
      italic,
      emoji: emoji ?? undefined,
    }));
  }
  return unicodeFontDataPromise;
}

async function embedFonts(
  pdfDoc: PDFDocument,
  fontFamily: FontFamilyOption,
): Promise<EmbeddedFonts> {
  if (fontFamily === "NotoSans") {
    try {
      const data = await loadUnicodeFontData();

      const [regularFont, boldFont, italicFont] = await Promise.all([
        pdfDoc.embedFont(data.regular, { subset: true }),
        pdfDoc.embedFont(data.bold, { subset: true }),
        pdfDoc.embedFont(data.italic, { subset: true }),
      ]);

      let emojiFont: PDFFont | null = null;
      if (data.emoji) {
        try {
          emojiFont = await pdfDoc.embedFont(data.emoji, { subset: true });
        } catch (emojiError) {
          console.warn(
            "Failed to embed emoji font, continuing without it",
            emojiError,
          );
        }
      }

      return { regularFont, boldFont, italicFont, emojiFont };
    } catch (unicodeError) {
      console.error(
        "Failed to load Noto Sans fonts, falling back to Helvetica",
        unicodeError,
      );
      return embedFonts(pdfDoc, "Helvetica");
    }
  }

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

  return { regularFont, boldFont, italicFont, emojiFont: null };
}

type TextSegment = {
  text: string;
  font: PDFFont;
};

export class MarkdownToPdfWorker {
  async convert(
    markdownText: string,
    options: {
      fontSize?: number;
      lineHeight?: number;
      margins?: { top: number; bottom: number; left: number; right: number };
      fontFamily?: FontFamilyOption;
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
      const fontFamily = (options.fontFamily || "NotoSans") as FontFamilyOption;

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      onProgress?.(20);

      // Embed fonts
      const { regularFont, boldFont, italicFont, emojiFont } = await embedFonts(
        pdfDoc,
        fontFamily,
      );

      onProgress?.(30);

      const fontCharSetCache = new WeakMap<PDFFont, Set<number>>();
      const unsupportedCharacters = new Set<string>();
      let hadUnsupportedGlyphs = false;

      const getSupportedCodePoints = (font: PDFFont) => {
        let cache = fontCharSetCache.get(font);
        if (!cache) {
          cache = new Set(font.getCharacterSet());
          fontCharSetCache.set(font, cache);
        }
        return cache;
      };

      const createSegmentsForText = (
        input: string,
        primaryFont: PDFFont,
      ) => {
        const segments: TextSegment[] = [];
        const primarySupported = getSupportedCodePoints(primaryFont);
        const emojiSupported = emojiFont ? getSupportedCodePoints(emojiFont) : null;

        let currentFont: PDFFont = primaryFont;
        let buffer = "";
        let replaced = false;

        const flushBuffer = () => {
          if (!buffer) return;
          segments.push({ text: buffer, font: currentFont });
          buffer = "";
        };

        for (const char of input) {
          const codePoint = char.codePointAt(0);
          let targetFont = primaryFont;
          let outputChar = char;

          if (codePoint !== undefined && primarySupported.has(codePoint)) {
            targetFont = primaryFont;
          } else if (emojiSupported && codePoint !== undefined && emojiSupported.has(codePoint)) {
            targetFont = emojiFont as PDFFont;
          } else if (char === "•") {
            outputChar = "-";
            targetFont = primaryFont;
            replaced = true;
          } else if (char === "–" || char === "—") {
            outputChar = "-";
            targetFont = primaryFont;
            replaced = true;
          } else if (codePoint !== undefined && codePoint >= 32 && codePoint <= 126) {
            targetFont = primaryFont;
          } else {
            outputChar = "?";
            targetFont = primaryFont;
            replaced = true;
            if (char.trim()) {
              unsupportedCharacters.add(char);
            }
          }

          if (targetFont !== currentFont) {
            flushBuffer();
            currentFont = targetFont;
          }

          buffer += outputChar;
        }

        flushBuffer();

        return { segments, replaced };
      };

      // Parse markdown (basic implementation)
      const lines = markdownText.split("\n");
      let currentPage = pdfDoc.addPage();
      let { width, height } = currentPage.getSize();

      let yPosition = height - margins.top;
      let maxWidth = width - margins.left - margins.right;
      const baseLineSpacing = fontSize * lineHeight;

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

        const lineSpacing = currentFontSize * lineHeight;

        // Check if we need a new page
        if (yPosition < margins.bottom + currentFontSize) {
          currentPage = pdfDoc.addPage();
          ({ width, height } = currentPage.getSize());
          maxWidth = width - margins.left - margins.right;
          yPosition = height - margins.top;
        }

        // Draw text with word wrapping
        const { segments: sanitizedSegments, replaced } = createSegmentsForText(
          text,
          currentFont,
        );

        if (replaced) {
          hadUnsupportedGlyphs = true;
        }

        const measureSegments = (segments: TextSegment[]) =>
          segments.reduce(
            (total, segment) =>
              total + segment.font.widthOfTextAtSize(segment.text, currentFontSize),
            0,
          );

        const drawSegments = (segments: TextSegment[]) => {
          let xPosition = margins.left;
          for (const segment of segments) {
            if (!segment.text) continue;
            currentPage.drawText(segment.text, {
              x: xPosition,
              y: yPosition,
              size: currentFontSize,
              font: segment.font,
              color: rgb(0, 0, 0),
            });
            xPosition += segment.font.widthOfTextAtSize(
              segment.text,
              currentFontSize,
            );
          }
        };

        if (sanitizedSegments.length && sanitizedSegments.some((s) => s.text.trim())) {
          const words = text.split(" ");
          const wordSegmentsList = words.map((word) =>
            createSegmentsForText(word, currentFont).segments,
          );

          let currentLineSegments: TextSegment[] = [];

          const spaceSegment: TextSegment = {
            text: " ",
            font: currentFont,
          };

          for (const wordSegments of wordSegmentsList) {
            const hasContent = wordSegments.some((segment) => segment.text);
            if (!hasContent) continue;

            const candidateSegments =
              currentLineSegments.length > 0
                ? [...currentLineSegments, spaceSegment, ...wordSegments]
                : [...wordSegments];

            const candidateWidth = measureSegments(candidateSegments);

            if (
              candidateWidth > maxWidth &&
              measureSegments(currentLineSegments) > 0
            ) {
              drawSegments(currentLineSegments);
              yPosition -= lineSpacing;

              if (yPosition < margins.bottom + currentFontSize) {
                currentPage = pdfDoc.addPage();
                ({ width, height } = currentPage.getSize());
                maxWidth = width - margins.left - margins.right;
                yPosition = height - margins.top;
              }

              currentLineSegments = [...wordSegments];
            } else {
              currentLineSegments = candidateSegments;
            }
          }

          if (measureSegments(currentLineSegments) > 0) {
            drawSegments(currentLineSegments);
            yPosition -= lineSpacing;
          }
        } else {
          // Empty line
          yPosition -= baseLineSpacing * 0.5;
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

      if (hadUnsupportedGlyphs && unsupportedCharacters.size > 0) {
        console.warn(
          "Some characters could not be embedded with the selected font and were replaced with '?' or '-' in the generated PDF.",
          Array.from(unsupportedCharacters).join(" "),
        );
      }

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
