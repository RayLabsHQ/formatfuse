import React, { useState, useCallback } from 'react';
import { Upload, Download, Image, Settings2, AlertCircle, X, Maximize2 } from 'lucide-react';
import { useImageResize } from '../../hooks/useImageResize';
import type { ResizeOptions, ResizeMethod, FitMethod } from '../../lib/image-resize';
import { VirtualizedFileList } from './VirtualizedFileList';

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

export default function ImageResizer() {
  const { resize, resizeBatch, isResizing, progress, batchProgress, error, clearError } = useImageResize();
  const [files, setFiles] = useState<FileInfo[]>([]);
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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: FileInfo[] = selectedFiles.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0,
      isLarge: file.size > 10 * 1024 * 1024
    }));
    setFiles(prev => [...prev, ...newFiles]);
    clearError();
  }, [clearError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'));
    const newFiles: FileInfo[] = imageFiles.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0,
      isLarge: file.size > 10 * 1024 * 1024
    }));
    setFiles(prev => [...prev, ...newFiles]);
    clearError();
  }, [clearError]);

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

  const handleDownloadAll = () => {
    files.filter(f => f.status === 'completed' && f.result).forEach(handleDownload);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const hasFiles = files.length > 0;
  const hasCompleted = completedCount > 0;

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <div className="p-1.5 sm:p-2 bg-tool-jpg/[0.1] text-tool-jpg rounded-lg">
            <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          Image Resizer
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground px-2">
          Resize multiple images at once with advanced options
        </p>
      </div>

      {/* Options Panel - Mobile optimized */}
      <div className="mb-6 p-4 sm:p-6 rounded-lg border bg-card">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
          Resize Options
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* Preset Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Preset Dimensions</label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              {PRESET_DIMENSIONS.map(preset => (
                <option key={preset.name} value={preset.name}>
                  {preset.name} {preset.description && `- ${preset.description}`}
                </option>
              ))}
            </select>
          </div>
          
          {/* Output Format */}
          <div>
            <label className="block text-sm font-medium mb-2">Output Format</label>
            <select
              value={options.format}
              onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value as any }))}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
        </div>
        
        {/* Custom Dimensions */}
        {selectedPreset === 'Custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Width (px)</label>
              <input
                type="number"
                value={options.width || ''}
                onChange={(e) => setOptions(prev => ({ ...prev, width: parseInt(e.target.value) || undefined }))}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                placeholder="Auto"
                min="1"
                max="10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Height (px)</label>
              <input
                type="number"
                value={options.height || ''}
                onChange={(e) => setOptions(prev => ({ ...prev, height: parseInt(e.target.value) || undefined }))}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                placeholder="Auto"
                min="1"
                max="10000"
              />
            </div>
          </div>
        )}
        
        {/* Maintain Aspect Ratio */}
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.maintainAspectRatio !== false}
              onChange={(e) => setOptions(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm font-medium">Maintain aspect ratio</span>
          </label>
        </div>
        
        {/* Advanced Options */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-primary hover:underline mb-4"
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced options
        </button>
        
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium mb-2">Resize Method</label>
              <select
                value={options.method}
                onChange={(e) => setOptions(prev => ({ ...prev, method: e.target.value as ResizeMethod }))}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                {RESIZE_METHODS.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label} - {method.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Fit Method</label>
              <select
                value={options.fitMethod}
                onChange={(e) => setOptions(prev => ({ ...prev, fitMethod: e.target.value as FitMethod }))}
                className="w-full px-3 py-2 border rounded-lg bg-background"
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
                <label className="block text-sm font-medium mb-2">
                  Quality ({Math.round((options.quality || 0.85) * 100)}%)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={options.quality || 0.85}
                  onChange={(e) => setOptions(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Area */}
      {!hasFiles && (
        <div
          className="p-12 border-2 border-dashed rounded-lg text-center hover:border-primary/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
            aria-label="Select images to resize"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Drop images here or click to upload</p>
            <p className="text-sm text-muted-foreground">
              Support for JPG, PNG, WebP, and more. Batch processing available.
            </p>
          </label>
        </div>
      )}

      {/* File List */}
      {hasFiles && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {files.length} image{files.length !== 1 ? 's' : ''} selected
            </h3>
            <div className="flex gap-2">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="add-more"
                aria-label="Select additional images to resize"
              />
              <label
                htmlFor="add-more"
                className="px-4 py-2 text-sm border rounded-lg hover:bg-accent cursor-pointer"
              >
                Add More
              </label>
              {hasCompleted && (
                <button
                  onClick={handleDownloadAll}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Download All ({completedCount})
                </button>
              )}
            </div>
          </div>

          <VirtualizedFileList
            files={files}
            onDownload={handleDownload}
            onRemove={handleRemoveFile}
            renderExtraInfo={(file) => (
              file.dimensions && (
                <span className="text-xs text-muted-foreground">
                  {file.dimensions.width}×{file.dimensions.height}
                </span>
              )
            )}
          />

          {files.some(f => f.status === 'pending') && (
            <button
              onClick={handleResize}
              disabled={isResizing}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResizing ? `Resizing... (${progress}%)` : 'Resize All Images'}
            </button>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm">{error}</p>
          <button
            onClick={clearError}
            className="ml-auto text-sm hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border">
          <Image className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Batch Processing</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Resize multiple images at once with consistent settings
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Settings2 className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Smart Presets</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Quick resize for social media, web, and common dimensions
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Maximize2 className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Quality Control</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Advanced algorithms preserve image quality during resize
          </p>
        </div>
      </div>
    </div>
  );
}