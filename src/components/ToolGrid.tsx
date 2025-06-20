import React from 'react';
import { ArrowRight, Zap, Shield, Clock } from 'lucide-react';
import { universalTools, pdfTools, imageTools, allTools } from '../data/tools';

// Select top tools to display on homepage
const featuredTools = [
  universalTools[0], // Universal Image Converter
  universalTools[1], // Image Compressor
  pdfTools[0], // PDF to Word
  pdfTools[4], // JPG to PDF
  imageTools.find(t => t.id === 'png-to-jpg'),
  pdfTools[1], // Merge PDF
  pdfTools[2], // Compress PDF
  imageTools.find(t => t.id === 'image-resize'),
  imageTools.find(t => t.id === 'webp-to-png'),
].filter(Boolean).slice(0, 9);

// Tool color schemes
const colorSchemes = [
  {
    color: 'bg-gradient-to-br from-[#F0F0FF] to-[#E0E0FF] dark:from-[#3A3A4A] dark:to-[#2F2F3F]',
    accent: 'text-[#673AB7] dark:text-[#9575CD]'
  },
  {
    color: 'bg-gradient-to-br from-[#FFE0E0] to-[#FFD0D0] dark:from-[#4A3333] dark:to-[#3A2525]',
    accent: 'text-[#FF6B6B] dark:text-[#FFB8B8]'
  },
  {
    color: 'bg-gradient-to-br from-[#E0F0FF] to-[#D0E5FF] dark:from-[#2A3A4A] dark:to-[#1F2F3F]',
    accent: 'text-[#4A90E2] dark:text-[#7AB3F5]'
  },
  {
    color: 'bg-gradient-to-br from-[#F0E0FF] to-[#E5D0FF] dark:from-[#3A2A4A] dark:to-[#2F1F3F]',
    accent: 'text-[#9B6DD0] dark:text-[#B794E8]'
  },
  {
    color: 'bg-gradient-to-br from-[#E0FFE0] to-[#D0FFD0] dark:from-[#2A4A2A] dark:to-[#1F3F1F]',
    accent: 'text-[#4CAF50] dark:text-[#81C784]'
  },
  {
    color: 'bg-gradient-to-br from-[#FFF0E0] to-[#FFE5D0] dark:from-[#4A3A2A] dark:to-[#3F2F1F]',
    accent: 'text-[#FF9800] dark:text-[#FFB74D]'
  },
  {
    color: 'bg-gradient-to-br from-[#FFE0F0] to-[#FFD0E5] dark:from-[#4A2A3A] dark:to-[#3F1F2F]',
    accent: 'text-[#E91E63] dark:text-[#F48FB1]'
  },
  {
    color: 'bg-gradient-to-br from-[#E0EFFF] to-[#D0E0FF] dark:from-[#2A394A] dark:to-[#1F2E3F]',
    accent: 'text-[#2196F3] dark:text-[#64B5F6]'
  },
  {
    color: 'bg-gradient-to-br from-[#E8E8E8] to-[#D8D8D8] dark:from-[#3A3A3A] dark:to-[#2F2F2F]',
    accent: 'text-[#607D8B] dark:text-[#90A4AE]'
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
          {featuredTools.map((tool, index) => {
            if (!tool) return null;
            const scheme = colorSchemes[index % colorSchemes.length];
            return (
              <a
                key={tool.id}
                href={tool.route || `/convert/${tool.id}`}
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
                    ${scheme.color}
                  `}>
                    <tool.icon className={`w-6 h-6 ${scheme.accent}`} />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    {tool.name}
                    {tool.isBeta && (
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
            );
          })}
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
            View All {allTools.length} Tools
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}