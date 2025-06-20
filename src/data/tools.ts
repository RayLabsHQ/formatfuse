import { 
  FileText, Code, ArrowRight, TrendingUp, Sparkles,
  Layers, FileDown, Scissors, Type, Image, QrCode, Braces, 
  Hash, FileSpreadsheet, FileArchive, Globe
} from 'lucide-react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  searches?: string;
  isNew?: boolean;
  isPopular?: boolean;
  isBeta?: boolean;
  category: string;
  route?: string; // Custom route if different from id
}

// Universal converters (these should appear first)
export const universalTools: Tool[] = [
  { 
    id: 'image-converter', 
    name: 'Universal Image Converter', 
    description: 'Convert between PNG, JPG, WebP, GIF, BMP, ICO, TIFF, AVIF and more',
    icon: Image, 
    searches: '1M+', 
    isPopular: true,
    category: 'image',
    route: '/tools/image-converter'
  },
  { 
    id: 'image-compressor', 
    name: 'Image Compressor', 
    description: 'Compress JPG, WebP, and AVIF images while maintaining quality',
    icon: FileDown, 
    searches: '500k', 
    isPopular: true,
    category: 'image',
    route: '/tools/image-converter'
  }
];

// Image format conversions
const imageFormats = ['png', 'jpg', 'webp', 'gif', 'bmp', 'ico', 'tiff', 'avif'];
const imageConversions: Tool[] = [];

// Generate all image conversion combinations
for (const from of imageFormats) {
  for (const to of imageFormats) {
    // Skip same format conversions except for lossy formats (compression)
    if (from === to && !['jpg', 'webp', 'avif'].includes(from)) continue;
    
    const fromName = from.toUpperCase();
    const toName = to.toUpperCase();
    const isSameFormat = from === to;
    
    imageConversions.push({
      id: `${from}-to-${to}`,
      name: isSameFormat ? `${fromName} Compressor` : `${fromName} to ${toName}`,
      description: isSameFormat 
        ? `Compress and optimize ${fromName} images`
        : `Convert ${fromName} images to ${toName} format`,
      icon: Image,
      searches: getSearchVolume(from, to),
      isPopular: isPopularConversion(from, to),
      category: 'image',
      route: `/convert/${from}-to-${to}`
    });
  }
}

// Helper functions
function getSearchVolume(from: string, to: string): string {
  const popularConversions: Record<string, string> = {
    'png-to-jpg': '350k',
    'jpg-to-png': '280k',
    'jpg-to-pdf': '300k',
    'webp-to-png': '150k',
    'webp-to-jpg': '120k',
    'heic-to-jpg': '150k',
    'gif-to-mp4': '100k',
    'png-to-webp': '100k',
    'jpg-to-webp': '90k',
    'bmp-to-jpg': '80k',
    'tiff-to-jpg': '70k',
    'jpg-to-jpg': '200k', // compression
    'webp-to-webp': '50k', // compression
    'avif-to-jpg': '40k',
    'avif-to-png': '30k',
  };
  
  const key = `${from}-to-${to}`;
  return popularConversions[key] || '20k';
}

function isPopularConversion(from: string, to: string): boolean {
  const popular = [
    'png-to-jpg', 'jpg-to-png', 'jpg-to-pdf', 
    'webp-to-png', 'webp-to-jpg', 'jpg-to-jpg'
  ];
  return popular.includes(`${from}-to-${to}`);
}

// PDF Tools
export const pdfTools: Tool[] = [
  { 
    id: 'pdf-to-word', 
    name: 'PDF to Word', 
    description: 'Convert PDF documents to editable Word files',
    icon: FileText, 
    searches: '450k', 
    isPopular: true,
    category: 'pdf',
    route: '/convert/pdf-to-word'
  },
  { 
    id: 'pdf-merge', 
    name: 'Merge PDF', 
    description: 'Combine multiple PDFs into one document',
    icon: Layers, 
    searches: '250k',
    category: 'pdf',
    route: '/convert/pdf-merge'
  },
  { 
    id: 'pdf-compress', 
    name: 'Compress PDF', 
    description: 'Reduce PDF file size without losing quality',
    icon: FileDown, 
    searches: '200k',
    category: 'pdf',
    route: '/convert/pdf-compress'
  },
  { 
    id: 'pdf-split', 
    name: 'Split PDF', 
    description: 'Extract pages or split PDF into multiple files',
    icon: Scissors, 
    searches: '180k',
    category: 'pdf',
    route: '/convert/pdf-split'
  },
  { 
    id: 'jpg-to-pdf', 
    name: 'JPG to PDF', 
    description: 'Convert images to PDF documents',
    icon: Image, 
    searches: '300k', 
    isPopular: true,
    category: 'pdf',
    route: '/convert/jpg-to-pdf'
  },
  { 
    id: 'word-to-pdf', 
    name: 'Word to PDF', 
    description: 'Convert Word documents to PDF format',
    icon: Type, 
    searches: '380k',
    isPopular: true,
    category: 'pdf',
    route: '/convert/word-to-pdf'
  },
  { 
    id: 'pdf-to-jpg', 
    name: 'PDF to JPG', 
    description: 'Extract images from PDF pages',
    icon: Image, 
    searches: '180k',
    category: 'pdf',
    route: '/convert/pdf-to-jpg'
  },
  {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    description: 'Convert spreadsheets to PDF format',
    icon: FileSpreadsheet,
    searches: '150k',
    category: 'pdf',
    route: '/convert/excel-to-pdf'
  },
  {
    id: 'pdf-rotate',
    name: 'Rotate PDF',
    description: 'Rotate PDF pages to correct orientation',
    icon: FileText,
    searches: '120k',
    category: 'pdf',
    route: '/convert/pdf-rotate'
  }
];

// Developer Tools
export const devTools: Tool[] = [
  { 
    id: 'json-format', 
    name: 'Format JSON', 
    description: 'Beautify and validate JSON data',
    icon: Braces, 
    searches: '150k',
    category: 'dev',
    route: '/tools/json-format'
  },
  { 
    id: 'base64-encode', 
    name: 'Base64 Encode/Decode', 
    description: 'Encode and decode Base64 strings',
    icon: Hash, 
    searches: '100k',
    category: 'dev',
    route: '/tools/base64-encode'
  },
  { 
    id: 'qr-generator', 
    name: 'QR Code Generator', 
    description: 'Create QR codes for URLs and text',
    icon: QrCode, 
    searches: '200k',
    isPopular: true,
    category: 'dev',
    route: '/tools/qr-generator'
  },
  { 
    id: 'url-shorten', 
    name: 'URL Shortener', 
    description: 'Create short links for long URLs',
    icon: Globe, 
    searches: '150k',
    category: 'dev',
    route: '/tools/url-shorten'
  },
  { 
    id: 'word-counter', 
    name: 'Word Counter', 
    description: 'Count words, characters, and paragraphs',
    icon: Type, 
    searches: '120k',
    category: 'dev',
    route: '/tools/word-counter'
  },
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    description: 'Generate MD5, SHA-1, SHA-256 hashes',
    icon: Hash,
    searches: '80k',
    category: 'dev',
    route: '/tools/hash-generator'
  },
  {
    id: 'case-converter',
    name: 'Case Converter',
    description: 'Convert text case (upper, lower, title)',
    icon: Type,
    searches: '90k',
    category: 'dev',
    route: '/tools/case-converter'
  }
];

// Document Tools
export const documentTools: Tool[] = [
  {
    id: 'txt-to-pdf',
    name: 'Text to PDF',
    description: 'Convert plain text files to PDF',
    icon: FileText,
    searches: '100k',
    category: 'document',
    route: '/convert/txt-to-pdf'
  },
  {
    id: 'rtf-converter',
    name: 'RTF Converter',
    description: 'Convert Rich Text Format files',
    icon: FileText,
    searches: '80k',
    category: 'document',
    route: '/tools/rtf-converter'
  },
  {
    id: 'markdown-to-html',
    name: 'Markdown to HTML',
    description: 'Convert Markdown to HTML format',
    icon: Code,
    searches: '90k',
    category: 'document',
    route: '/tools/markdown-to-html'
  }
];

// Archive Tools
export const archiveTools: Tool[] = [
  {
    id: 'zip-extract',
    name: 'Extract ZIP',
    description: 'Extract files from ZIP archives',
    icon: FileArchive,
    searches: '150k',
    isNew: true,
    category: 'archive',
    route: '/tools/zip-extract'
  },
  {
    id: 'create-zip',
    name: 'Create ZIP',
    description: 'Compress files into ZIP archive',
    icon: FileArchive,
    searches: '120k',
    category: 'archive',
    route: '/tools/create-zip'
  }
];

// Other image tools (non-conversion)
export const otherImageTools: Tool[] = [
  { 
    id: 'image-resize', 
    name: 'Resize Image', 
    description: 'Change image dimensions and resolution',
    icon: Image, 
    searches: '400k', 
    isNew: true,
    category: 'image',
    route: '/tools/image-resize'
  },
  { 
    id: 'background-remove', 
    name: 'Remove Background', 
    description: 'Remove background from images automatically',
    icon: Image, 
    searches: '300k',
    isPopular: true,
    category: 'image',
    route: '/tools/background-remove'
  }
];

// Combine all tools with universal tools first
export const imageTools: Tool[] = [
  ...universalTools,
  ...otherImageTools,
  ...imageConversions
];

// All tools combined
export const allTools: Tool[] = [
  ...universalTools,
  ...pdfTools,
  ...otherImageTools,
  ...imageConversions,
  ...devTools,
  ...documentTools,
  ...archiveTools
];

// Categories for filtering
export const categories = [
  { 
    id: 'pdf',
    name: 'PDF Tools', 
    tools: pdfTools, 
    color: 'border-tool-pdf text-tool-pdf', 
    bgColor: 'bg-tool-pdf/10' 
  },
  { 
    id: 'image',
    name: 'Image Tools', 
    tools: imageTools, 
    color: 'border-tool-jpg text-tool-jpg', 
    bgColor: 'bg-tool-jpg/10' 
  },
  { 
    id: 'dev',
    name: 'Developer Tools', 
    tools: devTools, 
    color: 'border-accent text-accent', 
    bgColor: 'bg-accent/10' 
  },
  { 
    id: 'document',
    name: 'Document Tools', 
    tools: documentTools, 
    color: 'border-tool-doc text-tool-doc', 
    bgColor: 'bg-tool-doc/10' 
  },
  { 
    id: 'archive',
    name: 'Archive Tools', 
    tools: archiveTools, 
    color: 'border-primary text-primary', 
    bgColor: 'bg-primary/10' 
  },
];

// Search function for tools
export function searchTools(query: string): Tool[] {
  if (!query) return allTools;
  
  const lowerQuery = query.toLowerCase();
  
  return allTools.filter(tool => {
    // Check tool name
    if (tool.name.toLowerCase().includes(lowerQuery)) return true;
    
    // Check tool description
    if (tool.description.toLowerCase().includes(lowerQuery)) return true;
    
    // Check tool id (for direct searches like "png-to-jpg")
    if (tool.id.toLowerCase().includes(lowerQuery)) return true;
    
    // Check acronyms (e.g., "pdf" matches "PDF to Word")
    const acronym = tool.name.split(' ').map(word => word[0]).join('').toLowerCase();
    if (acronym.includes(lowerQuery)) return true;
    
    // Check format searches (e.g., "png jpg" matches "PNG to JPG")
    const formats = tool.id.split('-to-');
    if (formats.length === 2) {
      const searchTerms = lowerQuery.split(' ').filter(t => t.length > 0);
      if (searchTerms.every(term => 
        formats.some(format => format.includes(term))
      )) return true;
    }
    
    return false;
  });
}