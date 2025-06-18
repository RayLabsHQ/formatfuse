import React from 'react';
import { 
  FileText, Code, ArrowRight, TrendingUp, Sparkles,
  Layers, FileDown, Scissors, Type, Image, QrCode, Braces, 
  Hash, FileSpreadsheet, FileArchive, Globe, X
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  searches?: string;
  isNew?: boolean;
  isPopular?: boolean;
}

const pdfTools: Tool[] = [
  { 
    id: 'pdf-to-word', 
    name: 'PDF to Word', 
    description: 'Convert PDF documents to editable Word files',
    icon: FileText, 
    searches: '450k', 
    isPopular: true 
  },
  { 
    id: 'pdf-merge', 
    name: 'Merge PDF', 
    description: 'Combine multiple PDFs into one document',
    icon: Layers, 
    searches: '250k' 
  },
  { 
    id: 'pdf-compress', 
    name: 'Compress PDF', 
    description: 'Reduce PDF file size without losing quality',
    icon: FileDown, 
    searches: '200k' 
  },
  { 
    id: 'pdf-split', 
    name: 'Split PDF', 
    description: 'Extract pages or split PDF into multiple files',
    icon: Scissors, 
    searches: '180k' 
  },
  { 
    id: 'jpg-to-pdf', 
    name: 'JPG to PDF', 
    description: 'Convert images to PDF documents',
    icon: Image, 
    searches: '300k', 
    isPopular: true 
  },
  { 
    id: 'word-to-pdf', 
    name: 'Word to PDF', 
    description: 'Convert Word documents to PDF format',
    icon: Type, 
    searches: '380k',
    isPopular: true 
  },
  { 
    id: 'pdf-to-jpg', 
    name: 'PDF to JPG', 
    description: 'Extract images from PDF pages',
    icon: Image, 
    searches: '180k' 
  },
  {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    description: 'Convert spreadsheets to PDF format',
    icon: FileSpreadsheet,
    searches: '150k'
  },
  {
    id: 'pdf-rotate',
    name: 'Rotate PDF',
    description: 'Rotate PDF pages to correct orientation',
    icon: FileText,
    searches: '120k'
  }
];

const imageTools: Tool[] = [
  { 
    id: 'png-to-jpg', 
    name: 'PNG to JPG', 
    description: 'Convert PNG images to JPG format',
    icon: Image, 
    searches: '350k', 
    isPopular: true 
  },
  { 
    id: 'image-resize', 
    name: 'Resize Image', 
    description: 'Change image dimensions and resolution',
    icon: Image, 
    searches: '400k', 
    isNew: true 
  },
  { 
    id: 'image-compress', 
    name: 'Compress Image', 
    description: 'Optimize images for web and email',
    icon: FileDown, 
    searches: '200k' 
  },
  { 
    id: 'heic-to-jpg', 
    name: 'HEIC to JPG', 
    description: 'Convert iPhone photos to JPG format',
    icon: Image, 
    searches: '150k', 
    isNew: true 
  },
  { 
    id: 'webp-convert', 
    name: 'WebP Converter', 
    description: 'Convert images to/from WebP format',
    icon: Image, 
    searches: '120k' 
  },
  { 
    id: 'background-remove', 
    name: 'Remove Background', 
    description: 'Remove background from images automatically',
    icon: Image, 
    searches: '300k',
    isPopular: true 
  },
  {
    id: 'jpg-to-png',
    name: 'JPG to PNG',
    description: 'Convert JPG images to PNG with transparency',
    icon: Image,
    searches: '280k'
  },
  {
    id: 'svg-converter',
    name: 'SVG Converter',
    description: 'Convert vector images to/from SVG',
    icon: Image,
    searches: '100k'
  }
];

const devTools: Tool[] = [
  { 
    id: 'json-format', 
    name: 'Format JSON', 
    description: 'Beautify and validate JSON data',
    icon: Braces, 
    searches: '150k' 
  },
  { 
    id: 'base64-encode', 
    name: 'Base64 Encode/Decode', 
    description: 'Encode and decode Base64 strings',
    icon: Hash, 
    searches: '100k' 
  },
  { 
    id: 'qr-generator', 
    name: 'QR Code Generator', 
    description: 'Create QR codes for URLs and text',
    icon: QrCode, 
    searches: '200k',
    isPopular: true 
  },
  { 
    id: 'url-shorten', 
    name: 'URL Shortener', 
    description: 'Create short links for long URLs',
    icon: Globe, 
    searches: '150k' 
  },
  { 
    id: 'word-counter', 
    name: 'Word Counter', 
    description: 'Count words, characters, and paragraphs',
    icon: Type, 
    searches: '120k' 
  },
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    description: 'Generate MD5, SHA-1, SHA-256 hashes',
    icon: Hash,
    searches: '80k'
  },
  {
    id: 'case-converter',
    name: 'Case Converter',
    description: 'Convert text case (upper, lower, title)',
    icon: Type,
    searches: '90k'
  }
];

const documentTools: Tool[] = [
  {
    id: 'txt-to-pdf',
    name: 'Text to PDF',
    description: 'Convert plain text files to PDF',
    icon: FileText,
    searches: '100k'
  },
  {
    id: 'rtf-converter',
    name: 'RTF Converter',
    description: 'Convert Rich Text Format files',
    icon: FileText,
    searches: '80k'
  },
  {
    id: 'markdown-to-html',
    name: 'Markdown to HTML',
    description: 'Convert Markdown to HTML format',
    icon: Code,
    searches: '90k'
  }
];

const archiveTools: Tool[] = [
  {
    id: 'zip-extract',
    name: 'Extract ZIP',
    description: 'Extract files from ZIP archives',
    icon: FileArchive,
    searches: '150k',
    isNew: true
  },
  {
    id: 'create-zip',
    name: 'Create ZIP',
    description: 'Compress files into ZIP archive',
    icon: FileArchive,
    searches: '120k'
  }
];

const categories = [
  { name: 'PDF Tools', tools: pdfTools, color: 'border-tool-pdf text-tool-pdf', bgColor: 'bg-tool-pdf/10' },
  { name: 'Image Tools', tools: imageTools, color: 'border-tool-jpg text-tool-jpg', bgColor: 'bg-tool-jpg/10' },
  { name: 'Developer Tools', tools: devTools, color: 'border-accent text-accent', bgColor: 'bg-accent/10' },
  { name: 'Document Tools', tools: documentTools, color: 'border-tool-doc text-tool-doc', bgColor: 'bg-tool-doc/10' },
  { name: 'Archive Tools', tools: archiveTools, color: 'border-primary text-primary', bgColor: 'bg-primary/10' },
];

// Fuzzy search function
function fuzzySearch(query: string, target: string): boolean {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  
  // If query is empty or exact match
  if (!query || targetLower.includes(queryLower)) return true;
  
  // Simple fuzzy match - all characters in query must appear in order
  let queryIndex = 0;
  for (let i = 0; i < targetLower.length && queryIndex < queryLower.length; i++) {
    if (targetLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === queryLower.length;
}

export default function AllToolsGrid() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const filteredCategories = categories.map(category => ({
    ...category,
    tools: category.tools.filter(tool => {
      if (!searchQuery) return true;
      
      // Check for fuzzy match in name or description
      return fuzzySearch(searchQuery, tool.name) || 
             fuzzySearch(searchQuery, tool.description) ||
             // Also check acronyms (e.g., "pdf" matches "PDF to Word")
             tool.name.split(' ').map(word => word[0]).join('').toLowerCase().includes(searchQuery.toLowerCase())
    })
  })).filter(category => 
    !selectedCategory || category.name === selectedCategory
  );

  const totalTools = categories.reduce((acc, cat) => acc + cat.tools.length, 0);
  const visibleTools = filteredCategories.reduce((acc, cat) => acc + cat.tools.length, 0);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Search and Filter Bar */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <input
                  type="text"
                  placeholder="Search tools (try 'pdf', 'img resize', 'qr')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full sm:w-96 bg-card border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">{visibleTools}</span>
              <span>of</span>
              <span className="font-medium">{totalTools}</span>
              <span>tools available</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !selectedCategory 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-card border border-border hover:border-primary/20 hover:bg-primary/5'
              }`}
            >
              All Categories
            </button>
            {categories.map(category => {
              const count = searchQuery 
                ? filteredCategories.find(c => c.name === category.name)?.tools.length || 0
                : category.tools.length;
              return (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category.name 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'bg-card border border-border hover:border-primary/20 hover:bg-primary/5'
                  }`}
                >
                  {category.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Tools by Category */}
        <div className="space-y-12">
          {filteredCategories.map((category) => (
            category.tools.length > 0 && (
              <div key={category.name}>
                <h2 className="text-2xl font-bold mb-6">{category.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {category.tools.map((tool) => (
                    <a
                      key={tool.id}
                      href={`/convert/${tool.id}`}
                      className="group relative block"
                    >
                      <div className="relative h-full bg-card rounded-2xl p-6 border border-border transition-all duration-200 hover:scale-[1.02] hover:border-primary/20 hover:shadow-lg">
                        {/* Color accent bar */}
                        <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full ${category.bgColor} opacity-60`} />
                        
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category.bgColor}`}>
                            <tool.icon className={`w-6 h-6 ${category.color.split(' ')[1]}`} />
                          </div>
                          
                          {/* Badges */}
                          <div className="flex gap-2">
                            {tool.isNew && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                                <Sparkles className="w-3 h-3" />
                                New
                              </span>
                            )}
                            {tool.isPopular && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                <TrendingUp className="w-3 h-3" />
                                Hot
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                          {tool.name}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {tool.description}
                        </p>
                        
                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          {tool.searches ? (
                            <span className="text-xs text-muted-foreground font-medium">
                              {tool.searches}/mo
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Free tool</span>
                          )}
                          <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>Try now</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        {visibleTools === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">No tools found</p>
              <p className="text-muted-foreground mb-4">Try adjusting your search or browse all categories</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
                className="text-primary hover:underline text-sm font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}