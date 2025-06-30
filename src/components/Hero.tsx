import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, Image, FileCode, Archive, Shield, Zap, Clock, CheckCircle } from 'lucide-react';
import ToolSuggestionModal from './ToolSuggestionModal';
import { getToolsForFile, isSupportedFileType } from '../lib/file-type-tools';
import { storeFileForTransfer } from '../lib/file-transfer';

const fileTypes = [
  { text: 'PDFs', icon: FileText, color: 'var(--tool-pdf)' },
  { text: 'Images', icon: Image, color: 'var(--tool-jpg)' },
  { text: 'Documents', icon: FileCode, color: 'var(--tool-doc)' },
  { text: 'Archives', icon: Archive, color: 'var(--primary)' },
];

const benefits = [
  { icon: Shield, text: '100% Private - Files never leave your device' },
  { icon: Zap, text: 'Instant conversion - No waiting' },
  { icon: Clock, text: 'No limits - Convert unlimited files' },
];

export default function Hero() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTypeIndex, setCurrentTypeIndex] = useState(0);
  const [isTypeTransitioning, setIsTypeTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Rotate file types
  useEffect(() => {
    const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!shouldReduceMotion) {
      intervalRef.current = setInterval(() => {
        setIsTypeTransitioning(true);
        setTimeout(() => {
          setCurrentTypeIndex((prev) => (prev + 1) % fileTypes.length);
          setIsTypeTransitioning(false);
        }, 200);
      }, 3000) as unknown as number;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as unknown as NodeJS.Timeout);
      }
    };
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!isSupportedFileType(file)) {
      alert(`Sorry, we don't support ${file.name.split('.').pop()?.toUpperCase()} files yet.`);
      return;
    }

    setSelectedFile(file);
    setShowModal(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleToolSelect = async (toolId: string) => {
    if (!selectedFile) return;

    setIsProcessing(true);
    
    const stored = await storeFileForTransfer(selectedFile);
    
    if (stored) {
      window.location.href = `/convert/${toolId}`;
    } else {
      alert('File is too large to transfer. Please select the file again on the tool page.');
      window.location.href = `/convert/${toolId}`;
    }
  };

  const tools = selectedFile ? getToolsForFile(selectedFile) : [];
  const CurrentIcon = fileTypes[currentTypeIndex].icon;

  return (
    <section className="relative p-12 md:p-16 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left column - Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 text-sm animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-muted-foreground">Privacy-First Conversion Active</span>
            </div>

            {/* Dynamic headline */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold animate-fade-in-up">
                <span className="text-foreground">Convert Your</span>
                <div className="relative h-[1.2em] mt-2">
                  <div className="absolute inset-0 flex items-center gap-3">
                    <CurrentIcon 
                      className={`w-10 h-10 md:w-12 md:h-12 transition-all duration-300 ${
                        isTypeTransitioning ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
                      }`}
                      style={{ color: fileTypes[currentTypeIndex].color }}
                    />
                    <span 
                      className={`text-4xl md:text-5xl lg:text-6xl font-bold transition-all duration-300 ${
                        isTypeTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                      }`}
                      style={{ color: fileTypes[currentTypeIndex].color }}
                    >
                      {fileTypes[currentTypeIndex].text}
                    </span>
                  </div>
                </div>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                Fast, secure, and completely private. No uploads, no servers, no payments.
                Everything happens right in your browser.
              </p>
            </div>

            {/* Benefits list */}
            <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm md:text-base text-muted-foreground">
                      {benefit.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Supported formats */}
            <p className="text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
              Supports 90+ formats including PDF, JPG, PNG, DOC, HEIC, and more
            </p>
          </div>

          {/* Right column - Drop zone */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <label 
              htmlFor="file-upload"
              className={`group relative block cursor-pointer`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                id="file-upload"
                className="sr-only"
                accept="*"
                onChange={handleFileSelect}
                disabled={isProcessing}
                aria-label="Upload a file to convert"
              />
              <div className={`relative p-16 md:p-20 rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
                isDragging 
                  ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20' 
                  : 'border-border bg-card/50 group-hover:border-primary group-hover:bg-card group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:scale-[1.01]'
              }`}>
                {/* Animated border gradient on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-[-2px] rounded-2xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient-shift" />
                  <div className="absolute inset-0 rounded-2xl bg-card/95" />
                </div>

                <div className="relative text-center">
                  <Upload className={`w-16 h-16 mx-auto mb-6 transition-all duration-300 ${
                    isDragging ? 'text-primary scale-110 rotate-12' : 'text-muted-foreground group-hover:text-primary group-hover:scale-105'
                  }`} />
                  <p className="text-xl font-medium mb-3 transition-colors duration-300 group-hover:text-primary">
                    Drop any file here
                  </p>
                  <p className="text-base text-muted-foreground mb-6 transition-all duration-300 group-hover:text-foreground">
                    or click to browse
                  </p>
                  
                  {/* Quick action hint */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 transition-all duration-300 group-hover:bg-primary/10">
                    <CheckCircle className="w-4 h-4 text-primary transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                      Instant conversion • No sign-up required
                    </span>
                  </div>
                </div>

                {/* Visual indicator for drag state */}
                {isDragging && (
                  <div className="absolute inset-0 bg-primary/5 pointer-events-none animate-pulse" />
                )}
              </div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Tool Suggestion Modal */}
      <ToolSuggestionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
        tools={tools}
        onSelectTool={handleToolSelect}
      />
    </section>
  );
}