import React, { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { usePdfOperations } from '../../hooks/usePdfOperations';
import { 
  Image, Download, FileText, AlertCircle, Upload, FileUp,
  FileCheck, CheckCircle, Loader2, Package, Settings
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Slider } from '../ui/slider';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
const { saveAs } = FileSaver;

interface ConversionResult {
  page: number;
  data: Uint8Array;
  size: number;
}

export const PdfToJpg: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [metadata, setMetadata] = useState<any>(null);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [conversionMode, setConversionMode] = useState<'all' | 'specific'>('all');
  const [specificPages, setSpecificPages] = useState<string>('');
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [quality, setQuality] = useState(85);
  const [scale, setScale] = useState(1.5);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { pdfToImages, getPageCount, getMetadata, isProcessing, progress, error } = usePdfOperations();

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;

    setFile(selectedFile);
    setResults([]);
    setSpecificPages('');
    
    try {
      const fileData = new Uint8Array(await selectedFile.arrayBuffer());
      const count = await getPageCount(fileData);
      const meta = await getMetadata(fileData);
      setPageCount(count);
      setMetadata(meta);
      
      // Set default to all pages
      setSpecificPages(`1-${count}`);
    } catch (err) {
      console.error('Error reading PDF:', err);
    }
  }, [getPageCount, getMetadata]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    try {
      const fileData = new Uint8Array(await file.arrayBuffer());
      
      let pages: number[] | undefined;
      if (conversionMode === 'specific' && specificPages) {
        // Parse page ranges
        const ranges = specificPages.split(',').map(r => r.trim());
        pages = [];
        for (const range of ranges) {
          if (range.includes('-')) {
            const [start, end] = range.split('-').map(n => parseInt(n.trim()));
            for (let i = start; i <= end && i <= pageCount; i++) {
              if (i > 0) pages.push(i);
            }
          } else {
            const page = parseInt(range);
            if (page > 0 && page <= pageCount) pages.push(page);
          }
        }
        // Remove duplicates and sort
        pages = [...new Set(pages)].sort((a, b) => a - b);
      }

      const images = await pdfToImages(fileData, {
        pages,
        format,
        quality: format === 'jpeg' ? quality / 100 : undefined,
        scale
      });

      const convertedResults: ConversionResult[] = images.map((data, index) => ({
        page: pages ? pages[index] : index + 1,
        data,
        size: data.length
      }));

      setResults(convertedResults);
    } catch (err) {
      console.error('Error converting PDF:', err);
    }
  }, [file, pdfToImages, conversionMode, specificPages, pageCount, format, quality, scale]);

  const downloadSingle = useCallback((result: ConversionResult) => {
    const blob = new Blob([result.data], { 
      type: format === 'jpeg' ? 'image/jpeg' : 'image/png' 
    });
    const baseName = file?.name.replace('.pdf', '') || 'page';
    saveAs(blob, `${baseName}_page${result.page}.${format === 'jpeg' ? 'jpg' : 'png'}`);
  }, [file, format]);

  const downloadAll = useCallback(async () => {
    if (results.length === 0) return;

    if (results.length === 1) {
      downloadSingle(results[0]);
      return;
    }

    const zip = new JSZip();
    const baseName = file?.name.replace('.pdf', '') || 'pages';

    results.forEach((result) => {
      const fileName = `${baseName}_page${result.page}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      zip.file(fileName, result.data);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${baseName}_images.zip`);
  }, [results, file, format, downloadSingle]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Tool Header */}
      <div className="border-b bg-card/[0.5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-tool-pdf/[0.1] text-tool-pdf rounded-lg">
                <Image className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              PDF to JPG Converter
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
              Convert PDF pages to high-quality JPG or PNG images. Extract all pages or select specific ones.
              100% private - all processing happens in your browser.
            </p>
            
            {/* Tool Features */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">No file size limits</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Adjustable quality</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Batch download</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Drop Zone */}
        {!file && (
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
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/[0.1] rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">Drop PDF file here</h3>
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
                  PDF files only
                </span>
                <span className="flex items-center gap-1">
                  <FileUp className="w-3 h-3" />
                  No file size limit
                </span>
              </div>
            </div>
          </div>
        )}

        {file && pageCount > 0 && (
          <div className="space-y-6">
            {/* File Info Card */}
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-tool-pdf/[0.1] text-tool-pdf rounded">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{file.name}</h3>
                    <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{pageCount} pages</span>
                      <span>{formatFileSize(file.size)}</span>
                      {metadata?.title && (
                        <span>Title: {metadata.title}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setResults([]);
                    setPageCount(0);
                    setMetadata(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Change file
                </Button>
              </div>
            </div>

            {/* Conversion Options */}
            <div className="bg-card border rounded-lg p-6 space-y-6">
              <h3 className="font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Conversion Options
              </h3>
              
              {/* Page Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Pages to convert</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConversionMode('all')}
                    className={`p-3 rounded-lg border-2 ff-transition ${
                      conversionMode === 'all' 
                        ? 'border-primary bg-primary/[0.05]' 
                        : 'border-border hover:border-primary/[0.3]'
                    }`}
                  >
                    <div className="font-medium">All pages</div>
                    <div className="text-xs text-muted-foreground mt-1">Convert every page</div>
                  </button>
                  <button
                    onClick={() => setConversionMode('specific')}
                    className={`p-3 rounded-lg border-2 ff-transition ${
                      conversionMode === 'specific' 
                        ? 'border-primary bg-primary/[0.05]' 
                        : 'border-border hover:border-primary/[0.3]'
                    }`}
                  >
                    <div className="font-medium">Specific pages</div>
                    <div className="text-xs text-muted-foreground mt-1">Choose pages to convert</div>
                  </button>
                </div>
                
                {conversionMode === 'specific' && (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="e.g., 1-3, 5, 7-10"
                      value={specificPages}
                      onChange={(e) => setSpecificPages(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter page numbers or ranges separated by commas
                    </p>
                  </div>
                )}
              </div>

              {/* Format and Quality */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Output format</label>
                  <Select
                    value={format}
                    onValueChange={(value: 'jpeg' | 'png') => setFormat(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jpeg">JPEG (smaller size)</SelectItem>
                      <SelectItem value="png">PNG (higher quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {format === 'jpeg' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quality</label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[quality]}
                        onValueChange={(value) => setQuality(value[0])}
                        min={10}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono bg-secondary px-2 py-0.5 rounded min-w-[48px] text-center">
                        {quality}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Scale */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution scale</label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[scale]}
                    onValueChange={(value) => setScale(value[0])}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono bg-secondary px-2 py-0.5 rounded min-w-[48px] text-center">
                    {scale.toFixed(1)}x
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Higher scale = better quality but larger file size
                </p>
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleConvert}
              disabled={isProcessing || !file}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting to {format.toUpperCase()}...
                </>
              ) : (
                <>
                  <Image className="w-4 h-4 mr-2" />
                  Convert to {format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="bg-card border rounded-lg p-4 mt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Converting pages...</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error.message}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Successfully converted {results.length} pages!</span>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Converted Images</h3>
                {results.length > 1 && (
                  <Button
                    onClick={downloadAll}
                    variant="default"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Download All ({results.length} images)
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.map((result) => (
                  <div
                    key={result.page}
                    className="group relative aspect-[3/4] bg-secondary/[0.3] rounded-lg overflow-hidden hover:ring-2 hover:ring-primary ff-transition"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Page {result.page}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatFileSize(result.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => downloadSingle(result)}
                      size="sm"
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 ff-transition"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfToJpg;