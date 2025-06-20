import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Image, Upload, Download, X, FileUp, 
  Loader2, ArrowRight, FileCheck, Settings, Eye, Package
} from 'lucide-react';
import { getImageConverter, IMAGE_FORMATS, type ImageFormat } from '../../lib/image-converter';

interface FileInfo {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: Blob;
  error?: string;
}

interface ImageConverterProps {
  sourceFormat?: string;
  targetFormat?: string;
}

// Format configuration
const FORMATS: Record<string, ImageFormat & { displayName: string }> = {
  PNG: { mime: 'image/png', extension: 'png', name: 'PNG', displayName: 'PNG' },
  JPEG: { mime: 'image/jpeg', extension: 'jpg', name: 'JPEG', displayName: 'JPEG/JPG' },
  WEBP: { mime: 'image/webp', extension: 'webp', name: 'WebP', displayName: 'WebP' },
  GIF: { mime: 'image/gif', extension: 'gif', name: 'GIF', displayName: 'GIF' },
  BMP: { mime: 'image/bmp', extension: 'bmp', name: 'BMP', displayName: 'BMP' },
  ICO: { mime: 'image/x-icon', extension: 'ico', name: 'ICO', displayName: 'ICO' },
  TIFF: { mime: 'image/tiff', extension: 'tiff', name: 'TIFF', displayName: 'TIFF' },
  AVIF: { mime: 'image/avif', extension: 'avif', name: 'AVIF', displayName: 'AVIF' },
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
      const converter = getImageConverter();
      
      const convertedBlob = await converter.convert(
        fileInfo.file,
        selectedTargetFormat,
        (progress) => {
          setFiles(prev => prev.map((f, i) => 
            i === index ? { ...f, progress } : f
          ));
        }
      );

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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="p-2 bg-tool-jpg/[0.1] text-tool-jpg rounded-lg">
                  <Image className="w-6 h-6" />
                </div>
                {selectedSourceFormat?.displayName || 'Image'} to {selectedTargetFormat?.displayName || 'Image'} Converter
              </h1>
              <p className="mt-2 text-muted-foreground">
                Convert {selectedSourceFormat?.displayName || 'your'} images to {selectedTargetFormat?.displayName || 'any'} format instantly. 
                All processing happens in your browser - 100% private and secure.
              </p>
            </div>
            
            {/* Tool Stats */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold">50MB</div>
                <div className="text-muted-foreground">Max file size</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="font-semibold">Batch</div>
                <div className="text-muted-foreground">Multi-file support</div>
              </div>
            </div>
          </div>

          {/* Format Selector */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">From:</label>
              <select
                value={selectedSourceFormat?.name || 'PNG'}
                onChange={(e) => {
                  const format = Object.values(FORMATS).find(f => f.name === e.target.value);
                  if (format) setSelectedSourceFormat(format);
                }}
                className="px-3 py-1.5 bg-secondary rounded-md text-sm font-medium"
              >
                {Object.values(FORMATS).map(format => (
                  <option key={format.name} value={format.name}>
                    {format.displayName}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-muted-foreground" />

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">To:</label>
              <select
                value={selectedTargetFormat?.name || 'JPEG'}
                onChange={(e) => {
                  const format = Object.values(FORMATS).find(f => f.name === e.target.value);
                  if (format) setSelectedTargetFormat(format);
                }}
                className="px-3 py-1.5 bg-secondary rounded-md text-sm font-medium"
              >
                {Object.values(FORMATS).map(format => (
                  <option key={format.name} value={format.name}>
                    {format.displayName}
                  </option>
                ))}
              </select>
            </div>

            {showQualitySlider && (
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm font-medium">Quality:</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm font-mono bg-secondary px-2 py-0.5 rounded">
                  {quality}%
                </span>
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
                Up to 50MB
              </span>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Files to convert</h3>
              <div className="flex items-center gap-3">
                {files.some(f => f.status === 'completed') && files.length > 1 && (
                  <button
                    onClick={downloadAll}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent/[0.1] text-accent rounded-md hover:bg-accent/[0.2] ff-transition"
                  >
                    <Package className="w-4 h-4" />
                    Download All
                  </button>
                )}
                <button
                  onClick={processAll}
                  disabled={!files.some(f => f.status === 'pending')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 ff-transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Convert All
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {files.map((fileInfo, index) => (
                <div
                  key={index}
                  className="bg-card rounded-lg p-4 ff-shadow-tool border-l-4 border-tool-jpg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Image className="w-5 h-5 text-tool-jpg flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{fileInfo.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(fileInfo.file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {fileInfo.status === 'pending' && (
                        <button
                          onClick={() => processFile(index)}
                          className="px-3 py-1 text-sm bg-secondary rounded-md hover:bg-secondary/[0.8] ff-transition"
                        >
                          Convert
                        </button>
                      )}
                      
                      {fileInfo.status === 'processing' && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-sm font-mono">{Math.round(fileInfo.progress)}%</span>
                        </div>
                      )}
                      
                      {fileInfo.status === 'completed' && fileInfo.result && (
                        <button 
                          onClick={() => {
                            const url = URL.createObjectURL(fileInfo.result!);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileInfo.file.name.replace(/\.[^/.]+$/, '') + '.' + selectedTargetFormat.extension;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-accent/[0.1] text-accent rounded-md hover:bg-accent/[0.2] ff-transition"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      )}

                      {fileInfo.status === 'error' && (
                        <span className="text-sm text-destructive">
                          {fileInfo.error}
                        </span>
                      )}
                      
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-secondary rounded ff-transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {fileInfo.status === 'processing' && (
                    <div className="mt-3">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full ff-transition"
                          style={{ width: `${fileInfo.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
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