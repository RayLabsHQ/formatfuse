import { FileText, Image, Code, FileSpreadsheet, FileArchive, Type } from 'lucide-react';

export interface ToolOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  popularity?: 'high' | 'medium' | 'low';
  searches?: string;
}

// Comprehensive mapping of file extensions to available tools
export const fileTypeToTools: Record<string, ToolOption[]> = {
  // PDF conversions
  'pdf': [
    { 
      id: 'pdf-compress', 
      name: 'Compress PDF', 
      description: 'Reduce file size',
      icon: FileText,
      popularity: 'high',
      searches: '200k'
    },
    { 
      id: 'pdf-split', 
      name: 'Split PDF', 
      description: 'Extract pages',
      icon: FileText,
      searches: '180k'
    },
    { 
      id: 'pdf-to-jpg', 
      name: 'PDF to JPG', 
      description: 'Convert to images',
      icon: Image,
      searches: '180k'
    },
    { 
      id: 'pdf-merge', 
      name: 'Merge PDFs', 
      description: 'Combine with other PDFs',
      icon: FileText,
      searches: '250k'
    }
  ],
  
  // Image conversions
  'jpg': [
    { 
      id: 'jpg-to-pdf', 
      name: 'JPG to PDF', 
      description: 'Create PDF from image',
      icon: FileText,
      popularity: 'high',
      searches: '300k'
    },
    { 
      id: 'jpg-to-png', 
      name: 'JPG to PNG', 
      description: 'Convert to PNG format',
      icon: Image,
      searches: '200k'
    },
    { 
      id: 'image-resize', 
      name: 'Resize Image', 
      description: 'Change dimensions',
      icon: Image,
      popularity: 'high',
      searches: '400k'
    },
    { 
      id: 'image-compress', 
      name: 'Compress Image', 
      description: 'Reduce file size',
      icon: Image,
      searches: '250k'
    },
    { 
      id: 'jpg-to-webp', 
      name: 'JPG to WebP', 
      description: 'Modern web format',
      icon: Image,
      searches: '120k'
    }
  ],
  
  'jpeg': [], // Will use jpg tools
  
  'png': [
    { 
      id: 'png-to-jpg', 
      name: 'PNG to JPG', 
      description: 'Convert to JPG format',
      icon: Image,
      popularity: 'high',
      searches: '350k'
    },
    { 
      id: 'png-to-pdf', 
      name: 'PNG to PDF', 
      description: 'Create PDF from image',
      icon: FileText,
      searches: '150k'
    },
    { 
      id: 'background-remove', 
      name: 'Remove Background', 
      description: 'Make transparent',
      icon: Image,
      popularity: 'high',
      searches: '300k'
    },
    { 
      id: 'image-resize', 
      name: 'Resize Image', 
      description: 'Change dimensions',
      icon: Image,
      searches: '400k'
    },
    { 
      id: 'png-to-webp', 
      name: 'PNG to WebP', 
      description: 'Modern web format',
      icon: Image,
      searches: '120k'
    }
  ],
  
  'webp': [
    { 
      id: 'webp-to-jpg', 
      name: 'WebP to JPG', 
      description: 'Convert to JPG',
      icon: Image,
      searches: '120k'
    },
    { 
      id: 'webp-to-png', 
      name: 'WebP to PNG', 
      description: 'Convert to PNG',
      icon: Image,
      searches: '120k'
    },
    { 
      id: 'image-resize', 
      name: 'Resize Image', 
      description: 'Change dimensions',
      icon: Image,
      searches: '400k'
    }
  ],
  
  'heic': [
    { 
      id: 'heic-to-jpg', 
      name: 'HEIC to JPG', 
      description: 'Convert iPhone photos',
      icon: Image,
      popularity: 'high',
      searches: '150k'
    },
    { 
      id: 'heic-to-png', 
      name: 'HEIC to PNG', 
      description: 'Convert to PNG',
      icon: Image,
      searches: '100k'
    }
  ],
  
  // Document conversions
  'doc': [
    { 
      id: 'word-to-pdf', 
      name: 'Word to PDF', 
      description: 'Convert to PDF',
      icon: FileText,
      popularity: 'high',
      searches: '380k'
    },
    { 
      id: 'doc-to-txt', 
      name: 'Word to Text', 
      description: 'Extract plain text',
      icon: Type,
      searches: '80k'
    }
  ],
  
  'docx': [], // Will use doc tools
  
  'xls': [
    { 
      id: 'excel-to-pdf', 
      name: 'Excel to PDF', 
      description: 'Convert spreadsheet to PDF',
      icon: FileText,
      searches: '150k'
    },
    { 
      id: 'excel-to-csv', 
      name: 'Excel to CSV', 
      description: 'Convert to CSV format',
      icon: FileSpreadsheet,
      searches: '100k'
    }
  ],
  
  'xlsx': [], // Will use xls tools
  
  // Developer tools
  'json': [
    { 
      id: 'json-format', 
      name: 'Format JSON', 
      description: 'Pretty print JSON',
      icon: Code,
      popularity: 'high',
      searches: '150k'
    },
    { 
      id: 'json-to-csv', 
      name: 'JSON to CSV', 
      description: 'Convert to CSV',
      icon: FileSpreadsheet,
      searches: '80k'
    },
    { 
      id: 'json-to-xml', 
      name: 'JSON to XML', 
      description: 'Convert to XML',
      icon: Code,
      searches: '60k'
    }
  ],
  
  'csv': [
    { 
      id: 'csv-to-json', 
      name: 'CSV to JSON', 
      description: 'Convert to JSON',
      icon: Code,
      searches: '80k'
    },
    { 
      id: 'csv-to-excel', 
      name: 'CSV to Excel', 
      description: 'Convert to Excel',
      icon: FileSpreadsheet,
      searches: '100k'
    }
  ],
  
  // Archive formats
  'zip': [
    { 
      id: 'zip-extract', 
      name: 'Extract ZIP', 
      description: 'Unzip files',
      icon: FileArchive,
      searches: '200k'
    }
  ]
};

// Helper function to get tools for a file
export function getToolsForFile(file: File): ToolOption[] {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Handle jpeg -> jpg mapping
  if (extension === 'jpeg') {
    return fileTypeToTools['jpg'] || [];
  }
  
  // Handle docx -> doc mapping
  if (extension === 'docx') {
    return fileTypeToTools['doc'] || [];
  }
  
  // Handle xlsx -> xls mapping
  if (extension === 'xlsx') {
    return fileTypeToTools['xls'] || [];
  }
  
  return fileTypeToTools[extension] || [];
}

// Helper to check if we support a file type
export function isSupportedFileType(file: File): boolean {
  const tools = getToolsForFile(file);
  return tools.length > 0;
}