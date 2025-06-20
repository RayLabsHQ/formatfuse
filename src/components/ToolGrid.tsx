import React from 'react';
import { 
  FileText, Layers, FileDown, Scissors, Image, Type,
  ArrowRight, Zap, Shield, Clock
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  searches: string;
  icon: React.ElementType;
  category: 'pdf' | 'image' | 'doc';
  color: string;
  accent: string;
  beta?: boolean;
}

const tools: Tool[] = [
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Convert PDFs to editable Word documents',
    searches: '450k/mo',
    icon: FileText,
    category: 'pdf',
    color: 'bg-gradient-to-br from-[#FFE0E0] to-[#FFD0D0] dark:from-[#4A3333] dark:to-[#3A2525]',
    accent: 'text-[#FF6B6B] dark:text-[#FFB8B8]',
    beta: true
  },
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    description: 'Transform images into PDF documents',
    searches: '300k/mo',
    icon: Image,
    category: 'image',
    color: 'bg-gradient-to-br from-[#E0F0FF] to-[#D0E5FF] dark:from-[#2A3A4A] dark:to-[#1F2F3F]',
    accent: 'text-[#4A90E2] dark:text-[#7AB3F5]'
  },
  {
    id: 'png-to-jpg',
    name: 'PNG to JPG',
    description: 'Convert PNG images to JPG format',
    searches: '350k/mo',
    icon: Image,
    category: 'image',
    color: 'bg-gradient-to-br from-[#F0E0FF] to-[#E5D0FF] dark:from-[#3A2A4A] dark:to-[#2F1F3F]',
    accent: 'text-[#9B6DD0] dark:text-[#B794E8]'
  },
  {
    id: 'webp-converter',
    name: 'WebP Converter',
    description: 'Convert images to/from WebP format',
    searches: '120k/mo',
    icon: Image,
    category: 'image',
    color: 'bg-gradient-to-br from-[#E0EFFF] to-[#D0E0FF] dark:from-[#2A394A] dark:to-[#1F2E3F]',
    accent: 'text-[#2196F3] dark:text-[#64B5F6]'
  },
  {
    id: 'heic-to-jpg',
    name: 'HEIC to JPG',
    description: 'Convert iPhone photos to JPG',
    searches: '150k/mo',
    icon: Image,
    category: 'image',
    color: 'bg-gradient-to-br from-[#E8E8E8] to-[#D8D8D8] dark:from-[#3A3A3A] dark:to-[#2F2F2F]',
    accent: 'text-[#607D8B] dark:text-[#90A4AE]'
  },
  {
    id: 'pdf-merge',
    name: 'Merge PDF',
    description: 'Combine multiple PDFs into one',
    searches: '250k/mo',
    icon: Layers,
    category: 'pdf',
    color: 'bg-gradient-to-br from-[#E0FFE0] to-[#D0FFD0] dark:from-[#2A4A2A] dark:to-[#1F3F1F]',
    accent: 'text-[#4CAF50] dark:text-[#81C784]'
  },
  {
    id: 'pdf-compress',
    name: 'Compress PDF',
    description: 'Reduce PDF file size instantly',
    searches: '200k/mo',
    icon: FileDown,
    category: 'pdf',
    color: 'bg-gradient-to-br from-[#FFF0E0] to-[#FFE5D0] dark:from-[#4A3A2A] dark:to-[#3F2F1F]',
    accent: 'text-[#FF9800] dark:text-[#FFB74D]'
  },
  {
    id: 'image-resize',
    name: 'Resize Image',
    description: 'Adjust image dimensions perfectly',
    searches: '400k/mo',
    icon: Image,
    category: 'image',
    color: 'bg-gradient-to-br from-[#FFE0F0] to-[#FFD0E5] dark:from-[#4A2A3A] dark:to-[#3F1F2F]',
    accent: 'text-[#E91E63] dark:text-[#F48FB1]'
  },
  {
    id: 'image-converter',
    name: 'Universal Image Converter',
    description: 'Convert between any image format',
    searches: '500k/mo',
    icon: Image,
    category: 'image',
    color: 'bg-gradient-to-br from-[#F0F0FF] to-[#E0E0FF] dark:from-[#3A3A4A] dark:to-[#2F2F3F]',
    accent: 'text-[#673AB7] dark:text-[#9575CD]'
  }
];

export default function ToolGrid() {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 ff-grid opacity-[0.02]" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Popular File Converters
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Fast, secure, and completely private. All conversions happen in your browser.
          </p>
        </div>
        
        {/* Tool grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <a
              key={tool.id}
              href={tool.id === 'image-converter' ? '/tools/image-converter' : `/convert/${tool.id}`}
              className="group relative block"
            >
              <div className={`
                relative rounded-2xl p-6 h-full
                bg-card border border-border
                transition-transform duration-200 ease-out
                hover:scale-[1.02] hover:border-primary/20
              `}>
                {/* Tool icon */}
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center mb-4
                  ${tool.color}
                `}>
                  <tool.icon className={`w-6 h-6 ${tool.accent}`} />
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  {tool.name}
                  {tool.beta && (
                    <span className="text-xs font-normal bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                      Beta
                    </span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {tool.description}
                </p>
                
                {/* Footer */}
                <div className="flex items-center justify-end text-xs">
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </a>
          ))}
        </div>
        
        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold mb-2">Lightning Fast</h3>
            <p className="text-sm text-muted-foreground">
              Convert files instantly with WebAssembly
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold mb-2">100% Private</h3>
            <p className="text-sm text-muted-foreground">
              Your files never leave your browser
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold mb-2">No Limits</h3>
            <p className="text-sm text-muted-foreground">
              Convert unlimited files, any size
            </p>
          </div>
        </div>
        
        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="/tools"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-transform hover:scale-105"
          >
            View All 50+ Tools
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}