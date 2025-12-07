import {
  FileText,
  Code,
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
  Palette,
  Video,
  Film,
  PlayCircle,
} from "lucide-react";
import uFuzzy from "@leeoniya/ufuzzy";

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
      isPopular: isPopularConversion(from, to),
      isImplemented: true, // All image conversions are implemented
      category: "image",
      route: `/convert/${from}-to-${to}`,
    });
  }
}

// Helper functions
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
    isImplemented: true,
    category: "pdf",
    route: "/convert/pdf-merge",
  },
  {
    id: "pdf-compress",
    name: "Compress PDF",
    description: "Reduce PDF file size without losing quality",
    icon: FileDown,
    isImplemented: true,
    category: "pdf",
    route: "/convert/pdf-compress",
  },
  {
    id: "pdf-split",
    name: "Split PDF",
    description: "Extract pages or split PDF into multiple files",
    icon: Scissors,
    isImplemented: true,
    category: "pdf",
    route: "/convert/pdf-split",
  },
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Convert images to PDF documents",
    icon: Image,
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
    isImplemented: true,
    category: "pdf",
    route: "/convert/pdf-to-jpg",
  },
  {
    id: "excel-to-pdf",
    name: "Excel to PDF",
    description: "Convert spreadsheets to PDF format",
    icon: FileSpreadsheet,
    isImplemented: false, // TODO: Not implemented
    category: "pdf",
    route: "/convert/excel-to-pdf",
  },
  {
    id: "pdf-rotate",
    name: "Rotate PDF",
    description: "Rotate PDF pages to correct orientation",
    icon: FileText,
    isImplemented: true,
    category: "pdf",
    route: "/convert/pdf-rotate",
  },
  {
    id: "markdown-to-pdf",
    name: "Markdown to PDF",
    description: "Convert Markdown to PDF with live preview",
    icon: Code,
    isPopular: true,
    isImplemented: true,
    category: "pdf",
    route: "/convert/markdown-to-pdf",
  },
  {
    id: "pdf-to-markdown",
    name: "PDF to Markdown",
    description: "Extract text from PDF and convert to formatted Markdown",
    icon: FileText,
    isPopular: true,
    isImplemented: true,
    category: "pdf",
    route: "/convert/pdf-to-markdown",
  },
];

// Developer Tools (unfiltered - includes unimplemented for reference)
const devToolsAll: Tool[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Beautify, minify and validate JSON data with error detection",
    icon: Braces,
    isImplemented: true,
    category: "dev",
    route: "/tools/json-formatter",
  },
  {
    id: "base64-encoder",
    name: "Base64 Encode/Decode",
    description: "Encode and decode Base64 strings with file support",
    icon: Hash,
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
    isImplemented: false, // TODO: Not implemented
    category: "dev",
    route: "/tools/url-shorten",
  },
  {
    id: "word-counter",
    name: "Word Counter",
    description: "Count words, characters, and paragraphs",
    icon: Type,
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
    isImplemented: true,
    isNew: true,
    category: "dev",
    route: "/tools/text-diff-checker",
  },
  {
    id: "color-converter",
    name: "Color Converter",
    description:
      "Convert colors between HEX, RGB, HSL, HSV, CMYK, and LAB formats",
    icon: Palette,
    isImplemented: true,
    isNew: true,
    category: "dev",
    route: "/tools/color-converter",
  },
];

// Color format conversions (for search only, not displayed in tool lists)
const colorFormats = [
  { key: "hex", name: "HEX" },
  { key: "rgb", name: "RGB" },
  { key: "hsl", name: "HSL" },
  { key: "hsv", name: "HSV" },
  { key: "hwb", name: "HWB" },
  { key: "lab", name: "LAB" },
  { key: "lch", name: "LCH" },
  { key: "oklab", name: "OKLab" },
  { key: "oklch", name: "OKLCH" },
  { key: "p3", name: "Display P3" },
  { key: "rec2020", name: "Rec. 2020" },
  { key: "prophoto", name: "ProPhoto RGB" },
  { key: "a98rgb", name: "Adobe RGB" },
  { key: "xyz", name: "XYZ" },
  { key: "xyz-d50", name: "XYZ D50" },
];

const colorConversions: Tool[] = [];

// Generate all color conversion combinations
for (const from of colorFormats) {
  for (const to of colorFormats) {
    // Skip same format conversions
    if (from.key === to.key) continue;

    colorConversions.push({
      id: `color-${from.key}-to-${to.key}`,
      name: `${from.name} to ${to.name}`,
      description: `Convert ${from.name} colors to ${to.name} format`,
      icon: Palette,
      isImplemented: true,
      category: "dev", // Color converter is under dev tools
      route: `/convert/color/${from.key}-to-${to.key}`,
    });
  }
}

// Document Tools (merged into PDF category for SEO - keeping URLs)
const documentToolsAll: Tool[] = [
  {
    id: "pdf-protect",
    name: "Protect PDF",
    description: "Add password protection to PDF files",
    icon: Lock,
    isImplemented: true,
    category: "pdf",
    route: "/tools/pdf-protect",
  },
  {
    id: "pdf-unlock",
    name: "Unlock PDF",
    description: "Remove password from protected PDFs",
    icon: Shield,
    isImplemented: true,
    category: "pdf",
    route: "/tools/pdf-unlock",
  },
];

// Text Tools (placeholder - will be adding new text tools)
const textToolsAll: Tool[] = [
  {
    id: "txt-to-pdf",
    name: "Text to PDF",
    description: "Convert plain text files to PDF",
    icon: FileText,
    isImplemented: false, // TODO: Not implemented
    category: "text",
    route: "/convert/txt-to-pdf",
  },
  {
    id: "rtf-converter",
    name: "RTF Converter",
    description: "Convert Rich Text Format files",
    icon: FileText,
    isImplemented: false, // TODO: Not implemented
    category: "text",
    route: "/tools/rtf-converter",
  },
  {
    id: "markdown-to-html",
    name: "Markdown to HTML",
    description: "Convert Markdown to HTML format",
    icon: Code,
    isImplemented: false, // TODO: Not implemented
    category: "text",
    route: "/tools/markdown-to-html",
  },
];

// Video Tools (unfiltered - includes unimplemented for reference)
const videoToolsAll: Tool[] = [
  {
    id: "video-converter",
    name: "Universal Video Converter",
    description: "Convert between MP4, WebM, MOV, MKV with advanced settings",
    icon: Video,
    isPopular: true,
    isNew: true,
    isImplemented: true,
    category: "video",
    route: "/tools/video-converter",
  },
  {
    id: "video-compressor",
    name: "Video Compressor",
    description: "Reduce video file size while maintaining quality",
    icon: FileDown,
    isPopular: true,
    isNew: true,
    isImplemented: true,
    category: "video",
    route: "/tools/video-compressor",
  },
  {
    id: "video-trimmer",
    name: "Video Trimmer",
    description: "Trim and cut videos to exact timestamps",
    icon: Scissors,
    isPopular: true,
    isNew: true,
    isImplemented: true,
    category: "video",
    route: "/tools/video-trimmer",
  },
  {
    id: "video-thumbnail-generator",
    name: "Video Thumbnail Generator",
    description: "Extract multiple thumbnails from videos at different timestamps",
    icon: Image,
    isPopular: true,
    isNew: true,
    isImplemented: true,
    category: "video",
    route: "/tools/video-thumbnail-generator",
  },
  {
    id: "video-resizer",
    name: "Video Resizer",
    description: "Resize videos to different resolutions (1080p, 720p, 480p)",
    icon: Film,
    isNew: true,
    isImplemented: true,
    category: "video",
    route: "/tools/video-resizer",
  },
  {
    id: "video-rotator",
    name: "Rotate Video",
    description: "Rotate and flip videos to correct orientation",
    icon: PlayCircle,
    isNew: true,
    isImplemented: true,
    category: "video",
    route: "/tools/video-rotator",
  },
];

// Video format conversions - comprehensive list for programmatic SEO
// Input formats we can accept (browser FFmpeg.wasm support)
const videoInputFormats = ["mp4", "webm", "mov", "mkv", "avi", "wmv", "flv", "3gp", "m4v", "ogv", "ts", "mts"];
// Output formats we can produce (gif is for video-to-gif conversion only)
const videoOutputFormats = ["mp4", "webm", "mov", "mkv", "gif"];
// Quality-adjustable formats (same-format compression)
const qualityVideoFormats = ["mp4", "webm"];
// Audio extraction outputs
const audioOutputFormats = ["mp3", "aac", "wav", "ogg", "flac", "m4a"];

const videoConversions: Tool[] = [];

// Helper function for popular video conversions
function isPopularVideoConversion(from: string, to: string): boolean {
  const popular = [
    "mp4-to-webm", "webm-to-mp4", "mov-to-mp4", "mkv-to-mp4",
    "mp4-to-mp4", "avi-to-mp4", "wmv-to-mp4", "flv-to-mp4",
    "mp4-to-gif", "mov-to-gif", "webm-to-gif",
    "mp4-to-mp3", "mov-to-mp3", "mkv-to-mp3",
  ];
  return popular.includes(`${from}-to-${to}`);
}

// Generate video to video conversions
for (const from of videoInputFormats) {
  for (const to of videoOutputFormats) {
    // Skip same format conversions except for quality-adjustable formats
    if (from === to && !qualityVideoFormats.includes(from)) continue;

    const fromName = from.toUpperCase();
    const toName = to.toUpperCase();
    const isSameFormat = from === to;
    const isToGif = to === "gif";

    videoConversions.push({
      id: `video-${from}-to-${to}`,
      name: isSameFormat
        ? `${fromName} Compressor`
        : isToGif
        ? `${fromName} to GIF`
        : `${fromName} to ${toName}`,
      description: isSameFormat
        ? `Compress and optimize ${fromName} videos`
        : isToGif
        ? `Convert ${fromName} videos to animated GIF`
        : `Convert ${fromName} videos to ${toName} format`,
      icon: isToGif ? Image : Video,
      isPopular: isPopularVideoConversion(from, to),
      isNew: true,
      isImplemented: true,
      category: "video",
      route: `/video-tools/${from}-to-${to}`,
      searches: `${fromName} ${toName} convert converter video`,
    });
  }
}

// Generate video to audio extraction conversions
for (const from of videoInputFormats.filter(f => f !== "gif")) {
  for (const to of audioOutputFormats) {
    const fromName = from.toUpperCase();
    const toName = to.toUpperCase();

    videoConversions.push({
      id: `video-${from}-to-${to}`,
      name: `${fromName} to ${toName}`,
      description: `Extract ${toName} audio from ${fromName} videos`,
      icon: Video,
      isPopular: isPopularVideoConversion(from, to),
      isNew: true,
      isImplemented: true,
      category: "video",
      route: `/video-tools/${from}-to-${to}`,
      searches: `${fromName} ${toName} extract audio converter video`,
    });
  }
}

// Archive Tools (unfiltered - includes unimplemented for reference)
const archiveToolsAll: Tool[] = [
  {
    id: "create-archive",
    name: "Create Archive",
    description: "Create ZIP, TAR, or TAR.GZ archives from multiple files",
    icon: FileArchive,
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
    isImplemented: true,
    category: "archive",
    route: "/tools/create-zip",
  },
  {
    id: "tar-create",
    name: "Create TAR",
    description: "Create TAR archives with optional compression",
    icon: Package,
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
    isPopular: true,
    isImplemented: true,
    category: "image",
    route: "/convert/svg-to-png",
  },
];

// Filter function to exclude unimplemented tools
const filterImplemented = (tools: Tool[]) =>
  tools.filter((tool) => tool.isImplemented !== false);

// Export filtered tools (document tools now merged into PDF)
export const pdfTools = filterImplemented([...pdfToolsAll, ...documentToolsAll]);
export const devTools = filterImplemented(devToolsAll);
export const textTools = filterImplemented(textToolsAll);
export const videoTools = filterImplemented([...videoToolsAll, ...videoConversions]);
export const archiveTools = filterImplemented(archiveToolsAll);
export const otherImageTools = filterImplemented(otherImageToolsAll);

// Check if we're in development mode
const isDev = import.meta.env?.DEV ?? false;

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
  ...documentToolsAll,
  ...otherImageToolsAll,
  ...imageConversions,
  ...videoToolsAll,
  ...videoConversions,
  ...textToolsAll,
  ...devToolsAll,
  ...archiveToolsAll,
]);

// Categories for filtering (show empty categories in dev mode only)
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
    id: "video",
    name: "Video Tools",
    tools: videoTools,
    color: "border-purple-500 text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "text",
    name: "Text Tools",
    tools: textTools,
    color: "border-tool-doc text-tool-doc",
    bgColor: "bg-tool-doc/10",
  },
  {
    id: "dev",
    name: "Developer",
    tools: devTools,
    color: "border-accent text-accent",
    bgColor: "bg-accent/10",
  },
  {
    id: "archive",
    name: "Archive",
    tools: archiveTools,
    color: "border-amber-500 text-amber-500",
    bgColor: "bg-amber-500/10",
  },
].filter((cat) => isDev || cat.tools.length > 0); // Show empty categories in dev mode

const categoryNameMap = new Map(categories.map((cat) => [cat.id, cat.name]));

const searchableToolsForSearch: Tool[] = [...allTools, ...colorConversions];

const fuzzySearch = new uFuzzy({
  intraMode: 1,
  intraIns: 1,
  intraSub: 1,
  intraTrn: 1,
  intraDel: 1,
});

const FUZZY_INFO_THRESHOLD = 1_000;
const MAX_FUZZY_RESULTS = 400;

const fuzzyHaystack = searchableToolsForSearch.map((tool) =>
  buildSearchDocument(tool),
);

function buildSearchDocument(tool: Tool): string {
  const parts: string[] = [tool.name, tool.id.replace(/-/g, " "), tool.description];
  if (tool.searches) {
    parts.push(tool.searches);
  }
  const categoryName = categoryNameMap.get(tool.category);
  if (categoryName) {
    parts.push(categoryName);
  }
  return parts.join(" | ");
}

function rankTools(
  tools: Tool[],
  query: string,
  fuzzyOrder: Map<string, number>,
): Tool[] {
  if (tools.length === 0) return [];

  const lowerQuery = query.toLowerCase();
  const normalizedQuery = lowerQuery.replace(/\s+/g, "");
  const searchTerms = lowerQuery.split(/\s+/).filter((term) => term.length > 0);

  return tools
    .map((tool, index) => {
      const nameLower = tool.name.toLowerCase();
      const descriptionLower = tool.description.toLowerCase();
      const idLower = tool.id.toLowerCase();
      const searchesLower = tool.searches ? tool.searches.toLowerCase() : "";
      const categoryLower = categoryNameMap.get(tool.category)?.toLowerCase();
      const baseScore = Math.max(
        0,
        tools.length - (fuzzyOrder.get(tool.id) ?? tools.length + index),
      ) * 5;

      let score = baseScore;

      if (nameLower === lowerQuery) {
        score += 200;
      } else if (nameLower.includes(lowerQuery)) {
        score += 120;
      }

      if (idLower === lowerQuery) {
        score += 160;
      } else if (idLower.includes(lowerQuery)) {
        score += 90;
      }

      if (searchesLower && searchesLower.includes(lowerQuery)) {
        score += 110;
      }

      if (descriptionLower.includes(lowerQuery)) {
        score += 40;
      }

      if (categoryLower && categoryLower.includes(lowerQuery)) {
        score += 35;
      }

      const acronym = tool.name
        .split(/[\s/-]+/)
        .map((word) => word[0]?.toLowerCase() ?? "")
        .join("");
      if (normalizedQuery && acronym.includes(normalizedQuery)) {
        score += 50;
      }

      if (tool.id.startsWith("color-")) {
        const colorIdMatch = tool.id.match(/^color-(.+)-to-(.+)$/);
        if (colorIdMatch) {
          const [, sourceFormat, targetFormat] = colorIdMatch;
          const hasSourceFormat = searchTerms.some(
            (term) =>
              sourceFormat === term ||
              sourceFormat.includes(term) ||
              term.includes(sourceFormat),
          );
          const hasTargetFormat = searchTerms.some(
            (term) =>
              targetFormat === term ||
              targetFormat.includes(term) ||
              term.includes(targetFormat),
          );

          if (hasSourceFormat && hasTargetFormat && lowerQuery.includes("to")) {
            score += 90;
          } else if (hasSourceFormat && hasTargetFormat) {
            score += 70;
          } else if (
            searchTerms.some(
              (term) => sourceFormat === term || targetFormat === term,
            )
          ) {
            score += 40;
          } else if (
            lowerQuery.includes(sourceFormat) || lowerQuery.includes(targetFormat)
          ) {
            score += 25;
          }
        }

        if (lowerQuery.includes("color")) {
          score += 20;
        }
      } else {
        const formats = tool.id.split("-to-");
        if (formats.length === 2 && searchTerms.length > 0) {
          const matchesFormats = searchTerms.every((term) =>
            formats.some((format) => format.includes(term) || term.includes(format)),
          );
          if (matchesFormats) {
            score += 60;
          }
        }
      }

      if (tool.isPopular) {
        score += 15;
      }
      if (tool.isNew) {
        score += 10;
      }
      if (tool.isBeta) {
        score += 5;
      }

      return {
        tool,
        score,
        fuzzyIndex: fuzzyOrder.get(tool.id) ?? tools.length + index,
      };
    })
    .sort((a, b) => {
      if (b.score === a.score) {
        return a.fuzzyIndex - b.fuzzyIndex;
      }
      return b.score - a.score;
    })
    .map(({ tool }) => tool);
}

// Search function for tools
export function searchTools(query: string): Tool[] {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [...searchableToolsForSearch];
  }

  const [idxs, info, order] = fuzzySearch.search(
    fuzzyHaystack,
    trimmedQuery,
    1,
    FUZZY_INFO_THRESHOLD,
  );

  if (!idxs || idxs.length === 0) {
    return [];
  }

  let orderedIdxs: number[] = idxs;

  if (info && order) {
    orderedIdxs = order.map((infoIdx) => info.idx[infoIdx]);
  }

  const seen = new Set<number>();
  const uniqueIndices: number[] = [];

  for (const idx of orderedIdxs) {
    if (!seen.has(idx)) {
      seen.add(idx);
      uniqueIndices.push(idx);
      if (uniqueIndices.length >= MAX_FUZZY_RESULTS) {
        break;
      }
    }
  }

  const candidates = uniqueIndices.map((searchIndex) =>
    searchableToolsForSearch[searchIndex],
  );

  const fuzzyOrder = new Map<string, number>();
  candidates.forEach((tool, index) => {
    if (!fuzzyOrder.has(tool.id)) {
      fuzzyOrder.set(tool.id, index);
    }
  });

  return rankTools(candidates, trimmedQuery, fuzzyOrder);
}
