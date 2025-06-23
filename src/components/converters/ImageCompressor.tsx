import React, { useState, useCallback } from 'react';
import { Upload, Download, FileDown, AlertCircle, Settings2, Minimize2 } from 'lucide-react';
import { useImageCompress } from '../../hooks/useImageCompress';
import type { CompressOptions, CompressFormat } from '../../lib/image-compress';
import { VirtualizedFileList } from './VirtualizedFileList';

interface FileInfo {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: Blob;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  isLarge?: boolean;
}

const QUALITY_PRESETS = [
  { value: 95, label: 'Maximum', description: 'Best quality, larger file' },
  { value: 85, label: 'High', description: 'Excellent quality, good compression' },
  { value: 75, label: 'Medium', description: 'Good quality, smaller file' },
  { value: 60, label: 'Low', description: 'Acceptable quality, much smaller' },
  { value: 40, label: 'Minimum', description: 'Lower quality, tiny file' },
];

export default function ImageCompressor() {
  const { compress, compressBatch, isCompressing, progress, batchProgress, error, clearError } = useImageCompress();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [options, setOptions] = useState<CompressOptions>({
    quality: 85,
    maintainFormat: true,
    maxWidth: undefined,
    maxHeight: undefined
  });
  const [selectedPreset, setSelectedPreset] = useState<number>(85);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    const newFiles: FileInfo[] = imageFiles.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0,
      originalSize: file.size,
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
      originalSize: file.size,
      isLarge: file.size > 10 * 1024 * 1024
    }));
    setFiles(prev => [...prev, ...newFiles]);
    clearError();
  }, [clearError]);

  const handleQualityChange = (quality: number) => {
    setSelectedPreset(quality);
    setOptions(prev => ({ ...prev, quality }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleCompress = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    const fileBlobs = pendingFiles.map(f => f.file);
    
    // Update status to processing
    setFiles(prev => prev.map(f => 
      f.status === 'pending' ? { ...f, status: 'processing' as const } : f
    ));

    try {
      const results = await compressBatch(fileBlobs, options);
      
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
              compressedSize: result.compressedSize,
              compressionRatio: result.compressionRatio
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
          ? { ...f, status: 'error' as const, error: 'Compression failed' }
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
    
    const ext = file.file.name.split('.').pop() || 'jpg';
    const baseName = file.file.name.split('.').slice(0, -1).join('.');
    const fileName = `${baseName}_compressed.${ext}`;
    
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
  const totalSaved = files.reduce((sum, f) => {
    if (f.status === 'completed' && f.originalSize && f.compressedSize) {
      return sum + (f.originalSize - f.compressedSize);
    }
    return sum;
  }, 0);
  const hasFiles = files.length > 0;
  const hasCompleted = completedCount > 0;

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Image Compressor</h1>
        <p className="text-muted-foreground">
          Reduce image file sizes while maintaining quality. Batch compression supported.
        </p>
      </div>

      {/* Options Panel */}
      <div className="mb-6 p-6 rounded-lg border bg-card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Compression Settings
        </h3>
        
        {/* Quality Presets */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-3">Quality Level</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {QUALITY_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => handleQualityChange(preset.value)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  selectedPreset === preset.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-secondary border-border'
                }`}
              >
                <div className="font-medium text-sm">{preset.label}</div>
                <div className="text-xs opacity-80 mt-1">{preset.value}%</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {QUALITY_PRESETS.find(p => p.value === selectedPreset)?.description}
          </p>
        </div>
        
        {/* Format Options */}
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.maintainFormat !== false}
              onChange={(e) => setOptions(prev => ({ ...prev, maintainFormat: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm font-medium">Maintain original format</span>
          </label>
          <p className="text-xs text-muted-foreground ml-6 mt-1">
            Keep the same image format (JPG stays JPG, PNG stays PNG)
          </p>
        </div>
        
        {!options.maintainFormat && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Convert to Format</label>
            <select
              value={options.format || 'jpeg'}
              onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value as CompressFormat }))}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              <option value="jpeg">JPEG (Best for photos)</option>
              <option value="webp">WebP (Modern, smaller files)</option>
              <option value="png">PNG (Lossless, larger files)</option>
            </select>
          </div>
        )}
        
        {/* Advanced Options */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-primary hover:underline"
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced options
        </button>
        
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Max Width (px)</label>
                <input
                  type="number"
                  value={options.maxWidth || ''}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    maxWidth: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  placeholder="No limit"
                  min="1"
                  max="10000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Height (px)</label>
                <input
                  type="number"
                  value={options.maxHeight || ''}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    maxHeight: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  placeholder="No limit"
                  min="1"
                  max="10000"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Images larger than these dimensions will be resized proportionally
            </p>
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
            aria-label="Select images to compress"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Drop images here or click to upload</p>
            <p className="text-sm text-muted-foreground">
              Support for JPG, PNG, WebP, and more. Batch compression available.
            </p>
          </label>
        </div>
      )}

      {/* File List */}
      {hasFiles && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {files.length} image{files.length !== 1 ? 's' : ''} selected
              </h3>
              {hasCompleted && (
                <p className="text-sm text-muted-foreground">
                  Total saved: {formatFileSize(totalSaved)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="add-more"
                aria-label="Select additional images to compress"
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
              <>
                {file.originalSize && (
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.originalSize)}
                  </span>
                )}
                {file.status === 'completed' && file.compressedSize && (
                  <>
                    <span className="text-xs text-muted-foreground mx-1">→</span>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      {formatFileSize(file.compressedSize)} (-{file.compressionRatio?.toFixed(0)}%)
                    </span>
                  </>
                )}
              </>
            )}
          />

          {files.some(f => f.status === 'pending') && (
            <button
              onClick={handleCompress}
              disabled={isCompressing}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Minimize2 className="w-5 h-5" />
              {isCompressing ? `Compressing... (${progress}%)` : 'Compress All Images'}
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
    </div>
  );
}