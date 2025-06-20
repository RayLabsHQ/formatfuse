import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Image, Upload, Download, X, FileUp, 
  Loader2, ArrowRight, ArrowLeftRight, FileCheck, Settings, Eye, Package
} from 'lucide-react';
import { getImageConverter, type ImageFormat } from '../../lib/image-converter';
import { getHeicImageConverter } from '../../lib/heic-image-converter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Progress } from '../ui/progress';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import VirtualizedFileList from './VirtualizedFileList';

interface FileInfo {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: Blob;
  error?: string;
  isLarge?: boolean;
}

interface ImageConverterProps {
  sourceFormat?: string;
  targetFormat?: string;
}

// Format configuration - formats supported by image-rs + HEIC
const FORMATS: Record<string, ImageFormat & { displayName: string }> = {
  PNG: { mime: 'image/png', extension: 'png', name: 'PNG', displayName: 'PNG' },
  JPEG: { mime: 'image/jpeg', extension: 'jpg', name: 'JPEG', displayName: 'JPEG/JPG' },
  WEBP: { mime: 'image/webp', extension: 'webp', name: 'WebP', displayName: 'WebP' },
  GIF: { mime: 'image/gif', extension: 'gif', name: 'GIF', displayName: 'GIF' },
  BMP: { mime: 'image/bmp', extension: 'bmp', name: 'BMP', displayName: 'BMP' },
  ICO: { mime: 'image/x-icon', extension: 'ico', name: 'ICO', displayName: 'ICO' },
  TIFF: { mime: 'image/tiff', extension: 'tiff', name: 'TIFF', displayName: 'TIFF' },
  AVIF: { mime: 'image/avif', extension: 'avif', name: 'AVIF', displayName: 'AVIF' },
  HEIC: { mime: 'image/heic', extension: 'heic', name: 'HEIC', displayName: 'HEIC' },
};

export default function ImageConverter({ sourceFormat, targetFormat }: ImageConverterProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Handle format lookup more safely
  const getFormat = (formatName?: string) => {
    if (!formatName) return null;
    const upperFormat = formatName.toUpperCase();
    // Handle JPEG/JPG alias
    if (upperFormat === 'JPG') return FORMATS.JPEG;
    return FORMATS[upperFormat];
  };
  
  const [selectedSourceFormat, setSelectedSourceFormat] = useState(
    getFormat(sourceFormat) || FORMATS.PNG
  );
  const [selectedTargetFormat, setSelectedTargetFormat] = useState(
    getFormat(targetFormat) || FORMATS.JPEG
  );
  const [quality, setQuality] = useState(85);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update formats when props change (e.g., navigating between routes)
  useEffect(() => {
    const newSourceFormat = getFormat(sourceFormat);
    const newTargetFormat = getFormat(targetFormat);
    
    if (newSourceFormat) {
      setSelectedSourceFormat(newSourceFormat);
    }
    if (newTargetFormat) {
      setSelectedTargetFormat(newTargetFormat);
    }
  }, [sourceFormat, targetFormat]);

  const showQualitySlider = selectedTargetFormat && ['JPEG', 'WEBP', 'AVIF'].includes(selectedTargetFormat.name);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    // Auto-detect source format from first file
    if (droppedFiles.length > 0) {
      const firstFile = droppedFiles[0];
      const extension = firstFile.name.split('.').pop()?.toUpperCase();
      const detectedFormat = getFormat(extension);
      if (detectedFormat) {
        setSelectedSourceFormat(detectedFormat);
      }
    }

    const newFiles = droppedFiles.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0,
      isLarge: file.size > 50 * 1024 * 1024, // Flag files over 50MB
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Auto-detect source format
      if (selectedFiles.length > 0) {
        const firstFile = selectedFiles[0];
        const extension = firstFile.name.split('.').pop()?.toUpperCase();
        const detectedFormat = getFormat(extension);
        if (detectedFormat) {
          setSelectedSourceFormat(detectedFormat);
        }
      }

      const newFiles = selectedFiles.map(file => ({
        file,
        status: 'pending' as const,
        progress: 0,
        isLarge: file.size > 50 * 1024 * 1024, // Flag files over 50MB
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFile = async (index: number) => {
    const fileInfo = files[index];
    if (!fileInfo) return;

    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'processing' as const, progress: 0 } : f
    ));

    try {
      let convertedBlob: Blob;
      
      // Check if the source file is HEIC
      const isHeicSource = fileInfo.file.type === 'image/heic' || 
                          fileInfo.file.name.toLowerCase().endsWith('.heic') ||
                          fileInfo.file.name.toLowerCase().endsWith('.heif');
      
      if (isHeicSource) {
        // Use HEIC converter for HEIC files
        const heicConverter = getHeicImageConverter();
        convertedBlob = await heicConverter.convert(
          fileInfo.file,
          selectedTargetFormat,
          (progress) => {
            setFiles(prev => prev.map((f, i) => 
              i === index ? { ...f, progress } : f
            ));
          }
        );
      } else {
        // Use regular converter for other formats
        const converter = getImageConverter();
        convertedBlob = await converter.convert(
          fileInfo.file,
          selectedTargetFormat,
          (progress) => {
            setFiles(prev => prev.map((f, i) => 
              i === index ? { ...f, progress } : f
            ));
          }
        );
      }

      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'completed' as const, 
          result: convertedBlob,
          progress: 100
        } : f
      ));

    } catch (error) {
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Conversion failed' 
        } : f
      ));
    }
  };

  const processAll = () => {
    files.forEach((file, index) => {
      if (file.status === 'pending') {
        processFile(index);
      }
    });
  };

  const downloadFile = (index: number) => {
    const fileInfo = files[index];
    if (!fileInfo || fileInfo.status !== 'completed' || !fileInfo.result) return;

    const url = URL.createObjectURL(fileInfo.result);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileInfo.file.name.replace(/\.[^/.]+$/, '') + '.' + (selectedTargetFormat?.extension || 'jpg');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.result);
    
    if (completedFiles.length === 1) {
      // Single file - download directly
      const file = completedFiles[0];
      const url = URL.createObjectURL(file.result!);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file.name.replace(/\.[^/.]+$/, '') + '.' + (selectedTargetFormat?.extension || 'jpg');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Multiple files - create ZIP
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      
      completedFiles.forEach(file => {
        const newName = file.file.name.replace(/\.[^/.]+$/, '') + '.' + (selectedTargetFormat?.extension || 'jpg');
        zip.file(newName, file.result!);
      });
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted-images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const acceptedFormats = selectedSourceFormat ? `.${selectedSourceFormat.extension},${selectedSourceFormat.mime}` : '*';

  return (
    <div className="min-h-screen bg-background">
      {/* Tool Header */}
      <div className="border-b bg-card/[0.5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-tool-jpg/[0.1] text-tool-jpg rounded-lg">
                <Image className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              {selectedSourceFormat?.name === selectedTargetFormat?.name 
                ? `${selectedSourceFormat?.displayName || 'Image'} Compressor`
                : `${selectedSourceFormat?.displayName || 'Image'} to ${selectedTargetFormat?.displayName || 'Image'} Converter`
              }
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
              {selectedSourceFormat?.name === selectedTargetFormat?.name 
                ? `Compress and optimize ${selectedSourceFormat?.displayName || 'your'} images online. Reduce file size while maintaining visual quality with our free image compressor.`
                : `Convert ${selectedSourceFormat?.displayName || 'your'} images to ${selectedTargetFormat?.displayName || 'any'} format online for free. Fast, secure browser-based image converter.`
              }
              {' '}100% private - all processing happens in your browser.
            </p>
            
            {/* Tool Features */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">No file size limits</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Batch convert multiple files</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Free & no sign-up required</span>
              </div>
            </div>
          </div>

          {/* Format Selector */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">From:</label>
              <Select
                value={selectedSourceFormat?.name || 'PNG'}
                onValueChange={(value) => {
                  const format = Object.values(FORMATS).find(f => f.name === value);
                  if (format) setSelectedSourceFormat(format);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(FORMATS).map(format => (
                    <SelectItem key={format.name} value={format.name}>
                      {format.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => {
                // Swap source and target formats
                const temp = selectedSourceFormat;
                setSelectedSourceFormat(selectedTargetFormat);
                setSelectedTargetFormat(temp);
              }}
              variant="ghost"
              size="icon"
              title="Swap formats"
              aria-label="Swap source and target formats"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">To:</label>
              <Select
                value={selectedTargetFormat?.name || 'JPEG'}
                onValueChange={(value) => {
                  const format = Object.values(FORMATS).find(f => f.name === value);
                  if (format) setSelectedTargetFormat(format);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(FORMATS).map(format => (
                    <SelectItem key={format.name} value={format.name}>
                      {format.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showQualitySlider && (
              <div className="flex items-center gap-3 ml-auto">
                <label className="text-sm font-medium">Quality:</label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[quality]}
                    onValueChange={(value) => setQuality(value[0])}
                    min={10}
                    max={100}
                    step={1}
                    className="w-[120px]"
                  />
                  <span className="text-sm font-mono bg-secondary px-2 py-0.5 rounded min-w-[48px] text-center">
                    {quality}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-12 text-center ff-transition ${
            isDragging 
              ? 'border-primary bg-primary/[0.05] drop-zone-active' 
              : 'border-border drop-zone hover:border-primary/[0.5]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/[0.1] rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">Drop {selectedSourceFormat?.displayName || 'image'} files here</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline font-medium"
                >
                  browse files
                </button>
                {' '}from your computer
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileCheck className="w-3 h-3" />
                .{selectedSourceFormat?.extension || '*'} format
              </span>
              <span className="flex items-center gap-1">
                <FileUp className="w-3 h-3" />
                No file size limit
              </span>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Files to convert ({files.length})</h3>
              <div className="flex items-center gap-3">
                {files.some(f => f.status === 'completed') && files.length > 1 && (
                  <Button
                    onClick={downloadAll}
                    variant="outline"
                    className="gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Download All
                  </Button>
                )}
                <Button
                  onClick={processAll}
                  disabled={!files.some(f => f.status === 'pending')}
                  className="gap-2"
                >
                  Convert All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Use virtualized list for better performance */}
            <VirtualizedFileList
              files={files}
              selectedTargetFormat={selectedTargetFormat}
              onConvert={processFile}
              onDownload={downloadFile}
              onRemove={removeFile}
              formatFileSize={formatFileSize}
            />
          </div>
        )}

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary rounded-lg text-primary mb-3">
              <Settings className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">Format Flexibility</h3>
            <p className="text-sm text-muted-foreground">
              Convert between 10+ image formats instantly
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary rounded-lg text-accent mb-3">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">Quality Control</h3>
            <p className="text-sm text-muted-foreground">
              Adjust quality settings for optimal results
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary rounded-lg text-tool-jpg mb-3">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">Batch Processing</h3>
            <p className="text-sm text-muted-foreground">
              Convert multiple images at once with ZIP download
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}