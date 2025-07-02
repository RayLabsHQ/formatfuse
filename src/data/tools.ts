import {
  FileText,
  Code,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Layers,
  FileDown,
  Scissors,
  Type,
  Image,
  QrCode,
  Braces,
  Hash,
  FileSpreadsheet,
  FileArchive,
  Globe,
  ArrowLeftRight,
  Lock,
  Shield,
  GitBranch,
  Package,
} from "lucide-react";

export interface Tool {
  id: string;
  name: string;
  title?: string; // Alternative title for display
  description: string;
  icon: React.ElementType;
  searches?: string;
  isNew?: boolean;
  isPopular?: boolean;
  popular?: boolean; // Alternative popular flag
  isBeta?: boolean;
  isImplemented?: boolean; // Flag to hide unimplemented tools
  category: string;
  route?: string; // Custom route if different from id
  href?: string; // Alternative href field
}

// Universal converters (these should appear first)
export const universalTools: Tool[] = [
  {
    id: "image-converter",
    name: "Universal Image Converter",
    description:
      "Convert between PNG, JPG, WebP, GIF, BMP, ICO, TIFF, AVIF, HEIC and more",
    icon: Image,
    searches: "1M+",
    isPopular: true,
    isImplemented: true,
    category: "image",
    route: "/tools/image-converter",
  },
  {
    id: "image-compressor",
    name: "Image Compressor",
    description:
      "Compress JPG, WebP, and AVIF images while maintaining quality",
    icon: FileDown,
    searches: "500k",
    isPopular: true,
    isImplemented: true,
    category: "image",
    route: "/tools/image-compressor",
  },
  {
    id: "image-resizer",
    name: "Image Resizer",
    description:
      "Resize images to exact dimensions with bulk processing support",
    icon: Image,
    searches: "400k",
    isPopular: true,
    isImplemented: true,
    category: "image",
    route: "/tools/image-resizer",
  },
];

// Image format conversions
const imageFormats = [
  "png",
  "jpg",
  "webp",
  "gif",
  "bmp",
  "ico",
  "tiff",
  "avif",
  "heic",
];
const imageConversions: Tool[] = [];

// Generate all image conversion combinations
for (const from of imageFormats) {
  for (const to of imageFormats) {
    // Skip same format conversions except for lossy formats (compression)
    // Note: HEIC to HEIC is not supported
    if (
      from === to &&
      (!["jpg", "webp", "avif"].includes(from) || from === "heic")
    )
      continue;

    const fromName = from.toUpperCase();
    const toName = to.toUpperCase();
    const isSameFormat = from === to;

    imageConversions.push({
      id: `${from}-to-${to}`,
      name: isSameFormat
        ? `${fromName} Compressor`
        : `${fromName} to ${toName}`,
      description: isSameFormat
        ? `Compress and optimize ${fromName} images`
        : `Convert ${fromName} images to ${toName} format`,
      icon: Image,
      searches: getSearchVolume(from, to),
      isPopular: isPopularConversion(from, to),
      isImplemented: true, // All image conversions are implemented
      category: "image",
      route: `/convert/${from}-to-${to}`,
    });
  }
}

// Helper functions
function getSearchVolume(from: string, to: string): string {
  const popularConversions: Record<string, string> = {
    "png-to-jpg": "350k",
    "jpg-to-png": "280k",
    "jpg-to-pdf": "300k",
    "webp-to-png": "150k",
    "webp-to-jpg": "120k",
    "heic-to-jpg": "180k",
    "heic-to-png": "120k",
    "heic-to-webp": "50k",
    "gif-to-mp4": "100k",
    "png-to-webp": "100k",
    "jpg-to-webp": "90k",
    "bmp-to-jpg": "80k",
    "tiff-to-jpg": "70k",
    "jpg-to-jpg": "200k", // compression
    "webp-to-webp": "50k", // compression
    "avif-to-jpg": "40k",
    "avif-to-png": "30k",
  };

  const key = `${from}-to-${to}`;
  return popularConversions[key] || "20k";
}

function isPopularConversion(from: string, to: string): boolean {
  const popular = [
    "png-to-jpg",
    "jpg-to-png",
    "jpg-to-pdf",
    "webp-to-png",
    "webp-to-jpg",
    "jpg-to-jpg",
    "heic-to-jpg",
    "heic-to-png",
  ];
  return popular.includes(`${from}-to-${to}`);
}

// PDF Tools (unfiltered - includes unimplemented for reference)
const pdfToolsAll: Tool[] = [
  {
    id: "pdf-merge",
    name: "Merge PDF",
    description: "Combine multiple PDFs into one document",
    icon: Layers,
    searches: "250k",
    isImplemented: true,
    category: "pdf",
    route: "/convert/pdf-merge",
  },
  {
    id: "pdf-compress",
    name: "Compress PDF",
    description: "Reduce PDF file size without losing quality",
    icon: FileDown,
    searches: "200k",
    isImplemented: true,
    category: "pdf",
    route: "/convert/pdf-compress",
  },
  {
    id: "pdf-split",
    name: "Split PDF",
    description: "Extract pages or split PDF into multiple files",
    icon: Scissors,
    searches: "180k",
    isImplemented: true,
    category: "pdf",
    route: "/convert/pdf-split",
  },
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Convert images to PDF documents",
    icon: Image,
    searches: "300k",
    isPopular: true,
    isImplemented: true,
    category: "pdf",
    route: "/convert/jpg-to-pdf",
  },
  {
    id: "word-to-pdf",
    name: "Word to PDF",
    description: "Convert Word documents to PDF format",
    icon: Type,
    searches: "380k",
    isPopular: true,
    isImplemented: false, // TODO: Not implemented
    category: "pdf",
    route: "/convert/word-to-pdf",
  },
  {
    id: "pdf-to-jpg",
    name: "PDF to JPG",
    description: "Extract images from PDF pages",
    icon: Image,
    searches: "180k",
    isImplemented: true,
    category: "pdf",
    route: "/convert/pdf-to-jpg",
  },
  {
    id: "excel-to-pdf",
    name: "Excel to PDF",
    description: "Convert spreadsheets to PDF format",
    icon: FileSpreadsheet,
    searches: "150k",
    isImplemented: false, // TODO: Not implemented
    category: "pdf",
    route: "/convert/excel-to-pdf",
  },
  {
    id: "pdf-rotate",
    name: "Rotate PDF",
    description: "Rotate PDF pages to correct orientation",
    icon: FileText,
    searches: "120k",
    isImplemented: true,
    category: "pdf",
    route: "/convert/pdf-rotate",
  },
];

// Developer Tools (unfiltered - includes unimplemented for reference)
const devToolsAll: Tool[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Beautify, minify and validate JSON data with error detection",
    icon: Braces,
    searches: "150k",
    isImplemented: true,
    category: "dev",
    route: "/tools/json-formatter",
  },
  {
    id: "base64-encoder",
    name: "Base64 Encode/Decode",
    description: "Encode and decode Base64 strings with file support",
    icon: Hash,
    searches: "100k",
    isImplemented: true,
    category: "dev",
    route: "/tools/base64-encoder",
  },
  {
    id: "qr-generator",
    name: "QR Code Generator",
    description:
      "Create QR codes for URLs, WiFi, contacts, and more with custom styling",
    icon: QrCode,
    searches: "200k",
    isPopular: true,
    isImplemented: true,
    category: "dev",
    route: "/tools/qr-generator",
  },
  {
    id: "url-shorten",
    name: "URL Shortener",
    description: "Create short links for long URLs",
    icon: Globe,
    searches: "150k",
    isImplemented: false, // TODO: Not implemented
    category: "dev",
    route: "/tools/url-shorten",
  },
  {
    id: "word-counter",
    name: "Word Counter",
    description: "Count words, characters, and paragraphs",
    icon: Type,
    searches: "120k",
    isImplemented: true,
    category: "dev",
    route: "/tools/word-counter",
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    description:
      "Generate MD5, SHA-1, SHA-256, SHA-512 hashes for text and files",
    icon: Hash,
    searches: "80k",
    isImplemented: true,
    category: "dev",
    route: "/tools/hash-generator",
    isNew: true,
  },
  {
    id: "case-converter",
    name: "Case Converter",
    description: "Convert text between case formats with smart detection",
    icon: Type,
    searches: "90k",
    isImplemented: true,
    category: "dev",
    route: "/tools/case-converter",
  },
  {
    id: "json-yaml-converter",
    name: "JSON ↔ YAML Converter",
    description:
      "Convert between JSON and YAML formats with syntax highlighting",
    icon: ArrowLeftRight,
    searches: "200k",
    isImplemented: true,
    isNew: true,
    isPopular: true,
    category: "dev",
    route: "/tools/json-yaml-converter",
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description:
      "Generate UUIDs (v1, v3, v4, v5) in various formats with bulk generation",
    icon: Hash,
    searches: "150k",
    isImplemented: true,
    isNew: true,
    category: "dev",
    route: "/tools/uuid-generator",
  },
  {
    id: "password-generator",
    name: "Password Generator",
    description:
      "Generate secure passwords with customizable length, characters, and strength",
    icon: Lock,
    searches: "200k",
    isImplemented: true,
    isNew: true,
    isPopular: true,
    category: "dev",
    route: "/tools/password-generator",
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    description:
      "Decode and inspect JSON Web Tokens without sending them to a server",
    icon: Shield,
    searches: "180k",
    isImplemented: true,
    isNew: true,
    isPopular: true,
    category: "dev",
    route: "/tools/jwt-decoder",
  },
  {
    id: "text-diff-checker",
    name: "Text Diff Checker",
    description:
      "Compare two texts and visualize differences with multiple view modes",
    icon: GitBranch,
    searches: "150k",
    isImplemented: true,
    isNew: true,
    category: "dev",
    route: "/tools/text-diff-checker",
  },
];

// Document Tools (unfiltered - includes unimplemented for reference)
const documentToolsAll: Tool[] = [
  {
    id: "txt-to-pdf",
    name: "Text to PDF",
    description: "Convert plain text files to PDF",
    icon: FileText,
    searches: "100k",
    isImplemented: false, // TODO: Not implemented
    category: "document",
    route: "/convert/txt-to-pdf",
  },
  {
    id: "rtf-converter",
    name: "RTF Converter",
    description: "Convert Rich Text Format files",
    icon: FileText,
    searches: "80k",
    isImplemented: false, // TODO: Not implemented
    category: "document",
    route: "/tools/rtf-converter",
  },
  {
    id: "markdown-to-html",
    name: "Markdown to HTML",
    description: "Convert Markdown to HTML format",
    icon: Code,
    searches: "90k",
    isImplemented: false, // TODO: Not implemented
    category: "document",
    route: "/tools/markdown-to-html",
  },
  {
    id: "markdown-to-pdf",
    name: "Markdown to PDF",
    description: "Convert Markdown to PDF with live preview",
    icon: Code,
    searches: "110k",
    isPopular: true,
    isImplemented: true,
    category: "document",
    route: "/convert/markdown-to-pdf",
  },
];

// Archive Tools (unfiltered - includes unimplemented for reference)
const archiveToolsAll: Tool[] = [
  {
    id: "create-archive",
    name: "Create Archive",
    description: "Create ZIP, TAR, or TAR.GZ archives from multiple files",
    icon: FileArchive,
    searches: "250k",
    isNew: true,
    isPopular: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/create-archive",
  },
  {
    id: "multi-extract",
    name: "Universal Extractor",
    description: "Extract any archive format: ZIP, 7Z, RAR, TAR, and more",
    icon: FileArchive,
    searches: "200k",
    isNew: true,
    isPopular: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/multi-extract",
  },
  {
    id: "create-zip",
    name: "Create ZIP",
    description: "Compress files into ZIP archive",
    icon: FileArchive,
    searches: "120k",
    isImplemented: true,
    category: "archive",
    route: "/tools/create-zip",
  },
  {
    id: "tar-create",
    name: "Create TAR",
    description: "Create TAR archives with optional compression",
    icon: Package,
    searches: "60k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/tar-create",
  },
  {
    id: "zip-extract",
    name: "Extract ZIP",
    description: "Extract files from ZIP archives",
    icon: FileArchive,
    searches: "150k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/zip-extract",
  },
  {
    id: "7z-extract",
    name: "Extract 7-Zip",
    description: "Extract 7Z archives with high compression",
    icon: FileArchive,
    searches: "100k",
    isNew: true,
    isPopular: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/7z-extract",
  },
  {
    id: "rar-extract",
    name: "Extract RAR",
    description: "Extract RAR v4 and v5 archives",
    icon: FileArchive,
    searches: "90k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/rar-extract",
  },
  {
    id: "tar-extract",
    name: "Extract TAR",
    description: "Extract TAR, TAR.GZ, and TAR.BZ2 archives",
    icon: Package,
    searches: "80k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/tar-extract",
  },
  {
    id: "iso-extract",
    name: "Extract ISO",
    description: "Extract ISO disk image files",
    icon: FileArchive,
    searches: "70k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/iso-extract",
  },
  {
    id: "cab-extract",
    name: "Extract CAB",
    description: "Extract Microsoft Cabinet (CAB) files",
    icon: FileArchive,
    searches: "40k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/cab-extract",
  },
  {
    id: "ar-extract",
    name: "Extract AR",
    description: "Extract AR archives (Debian packages)",
    icon: FileArchive,
    searches: "30k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/ar-extract",
  },
  {
    id: "cpio-extract",
    name: "Extract CPIO",
    description: "Extract CPIO archives",
    icon: FileArchive,
    searches: "25k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/cpio-extract",
  },
  {
    id: "xz-extract",
    name: "Extract XZ",
    description: "Extract XZ compressed files",
    icon: FileArchive,
    searches: "35k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/xz-extract",
  },
  {
    id: "lzma-extract",
    name: "Extract LZMA",
    description: "Extract LZMA compressed files",
    icon: FileArchive,
    searches: "20k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/lzma-extract",
  },
  {
    id: "gz-extract",
    name: "Extract GZ",
    description: "Extract GZIP compressed files",
    icon: FileArchive,
    searches: "50k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/gz-extract",
  },
  {
    id: "bz2-extract",
    name: "Extract BZ2",
    description: "Extract BZIP2 compressed files",
    icon: FileArchive,
    searches: "30k",
    isNew: true,
    isImplemented: true,
    category: "archive",
    route: "/tools/bz2-extract",
  },
];

// Other image tools (non-conversion) (unfiltered - includes unimplemented for reference)
const otherImageToolsAll: Tool[] = [
  {
    id: "background-remove",
    name: "Remove Background",
    description: "Remove background from images automatically",
    icon: Image,
    searches: "300k",
    isPopular: true,
    isImplemented: false, // TODO: Not implemented
    category: "image",
    route: "/tools/background-remove",
  },
  {
    id: "svg-to-png",
    name: "SVG to PNG",
    description:
      "Convert SVG vector graphics to PNG, JPEG, WebP, or AVIF formats",
    icon: Image,
    searches: "250k",
    isPopular: true,
    isImplemented: true,
    category: "image",
    route: "/convert/svg-to-png",
  },
];

// Filter function to exclude unimplemented tools
const filterImplemented = (tools: Tool[]) =>
  tools.filter((tool) => tool.isImplemented !== false);

// Export filtered tools
export const pdfTools = filterImplemented(pdfToolsAll);
export const devTools = filterImplemented(devToolsAll);
export const documentTools = filterImplemented(documentToolsAll);
export const archiveTools = filterImplemented(archiveToolsAll);
export const otherImageTools = filterImplemented(otherImageToolsAll);

// Combine all tools with universal tools first
export const imageTools: Tool[] = filterImplemented([
  ...universalTools,
  ...otherImageToolsAll,
  ...imageConversions,
]);

// All tools combined (filtered)
export const allTools: Tool[] = filterImplemented([
  ...universalTools,
  ...pdfToolsAll,
  ...otherImageToolsAll,
  ...imageConversions,
  ...devToolsAll,
  ...documentToolsAll,
  ...archiveToolsAll,
]);

// Categories for filtering (with unimplemented tools filtered out)
export const categories = [
  {
    id: "pdf",
    name: "PDF Tools",
    tools: pdfTools,
    color: "border-tool-pdf text-tool-pdf",
    bgColor: "bg-tool-pdf/10",
  },
  {
    id: "image",
    name: "Image Tools",
    tools: imageTools,
    color: "border-tool-jpg text-tool-jpg",
    bgColor: "bg-tool-jpg/10",
  },
  {
    id: "dev",
    name: "Developer Tools",
    tools: devTools,
    color: "border-accent text-accent",
    bgColor: "bg-accent/10",
  },
  {
    id: "document",
    name: "Document Tools",
    tools: documentTools,
    color: "border-tool-doc text-tool-doc",
    bgColor: "bg-tool-doc/10",
  },
  {
    id: "archive",
    name: "Archive Tools",
    tools: archiveTools,
    color: "border-amber-500 text-amber-500",
    bgColor: "bg-amber-500/10",
  },
].filter((cat) => cat.tools.length > 0); // Only show categories with tools

// Search function for tools
export function searchTools(query: string): Tool[] {
  if (!query) return allTools;

  const lowerQuery = query.toLowerCase();

  return allTools.filter((tool) => {
    // Check tool name
    if (tool.name.toLowerCase().includes(lowerQuery)) return true;

    // Check tool description
    if (tool.description.toLowerCase().includes(lowerQuery)) return true;

    // Check tool id (for direct searches like "png-to-jpg")
    if (tool.id.toLowerCase().includes(lowerQuery)) return true;

    // Check acronyms (e.g., "pdf" matches "PDF to Word")
    const acronym = tool.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toLowerCase();
    if (acronym.includes(lowerQuery)) return true;

    // Check format searches (e.g., "png jpg" matches "PNG to JPG")
    const formats = tool.id.split("-to-");
    if (formats.length === 2) {
      const searchTerms = lowerQuery.split(" ").filter((t) => t.length > 0);
      if (
        searchTerms.every((term) =>
          formats.some((format) => format.includes(term)),
        )
      )
        return true;
    }

    return false;
  });
}
