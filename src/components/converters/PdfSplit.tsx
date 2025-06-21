import React, { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { usePdfOperations } from '../../hooks/usePdfOperations';
import { parsePageRanges, formatPageRanges } from '../../lib/pdf-operations';
import { 
  Scissors, Download, FileText, AlertCircle, Upload, FileUp,
  FileCheck, CheckCircle, Loader2
} from 'lucide-react';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
const { saveAs } = FileSaver;

export const PdfSplit: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<'range' | 'every'>('range');
  const [pageRangeInput, setPageRangeInput] = useState<string>('');
  const [everyNPages, setEveryNPages] = useState<number>(1);
  const [results, setResults] = useState<Uint8Array[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { split, getPageCount, getMetadata, isProcessing, progress, error } = usePdfOperations();

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;

    setFile(selectedFile);
    setResults([]);
    setPageRangeInput('');
    
    try {
      const fileData = new Uint8Array(await selectedFile.arrayBuffer());
      const count = await getPageCount(fileData);
      const meta = await getMetadata(fileData);
      setPageCount(count);
      setMetadata(meta);
      
      // Set default range to all pages
      setPageRangeInput(`1-${count}`);
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

  const handleSplit = useCallback(async () => {
    if (!file) return;

    try {
      const fileData = new Uint8Array(await file.arrayBuffer());
      
      let pageRanges: Array<{ start: number; end: number }> = [];
      
      if (splitMode === 'range') {
        pageRanges = parsePageRanges(pageRangeInput, pageCount);
      } else {
        // Split every N pages
        for (let i = 1; i <= pageCount; i += everyNPages) {
          pageRanges.push({
            start: i,
            end: Math.min(i + everyNPages - 1, pageCount)
          });
        }
      }

      if (pageRanges.length === 0) {
        throw new Error('No valid page ranges specified');
      }

      const splitResults = await split(fileData, { pageRanges });
      setResults(splitResults);
    } catch (err) {
      console.error('Error splitting PDF:', err);
    }
  }, [file, split, splitMode, pageRangeInput, pageCount, everyNPages]);

  const downloadSingle = useCallback((data: Uint8Array, index: number) => {
    const blob = new Blob([data], { type: 'application/pdf' });
    const baseName = file?.name.replace('.pdf', '') || 'split';
    saveAs(blob, `${baseName}_part${index + 1}.pdf`);
  }, [file]);

  const downloadAll = useCallback(async () => {
    if (results.length === 0) return;

    const zip = new JSZip();
    const baseName = file?.name.replace('.pdf', '') || 'split';

    results.forEach((data, index) => {
      zip.file(`${baseName}_part${index + 1}.pdf`, data);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${baseName}_split.zip`);
  }, [results, file]);

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
                <Scissors className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              Split PDF
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
              Extract pages or split your PDF into multiple files. Fast and secure PDF splitter that works entirely in your browser.
              100% private - no file uploads required.
            </p>
            
            {/* Tool Features */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">No file size limits</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Split by pages or ranges</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Download as ZIP</span>
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

            {/* Split Options */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="font-medium">Split Options</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSplitMode('range')}
                  className={`p-3 rounded-lg border-2 ff-transition ${
                    splitMode === 'range' 
                      ? 'border-primary bg-primary/[0.05]' 
                      : 'border-border hover:border-primary/[0.3]'
                  }`}
                >
                  <div className="font-medium">Custom ranges</div>
                  <div className="text-xs text-muted-foreground mt-1">Split by page numbers</div>
                </button>
                <button
                  onClick={() => setSplitMode('every')}
                  className={`p-3 rounded-lg border-2 ff-transition ${
                    splitMode === 'every' 
                      ? 'border-primary bg-primary/[0.05]' 
                      : 'border-border hover:border-primary/[0.3]'
                  }`}
                >
                  <div className="font-medium">Fixed interval</div>
                  <div className="text-xs text-muted-foreground mt-1">Split every N pages</div>
                </button>
              </div>

              {splitMode === 'range' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="page-ranges">
                    Page ranges
                  </label>
                  <Input
                    id="page-ranges"
                    type="text"
                    placeholder="e.g., 1-3, 5, 7-10"
                    value={pageRangeInput}
                    onChange={(e) => setPageRangeInput(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter page numbers or ranges separated by commas. Example: 1-3, 5, 7-10
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="every-n-pages">
                    Split interval
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="every-n-pages"
                      type="number"
                      min="1"
                      max={pageCount}
                      value={everyNPages}
                      onChange={(e) => setEveryNPages(parseInt(e.target.value) || 1)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">pages per file</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Split PDF into files with {everyNPages} page{everyNPages > 1 ? 's' : ''} each
                  </p>
                </div>
              )}
            </div>

            {/* Action Button */}
            <Button
              onClick={handleSplit}
              disabled={isProcessing || !file}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Splitting PDF...
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4 mr-2" />
                  Split PDF
                </>
              )}
            </Button>
          </div>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="bg-card border rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing PDF...</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error.message}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Successfully split into {results.length} files</span>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Split Results</h3>
                <Button
                  onClick={downloadAll}
                  variant="default"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All ({results.length} files)
                </Button>
              </div>
              
              <div className="space-y-2">
                {results.map((data, index) => {
                  const sizeKB = Math.round(data.length / 1024);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-secondary/[0.3] rounded-lg hover:bg-secondary/[0.5] ff-transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-tool-pdf/[0.1] text-tool-pdf rounded">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-medium">Part {index + 1}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {formatFileSize(data.length)}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => downloadSingle(data, index)}
                        size="sm"
                        variant="ghost"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfSplit;