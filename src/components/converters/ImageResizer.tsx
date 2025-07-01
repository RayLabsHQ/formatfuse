import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, Download, Image, Settings2, AlertCircle, Maximize2,
  Shield, Zap, ChevronRight, Sliders,
  Ruler, Palette, FileImage, Loader2,
  Info
} from 'lucide-react';
import { TbAspectRatio } from 'react-icons/tb';
import { useImageResize } from '../../hooks/useImageResize';
import type { ResizeOptions, ResizeMethod, FitMethod } from '../../lib/image-resize';
import { SimplifiedFileList } from './SimplifiedFileList';
import { FAQ, type FAQItem } from '../ui/FAQ';
import { RelatedTools, type RelatedTool } from '../ui/RelatedTools';
import { CollapsibleSection } from '../ui/mobile/CollapsibleSection';
import { cn } from '../../lib/utils';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import JSZip from 'jszip';

interface FileInfo {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: Blob;
  error?: string;
  dimensions?: { width: number; height: number };
  isLarge?: boolean;
}

interface PresetDimension {
  name: string;
  width?: number;
  height?: number;
  description: string;
}

const PRESET_DIMENSIONS: PresetDimension[] = [
  { name: 'Custom', description: 'Set custom dimensions' },
  { name: 'HD (720p)', width: 1280, height: 720, description: '1280×720' },
  { name: 'Full HD (1080p)', width: 1920, height: 1080, description: '1920×1080' },
  { name: '4K', width: 3840, height: 2160, description: '3840×2160' },
  { name: 'Square (Instagram)', width: 1080, height: 1080, description: '1080×1080' },
  { name: 'Instagram Story', width: 1080, height: 1920, description: '1080×1920' },
  { name: 'Facebook Cover', width: 1200, height: 630, description: '1200×630' },
  { name: 'Twitter Header', width: 1500, height: 500, description: '1500×500' },
  { name: 'LinkedIn Cover', width: 1128, height: 191, description: '1128×191' },
  { name: 'Thumbnail', width: 300, height: 300, description: '300×300' },
];

const RESIZE_METHODS: { value: ResizeMethod; label: string; description: string }[] = [
  { value: 'lanczos3', label: 'Lanczos (High Quality)', description: 'Best for photos' },
  { value: 'mitchell', label: 'Mitchell', description: 'Good balance' },
  { value: 'catrom', label: 'Catmull-Rom', description: 'Sharp details' },
  { value: 'triangle', label: 'Triangle (Fast)', description: 'Fastest option' },
  { value: 'magicKernel', label: 'Magic Kernel', description: 'Advanced algorithm' },
];

const FIT_METHODS: { value: FitMethod; label: string; description: string }[] = [
  { value: 'stretch', label: 'Stretch', description: 'Stretch to exact dimensions' },
  { value: 'contain', label: 'Contain', description: 'Fit within dimensions' },
  { value: 'cover', label: 'Cover', description: 'Cover entire area' },
  { value: 'fill', label: 'Fill', description: 'Fill dimensions exactly' },
];

const features = [
  { icon: Shield, text: 'Privacy-first', description: 'Files never leave your device' },
  { icon: Zap, text: 'Lightning fast', description: 'Powered by WebAssembly' },
  { icon: Ruler, text: 'Pixel perfect', description: 'Resize to exact dimensions' },
];

const relatedTools: RelatedTool[] = [
  { id: 'image-compressor', name: 'Image Compressor', description: 'Reduce file size while maintaining quality', icon: FileImage },
  { id: 'image-converter', name: 'Image Converter', description: 'Convert between all image formats', icon: Image },
  { id: 'crop-image', name: 'Crop Image', description: 'Crop and trim your images', icon: TbAspectRatio },
];

const faqs: FAQItem[] = [
  {
    question: 'What\'s the difference between resize methods?',
    answer: 'Each method uses different algorithms: Lanczos provides the highest quality for photos, Mitchell offers a good balance, Catmull-Rom preserves sharp details, Triangle is fastest, and Magic Kernel uses advanced AI-inspired techniques.'
  },
  {
    question: 'How do fit methods work?',
    answer: 'Stretch distorts the image to match exact dimensions. Contain scales down to fit within bounds. Cover scales up to fill the area. Fill crops to exact dimensions while maintaining aspect ratio.'
  },
  {
    question: 'Can I resize multiple images at once?',
    answer: 'Yes! You can select or drag multiple files for batch resizing. All images will be processed with the same settings and can be downloaded individually or as a ZIP file.'
  },
  {
    question: 'What\'s the maximum image size supported?',
    answer: 'We can handle images up to 50MB each. For best performance, we recommend keeping individual files under 20MB. There\'s no limit on the number of files you can process.'
  }
];

export default function ImageResizer() {
  const { resizeBatch, isResizing, batchProgress, error, clearError } = useImageResize();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [options, setOptions] = useState<ResizeOptions>({
    width: 1920,
    height: 1080,
    method: 'lanczos3',
    fitMethod: 'contain',
    maintainAspectRatio: true,
    quality: 0.85,
    format: 'jpeg'
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('Custom');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((selectedFiles: File[]) => {
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    const newFiles: FileInfo[] = imageFiles.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0,
      isLarge: file.size > 10 * 1024 * 1024
    }));
    setFiles(prev => [...prev, ...newFiles]);
    clearError();
  }, [clearError]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
  }, [handleFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [handleFiles]);

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
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = PRESET_DIMENSIONS.find(p => p.name === presetName);
    if (preset && preset.width && preset.height) {
      setOptions(prev => ({
        ...prev,
        width: preset.width,
        height: preset.height
      }));
    }
  };

  const handleResize = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    const fileBlobs = pendingFiles.map(f => f.file);
    
    // Update status to processing
    setFiles(prev => prev.map(f => 
      f.status === 'pending' ? { ...f, status: 'processing' as const } : f
    ));

    try {
      const results = await resizeBatch(fileBlobs, options);
      
      // Update files with results
      setFiles(prev => {
        const updated = [...prev];
        let resultIndex = 0;
        
        updated.forEach((file, index) => {
          if (file.status === 'processing' && resultIndex < results.length) {
            const result = results[resultIndex];
            updated[index] = {
              ...file,
              status: 'completed',
              progress: 100,
              result: result.blob,
              dimensions: { width: result.width, height: result.height }
            };
            resultIndex++;
          }
        });
        
        return updated;
      });
    } catch (err) {
      // Mark all processing files as error
      setFiles(prev => prev.map(f => 
        f.status === 'processing' 
          ? { ...f, status: 'error' as const, error: 'Resize failed' }
          : f
      ));
    }
  };

  // Update progress during batch processing
  React.useEffect(() => {
    if (batchProgress.length > 0) {
      setFiles(prev => {
        const updated = [...prev];
        const processingFiles = updated.filter(f => f.status === 'processing');
        
        batchProgress.forEach(({ index, progress }) => {
          if (index < processingFiles.length) {
            const fileIndex = updated.findIndex(f => f === processingFiles[index]);
            if (fileIndex !== -1) {
              updated[fileIndex] = { ...updated[fileIndex], progress };
            }
          }
        });
        
        return updated;
      });
    }
  }, [batchProgress]);

  const handleDownload = (file: FileInfo) => {
    if (!file.result) return;
    
    const ext = options.format || 'jpg';
    const baseName = file.file.name.split('.').slice(0, -1).join('.');
    const fileName = `${baseName}_resized_${options.width}x${options.height}.${ext}`;
    
    const url = URL.createObjectURL(file.result);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.result);
    
    if (completedFiles.length === 1) {
      handleDownload(completedFiles[0]);
      return;
    }
    
    const zip = new JSZip();
    
    completedFiles.forEach((file) => {
      if (file.result) {
        const ext = options.format || 'jpg';
        const baseName = file.file.name.split('.').slice(0, -1).join('.');
        const fileName = `${baseName}_resized_${options.width}x${options.height}.${ext}`;
        zip.file(fileName, file.result);
      }
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resized-images.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const hasFiles = files.length > 0;
  const hasCompleted = completedCount > 0;

  return (
    <div className="w-full">
      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold animate-fade-in flex items-center justify-center flex-wrap gap-3">
            <span>Image</span>
            <span className="text-primary">Resizer</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Resize images to exact dimensions with batch processing support. 
            Choose from presets or set custom sizes with advanced resampling methods.
          </p>
        </div>

        {/* Features - Responsive */}
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

        {/* Main Resizer Interface */}
        <div className="space-y-6">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {error && (
            <div className="mb-4 px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Settings Card - Redesigned */}
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up relative z-20" style={{ animationDelay: '0.3s' }}>
            {/* Card Header */}
            <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                Resize Settings
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Preset Dimensions - Enhanced Mobile */}
              <div className="space-y-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <TbAspectRatio className="w-4 h-4 text-muted-foreground" />
                  Preset Dimensions
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_DIMENSIONS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetChange(preset.name)}
                      className={cn(
                        "relative px-3 py-2.5 rounded-xl border-2 transition-all duration-200",
                        selectedPreset === preset.name
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/50 bg-card/50"
                      )}
                    >
                      <div className="text-sm font-medium">{preset.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Dimensions - Mobile Optimized */}
              <div className="space-y-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  Custom Dimensions
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Width (px)</label>
                    <input
                      type="number"
                      value={options.width || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setOptions(prev => ({ ...prev, width: value }));
                        setSelectedPreset('Custom');
                      }}
                      className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="1920"
                      min="1"
                      max="10000"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Height (px)</label>
                    <input
                      type="number"
                      value={options.height || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setOptions(prev => ({ ...prev, height: value }));
                        setSelectedPreset('Custom');
                      }}
                      className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="1080"
                      min="1"
                      max="10000"
                    />
                  </div>
                </div>
              </div>

              {/* Output Format */}
              <div className="space-y-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  Output Format
                </label>
                <select
                  value={options.format}
                  onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value as any }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="jpeg">JPEG - Best for photos</option>
                  <option value="png">PNG - Supports transparency</option>
                  <option value="webp">WebP - Modern format, smaller files</option>
                </select>
              </div>

              {/* Maintain Aspect Ratio Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Maintain Aspect Ratio</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.maintainAspectRatio !== false}
                    onChange={(e) => setOptions(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors duration-200"></div>
                  <div className="absolute left-[2px] top-[2px] bg-background w-5 h-5 rounded-full transition-transform duration-200 peer-checked:translate-x-5"></div>
                </label>
              </div>

              {/* Advanced Options - Collapsible on Mobile */}
              <div className="sm:hidden">
                <CollapsibleSection
                  title="Advanced Options"
                  defaultOpen={false}
                >
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Resize Method</label>
                      <select
                        value={options.method}
                        onChange={(e) => setOptions(prev => ({ ...prev, method: e.target.value as ResizeMethod }))}
                        className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
                      >
                        {RESIZE_METHODS.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {RESIZE_METHODS.find(m => m.value === options.method)?.description}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Fit Method</label>
                      <select
                        value={options.fitMethod}
                        onChange={(e) => setOptions(prev => ({ ...prev, fitMethod: e.target.value as FitMethod }))}
                        className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm"
                      >
                        {FIT_METHODS.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {FIT_METHODS.find(m => m.value === options.fitMethod)?.description}
                      </p>
                    </div>
                    
                    {options.format !== 'png' && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Quality: {Math.round((options.quality || 0.85) * 100)}%
                        </label>
                        <Slider
                          value={[(options.quality || 0.85) * 100]}
                          onValueChange={(value) => setOptions(prev => ({ ...prev, quality: value[0] / 100 }))}
                          min={10}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              </div>

              {/* Desktop Advanced Options */}
              <div className="hidden sm:block space-y-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  Advanced Options
                  <ChevronRight className={cn(
                    "w-4 h-4 ml-auto transition-transform",
                    showAdvanced && "rotate-90"
                  )} />
                </button>
                
                {showAdvanced && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Resize Method</label>
                      <select
                        value={options.method}
                        onChange={(e) => setOptions(prev => ({ ...prev, method: e.target.value as ResizeMethod }))}
                        className="w-full px-3 py-2.5 border border-border rounded-lg bg-background"
                      >
                        {RESIZE_METHODS.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label} - {method.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Fit Method</label>
                      <select
                        value={options.fitMethod}
                        onChange={(e) => setOptions(prev => ({ ...prev, fitMethod: e.target.value as FitMethod }))}
                        className="w-full px-3 py-2.5 border border-border rounded-lg bg-background"
                      >
                        {FIT_METHODS.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label} - {method.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {options.format !== 'png' && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Quality: {Math.round((options.quality || 0.85) * 100)}%
                        </label>
                        <Slider
                          value={[(options.quality || 0.85) * 100]}
                          onValueChange={(value) => setOptions(prev => ({ ...prev, quality: value[0] / 100 }))}
                          min={10}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Drop Zone / File Upload */}
          {!hasFiles ? (
            <label 
              htmlFor="file-upload"
              className="group relative block cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <div className={cn(
                "relative p-12 sm:p-16 md:p-20 rounded-2xl border-2 border-dashed transition-all duration-300",
                isDragging 
                  ? "border-primary bg-primary/10 scale-[1.02]" 
                  : "border-border bg-card/50 hover:border-primary hover:bg-card group-hover:scale-[1.01]"
              )}>
                <div className="text-center">
                  <Upload className={cn(
                    "w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 transition-all duration-300",
                    isDragging ? "text-primary scale-110" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  <p className="text-lg sm:text-xl font-medium mb-2">
                    Drop images here
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    or click to browse
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Supports JPG, PNG, WebP, and more
                    </span>
                  </div>
                </div>
              </div>
            </label>
          ) : (
            <div className="space-y-4">
              <SimplifiedFileList
                files={files}
                onRemove={handleRemoveFile}
                onDownload={handleDownload}
              />
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add More Images
                </Button>
                
                <Button
                  onClick={handleResize}
                  disabled={isResizing || files.filter(f => f.status === 'pending').length === 0}
                  className="flex-1"
                >
                  {isResizing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resizing...
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Resize {files.filter(f => f.status === 'pending').length} Images
                    </>
                  )}
                </Button>
                
                {hasCompleted && (
                  <Button
                    onClick={handleDownloadAll}
                    variant="default"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download All ({completedCount})
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Related Tools */}
          <div className="mt-12 pt-12 border-t">
            <RelatedTools tools={relatedTools} direction="responsive" />
          </div>

          {/* FAQ Section */}
          <div className="mt-16 pt-16 border-t">
            <FAQ items={faqs} />
          </div>
        </div>
      </section>
    </div>
  );
}