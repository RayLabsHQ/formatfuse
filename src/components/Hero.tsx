import React from 'react';
import { Upload, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-16 pb-20 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-accent/[0.03]" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            50+ Free Tools, No Sign-up Required
          </div>
          
          {/* Heading */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Convert Any File,
            <span className="block text-primary">
              Right in Your Browser
            </span>
          </h1>
          
          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Fast, secure, and completely private. Your files never leave your device. 
            Convert PDFs, images, and documents instantly.
          </p>
          
          {/* Quick upload area */}
          <div className="max-w-md mx-auto">
            <div className="relative group">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <div className="p-8 rounded-2xl border-2 border-dashed border-border bg-card/50 group-hover:border-primary/50 group-hover:bg-primary/[0.02] transition-colors">
                <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-base font-medium mb-2">
                  Drop a file here to start
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              Supports PDF, JPG, PNG, DOC, and 40+ more formats
            </p>
          </div>
          
          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-primary">2M+</div>
              <div className="text-sm text-muted-foreground">Files Converted</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Privacy Guaranteed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">&lt;2s</div>
              <div className="text-sm text-muted-foreground">Average Speed</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}