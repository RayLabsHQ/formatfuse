import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, Download, X, ArrowRight, ArrowUpDown,
  FileImage, AlertCircle, CheckCircle2, Loader2, Shield, Zap,
  Sparkles, Info, Minimize2, Image, ChevronRight, HelpCircle
} from 'lucide-react';
import { useImageCompress } from '../../hooks/useImageCompress';
import type { CompressOptions, CompressFormat } from '../../lib/image-compress';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { CollapsibleSection } from '../ui/mobile/CollapsibleSection';
import { FormatSelect } from '../ui/format-select';
import { cn } from '../../lib/utils';
import { ImageCarouselModal } from './ImageCarouselModal';
import JSZip from 'jszip';
import { useVirtualizer } from '@tanstack/react-virtual';

interface FileInfo {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: Blob;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  previewUrl?: string;
}

// Format configuration with display names and colors
const FORMATS = {
  JPEG: { mime: 'image/jpeg', extension: 'jpg', name: 'JPEG', displayName: 'JPG', color: 'var(--tool-jpg)' },
  WEBP: { mime: 'image/webp', extension: 'webp', name: 'WebP', displayName: 'WebP', color: 'oklch(0.72 0.16 210)' },
  PNG: { mime: 'image/png', extension: 'png', name: 'PNG', displayName: 'PNG', color: 'var(--tool-png)' },
  AVIF: { mime: 'image/avif', extension: 'avif', name: 'AVIF', displayName: 'AVIF', color: 'oklch(0.72 0.16 210)' },
};

const features = [
  { icon: Shield, text: 'Privacy-first', description: 'Files never leave your device' },
  { icon: Zap, text: 'Lightning fast', description: 'Powered by WebAssembly' },
  { icon: Sparkles, text: 'Smart compression', description: 'Optimal quality-to-size ratio' },
];

const relatedTools = [
  { id: 'image-resizer', name: 'Image Resizer', description: 'Resize images to any dimension', icon: Image },
  { id: 'png-to-jpg', name: 'PNG to JPG', description: 'Convert PNG images to JPG format', icon: FileImage },
  { id: 'image-converter', name: 'Image Converter', description: 'Convert between all image formats', icon: FileImage },
];

const faqs = [
  {
    question: 'How does image compression work?',
    answer: 'Our tool uses advanced algorithms to reduce file size while maintaining visual quality. For lossy formats (JPEG, WebP), it removes imperceptible details. For PNG, it optimizes the encoding.'
  },
  {
    question: 'Will compression reduce image quality?',
    answer: 'It depends on your settings. At quality levels above 85, the difference is usually imperceptible. Lower quality settings trade some visual fidelity for much smaller file sizes.'
  },
  {
    question: 'What\'s the best format for compression?',
    answer: 'WebP typically offers the best compression with excellent quality. JPEG is widely compatible. PNG is best for images with transparency. AVIF offers cutting-edge compression but limited browser support.'
  },
  {
    question: 'Can I compress multiple images at once?',
    answer: 'Yes! You can select or drag multiple files for batch compression. All files will be processed with the same settings and can be downloaded individually or as a ZIP.'
  }
];

export default function ImageCompressor() {
  const { compress, isCompressing, error, clearError } = useImageCompress();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState(FORMATS.JPEG);
  const [maintainFormat, setMaintainFormat] = useState(true);
  const [quality, setQuality] = useState(85);
  const [qualityInput, setQualityInput] = useState('85');
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const parentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync quality input when quality changes from buttons
  useEffect(() => {
    setQualityInput(quality.toString());
  }, [quality]);

  const handleFiles = useCallback((selectedFiles: File[]) => {
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    const newFiles: FileInfo[] = imageFiles.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0,
      originalSize: file.size,
      previewUrl: URL.createObjectURL(file)
    }));
    setFiles(prev => [...prev, ...newFiles]);
    clearError();
  }, [clearError]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
  }, [handleFiles]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const compressFile = useCallback(async (fileIndex: number) => {
    const fileInfo = files[fileIndex];
    if (!fileInfo || fileInfo.status === 'processing') return;

    setFiles(prev => prev.map((f, i) => 
      i === fileIndex ? { ...f, status: 'processing' as const } : f
    ));

    try {
      const options: CompressOptions = {
        quality,
        maintainFormat,
        format: maintainFormat ? undefined : (selectedFormat.extension as CompressFormat),
        maxWidth,
        maxHeight
      };

      const result = await compress(
        fileInfo.file,
        options
      );

      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { 
          ...f, 
          status: 'completed' as const, 
          result: result?.blob,
          compressedSize: result?.compressedSize,
          compressionRatio: result?.compressionRatio,
          progress: 100,
          previewUrl: f.previewUrl || (result?.blob ? URL.createObjectURL(result.blob) : undefined)
        } : f
      ));
    } catch (err) {
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { 
          ...f, 
          status: 'error' as const, 
          error: err instanceof Error ? err.message : 'Compression failed' 
        } : f
      ));
    }
  }, [files, compress, quality, maintainFormat, selectedFormat, maxWidth, maxHeight]);

  const compressAll = useCallback(async () => {
    const pendingFiles = files
      .map((f, i) => ({ file: f, index: i }))
      .filter(({ file }) => file.status === 'pending' || file.status === 'error');

    for (const { index } of pendingFiles) {
      await compressFile(index);
    }
  }, [files, compressFile]);

  const downloadFile = useCallback((fileInfo: FileInfo) => {
    if (!fileInfo.result) return;
    
    const link = document.createElement('a');
    const outputFormat = maintainFormat ? fileInfo.file.name.split('.').pop() : selectedFormat.extension;
    const baseName = fileInfo.file.name.substring(0, fileInfo.file.name.lastIndexOf('.')) || fileInfo.file.name;
    link.href = URL.createObjectURL(fileInfo.result);
    link.download = `${baseName}-compressed.${outputFormat}`;
    link.click();
  }, [maintainFormat, selectedFormat]);

  const downloadAll = useCallback(async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.result);
    
    if (completedFiles.length === 0) return;
    
    if (completedFiles.length === 1) {
      downloadFile(completedFiles[0]);
      return;
    }

    const zip = new JSZip();
    completedFiles.forEach((fileInfo) => {
      if (fileInfo.result) {
        const outputFormat = maintainFormat ? fileInfo.file.name.split('.').pop() : selectedFormat.extension;
        const baseName = fileInfo.file.name.substring(0, fileInfo.file.name.lastIndexOf('.')) || fileInfo.file.name;
        zip.file(`${baseName}-compressed.${outputFormat}`, fileInfo.result);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = 'compressed-images.zip';
    link.click();
  }, [files, downloadFile, maintainFormat, selectedFormat]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].previewUrl) {
        URL.revokeObjectURL(newFiles[index].previewUrl!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const clearAll = useCallback(() => {
    files.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setFiles([]);
    clearError();
  }, [files, clearError]);

  const openCarousel = useCallback((index: number) => {
    setCarouselIndex(index);
    setShowCarousel(true);
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  // Virtualization for file list
  const rowVirtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const completedCount = files.filter(f => f.status === 'completed').length;
  const hasFiles = files.length > 0;
  const canCompress = files.some(f => f.status === 'pending' || f.status === 'error');
  const canDownload = completedCount > 0;
  const hasCompletedFiles = completedCount > 0;

  const formatOptions = Object.values(FORMATS);

  // Calculate total savings
  const totalOriginalSize = files.reduce((sum, f) => sum + (f.originalSize || 0), 0);
  const totalCompressedSize = files.reduce((sum, f) => sum + (f.compressedSize || 0), 0);
  const totalSavings = totalOriginalSize - totalCompressedSize;
  const averageRatio = totalOriginalSize > 0 ? (totalSavings / totalOriginalSize) * 100 : 0;

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section - Same as ImageConverter */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight text-gradient animate-fade-in-up">
            <span className="text-foreground">Image </span>
            <span style={{ color: 'var(--tool-primary)' }}>Compressor</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Reduce image file sizes by up to 90% while maintaining visual quality. 
            Compress JPG, PNG, WebP, and AVIF images instantly in your browser.
          </p>
        </div>

        {/* Features - Responsive (Same as ImageConverter) */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {/* Desktop view */}
          <div className="hidden sm:flex flex-wrap justify-center gap-6 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{feature.text}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Mobile view - Compact icons */}
          <div className="sm:hidden space-y-3 mb-8">
            <div className="flex justify-center gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveFeature(activeFeature === index ? null : index)}
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
                      activeFeature === index 
                        ? "bg-primary text-primary-foreground scale-105" 
                        : "bg-primary/10 hover:bg-primary/20"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                );
              })}
            </div>
            
            {/* Mobile feature details */}
            {activeFeature !== null && (
              <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 mx-4 animate-in slide-in-from-top-2 duration-300">
                <p className="font-medium text-sm mb-1">{features[activeFeature].text}</p>
                <p className="text-xs text-muted-foreground">{features[activeFeature].description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Compressor Interface */}
        <div className="space-y-6">
          {/* Hidden file input - always available */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Settings Card (Same style as ImageConverter) */}
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-4 sm:p-6 animate-fade-in-up relative z-20" style={{ animationDelay: '0.3s' }}>
            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Output Format</h3>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={maintainFormat}
                      onChange={(e) => setMaintainFormat(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-muted-foreground">Keep original format</span>
                  </label>
                </div>
                
                {!maintainFormat && (
                  <div className="max-w-xs">
                    <FormatSelect
                      label="Format"
                      formats={formatOptions}
                      value={selectedFormat}
                      onChange={(format) => setSelectedFormat(format as typeof selectedFormat)}
                    />
                  </div>
                )}
              </div>

              {/* Quality Settings */}
              <div>
                <div className="max-w-2xl mx-auto">
                  {/* Desktop Layout */}
                  <div className="hidden sm:flex items-center justify-between mb-4">
                    <label className="text-sm font-medium">Quality</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 p-1 bg-background/50 rounded-lg">
                        <button
                          onClick={() => setQuality(95)}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                            quality === 95 ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                          )}
                        >
                          Maximum
                        </button>
                        <button
                          onClick={() => setQuality(85)}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                            quality === 85 ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                          )}
                        >
                          High
                        </button>
                        <button
                          onClick={() => setQuality(70)}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                            quality === 70 ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                          )}
                        >
                          Balanced
                        </button>
                        <button
                          onClick={() => setQuality(50)}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                            quality === 50 ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                          )}
                        >
                          Small
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={qualityInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d{0,3}$/.test(val)) {
                              setQualityInput(val);
                            }
                          }}
                          onBlur={() => {
                            const num = parseInt(qualityInput);
                            if (!qualityInput || isNaN(num)) {
                              setQuality(85);
                              setQualityInput('85');
                            } else {
                              const clamped = Math.min(100, Math.max(10, num));
                              setQuality(clamped);
                              setQualityInput(clamped.toString());
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-14 px-2 py-1 text-sm text-center bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile Layout */}
                  <div className="sm:hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Quality</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={qualityInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d{0,3}$/.test(val)) {
                              setQualityInput(val);
                            }
                          }}
                          onBlur={() => {
                            const num = parseInt(qualityInput);
                            if (!qualityInput || isNaN(num)) {
                              setQuality(85);
                              setQualityInput('85');
                            } else {
                              const clamped = Math.min(100, Math.max(10, num));
                              setQuality(clamped);
                              setQualityInput(clamped.toString());
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-12 px-1 py-1 text-sm text-center bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-background/50 rounded-lg">
                      <button
                        onClick={() => setQuality(95)}
                        className={cn(
                          "px-2 py-2 text-[11px] font-medium rounded-md transition-all duration-200",
                          quality === 95 ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                        )}
                      >
                        Max
                      </button>
                      <button
                        onClick={() => setQuality(85)}
                        className={cn(
                          "px-2 py-2 text-[11px] font-medium rounded-md transition-all duration-200",
                          quality === 85 ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                        )}
                      >
                        High
                      </button>
                      <button
                        onClick={() => setQuality(70)}
                        className={cn(
                          "px-2 py-2 text-[11px] font-medium rounded-md transition-all duration-200",
                          quality === 70 ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                        )}
                      >
                        Balanced
                      </button>
                      <button
                        onClick={() => setQuality(50)}
                        className={cn(
                          "px-2 py-2 text-[11px] font-medium rounded-md transition-all duration-200",
                          quality === 50 ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                        )}
                      >
                        Small
                      </button>
                    </div>
                  </div>
                  
                  {/* Slider */}
                  <Slider
                    value={[quality]}
                    onValueChange={(value) => setQuality(value[0])}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full mt-4"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Smaller file</span>
                    <span className="text-xs text-muted-foreground">Better quality</span>
                  </div>
                </div>
              </div>

              {/* Size Limits */}
              <CollapsibleSection title="Size Limits" defaultOpen={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Width (pixels)</label>
                    <input
                      type="number"
                      value={maxWidth || ''}
                      onChange={(e) => setMaxWidth(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Original"
                      className="w-full px-3 py-2 bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Height (pixels)</label>
                    <input
                      type="number"
                      value={maxHeight || ''}
                      onChange={(e) => setMaxHeight(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Original"
                      className="w-full px-3 py-2 bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>

          {/* File Upload Area - Only show when no files */}
          {files.length === 0 && (
            <div className="relative animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
                  isDragging 
                    ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20' 
                    : 'border-border bg-card/50 hover:border-primary hover:bg-card hover:shadow-lg hover:shadow-primary/10'
                }`}
              >
                <div className="p-8 sm:p-12 text-center pointer-events-none">
                  <Upload className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 transition-all duration-300 ${
                    isDragging ? 'text-primary scale-110 rotate-12' : 'text-muted-foreground'
                  }`} />
                  <p className="text-base sm:text-lg font-medium mb-2">Drop images here or click to browse</p>
                  <p className="text-xs sm:text-sm text-muted-foreground px-4">
                    Supports JPG, PNG, WebP, AVIF, and more
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Maximum 50MB per file</p>
                </div>
              </div>
            </div>
          )}

          {/* Files List - Only show when files exist */}
          {files.length > 0 && (
            <div className="space-y-6">
              <div 
                className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6 animate-fade-in-up" 
                style={{ animationDelay: '0.5s' }}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileImage className="w-5 h-5 text-primary" />
                    Files ({files.length})
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      size="sm"
                      variant="outline"
                      className="gap-2 flex-1 sm:flex-none"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">Add more</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                    {canCompress && (
                      <Button
                        onClick={compressAll}
                        disabled={isCompressing}
                        size="sm"
                        className="gap-2 flex-1 sm:flex-none"
                      >
                        {isCompressing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="hidden sm:inline">Compressing...</span>
                            <span className="sm:hidden">Compress</span>
                          </>
                        ) : (
                          <>
                            <Minimize2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Compress All</span>
                            <span className="sm:hidden">Compress</span>
                          </>
                        )}
                      </Button>
                    )}
                    {hasCompletedFiles && (
                      <Button
                        onClick={downloadAll}
                        size="sm"
                        variant="default"
                        className="gap-2 flex-1 sm:flex-none"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Download {completedCount > 1 ? 'All' : ''}</span>
                        <span className="sm:hidden">Download</span>
                      </Button>
                    )}
                    <Button
                      onClick={clearAll}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Total Savings Summary */}
                {totalCompressedSize > 0 && (
                  <div className="bg-primary/5 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total savings</p>
                        <p className="text-2xl font-bold text-primary">
                          {(totalSavings / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Average reduction</p>
                        <p className="text-2xl font-bold text-primary">
                          {averageRatio.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* File List with Virtualization */}
                <div 
                  ref={parentRef}
                  className="max-h-[400px] overflow-auto rounded-lg border border-border/50 scrollbar-thin"
                >
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                      const fileInfo = files[virtualItem.index];
                      const isLast = virtualItem.index === files.length - 1;
                      
                      return (
                        <div
                          key={virtualItem.key}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <div className={cn(
                            "flex items-center gap-4 p-4",
                            !isLast && "border-b border-border/50"
                          )}>
                            {/* Preview */}
                            {fileInfo.previewUrl && (
                              <button
                                onClick={() => openCarousel(virtualItem.index)}
                                className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                              >
                                <img
                                  src={fileInfo.previewUrl}
                                  alt={fileInfo.file.name}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            )}

                            {/* File Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{fileInfo.file.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {(fileInfo.originalSize! / 1024).toFixed(0)} KB
                                </span>
                                {fileInfo.compressedSize && (
                                  <>
                                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs font-medium text-primary">
                                      {(fileInfo.compressedSize / 1024).toFixed(0)} KB
                                    </span>
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                      -{fileInfo.compressionRatio?.toFixed(0)}%
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Status and Actions */}
                            <div className="flex items-center gap-2">
                              {fileInfo.status === 'processing' && (
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary transition-all duration-300"
                                      style={{ width: `${fileInfo.progress}%` }}
                                    />
                                  </div>
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                </div>
                              )}
                              {fileInfo.status === 'completed' && (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  <Button
                                    onClick={() => downloadFile(fileInfo)}
                                    size="icon"
                                    variant="ghost"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {fileInfo.status === 'error' && (
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-destructive" />
                                  <span className="text-xs text-destructive">{fileInfo.error}</span>
                                </div>
                              )}
                              {fileInfo.status === 'pending' && !isCompressing && (
                                <Button
                                  onClick={() => compressFile(virtualItem.index)}
                                  size="icon"
                                  variant="ghost"
                                >
                                  <Minimize2 className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                onClick={() => removeFile(virtualItem.index)}
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-start gap-3 animate-fade-in-up">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button onClick={clearError}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Image Carousel Modal */}
        <ImageCarouselModal
          isOpen={showCarousel}
          onClose={() => setShowCarousel(false)}
          files={files}
          currentIndex={carouselIndex}
          formatFileSize={formatFileSize}
        />

        {/* Info Sections */}
        <div className="grid gap-8 md:grid-cols-2 mt-12">
          {/* How it works */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Info className="w-6 h-6 text-primary" />
              How It Works
            </h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">1</span>
                <div>
                  <p className="font-medium">Select your images</p>
                  <p className="text-sm text-muted-foreground">Upload JPG, PNG, WebP, or AVIF images</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">2</span>
                <div>
                  <p className="font-medium">Choose compression settings</p>
                  <p className="text-sm text-muted-foreground">Adjust quality and format to your needs</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">3</span>
                <div>
                  <p className="font-medium">Download optimized images</p>
                  <p className="text-sm text-muted-foreground">Get smaller files with preserved quality</p>
                </div>
              </div>
            </div>
          </div>

          {/* Format Comparison */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Format Comparison</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                <span className="font-medium">JPEG</span>
                <span className="text-muted-foreground">Best for photos, no transparency</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                <span className="font-medium">WebP</span>
                <span className="text-muted-foreground">Modern format, excellent compression</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                <span className="font-medium">PNG</span>
                <span className="text-muted-foreground">Lossless, supports transparency</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                <span className="font-medium">AVIF</span>
                <span className="text-muted-foreground">Cutting-edge compression, limited support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Tools */}
        <div className="space-y-6 mt-12">
          <h2 className="text-2xl font-semibold">Related Tools</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {relatedTools.map((tool) => (
              <a
                key={tool.id}
                href={`/tools/${tool.id}`}
                className="group bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
              >
                <tool.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{tool.name}</h3>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
                <div className="mt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Try now
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-6 mt-12">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none p-4 rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
                  <span className="font-medium pr-4">{faq.question}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-4 pt-2 text-muted-foreground">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}