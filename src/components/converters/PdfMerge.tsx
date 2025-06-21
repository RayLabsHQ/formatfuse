import React, { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { usePdfOperations } from '../../hooks/usePdfOperations';
import { 
  Layers, Download, FileText, AlertCircle, Upload, FileUp,
  FileCheck, CheckCircle, Loader2, X, GripVertical
} from 'lucide-react';
import FileSaver from 'file-saver';
const { saveAs } = FileSaver;

interface FileWithPreview {
  file: File;
  id: string;
  pageCount?: number;
}

export const PdfMerge: React.FC = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [mergedResult, setMergedResult] = useState<Uint8Array | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFile, setDraggedFile] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { merge, getPageCount, isProcessing, progress, error } = usePdfOperations();

  const handleFileSelect = useCallback(async (selectedFiles: FileList) => {
    const newFiles: FileWithPreview[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (file.type === 'application/pdf') {
        try {
          const fileData = new Uint8Array(await file.arrayBuffer());
          const pageCount = await getPageCount(fileData);
          newFiles.push({
            file,
            id: `${Date.now()}-${i}`,
            pageCount
          });
        } catch (err) {
          console.error('Error reading PDF:', err);
          newFiles.push({
            file,
            id: `${Date.now()}-${i}`,
            pageCount: undefined
          });
        }
      }
    }
    
    setFiles(prev => [...prev, ...newFiles]);
    setMergedResult(null);
  }, [getPageCount]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      handleFileSelect(selectedFiles);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles) {
      handleFileSelect(droppedFiles);
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

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return;

    try {
      const fileDataArray = await Promise.all(
        files.map(async (f) => new Uint8Array(await f.file.arrayBuffer()))
      );
      
      const merged = await merge({ files: fileDataArray });
      setMergedResult(merged);
    } catch (err) {
      console.error('Error merging PDFs:', err);
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
              Combine multiple PDF files into one document. Drag to reorder pages before merging.
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
                <span className="font-medium">Drag to reorder</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Preserve quality</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Drop Zone */}
        {files.length === 0 && (
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
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/[0.1] rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">Drop PDF files here</h3>
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
                  Multiple PDFs
                </span>
                <span className="flex items-center gap-1">
                  <FileUp className="w-3 h-3" />
                  No file size limit
                </span>
              </div>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-6">
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">Files to merge</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {files.length} files • {totalPages} total pages
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add more
                </Button>
              </div>
              
              <div className="space-y-2">
                {files.map((fileInfo, index) => (
                  <div
                    key={fileInfo.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, fileInfo.id)}
                    onDragOver={(e) => handleDragOverFile(e, index)}
                    onDrop={(e) => handleDropFile(e, index)}
                    onDragEnd={() => {
                      setDragOverIndex(null);
                      setDraggedFile(null);
                    }}
                    className={`flex items-center gap-3 p-3 bg-secondary/[0.3] rounded-lg cursor-move ff-transition ${
                      dragOverIndex === index ? 'ring-2 ring-primary' : ''
                    } ${draggedFile === fileInfo.id ? 'opacity-50' : ''}`}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div className="p-1.5 bg-tool-pdf/[0.1] text-tool-pdf rounded">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{fileInfo.file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {fileInfo.pageCount ? `${fileInfo.pageCount} pages • ` : ''}
                        {formatFileSize(fileInfo.file.size)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileInfo.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground mt-3">
                Drag files to reorder them before merging
              </p>
            </div>

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
                  Merge {files.length} PDFs
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
                <span>Merging PDFs...</span>
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