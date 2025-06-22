import React, { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { usePdfOperations } from '../../hooks/usePdfOperations';
import { parsePageRanges } from '../../lib/pdf-operations';
import { 
  RotateCw, Download, FileText, AlertCircle, Upload, FileUp,
  FileCheck, CheckCircle, Loader2, Eye, Info, RotateCcw,
  FileOutput
} from 'lucide-react';
import FileSaver from 'file-saver';
import { DropZone } from '../ui/drop-zone';
import { PdfPreview } from '../ui/pdf-preview';
import { ProgressIndicator, MultiStepProgress } from '../ui/progress-indicator';
const { saveAs } = FileSaver;

export const PdfRotate: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [metadata, setMetadata] = useState<any>(null);
  const [rotatedResult, setRotatedResult] = useState<Uint8Array | null>(null);
  const [selectedRotation, setSelectedRotation] = useState<90 | 180 | 270>(90);
  const [rotateMode, setRotateMode] = useState<'all' | 'visual' | 'manual'>('all');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [specificPages, setSpecificPages] = useState<string>('');
  const [showPreview, setShowPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { rotate, getPageCount, getMetadata, isProcessing, progress, error } = usePdfOperations();

  const handleFileSelect = useCallback(async (files: FileList) => {
    const selectedFile = files[0];
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;

    setFile(selectedFile);
    setRotatedResult(null);
    setSpecificPages('');
    setSelectedPages([]);
    
    try {
      const data = new Uint8Array(await selectedFile.arrayBuffer());
      setFileData(data);
      
      const count = await getPageCount(data);
      const meta = await getMetadata(data);
      setPageCount(count);
      setMetadata(meta);
      
      // Set default to all pages
      setSpecificPages(`1-${count}`);
      
      // Always show preview for better UX
      setShowPreview(true);
    } catch (err) {
      console.error('Error reading PDF:', err);
    }
  }, [getPageCount, getMetadata]);

  const handlePageSelect = useCallback((pages: number[]) => {
    setSelectedPages(pages);
    // Convert selected pages to ranges for manual mode
    if (pages.length > 0) {
      const ranges = [];
      let start = pages[0];
      let end = pages[0];
      
      for (let i = 1; i < pages.length; i++) {
        if (pages[i] === end + 1) {
          end = pages[i];
        } else {
          ranges.push(start === end ? `${start}` : `${start}-${end}`);
          start = pages[i];
          end = pages[i];
        }
      }
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      setSpecificPages(ranges.join(', '));
    }
  }, []);

  const getPageNumbers = useCallback((): number[] => {
    if (rotateMode === 'all') {
      return []; // Empty array means all pages
    } else if (rotateMode === 'visual') {
      return selectedPages;
    } else {
      const ranges = parsePageRanges(specificPages, pageCount);
      return ranges.flatMap(range => {
        const pages = [];
        for (let i = range.start; i <= range.end; i++) {
          pages.push(i);
        }
        return pages;
      });
    }
  }, [rotateMode, selectedPages, specificPages, pageCount]);

  const handleRotate = useCallback(async () => {
    if (!file || !fileData) return;

    try {
      // Set up processing steps for visual feedback
      setProcessingSteps([
        { id: 'prepare', label: 'Preparing PDF', status: 'processing' },
        { id: 'rotate', label: `Rotating pages`, status: 'pending' },
        { id: 'finalize', label: 'Creating rotated PDF', status: 'pending' }
      ]);
      
      const pageNumbers = getPageNumbers();
      
      setProcessingSteps(prev => prev.map(step => ({
        ...step,
        status: step.id === 'prepare' ? 'completed' : step.id === 'rotate' ? 'processing' : step.status
      })));
      
      const rotated = await rotate(fileData, {
        angle: selectedRotation,
        pages: pageNumbers
      });
      
      setProcessingSteps(prev => prev.map(step => ({
        ...step,
        status: step.id === 'finalize' ? 'processing' : step.status === 'pending' ? 'completed' : step.status
      })));
      
      setRotatedResult(rotated);
      
      setProcessingSteps(prev => prev.map(step => ({
        ...step,
        status: 'completed'
      })));
    } catch (err) {
      console.error('Error rotating PDF:', err);
      setProcessingSteps(prev => prev.map((step, idx) => ({
        ...step,
        status: idx === 0 ? 'error' : 'pending'
      })));
    }
  }, [file, fileData, rotate, selectedRotation, getPageNumbers]);

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
              Rotate PDF pages or entire documents. Preview pages visually and choose 90°, 180°, or 270° rotation.
              100% private - all processing happens in your browser.
            </p>
            
            {/* Tool Features */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Visual page selection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Rotation preview</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Batch rotation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Drop Zone */}
        {!file && (
          <DropZone
            onDrop={handleFileSelect}
            accept=".pdf,application/pdf"
            maxSize={100 * 1024 * 1024} // 100MB
            className="h-64"
          />
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
                    setFileData(null);
                    setRotatedResult(null);
                    setPageCount(0);
                    setMetadata(null);
                    setShowPreview(false);
                  }}
                >
                  Change file
                </Button>
              </div>
            </div>

            {/* PDF Preview - Show directly without card wrapper */}
            {showPreview && fileData && (
              <PdfPreview
                key={`pdf-preview-${previewKey}`}
                pdfData={new Uint8Array(fileData)}
                mode={rotateMode === 'visual' ? 'grid' : 'strip'}
                selectable={rotateMode === 'visual'}
                selectedPages={selectedPages}
                onPageSelect={handlePageSelect}
                maxHeight={500}
                className="mb-6"
              />
            )}

            {/* Rotation Options */}
            <div className="bg-card border rounded-lg p-6 space-y-6">
              <h3 className="font-medium">Rotation Options</h3>
              
              {/* Rotation Angle Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Rotation angle</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { angle: 90 as const, label: 'Clockwise', icon: RotateCw },
                    { angle: 180 as const, label: 'Upside down', icon: RotateCw },
                    { angle: 270 as const, label: 'Counter-clockwise', icon: RotateCcw }
                  ]).map(({ angle, label, icon: Icon }) => (
                    <button
                      key={angle}
                      onClick={() => setSelectedRotation(angle)}
                      className={`relative p-6 rounded-lg border-2 ff-transition ${
                        selectedRotation === angle 
                          ? 'border-primary bg-primary/[0.05] ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/[0.3]'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        {/* Visual rotation preview */}
                        <div className="relative w-16 h-16 bg-secondary rounded flex items-center justify-center">
                          <div 
                            className="w-12 h-16 bg-card border-2 border-primary/20 rounded ff-transition"
                            style={{ transform: `rotate(${angle}deg)` }}
                          >
                            <div className="h-full flex flex-col">
                              <div className="h-2 bg-primary/20 rounded-t" />
                              <div className="flex-1 p-1">
                                <div className="h-1 bg-border rounded mb-1" />
                                <div className="h-1 bg-border rounded mb-1" />
                                <div className="h-1 bg-border rounded" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{angle}°</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {label}
                          </span>
                        </div>
                      </div>
                      {selectedRotation === angle && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Which pages to rotate?</label>
                
                {/* Mode Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setRotateMode('all')}
                    className={`p-4 rounded-lg border-2 text-left ff-transition ${
                      rotateMode === 'all' 
                        ? 'border-primary bg-primary/[0.05]' 
                        : 'border-border hover:border-primary/[0.3]'
                    }`}
                  >
                    <FileOutput className="w-5 h-5 text-primary mb-2" />
                    <div className="font-medium">All Pages</div>
                    <div className="text-xs text-muted-foreground mt-1">Rotate entire document</div>
                  </button>
                  
                  <button
                    onClick={() => setRotateMode('visual')}
                    className={`p-4 rounded-lg border-2 text-left ff-transition ${
                      rotateMode === 'visual' 
                        ? 'border-primary bg-primary/[0.05]' 
                        : 'border-border hover:border-primary/[0.3]'
                    }`}
                  >
                    <Eye className="w-5 h-5 text-primary mb-2" />
                    <div className="font-medium">Visual Selection</div>
                    <div className="text-xs text-muted-foreground mt-1">Click pages to select</div>
                  </button>
                  
                  <button
                    onClick={() => setRotateMode('manual')}
                    className={`p-4 rounded-lg border-2 text-left ff-transition ${
                      rotateMode === 'manual' 
                        ? 'border-primary bg-primary/[0.05]' 
                        : 'border-border hover:border-primary/[0.3]'
                    }`}
                  >
                    <FileText className="w-5 h-5 text-primary mb-2" />
                    <div className="font-medium">Manual Ranges</div>
                    <div className="text-xs text-muted-foreground mt-1">Enter page numbers</div>
                  </button>
                </div>

                {/* Visual Selection Info */}
                {rotateMode === 'visual' && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        'Click on pages to select them for rotation. Selected pages will be rotated by the angle you choose. Use the enlarge button on each page for full-screen view.'
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Range Input */}
                {rotateMode === 'manual' && (
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

                {/* Selected Pages Summary */}
                {rotateMode !== 'all' && (selectedPages.length > 0 || specificPages) && (
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-1">Pages to rotate:</p>
                    <p className="text-sm font-mono">
                      {rotateMode === 'visual' 
                        ? selectedPages.sort((a, b) => a - b).join(', ')
                        : specificPages || 'None selected'}
                    </p>
                  </div>
                )}
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
          <div className="mt-6">
            <ProgressIndicator
              progress={progress}
              status="processing"
              message="Rotating your PDF..."
              showDetails={true}
            />
            
            {processingSteps.length > 0 && (
              <div className="mt-4">
                <MultiStepProgress
                  steps={processingSteps}
                  currentStep={processingSteps.find(s => s.status === 'processing')?.id}
                />
              </div>
            )}
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
                      {rotateMode === 'all' 
                        ? `All ${pageCount} pages` 
                        : `${getPageNumbers().length} pages`} rotated {selectedRotation}° • {formatFileSize(rotatedResult.length)}
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