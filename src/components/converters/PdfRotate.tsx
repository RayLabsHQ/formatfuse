import React, { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { usePdfOperations } from '../../hooks/usePdfOperations';
import { 
  RotateCw, Download, FileText, AlertCircle, Upload, FileUp,
  FileCheck, CheckCircle, Loader2
} from 'lucide-react';
import FileSaver from 'file-saver';
const { saveAs } = FileSaver;

export const PdfRotate: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [metadata, setMetadata] = useState<any>(null);
  const [rotatedResult, setRotatedResult] = useState<Uint8Array | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedRotation, setSelectedRotation] = useState<90 | 180 | 270>(90);
  const [rotateAll, setRotateAll] = useState(true);
  const [specificPages, setSpecificPages] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { rotate, getPageCount, getMetadata, isProcessing, progress, error } = usePdfOperations();

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;

    setFile(selectedFile);
    setRotatedResult(null);
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

  const handleRotate = useCallback(async () => {
    if (!file) return;

    try {
      const fileData = new Uint8Array(await file.arrayBuffer());
      
      const rotated = await rotate(fileData, {
        angle: selectedRotation,
        pages: rotateAll ? 'all' : specificPages
      });
      
      setRotatedResult(rotated);
    } catch (err) {
      console.error('Error rotating PDF:', err);
    }
  }, [file, rotate, selectedRotation, rotateAll, specificPages]);

  const downloadRotated = useCallback(() => {
    if (!rotatedResult) return;
    
    const blob = new Blob([rotatedResult], { type: 'application/pdf' });
    const fileName = file?.name.replace('.pdf', '') || 'rotated';
    saveAs(blob, `${fileName}_rotated_${selectedRotation}deg.pdf`);
  }, [rotatedResult, file, selectedRotation]);

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
                <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              Rotate PDF
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
              Rotate PDF pages or entire documents. Choose 90°, 180°, or 270° rotation.
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
                <span className="font-medium">Rotate all or specific pages</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Instant preview</span>
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
                    setRotatedResult(null);
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

            {/* Rotation Options */}
            <div className="bg-card border rounded-lg p-6 space-y-6">
              <h3 className="font-medium">Rotation Options</h3>
              
              {/* Rotation Angle Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Rotation angle</label>
                <div className="grid grid-cols-3 gap-3">
                  {([90, 180, 270] as const).map((angle) => (
                    <button
                      key={angle}
                      onClick={() => setSelectedRotation(angle)}
                      className={`p-4 rounded-lg border-2 ff-transition ${
                        selectedRotation === angle 
                          ? 'border-primary bg-primary/[0.05]' 
                          : 'border-border hover:border-primary/[0.3]'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                          <RotateCw 
                            className="w-6 h-6" 
                            style={{ transform: `rotate(${angle}deg)` }}
                          />
                        </div>
                        <span className="font-medium">{angle}°</span>
                        <span className="text-xs text-muted-foreground">
                          {angle === 90 && 'Clockwise'}
                          {angle === 180 && 'Upside down'}
                          {angle === 270 && 'Counter-clockwise'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Pages to rotate</label>
                <div className="space-y-3">
                  <button
                    onClick={() => setRotateAll(true)}
                    className={`w-full p-3 rounded-lg border-2 text-left ff-transition ${
                      rotateAll 
                        ? 'border-primary bg-primary/[0.05]' 
                        : 'border-border hover:border-primary/[0.3]'
                    }`}
                  >
                    <div className="font-medium">All pages</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Rotate every page in the document
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setRotateAll(false)}
                    className={`w-full p-3 rounded-lg border-2 text-left ff-transition ${
                      !rotateAll 
                        ? 'border-primary bg-primary/[0.05]' 
                        : 'border-border hover:border-primary/[0.3]'
                    }`}
                  >
                    <div className="font-medium">Specific pages</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Choose which pages to rotate
                    </div>
                  </button>
                  
                  {!rotateAll && (
                    <div className="pl-3">
                      <input
                        type="text"
                        placeholder="e.g., 1-3, 5, 7-10"
                        value={specificPages}
                        onChange={(e) => setSpecificPages(e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter page numbers or ranges separated by commas
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleRotate}
              disabled={isProcessing || !file}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rotating PDF...
                </>
              ) : (
                <>
                  <RotateCw className="w-4 h-4 mr-2" />
                  Rotate PDF
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
                <span>Rotating pages...</span>
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

        {/* Result */}
        {rotatedResult && (
          <div className="space-y-4 mt-6">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">PDF rotated successfully!</span>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-tool-pdf/[0.1] text-tool-pdf rounded">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Rotated PDF</h3>
                    <p className="text-sm text-muted-foreground">
                      {rotateAll ? 'All pages' : specificPages} rotated {selectedRotation}° • {formatFileSize(rotatedResult.length)}
                    </p>
                  </div>
                </div>
                <Button onClick={downloadRotated}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfRotate;