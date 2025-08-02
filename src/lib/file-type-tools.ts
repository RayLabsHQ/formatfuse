import { allTools, type Tool } from "../data/tools";

export interface ToolOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  popularity?: "high" | "medium" | "low";
  searches?: string;
  route?: string;
}

// Helper function to convert Tool to ToolOption
function toolToOption(tool: Tool): ToolOption {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    icon: tool.icon,
    popularity: tool.isPopular ? "high" : "medium",
    route: tool.route || tool.href,
  };
}

// Find tools that match certain criteria
function findTools(predicate: (tool: Tool) => boolean): ToolOption[] {
  return allTools
    .filter((t) => predicate(t) && t.isImplemented !== false)
    .map(toolToOption);
}

// Comprehensive mapping of file extensions to available tools
export const fileTypeToTools: Record<string, ToolOption[]> = {
  // PDF conversions
  pdf: findTools((t) => 
    ["pdf-compress", "pdf-split", "pdf-to-jpg", "pdf-merge", "pdf-rotate"].includes(t.id) ||
    (t.id.startsWith("pdf-to-") && t.isImplemented !== false)
  ),

  // Image conversions - JPG/JPEG
  jpg: findTools((t) => 
    ["jpg-to-pdf", "jpg-to-png", "image-resizer", "image-compressor", "jpg-to-webp", 
     "jpg-to-gif", "jpg-to-bmp", "jpg-to-ico", "jpg-to-tiff", "jpg-to-avif",
     "image-converter"].includes(t.id) ||
    (t.id.startsWith("jpg-to-") && t.isImplemented !== false)
  ),

  jpeg: [], // Will use jpg tools

  // PNG conversions
  png: findTools((t) => 
    ["png-to-jpg", "png-to-pdf", "image-resizer", 
     "png-to-webp", "png-to-gif", "png-to-bmp", "png-to-ico", "png-to-tiff", 
     "png-to-avif", "image-converter", "image-compressor"].includes(t.id) ||
    (t.id.startsWith("png-to-") && t.isImplemented !== false)
  ),

  // WebP conversions
  webp: findTools((t) => 
    ["webp-to-jpg", "webp-to-png", "image-resizer", "image-converter",
     "webp-to-gif", "webp-to-bmp", "webp-to-ico", "webp-to-tiff", 
     "webp-to-avif", "image-compressor"].includes(t.id) ||
    (t.id.startsWith("webp-to-") && t.isImplemented !== false)
  ),

  // HEIC conversions
  heic: findTools((t) => 
    ["heic-to-jpg", "heic-to-png", "image-converter", "heic-to-webp",
     "heic-to-gif", "heic-to-bmp", "heic-to-pdf"].includes(t.id) ||
    (t.id.startsWith("heic-to-") && t.isImplemented !== false)
  ),

  // GIF conversions
  gif: findTools((t) => 
    ["gif-to-jpg", "gif-to-png", "gif-to-webp", "image-converter",
     "gif-to-bmp", "gif-to-ico", "image-resizer"].includes(t.id) ||
    (t.id.startsWith("gif-to-") && t.isImplemented !== false)
  ),

  // BMP conversions
  bmp: findTools((t) => 
    ["bmp-to-jpg", "bmp-to-png", "bmp-to-webp", "image-converter",
     "bmp-to-gif", "bmp-to-ico", "image-resizer"].includes(t.id) ||
    (t.id.startsWith("bmp-to-") && t.isImplemented !== false)
  ),

  // ICO conversions
  ico: findTools((t) => 
    ["ico-to-jpg", "ico-to-png", "ico-to-webp", "image-converter",
     "ico-to-gif", "ico-to-bmp"].includes(t.id) ||
    (t.id.startsWith("ico-to-") && t.isImplemented !== false)
  ),

  // TIFF conversions
  tiff: findTools((t) => 
    ["tiff-to-jpg", "tiff-to-png", "tiff-to-webp", "image-converter",
     "tiff-to-gif", "tiff-to-bmp", "tiff-to-pdf"].includes(t.id) ||
    (t.id.startsWith("tiff-to-") && t.isImplemented !== false)
  ),

  // AVIF conversions
  avif: findTools((t) => 
    ["avif-to-jpg", "avif-to-png", "avif-to-webp", "image-converter",
     "avif-to-gif", "avif-to-bmp"].includes(t.id) ||
    (t.id.startsWith("avif-to-") && t.isImplemented !== false)
  ),

  // SVG conversions
  svg: findTools((t) => 
    ["svg-to-png", "svg-to-jpg", "svg-converter", "svg-to-pdf"].includes(t.id) ||
    (t.id.startsWith("svg-to-") && t.isImplemented !== false)
  ),

  // Document conversions
  doc: findTools((t) => 
    ["word-to-pdf", "doc-to-txt", "rtf-converter"].includes(t.id) ||
    (t.id.startsWith("doc-to-") && t.isImplemented !== false)
  ),

  docx: [], // Will use doc tools

  rtf: findTools((t) => 
    ["rtf-converter", "rtf-to-pdf", "rtf-to-txt"].includes(t.id) ||
    (t.id.startsWith("rtf-to-") && t.isImplemented !== false)
  ),

  txt: findTools((t) => 
    ["text-to-pdf", "word-counter", "case-converter"].includes(t.id) ||
    (t.id.startsWith("txt-to-") && t.isImplemented !== false)
  ),

  // Spreadsheet conversions
  xls: findTools((t) => 
    ["excel-to-pdf", "excel-to-csv"].includes(t.id) ||
    (t.id.startsWith("xls-to-") && t.isImplemented !== false)
  ),

  xlsx: [], // Will use xls tools

  csv: findTools((t) => 
    ["csv-to-json", "csv-to-excel"].includes(t.id) ||
    (t.id.startsWith("csv-to-") && t.isImplemented !== false)
  ),

  // Developer tools
  json: findTools((t) => 
    ["json-formatter", "json-to-csv", "json-to-xml"].includes(t.id) ||
    (t.id.startsWith("json-to-") && t.isImplemented !== false)
  ),

  xml: findTools((t) => 
    ["xml-to-json", "xml-formatter"].includes(t.id) ||
    (t.id.startsWith("xml-to-") && t.isImplemented !== false)
  ),

  yaml: findTools((t) => 
    ["yaml-to-json", "yaml-formatter"].includes(t.id) ||
    (t.id.startsWith("yaml-to-") && t.isImplemented !== false)
  ),

  // Markdown
  md: findTools((t) => 
    ["markdown-to-html", "markdown-to-pdf"].includes(t.id) ||
    (t.id.startsWith("md-to-") && t.isImplemented !== false)
  ),

  // Archive formats
  zip: findTools((t) => 
    ["zip-extract", "create-zip"].includes(t.id)
  ),

  rar: findTools((t) => 
    ["rar-extract"].includes(t.id)
  ),

  "7z": findTools((t) => 
    ["7z-extract"].includes(t.id)
  ),

  tar: findTools((t) => 
    ["tar-extract"].includes(t.id)
  ),
};

// Helper function to get tools for a file
export function getToolsForFile(file: File): ToolOption[] {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  // Handle jpeg -> jpg mapping
  if (extension === "jpeg") {
    return fileTypeToTools["jpg"] || [];
  }

  // Handle docx -> doc mapping
  if (extension === "docx") {
    return fileTypeToTools["doc"] || [];
  }

  // Handle xlsx -> xls mapping
  if (extension === "xlsx") {
    return fileTypeToTools["xls"] || [];
  }

  // Handle 7zip variations
  if (extension === "7zip") {
    return fileTypeToTools["7z"] || [];
  }

  return fileTypeToTools[extension] || [];
}

// Helper to check if we support a file type
export function isSupportedFileType(file: File): boolean {
  const tools = getToolsForFile(file);
  return tools.length > 0;
}