import React, { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { usePdfOperations } from '../../hooks/usePdfOperations';
import { 
  Layers, Download, FileText, AlertCircle, Upload, FileUp,
  FileCheck, CheckCircle, Loader2, X, GripVertical, Eye,
  EyeOff, Plus, FileStack, ChevronUp, ChevronDown, Info
} from 'lucide-react';
import FileSaver from 'file-saver';
import { DropZone } from '../ui/drop-zone';
import { PdfPreview } from '../ui/pdf-preview';
import { ProgressIndicator, MultiStepProgress } from '../ui/progress-indicator';
const { saveAs } = FileSaver;

interface FileWithPreview {
  file: File;
  id: string;
  pageCount?: number;
  data?: Uint8Array;
  showPreview?: boolean;
  previewKey?: number;
}

export const PdfMerge: React.FC = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [mergedResult, setMergedResult] = useState<Uint8Array | null>(null);
  const [draggedFile, setDraggedFile] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showGlobalPreview, setShowGlobalPreview] = useState(false);
  const [globalPreviewKey, setGlobalPreviewKey] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { merge, getPageCount, getMetadata, isProcessing, progress, error } = usePdfOperations();

  const handleFileSelect = useCallback(async (selectedFiles: FileList) => {
    const newFiles: FileWithPreview[] = [];
    
    // Set processing steps for visual feedback
    setProcessingSteps([
      { id: 'read', label: `Reading ${selectedFiles.length} file(s)`, status: 'processing' }
    ]);
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (file.type === 'application/pdf') {
        try {
          const fileData = new Uint8Array(await file.arrayBuffer());
          const pageCount = await getPageCount(fileData);
          newFiles.push({
            file,
            id: `${Date.now()}-${i}`,
            pageCount,
            data: fileData,
            showPreview: false
          });
        } catch (err) {
          console.error('Error reading PDF:', err);
          newFiles.push({
            file,
            id: `${Date.now()}-${i}`,
            pageCount: undefined,
            showPreview: false
          });
        }
      }
    }
    
    setFiles(prev => [...prev, ...newFiles]);
    setMergedResult(null);
    setProcessingSteps([]);
  }, [getPageCount]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      handleFileSelect(selectedFiles);
    }
  }, [handleFileSelect]);

  const toggleFilePreview = useCallback((id: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { 
        ...f, 
        showPreview: !f.showPreview,
        previewKey: (f.previewKey || 0) + 1
      } : f
    ));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setMergedResult(null);
  }, []);

  // Drag and drop reordering
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedFile(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOverFile = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDropFile = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedFile === null) return;
    
    const draggedIndex = files.findIndex(f => f.id === draggedFile);
    if (draggedIndex === -1) return;
    
    const newFiles = [...files];
    const [removed] = newFiles.splice(draggedIndex, 1);
    newFiles.splice(dropIndex, 0, removed);
    
    setFiles(newFiles);
    setDraggedFile(null);
    setDragOverIndex(null);
    setMergedResult(null);
  }, [files, draggedFile]);

  const moveFile = useCallback((index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= files.length) return;
    
    [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
    setFiles(newFiles);
    setMergedResult(null);
  }, [files]);

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return;

    try {
      // Set up processing steps for visual feedback
      setProcessingSteps([
        { id: 'prepare', label: 'Preparing files', status: 'processing' },
        { id: 'merge', label: `Merging ${files.length} PDFs`, status: 'pending' },
        { id: 'finalize', label: 'Creating final document', status: 'pending' }
      ]);

      // Use existing data if available, otherwise load it
      const fileDataArray = await Promise.all(
        files.map(async (f) => f.data || new Uint8Array(await f.file.arrayBuffer()))
      );
      
      setProcessingSteps(prev => prev.map(step => ({
        ...step,
        status: step.id === 'prepare' ? 'completed' : step.id === 'merge' ? 'processing' : step.status
      })));
      
      const merged = await merge({ files: fileDataArray });
      
      setProcessingSteps(prev => prev.map(step => ({
        ...step,
        status: step.id === 'finalize' ? 'processing' : step.status === 'pending' ? 'completed' : step.status
      })));
      
      setMergedResult(merged);
      
      setProcessingSteps(prev => prev.map(step => ({
        ...step,
        status: 'completed'
      })));
    } catch (err) {
      console.error('Error merging PDFs:', err);
      setProcessingSteps(prev => prev.map((step, idx) => ({
        ...step,
        status: idx === 0 ? 'error' : 'pending'
      })));
    }
  }, [files, merge]);

  const downloadMerged = useCallback(() => {
    if (!mergedResult) return;
    
    const blob = new Blob([mergedResult], { type: 'application/pdf' });
    const fileName = files.length > 0 
      ? `merged_${files[0].file.name.replace('.pdf', '')}_and_${files.length - 1}_more.pdf`
      : 'merged.pdf';
    saveAs(blob, fileName);
  }, [mergedResult, files]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Tool Header */}
      <div className="border-b bg-card/[0.5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-tool-pdf/[0.1] text-tool-pdf rounded-lg">
                <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              Merge PDF Files
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
              Combine multiple PDF files into one document. Preview pages, drag to reorder, and merge with confidence.
              100% private - all processing happens in your browser.
            </p>
            
            {/* Tool Features */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Page preview</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Drag to reorder</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Batch processing</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Drop Zone */}
        {files.length === 0 && (
          <DropZone
            onDrop={handleFileSelect}
            accept=".pdf,application/pdf"
            multiple={true}
            maxSize={100 * 1024 * 1024} // 100MB per file
            className="h-64"
          />
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-6">
            {/* File Management Card */}
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">Files to merge</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {files.length} files • {totalPages} total pages
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowGlobalPreview(!showGlobalPreview);
                      setGlobalPreviewKey(prev => prev + 1);
                      // Update preview keys for all files
                      setFiles(prev => prev.map(f => ({ 
                        ...f, 
                        previewKey: (f.previewKey || 0) + 1
                      })));
                    }}
                  >
                    {showGlobalPreview ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide All Previews
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Show All Previews
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add more
                  </Button>
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              
              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Drag files to reorder them. Click the eye icon to preview pages from each PDF.
                    The final merged PDF will preserve all formatting and quality.
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {files.map((fileInfo, index) => (
                  <div key={fileInfo.id} className="space-y-2">
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, fileInfo.id)}
                      onDragOver={(e) => handleDragOverFile(e, index)}
                      onDrop={(e) => handleDropFile(e, index)}
                      onDragEnd={() => {
                        setDragOverIndex(null);
                        setDraggedFile(null);
                      }}
                      className={`flex items-center gap-3 p-3 bg-secondary/[0.3] rounded-lg cursor-move ff-transition ${
                        dragOverIndex === index ? 'ring-2 ring-primary scale-[1.02]' : ''
                      } ${draggedFile === fileInfo.id ? 'opacity-50' : ''} hover:bg-secondary/[0.5]`}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      
                      <div className="p-1.5 bg-tool-pdf/[0.1] text-tool-pdf rounded">
                        <FileText className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{fileInfo.file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {fileInfo.pageCount ? `${fileInfo.pageCount} pages • ` : ''}
                          {formatFileSize(fileInfo.file.size)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFilePreview(fileInfo.id);
                          }}
                        >
                          {fileInfo.showPreview || showGlobalPreview ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveFile(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveFile(index, 'down')}
                          disabled={index === files.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFile(fileInfo.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Individual File Preview */}
                    {(fileInfo.showPreview || showGlobalPreview) && fileInfo.data && (
                      <div className="ml-8 mt-4">
                        <PdfPreview
                          key={`pdf-preview-${fileInfo.id}-${fileInfo.previewKey || 0}`}
                          pdfData={new Uint8Array(fileInfo.data)}
                          mode="strip"
                          showPageNumbers={true}
                          maxHeight={200}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Merge Options */}
            {files.length > 2 && (
              <div className="bg-card border rounded-lg p-6">
                <h3 className="font-medium mb-3">Merge order summary</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {files.map((file, index) => (
                    <React.Fragment key={file.id}>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/[0.5] rounded-full text-sm">
                        <FileStack className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{file.file.name}</span>
                        <span className="text-xs text-muted-foreground">({file.pageCount || '?'} pages)</span>
                      </div>
                      {index < files.length - 1 && (
                        <span className="text-muted-foreground">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={handleMerge}
              disabled={isProcessing || files.length < 2}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Merging PDFs...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  Merge {files.length} PDFs into one
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
              message="Merging your PDFs..."
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
        {mergedResult && (
          <div className="space-y-4 mt-6">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">PDFs merged successfully!</span>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-tool-pdf/[0.1] text-tool-pdf rounded">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Merged PDF</h3>
                    <p className="text-sm text-muted-foreground">
                      {files.length} files combined • {formatFileSize(mergedResult.length)}
                    </p>
                  </div>
                </div>
                <Button onClick={downloadMerged}>
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

export default PdfMerge;