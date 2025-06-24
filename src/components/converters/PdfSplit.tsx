import React, { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { usePdfOperations } from '../../hooks/usePdfOperations';
import { parsePageRanges, formatPageRanges } from '../../lib/pdf-operations';
import { 
  Scissors, Download, FileText, AlertCircle, Eye, Package,
  CheckCircle, Loader2, Info, Zap, FileOutput, Split
} from 'lucide-react';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { DropZone } from '../ui/drop-zone';
import { PdfPreview } from '../ui/pdf-preview';
import { ProgressIndicator, MultiStepProgress } from '../ui/progress-indicator';
const { saveAs } = FileSaver;

interface SplitPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  getRanges: (pageCount: number) => Array<{ start: number; end: number }>;
}

const SPLIT_PRESETS: SplitPreset[] = [
  {
    id: 'individual',
    name: 'Individual Pages',
    description: 'Split into separate files for each page',
    icon: <FileOutput className="w-4 h-4" />,
    getRanges: (pageCount) => Array.from({ length: pageCount }, (_, i) => ({ start: i + 1, end: i + 1 }))
  },
  {
    id: 'halves',
    name: 'Split in Half',
    description: 'Divide the PDF into two equal parts',
    icon: <Scissors className="w-4 h-4" />,
    getRanges: (pageCount) => {
      const mid = Math.ceil(pageCount / 2);
      return [
        { start: 1, end: mid },
        { start: mid + 1, end: pageCount }
      ];
    }
  },
  {
    id: 'thirds',
    name: 'Split in Thirds',
    description: 'Divide into three equal parts',
    icon: <FileOutput className="w-4 h-4" />,
    getRanges: (pageCount) => {
      const third = Math.ceil(pageCount / 3);
      return [
        { start: 1, end: third },
        { start: third + 1, end: third * 2 },
        { start: third * 2 + 1, end: pageCount }
      ];
    }
  }
];

export const PdfSplit: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [metadata, setMetadata] = useState<any>(null);
  const [splitMode, setSplitMode] = useState<'preset' | 'visual' | 'manual'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<string>('individual');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageRangeInput, setPageRangeInput] = useState<string>('');
  const [results, setResults] = useState<Uint8Array[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<any[]>([]);
  
  const { split, getPageCount, getMetadata, isProcessing, progress, error } = usePdfOperations();

  const handleFileSelect = useCallback(async (files: FileList) => {
    const selectedFile = files[0];
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;

    setFile(selectedFile);
    setResults([]);
    setSelectedPages([]);
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      setFileData(data);
      
      const count = await getPageCount(data);
      const meta = await getMetadata(data);
      setPageCount(count);
      setMetadata(meta);
      
      // Set default range to all pages
      setPageRangeInput(`1-${count}`);
      
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
      setPageRangeInput(ranges.join(', '));
    }
  }, []);

  const getPageRanges = useCallback((): Array<{ start: number; end: number }> => {
    if (splitMode === 'preset') {
      const preset = SPLIT_PRESETS.find(p => p.id === selectedPreset);
      return preset ? preset.getRanges(pageCount) : [];
    } else if (splitMode === 'visual') {
      // Convert selected pages to ranges
      if (selectedPages.length === 0) return [];
      
      const sorted = [...selectedPages].sort((a, b) => a - b);
      const ranges = [];
      let start = sorted[0];
      let end = sorted[0];
      
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === end + 1) {
          end = sorted[i];
        } else {
          ranges.push({ start, end });
          start = sorted[i];
          end = sorted[i];
        }
      }
      ranges.push({ start, end });
      return ranges;
    } else {
      return parsePageRanges(pageRangeInput, pageCount);
    }
  }, [splitMode, selectedPreset, selectedPages, pageRangeInput, pageCount]);

  const handleSplit = useCallback(async () => {
    if (!file || !fileData) return;

    try {
      const pageRanges = getPageRanges();
      
      if (pageRanges.length === 0) {
        throw new Error('No valid page ranges specified');
      }

      // Set up processing steps for visual feedback
      setProcessingSteps([
        { id: 'prepare', label: 'Preparing PDF', status: 'processing' },
        { id: 'split', label: `Splitting into ${pageRanges.length} parts`, status: 'pending' },
        { id: 'finalize', label: 'Finalizing files', status: 'pending' }
      ]);

      // Create a copy to avoid ArrayBuffer issues
      const splitData = new Uint8Array(fileData);
      const splitResults = await split(splitData, { pageRanges });
      
      setProcessingSteps(prev => prev.map(step => ({
        ...step,
        status: step.id === 'prepare' ? 'completed' : step.id === 'split' ? 'processing' : step.status
      })));
      
      setResults(splitResults);
      
      setProcessingSteps(prev => prev.map(step => ({
        ...step,
        status: 'completed'
      })));
    } catch (err) {
      console.error('Error splitting PDF:', err);
      setProcessingSteps(prev => prev.map((step, idx) => ({
        ...step,
        status: idx === 0 ? 'error' : 'pending'
      })));
    }
  }, [file, fileData, split, getPageRanges]);

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
    <div className="bg-background">
      {/* Tool Header - Mobile optimized */}
      <div className="border-b bg-card/[0.5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-tool-pdf/[0.1] text-tool-pdf rounded-lg flex-shrink-0">
                <Scissors className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
              <span>Split PDF</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
              Extract pages or split your PDF into multiple files. Use presets for quick splitting or select pages visually.
              100% private - no file uploads required.
            </p>
            
            {/* Tool Features - Mobile optimized */}
            <div className="mt-4 grid grid-cols-1 sm:flex sm:flex-wrap gap-3 sm:gap-x-6 sm:gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                <span className="font-medium">Visual page selection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                <span className="font-medium">Smart presets</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                <span className="font-medium">Batch download</span>
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
            {/* File Info Card - Mobile optimized */}
            <div className="bg-card border rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-tool-pdf/[0.1] text-tool-pdf rounded flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm sm:text-base truncate">{file.name}</h3>
                    <div className="mt-0.5 sm:mt-1 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span>{pageCount} pages</span>
                      <span>{formatFileSize(file.size)}</span>
                      {metadata?.title && (
                        <span className="hidden sm:inline">Title: {metadata.title}</span>
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
                    setResults([]);
                    setPageCount(0);
                    setMetadata(null);
                    setShowPreview(false);
                  }}
                  className="self-end sm:self-auto text-xs sm:text-sm"
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
                mode={splitMode === 'visual' ? 'grid' : 'strip'}
                selectable={splitMode === 'visual'}
                selectedPages={selectedPages}
                onPageSelect={handlePageSelect}
                maxHeight={500}
                className="mb-6"
              />
            )}

            {/* Split Options */}
            <div className="bg-card border rounded-lg p-6 space-y-6">
              <h3 className="font-medium">How would you like to split?</h3>
              
              {/* Mode Selection - Mobile optimized */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <button
                  onClick={() => setSplitMode('preset')}
                  className={`p-3 sm:p-4 rounded-lg border-2 text-left ff-transition ${
                    splitMode === 'preset' 
                      ? 'border-primary bg-primary/[0.05]' 
                      : 'border-border hover:border-primary/[0.3]'
                  }`}
                >
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary mb-1.5 sm:mb-2" />
                  <div className="font-medium text-sm sm:text-base">Quick Presets</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Use common split patterns</div>
                </button>
                
                <button
                  onClick={() => setSplitMode('visual')}
                  className={`p-3 sm:p-4 rounded-lg border-2 text-left ff-transition ${
                    splitMode === 'visual' 
                      ? 'border-primary bg-primary/[0.05]' 
                      : 'border-border hover:border-primary/[0.3]'
                  }`}
                >
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-primary mb-1.5 sm:mb-2" />
                  <div className="font-medium text-sm sm:text-base">Visual Selection</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Click pages to select</div>
                </button>
                
                <button
                  onClick={() => setSplitMode('manual')}
                  className={`p-3 sm:p-4 rounded-lg border-2 text-left ff-transition ${
                    splitMode === 'manual' 
                      ? 'border-primary bg-primary/[0.05]' 
                      : 'border-border hover:border-primary/[0.3]'
                  }`}
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary mb-1.5 sm:mb-2" />
                  <div className="font-medium text-sm sm:text-base">Manual Ranges</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Enter page numbers</div>
                </button>
              </div>

              {/* Preset Options */}
              {splitMode === 'preset' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Choose a preset:</p>
                  <div className="grid gap-2">
                    {SPLIT_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border ff-transition ${
                          selectedPreset === preset.id
                            ? 'border-primary bg-primary/[0.05]'
                            : 'border-border hover:border-primary/[0.3]'
                        }`}
                      >
                        <div className="p-2 bg-secondary rounded">
                          {preset.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{preset.name}</div>
                          <div className="text-xs text-muted-foreground">{preset.description}</div>
                        </div>
                        {selectedPreset === preset.id && (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Preview of split */}
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-2">This will create:</p>
                    <div className="space-y-1">
                      {SPLIT_PRESETS.find(p => p.id === selectedPreset)?.getRanges(pageCount).map((range, idx) => (
                        <div key={idx} className="text-sm">
                          • Part {idx + 1}: Pages {range.start}-{range.end}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Selection Info - Mobile optimized */}
              {splitMode === 'visual' && (
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                        <span className="hidden sm:inline">Click on pages to select them. Selected pages will be extracted as separate files. Use the enlarge button on each page for full-screen view.</span>
                        <span className="sm:hidden">Tap pages to select them. Selected pages will be extracted as separate files.</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedPages.length > 0 && (
                    <div className="text-xs sm:text-sm">
                      Selected pages: {selectedPages.sort((a, b) => a - b).join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Manual Range Input */}
              {splitMode === 'manual' && (
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
              )}
            </div>

            {/* Action Button - Mobile optimized */}
            <Button
              onClick={handleSplit}
              disabled={isProcessing || !file || (splitMode === 'visual' && selectedPages.length === 0)}
              size="default"
              className="w-full h-11 text-sm sm:text-base"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                  Splitting PDF...
                </>
              ) : (
                <>
                  <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Split PDF
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
              message="Splitting your PDF..."
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

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Successfully split into {results.length} files</span>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="font-medium text-base sm:text-lg">Split Results</h3>
                <Button
                  onClick={downloadAll}
                  variant="default"
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Download All as ZIP
                </Button>
              </div>
              
              <div className="grid gap-2">
                {results.map((data, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 sm:p-3 bg-secondary/[0.3] rounded-lg hover:bg-secondary/[0.5] ff-transition group"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-1 sm:p-1.5 bg-tool-pdf/[0.1] text-tool-pdf rounded flex-shrink-0">
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <div>
                        <span className="font-medium text-sm sm:text-base">Part {index + 1}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground ml-1.5 sm:ml-2">
                          {formatFileSize(data.length)}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => downloadSingle(data, index)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 ff-transition"
                    >
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        
        {/* Features - Mobile optimized */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-lg border">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
            <h3 className="font-semibold text-sm sm:text-base mb-1">Visual Selection</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Preview pages and select exactly which ones to extract
            </p>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border">
            <Split className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
            <h3 className="font-semibold text-sm sm:text-base mb-1">Smart Presets</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Quick options for odd/even pages and custom ranges
            </p>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border">
            <Download className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
            <h3 className="font-semibold text-sm sm:text-base mb-1">Batch Download</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Download all extracted pages as a ZIP or individually
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfSplit;