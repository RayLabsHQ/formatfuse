// Centralized SEO data for programmatic PDF pages

export interface PdfSeoData {
  id: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  h1: string;
  subtitle: string;
  features: string[];
  faqs: { question: string; answer: string }[];
}

// Size-based compression targets
export const compressionSizes = [
  { size: "50kb", targetKB: 50, display: "50KB" },
  { size: "100kb", targetKB: 100, display: "100KB" },
  { size: "200kb", targetKB: 200, display: "200KB" },
  { size: "300kb", targetKB: 300, display: "300KB" },
  { size: "500kb", targetKB: 500, display: "500KB" },
  { size: "1mb", targetKB: 1024, display: "1MB" },
  { size: "2mb", targetKB: 2048, display: "2MB" },
  { size: "5mb", targetKB: 5120, display: "5MB" },
  { size: "10mb", targetKB: 10240, display: "10MB" },
  { size: "20mb", targetKB: 20480, display: "20MB" },
  { size: "25mb", targetKB: 25600, display: "25MB" },
] as const;

export type CompressionSize = (typeof compressionSizes)[number]["size"];

export function getCompressionSeoData(size: string, display: string): PdfSeoData {
  return {
    id: `compress-pdf-to-${size}`,
    title: `Compress PDF to ${display}`,
    metaTitle: `Compress PDF to ${display} Free Online - Reduce PDF Size | FormatFuse`,
    metaDescription: `Compress PDF files to under ${display} for free. No signup required, no watermarks. 100% private - files never leave your browser. Instant results.`,
    keywords: [
      `compress pdf to ${size}`,
      `reduce pdf to ${size}`,
      `pdf compressor ${size}`,
      `shrink pdf to ${size}`,
      `make pdf smaller ${size}`,
      `pdf under ${size}`,
      `resize pdf to ${size}`,
    ],
    h1: `Compress PDF to ${display}`,
    subtitle: `Reduce your PDF file size to under ${display} while maintaining quality. Free, fast, and completely private.`,
    features: [
      `Target size: Under ${display}`,
      "100% private - no uploads",
      "No signup required",
      "Instant compression",
      "Batch processing supported",
    ],
    faqs: [
      {
        question: `How do I compress a PDF to ${display}?`,
        answer: `Simply upload your PDF file, and our smart compressor will automatically reduce it to under ${display}. You can adjust quality settings if needed to achieve your target size.`,
      },
      {
        question: `Will my PDF look blurry after compressing to ${display}?`,
        answer: `Our compression algorithm prioritizes quality. Text remains sharp and readable. Images are intelligently compressed to maintain visual quality while achieving the target size.`,
      },
      {
        question: `What if my PDF can't be compressed to ${display}?`,
        answer: `Some PDFs with minimal images may already be close to the minimum size. If the target can't be reached, we'll compress as much as possible while maintaining readability.`,
      },
      {
        question: "Is my PDF safe when using this compressor?",
        answer:
          "Yes! Your files never leave your browser. All compression happens locally on your device using WebAssembly technology. We never upload or store your files.",
      },
    ],
  };
}

// Use-case based compression
export const compressionUseCases = [
  {
    usecase: "email",
    display: "Email",
    targetKB: 15360, // Aim for ~15MB to fit common email limits after encoding
    description: "for email attachments",
  },
  {
    usecase: "whatsapp",
    display: "WhatsApp",
    targetKB: 51200, // Keep well under the 100MB+ limit while staying fast to send
    description: "for WhatsApp sharing",
  },
  {
    usecase: "web",
    display: "Web",
    targetKB: 5120, // 5MB for fast loading
    description: "for web upload",
  },
  {
    usecase: "discord",
    display: "Discord",
    targetKB: 8192, // 8MB free tier
    description: "for Discord",
  },
  {
    usecase: "upload",
    display: "Upload",
    targetKB: 10240, // 10MB generic upload
    description: "for uploading",
  },
] as const;

export type CompressionUseCase = (typeof compressionUseCases)[number]["usecase"];

export function getUseCaseSeoData(
  usecase: string,
  display: string,
  description: string
): PdfSeoData {
  return {
    id: `compress-pdf-for-${usecase}`,
    title: `Compress PDF for ${display}`,
    metaTitle: `Compress PDF for ${display} Free - Reduce PDF Size ${description} | FormatFuse`,
    metaDescription: `Compress PDF files ${description} for free. Optimize PDF size for ${display.toLowerCase()} limits. No signup, no watermarks. 100% private.`,
    keywords: [
      `compress pdf for ${usecase}`,
      `reduce pdf for ${usecase}`,
      `pdf compressor ${usecase}`,
      `shrink pdf for ${usecase}`,
      `pdf size ${usecase}`,
      `${usecase} pdf limit`,
      `pdf too large for ${usecase}`,
    ],
    h1: `Compress PDF for ${display}`,
    subtitle: `Optimize your PDF ${description}. Fast, free, and completely private compression.`,
    features: [
      `Optimized for ${display}`,
      "Smart size reduction",
      "100% private - no uploads",
      "No signup required",
      "Instant results",
    ],
    faqs: [
      {
        question: `What's the maximum PDF size for ${display}?`,
        answer: `${display} typically allows files up to a certain size. Our compressor automatically optimizes your PDF to fit within these limits while maintaining readability.`,
      },
      {
        question: `Why is my PDF too large for ${display}?`,
        answer: `PDFs with high-resolution images, embedded fonts, or complex graphics can become large. Our compressor reduces these elements while keeping your document readable.`,
      },
      {
        question: `How much can I reduce my PDF for ${display}?`,
        answer:
          "Compression typically reduces file size by 20-80% depending on content. PDFs with many images see the most reduction.",
      },
      {
        question: "Is the compression permanent?",
        answer:
          "Yes, the compressed PDF is a new file. Your original file remains unchanged on your device. We recommend keeping the original if you need the full quality version.",
      },
    ],
  };
}

// Alternate routes mapping (verb-first vs noun-first patterns)
export const alternateRoutes = [
  { alt: "compress-pdf", canonical: "pdf-compress", tool: "PdfCompress" },
  { alt: "merge-pdf", canonical: "pdf-merge", tool: "PdfMerge" },
  { alt: "merge-pdfs", canonical: "pdf-merge", tool: "PdfMerge" },
  { alt: "combine-pdf", canonical: "pdf-merge", tool: "PdfMerge" },
  { alt: "combine-pdfs", canonical: "pdf-merge", tool: "PdfMerge" },
  { alt: "split-pdf", canonical: "pdf-split", tool: "PdfSplit" },
  { alt: "rotate-pdf", canonical: "pdf-rotate", tool: "PdfRotate" },
  { alt: "protect-pdf", canonical: "pdf-protect", tool: "PdfProtect" },
  { alt: "unlock-pdf", canonical: "pdf-unlock", tool: "PdfUnlock" },
  { alt: "pdf-to-image", canonical: "pdf-to-jpg", tool: "PdfToJpg" },
  { alt: "pdf-to-images", canonical: "pdf-to-jpg", tool: "PdfToJpg" },
  { alt: "pdf-to-png", canonical: "pdf-to-jpg", tool: "PdfToJpg" },
  { alt: "image-to-pdf", canonical: "jpg-to-pdf", tool: "JpgToPdf" },
  { alt: "images-to-pdf", canonical: "jpg-to-pdf", tool: "JpgToPdf" },
  { alt: "png-to-pdf", canonical: "jpg-to-pdf", tool: "JpgToPdf" },
  { alt: "photo-to-pdf", canonical: "jpg-to-pdf", tool: "JpgToPdf" },
  { alt: "picture-to-pdf", canonical: "jpg-to-pdf", tool: "JpgToPdf" },
  { alt: "reduce-pdf-size", canonical: "pdf-compress", tool: "PdfCompress" },
  { alt: "shrink-pdf", canonical: "pdf-compress", tool: "PdfCompress" },
  { alt: "pdf-reducer", canonical: "pdf-compress", tool: "PdfCompress" },
  { alt: "pdf-compressor", canonical: "pdf-compress", tool: "PdfCompress" },
  { alt: "make-pdf-smaller", canonical: "pdf-compress", tool: "PdfCompress" },
  { alt: "extract-pdf-pages", canonical: "pdf-split", tool: "PdfSplit" },
  { alt: "separate-pdf", canonical: "pdf-split", tool: "PdfSplit" },
  { alt: "pdf-splitter", canonical: "pdf-split", tool: "PdfSplit" },
  { alt: "add-watermark-to-pdf", canonical: "pdf-watermark", tool: "PdfWatermark" },
  { alt: "watermark-pdf", canonical: "pdf-watermark", tool: "PdfWatermark" },
  { alt: "password-protect-pdf", canonical: "pdf-protect", tool: "PdfProtect" },
  { alt: "encrypt-pdf", canonical: "pdf-protect", tool: "PdfProtect" },
  { alt: "remove-pdf-password", canonical: "pdf-unlock", tool: "PdfUnlock" },
  { alt: "decrypt-pdf", canonical: "pdf-unlock", tool: "PdfUnlock" },
  { alt: "pdf-page-numbers", canonical: "pdf-page-numbers", tool: "PdfPageNumbers" },
  { alt: "add-page-numbers-to-pdf", canonical: "pdf-page-numbers", tool: "PdfPageNumbers" },
  { alt: "number-pdf-pages", canonical: "pdf-page-numbers", tool: "PdfPageNumbers" },
  { alt: "flatten-pdf", canonical: "pdf-flatten", tool: "PdfFlatten" },
  { alt: "flatten-pdf-form", canonical: "pdf-flatten", tool: "PdfFlatten" },
] as const;

// SEO data for main PDF tools (optimized titles/descriptions)
export const pdfToolsSeo: Record<string, { title: string; description: string; keywords: string[] }> = {
  "pdf-compress": {
    title: "Compress PDF Free Online - Reduce PDF Size Up to 80% | FormatFuse",
    description:
      "Compress PDF files for free - reduce size by up to 80% in seconds. No signup, no watermarks, no file uploads. 100% private, works offline.",
    keywords: [
      "compress pdf",
      "compress pdf online",
      "pdf compressor",
      "reduce pdf size",
      "shrink pdf",
      "make pdf smaller",
      "pdf compression",
      "compress pdf free",
    ],
  },
  "pdf-merge": {
    title: "Merge PDF Files Free Online - Combine PDFs Instantly | FormatFuse",
    description:
      "Merge multiple PDF files into one document for free. Drag to reorder pages. No signup, no watermarks. 100% private - files never leave your browser.",
    keywords: [
      "merge pdf",
      "combine pdf",
      "merge pdf files",
      "combine pdf files",
      "pdf merger",
      "join pdf",
      "merge pdfs online",
      "combine pdfs free",
    ],
  },
  "pdf-split": {
    title: "Split PDF Free Online - Extract Pages from PDF | FormatFuse",
    description:
      "Split PDF files and extract specific pages for free. Separate PDF into multiple files. No signup, no watermarks. 100% private.",
    keywords: [
      "split pdf",
      "extract pdf pages",
      "separate pdf",
      "pdf splitter",
      "divide pdf",
      "split pdf online",
      "extract pages from pdf",
    ],
  },
  "pdf-rotate": {
    title: "Rotate PDF Pages Free Online - Fix PDF Orientation | FormatFuse",
    description:
      "Rotate PDF pages 90, 180, or 270 degrees for free. Fix upside-down or sideways pages. No signup, no watermarks. 100% private.",
    keywords: [
      "rotate pdf",
      "rotate pdf pages",
      "pdf rotation",
      "turn pdf",
      "flip pdf",
      "rotate pdf online",
      "fix pdf orientation",
    ],
  },
  "jpg-to-pdf": {
    title: "JPG to PDF Converter Free - Convert Images to PDF | FormatFuse",
    description:
      "Convert JPG, PNG, and images to PDF for free. Create multi-page PDFs from multiple images. No signup, no watermarks. 100% private.",
    keywords: [
      "jpg to pdf",
      "image to pdf",
      "convert jpg to pdf",
      "png to pdf",
      "picture to pdf",
      "photo to pdf",
      "images to pdf",
    ],
  },
  "pdf-to-jpg": {
    title: "PDF to JPG Converter Free - Extract Images from PDF | FormatFuse",
    description:
      "Convert PDF pages to JPG images for free. Extract all pages or select specific ones. High-quality output. No signup, 100% private.",
    keywords: [
      "pdf to jpg",
      "pdf to image",
      "convert pdf to jpg",
      "pdf to png",
      "extract images from pdf",
      "pdf to picture",
    ],
  },
  "pdf-protect": {
    title: "Protect PDF Free - Add Password to PDF Online | FormatFuse",
    description:
      "Add password protection to PDF files for free. Encrypt PDFs with AES-256 security. No signup, no uploads. 100% private.",
    keywords: [
      "protect pdf",
      "password protect pdf",
      "encrypt pdf",
      "pdf password",
      "secure pdf",
      "lock pdf",
      "add password to pdf",
    ],
  },
  "pdf-unlock": {
    title: "Unlock PDF Free - Remove Password from PDF Online | FormatFuse",
    description:
      "Remove password protection from PDF files for free. Unlock secured PDFs instantly. No signup, no uploads. 100% private.",
    keywords: [
      "unlock pdf",
      "remove pdf password",
      "decrypt pdf",
      "pdf unlocker",
      "remove password from pdf",
      "unlock secured pdf",
    ],
  },
  "pdf-watermark": {
    title: "Add Watermark to PDF Free Online | FormatFuse",
    description:
      "Add text or image watermarks to PDF files for free. Customize position, opacity, and rotation. No signup, 100% private.",
    keywords: [
      "pdf watermark",
      "add watermark to pdf",
      "watermark pdf",
      "stamp pdf",
      "pdf stamp",
      "watermark pdf online",
    ],
  },
  "pdf-flatten": {
    title: "Flatten PDF Free Online - Flatten PDF Forms | FormatFuse",
    description:
      "Flatten PDF forms and annotations for free. Convert fillable fields to static content. No signup, 100% private.",
    keywords: [
      "flatten pdf",
      "flatten pdf form",
      "pdf flattener",
      "remove pdf form fields",
      "flatten annotations",
    ],
  },
  "pdf-page-numbers": {
    title: "Add Page Numbers to PDF Free Online | FormatFuse",
    description:
      "Add page numbers to PDF documents for free. Customize position, format, and starting number. No signup, 100% private.",
    keywords: [
      "add page numbers to pdf",
      "pdf page numbers",
      "number pdf pages",
      "paginate pdf",
      "pdf pagination",
    ],
  },
  "markdown-to-pdf": {
    title: "Markdown to PDF Converter Free Online | FormatFuse",
    description:
      "Convert Markdown to beautifully formatted PDF for free. Supports tables, code blocks, and styling. No signup, 100% private.",
    keywords: [
      "markdown to pdf",
      "convert markdown to pdf",
      "md to pdf",
      "markdown converter",
      "markdown pdf",
    ],
  },
  "pdf-to-markdown": {
    title: "PDF to Markdown Converter Free Online | FormatFuse",
    description:
      "Convert PDF to Markdown format for free. Extract text with formatting preserved. No signup, 100% private.",
    keywords: [
      "pdf to markdown",
      "convert pdf to markdown",
      "pdf to md",
      "extract text from pdf",
      "pdf text extractor",
    ],
  },
};

// Hub page categories
export const pdfToolCategories = [
  {
    name: "Edit PDF",
    description: "Modify and rearrange your PDF documents",
    tools: ["pdf-merge", "pdf-split", "pdf-rotate", "pdf-page-numbers", "pdf-watermark"],
  },
  {
    name: "Convert PDF",
    description: "Convert between PDF and other formats",
    tools: ["jpg-to-pdf", "pdf-to-jpg", "markdown-to-pdf", "pdf-to-markdown"],
  },
  {
    name: "Optimize PDF",
    description: "Reduce file size and optimize PDFs",
    tools: ["pdf-compress", "pdf-flatten"],
  },
  {
    name: "Secure PDF",
    description: "Protect and unlock PDF documents",
    tools: ["pdf-protect", "pdf-unlock"],
  },
];

// ============================================
// IMAGE TO PDF FORMAT VARIATIONS
// ============================================
export const imageToPdfFormats = [
  {
    format: "png",
    display: "PNG",
    description: "Convert PNG images to PDF documents",
    keywords: ["png to pdf", "convert png to pdf", "png pdf converter"],
  },
  {
    format: "heic",
    display: "HEIC",
    description: "Convert iPhone HEIC photos to PDF",
    keywords: ["heic to pdf", "convert heic to pdf", "iphone photo to pdf", "ios image to pdf"],
  },
  {
    format: "webp",
    display: "WebP",
    description: "Convert WebP images to PDF documents",
    keywords: ["webp to pdf", "convert webp to pdf", "webp pdf converter"],
  },
  {
    format: "gif",
    display: "GIF",
    description: "Convert GIF images to PDF documents",
    keywords: ["gif to pdf", "convert gif to pdf", "gif pdf converter"],
  },
  {
    format: "bmp",
    display: "BMP",
    description: "Convert BMP images to PDF documents",
    keywords: ["bmp to pdf", "convert bmp to pdf", "bitmap to pdf"],
  },
  {
    format: "tiff",
    display: "TIFF",
    description: "Convert TIFF images to PDF documents",
    keywords: ["tiff to pdf", "convert tiff to pdf", "tif to pdf"],
  },
  {
    format: "avif",
    display: "AVIF",
    description: "Convert AVIF images to PDF documents",
    keywords: ["avif to pdf", "convert avif to pdf"],
  },
  {
    format: "svg",
    display: "SVG",
    description: "Convert SVG vector graphics to PDF",
    keywords: ["svg to pdf", "convert svg to pdf", "vector to pdf"],
  },
] as const;

export function getImageToPdfSeoData(format: string, display: string, description: string, keywords: string[]): PdfSeoData {
  return {
    id: `${format}-to-pdf`,
    title: `${display} to PDF`,
    metaTitle: `${display} to PDF Converter Free - Convert ${display} to PDF Online | FormatFuse`,
    metaDescription: `${description} for free. Create multi-page PDFs from multiple ${display} images. No signup, no watermarks. 100% private.`,
    keywords: [...keywords, `${format} image to pdf`, `free ${format} to pdf`],
    h1: `${display} to PDF Converter`,
    subtitle: `${description}. Fast, free, and completely private.`,
    features: [
      `Convert ${display} to PDF`,
      "Multiple images supported",
      "Custom page sizes",
      "100% private - no uploads",
      "No signup required",
    ],
    faqs: [
      {
        question: `How do I convert ${display} to PDF?`,
        answer: `Simply drag and drop your ${display} files or click to browse. You can add multiple images and arrange them in any order. Then click Convert to create your PDF.`,
      },
      {
        question: `Can I convert multiple ${display} images to one PDF?`,
        answer: `Yes! You can add as many ${display} images as you need and combine them into a single PDF document. Drag to reorder pages before converting.`,
      },
      {
        question: `What page sizes are available for ${display} to PDF?`,
        answer: "You can choose Auto (matches image size), A4, Letter, or Legal page sizes. You can also select Portrait or Landscape orientation.",
      },
      {
        question: `Is my ${display} file safe?`,
        answer: "Yes! Your files never leave your browser. All conversion happens locally on your device. We never upload or store your files.",
      },
    ],
  };
}

// ============================================
// PDF TO IMAGE FORMAT VARIATIONS
// ============================================
export const pdfToImageFormats = [
  {
    format: "png",
    display: "PNG",
    description: "Convert PDF pages to high-quality PNG images",
    keywords: ["pdf to png", "convert pdf to png", "pdf png converter", "extract png from pdf"],
  },
  {
    format: "webp",
    display: "WebP",
    description: "Convert PDF pages to WebP format for web",
    keywords: ["pdf to webp", "convert pdf to webp", "pdf webp converter"],
  },
  {
    format: "gif",
    display: "GIF",
    description: "Convert PDF pages to GIF images",
    keywords: ["pdf to gif", "convert pdf to gif"],
  },
  {
    format: "bmp",
    display: "BMP",
    description: "Convert PDF pages to BMP bitmap images",
    keywords: ["pdf to bmp", "convert pdf to bmp", "pdf bitmap"],
  },
  {
    format: "tiff",
    display: "TIFF",
    description: "Convert PDF pages to TIFF images",
    keywords: ["pdf to tiff", "convert pdf to tiff", "pdf tif"],
  },
] as const;

export function getPdfToImageSeoData(format: string, display: string, description: string, keywords: string[]): PdfSeoData {
  return {
    id: `pdf-to-${format}`,
    title: `PDF to ${display}`,
    metaTitle: `PDF to ${display} Converter Free - Convert PDF to ${display} Online | FormatFuse`,
    metaDescription: `${description} for free. Extract all pages or select specific ones. High-quality output. No signup, 100% private.`,
    keywords: [...keywords, `pdf to ${format} image`, `free pdf to ${format}`],
    h1: `PDF to ${display} Converter`,
    subtitle: `${description}. Fast, free, and completely private.`,
    features: [
      `Convert PDF to ${display}`,
      "Extract all or specific pages",
      "High-quality output",
      "100% private - no uploads",
      "Batch download as ZIP",
    ],
    faqs: [
      {
        question: `How do I convert PDF to ${display}?`,
        answer: `Upload your PDF file, select the pages you want to convert (or choose all pages), and click Convert. Your ${display} images will be ready to download.`,
      },
      {
        question: `Can I convert specific PDF pages to ${display}?`,
        answer: `Yes! You can select individual pages or page ranges to convert. You don't have to convert the entire PDF if you only need certain pages.`,
      },
      {
        question: `What resolution are the ${display} images?`,
        answer: `Images are exported at high resolution (typically 150-300 DPI) to ensure clarity and readability. The quality is suitable for printing or digital use.`,
      },
      {
        question: "Is my PDF file safe?",
        answer: "Yes! Your files never leave your browser. All conversion happens locally on your device. We never upload or store your files.",
      },
    ],
  };
}

// ============================================
// MERGE COUNT VARIATIONS
// ============================================
export const mergeCountVariations = [
  { count: "2", display: "Two", description: "Merge 2 PDF files into one" },
  { count: "3", display: "Three", description: "Merge 3 PDF files into one" },
  { count: "4", display: "Four", description: "Merge 4 PDF files into one" },
  { count: "5", display: "Five", description: "Merge 5 PDF files into one" },
  { count: "multiple", display: "Multiple", description: "Merge multiple PDF files into one" },
  { count: "many", display: "Many", description: "Merge many PDF files into one document" },
] as const;

export function getMergeCountSeoData(count: string, display: string, description: string): PdfSeoData {
  const isNumeric = !isNaN(Number(count));
  return {
    id: `merge-${count}-pdfs`,
    title: `Merge ${display} PDFs`,
    metaTitle: `Merge ${display} PDF Files Free - Combine ${isNumeric ? count : display} PDFs Online | FormatFuse`,
    metaDescription: `${description} for free. Drag to reorder pages. No signup, no watermarks. 100% private - files never leave your browser.`,
    keywords: [
      `merge ${count} pdfs`,
      `combine ${count} pdfs`,
      `merge ${count} pdf files`,
      `join ${count} pdfs`,
      `${count} pdfs into one`,
    ],
    h1: `Merge ${display} PDF Files`,
    subtitle: `${description}. Drag to reorder, then download your combined PDF.`,
    features: [
      `Combine ${isNumeric ? count : "unlimited"} PDF files`,
      "Drag to reorder pages",
      "Preview before merging",
      "100% private - no uploads",
      "No signup required",
    ],
    faqs: [
      {
        question: `How do I merge ${count} PDF files?`,
        answer: `Simply drag and drop your ${isNumeric ? count : ""} PDF files or click to browse. Arrange them in the desired order, then click Merge to combine them into one document.`,
      },
      {
        question: "Can I reorder the PDFs before merging?",
        answer: "Yes! You can drag and drop the files to arrange them in any order before merging. The final PDF will follow your arrangement.",
      },
      {
        question: `Is there a limit to how many PDFs I can merge?`,
        answer: "There's no strict limit. You can merge as many PDFs as your browser can handle. For very large files, we recommend merging in batches.",
      },
      {
        question: "Are my PDF files safe?",
        answer: "Yes! Your files never leave your browser. All merging happens locally on your device. We never upload or store your files.",
      },
    ],
  };
}

// ============================================
// SPLIT/EXTRACT VARIATIONS
// ============================================
export const splitVariations = [
  {
    variant: "first-page",
    display: "First Page",
    action: "Extract",
    description: "Extract the first page from a PDF",
    keywords: ["extract first page pdf", "get first page pdf", "pdf first page only"],
  },
  {
    variant: "last-page",
    display: "Last Page",
    action: "Extract",
    description: "Extract the last page from a PDF",
    keywords: ["extract last page pdf", "get last page pdf", "pdf last page only"],
  },
  {
    variant: "single-page",
    display: "Single Page",
    action: "Extract",
    description: "Extract a single page from a PDF",
    keywords: ["extract single page pdf", "extract one page pdf", "get single page from pdf"],
  },
  {
    variant: "page-range",
    display: "Page Range",
    action: "Extract",
    description: "Extract a range of pages from a PDF",
    keywords: ["extract page range pdf", "pdf page range", "extract pages 1-5 pdf"],
  },
  {
    variant: "odd-pages",
    display: "Odd Pages",
    action: "Extract",
    description: "Extract all odd-numbered pages from a PDF",
    keywords: ["extract odd pages pdf", "pdf odd pages only", "get odd pages"],
  },
  {
    variant: "even-pages",
    display: "Even Pages",
    action: "Extract",
    description: "Extract all even-numbered pages from a PDF",
    keywords: ["extract even pages pdf", "pdf even pages only", "get even pages"],
  },
  {
    variant: "every-page",
    display: "Every Page",
    action: "Split into",
    description: "Split PDF into individual pages",
    keywords: ["split pdf every page", "pdf to individual pages", "separate all pages"],
  },
  {
    variant: "half",
    display: "Two Halves",
    action: "Split into",
    description: "Split PDF into two equal halves",
    keywords: ["split pdf in half", "divide pdf in two", "pdf two parts"],
  },
] as const;

export function getSplitVariationSeoData(
  variant: string,
  display: string,
  action: string,
  description: string,
  keywords: string[]
): PdfSeoData {
  return {
    id: `${action.toLowerCase().replace(" ", "-")}-${variant}-pdf`,
    title: `${action} ${display} from PDF`,
    metaTitle: `${action} ${display} from PDF Free Online | FormatFuse`,
    metaDescription: `${description} for free. Fast and easy PDF page extraction. No signup, no watermarks. 100% private.`,
    keywords: [...keywords, `${variant} pdf`, `pdf ${variant}`],
    h1: `${action} ${display} from PDF`,
    subtitle: `${description}. Fast, free, and completely private.`,
    features: [
      description,
      "Preview pages before extracting",
      "Download instantly",
      "100% private - no uploads",
      "No signup required",
    ],
    faqs: [
      {
        question: `How do I ${action.toLowerCase()} ${display.toLowerCase()} from a PDF?`,
        answer: `Upload your PDF file, and our tool will help you ${action.toLowerCase()} exactly what you need. Click the button to process and download your result.`,
      },
      {
        question: "Can I preview the pages before extracting?",
        answer: "Yes! You can see thumbnails of all pages in your PDF before extracting, so you know exactly what you're getting.",
      },
      {
        question: "What format is the output?",
        answer: "The extracted pages are saved as a new PDF file. You can download it instantly after processing.",
      },
      {
        question: "Is my PDF file safe?",
        answer: "Yes! Your files never leave your browser. All processing happens locally on your device. We never upload or store your files.",
      },
    ],
  };
}

// ============================================
// ROTATION ANGLE VARIATIONS
// ============================================
export const rotationAngles = [
  { angle: "90", display: "90°", direction: "clockwise", description: "Rotate PDF pages 90 degrees clockwise" },
  { angle: "180", display: "180°", direction: "upside down", description: "Rotate PDF pages 180 degrees (flip upside down)" },
  { angle: "270", display: "270°", direction: "counter-clockwise", description: "Rotate PDF pages 270 degrees (90° counter-clockwise)" },
  { angle: "left", display: "Left", direction: "counter-clockwise", description: "Rotate PDF pages 90 degrees to the left" },
  { angle: "right", display: "Right", direction: "clockwise", description: "Rotate PDF pages 90 degrees to the right" },
] as const;

export function getRotationSeoData(angle: string, display: string, direction: string, description: string): PdfSeoData {
  return {
    id: `rotate-pdf-${angle}`,
    title: `Rotate PDF ${display}`,
    metaTitle: `Rotate PDF ${display} Free Online - Turn PDF ${direction} | FormatFuse`,
    metaDescription: `${description} for free. Fix sideways or upside-down pages instantly. No signup, no watermarks. 100% private.`,
    keywords: [
      `rotate pdf ${angle}`,
      `rotate pdf ${angle} degrees`,
      `turn pdf ${direction}`,
      `pdf rotate ${angle}`,
      `flip pdf ${angle}`,
    ],
    h1: `Rotate PDF ${display}`,
    subtitle: `${description}. Fix orientation issues instantly.`,
    features: [
      `Rotate ${display} ${direction}`,
      "Rotate all or specific pages",
      "Preview before saving",
      "100% private - no uploads",
      "No signup required",
    ],
    faqs: [
      {
        question: `How do I rotate a PDF ${display}?`,
        answer: `Upload your PDF, select the pages you want to rotate, and click the rotate button. The pages will be rotated ${display} ${direction}. Download your fixed PDF instantly.`,
      },
      {
        question: "Can I rotate only specific pages?",
        answer: "Yes! You can select individual pages to rotate while leaving others unchanged. This is perfect for fixing just a few sideways pages.",
      },
      {
        question: "Can I rotate multiple PDFs at once?",
        answer: "Yes, you can add multiple PDF files and rotate pages in each one. Process them all together and download the results.",
      },
      {
        question: "Is the rotation permanent?",
        answer: "The rotated PDF is saved as a new file with the correct orientation. Your original file remains unchanged on your device.",
      },
    ],
  };
}

// ============================================
// COMPRESSION QUALITY VARIATIONS
// ============================================
export const compressionQualities = [
  {
    quality: "high-quality",
    display: "High Quality",
    level: "high",
    description: "Compress PDF while preserving maximum quality",
    reduction: "10-30%",
  },
  {
    quality: "medium-quality",
    display: "Medium Quality",
    level: "medium",
    description: "Balanced compression for good quality and small size",
    reduction: "30-60%",
  },
  {
    quality: "low-quality",
    display: "Low Quality",
    level: "low",
    description: "Maximum compression for smallest file size",
    reduction: "50-80%",
  },
  {
    quality: "maximum",
    display: "Maximum",
    level: "low",
    description: "Maximum compression - smallest possible file size",
    reduction: "60-90%",
  },
  {
    quality: "lossless",
    display: "Lossless",
    level: "high",
    description: "Compress PDF without any quality loss",
    reduction: "5-20%",
  },
] as const;

export function getCompressionQualitySeoData(
  quality: string,
  display: string,
  description: string,
  reduction: string
): PdfSeoData {
  return {
    id: `compress-pdf-${quality}`,
    title: `Compress PDF - ${display}`,
    metaTitle: `Compress PDF ${display} Free - ${reduction} Size Reduction | FormatFuse`,
    metaDescription: `${description}. Reduce PDF size by ${reduction}. No signup, no watermarks. 100% private - files never leave your browser.`,
    keywords: [
      `compress pdf ${quality}`,
      `${quality} pdf compression`,
      `pdf compressor ${quality}`,
      `reduce pdf ${quality}`,
    ],
    h1: `Compress PDF - ${display}`,
    subtitle: `${description}. Expected reduction: ${reduction}.`,
    features: [
      `${display} compression preset`,
      `Typical reduction: ${reduction}`,
      "Batch compress multiple files",
      "100% private - no uploads",
      "No signup required",
    ],
    faqs: [
      {
        question: `What is ${display.toLowerCase()} PDF compression?`,
        answer: `${display} compression ${description.toLowerCase()}. This typically achieves ${reduction} file size reduction while maintaining the appropriate quality level.`,
      },
      {
        question: `How much smaller will my PDF be with ${display.toLowerCase()} compression?`,
        answer: `With ${display.toLowerCase()} compression, you can expect ${reduction} file size reduction. Actual results depend on your PDF's content (images vs text).`,
      },
      {
        question: "Will text be affected by compression?",
        answer: "Text remains sharp and searchable at all compression levels. Only embedded images are compressed based on the quality setting.",
      },
      {
        question: "Can I compress multiple PDFs?",
        answer: "Yes! You can select multiple PDFs and compress them all with the same settings. Download them individually or as a ZIP file.",
      },
    ],
  };
}

// ============================================
// BATCH OPERATION VARIATIONS
// ============================================
export const batchOperations = [
  {
    operation: "compress",
    display: "Compress",
    description: "Batch compress multiple PDF files at once",
    keywords: ["batch compress pdf", "compress multiple pdfs", "bulk pdf compression"],
  },
  {
    operation: "merge",
    display: "Merge",
    description: "Batch merge multiple PDF files",
    keywords: ["batch merge pdf", "bulk merge pdfs", "merge many pdfs"],
  },
  {
    operation: "convert",
    display: "Convert",
    description: "Batch convert multiple PDF files",
    keywords: ["batch convert pdf", "bulk convert pdfs", "convert multiple pdfs"],
  },
  {
    operation: "rotate",
    display: "Rotate",
    description: "Batch rotate multiple PDF files",
    keywords: ["batch rotate pdf", "rotate multiple pdfs", "bulk pdf rotation"],
  },
] as const;

export function getBatchOperationSeoData(
  operation: string,
  display: string,
  description: string,
  keywords: string[]
): PdfSeoData {
  return {
    id: `batch-${operation}-pdfs`,
    title: `Batch ${display} PDFs`,
    metaTitle: `Batch ${display} PDF Files Free Online | FormatFuse`,
    metaDescription: `${description} for free. Process unlimited files simultaneously. No signup, no watermarks. 100% private.`,
    keywords: [...keywords, `bulk ${operation} pdf`, `${operation} many pdfs`],
    h1: `Batch ${display} PDF Files`,
    subtitle: `${description}. Process multiple files at once.`,
    features: [
      "Process multiple files at once",
      "No file limit",
      "Download as ZIP",
      "100% private - no uploads",
      "No signup required",
    ],
    faqs: [
      {
        question: `How do I batch ${operation} PDFs?`,
        answer: `Simply drag and drop multiple PDF files or click to browse and select them. All files will be processed with the same settings. Download results individually or as a ZIP.`,
      },
      {
        question: "Is there a limit to how many files I can process?",
        answer: "There's no strict limit. You can process as many PDFs as your browser can handle. For very large batches, we recommend processing in groups.",
      },
      {
        question: "Can I download all results at once?",
        answer: "Yes! After processing, you can download all files as a single ZIP archive, or download them individually.",
      },
      {
        question: "Are my files safe?",
        answer: "Yes! Your files never leave your browser. All processing happens locally on your device. We never upload or store your files.",
      },
    ],
  };
}

// ============================================
// PERCENTAGE REDUCTION VARIATIONS
// ============================================
export const reductionPercentages = [
  { percent: "50", display: "50%", description: "Reduce PDF size by 50%" },
  { percent: "75", display: "75%", description: "Reduce PDF size by 75%" },
  { percent: "80", display: "80%", description: "Reduce PDF size by 80%" },
  { percent: "90", display: "90%", description: "Reduce PDF size by 90%" },
] as const;

export function getReductionPercentSeoData(percent: string, display: string, description: string): PdfSeoData {
  return {
    id: `reduce-pdf-size-${percent}-percent`,
    title: `Reduce PDF Size ${display}`,
    metaTitle: `Reduce PDF Size by ${display} Free Online | FormatFuse`,
    metaDescription: `${description} for free. Smart compression to achieve your target reduction. No signup, no watermarks. 100% private.`,
    keywords: [
      `reduce pdf size ${percent} percent`,
      `compress pdf ${percent}%`,
      `shrink pdf ${percent}`,
      `pdf ${percent} smaller`,
    ],
    h1: `Reduce PDF Size by ${display}`,
    subtitle: `${description}. Smart compression to hit your target.`,
    features: [
      `Target: ${display} size reduction`,
      "Smart adaptive compression",
      "Quality preservation",
      "100% private - no uploads",
      "No signup required",
    ],
    faqs: [
      {
        question: `Can I really reduce my PDF by ${display}?`,
        answer: `It depends on your PDF's content. PDFs with many images can often be reduced by ${display} or more. Text-heavy PDFs may have less reduction potential.`,
      },
      {
        question: "What if the target reduction can't be achieved?",
        answer: `We'll compress as much as possible while maintaining readability. Some PDFs may not reach ${display} reduction if they're already optimized.`,
      },
      {
        question: "Will quality be affected?",
        answer: `To achieve ${display} reduction, some quality trade-off may be needed for images. Text remains sharp and readable at all compression levels.`,
      },
      {
        question: "Is my PDF safe?",
        answer: "Yes! Your files never leave your browser. All compression happens locally on your device. We never upload or store your files.",
      },
    ],
  };
}
