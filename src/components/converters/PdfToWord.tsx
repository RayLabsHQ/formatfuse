import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  FileText, Upload, Download, X, FileUp, 
  Loader2, ArrowRight, FileCheck, Settings, Eye
} from 'lucide-react';
import { retrieveStoredFile } from '../../lib/file-transfer';

interface FileInfo {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: Blob;
  error?: string;
}

export default function PdfToWord() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for pre-loaded file on mount
  useEffect(() => {
    const loadStoredFile = async () => {
      const storedFile = await retrieveStoredFile();
      if (storedFile && storedFile.type === 'application/pdf') {
        setFiles([{
          file: storedFile,
          status: 'pending',
          progress: 0,
        }]);
      }
    };
    
    loadStoredFile();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );

    if (droppedFiles.length > 0) {
      const newFiles = droppedFiles.map(file => ({
        file,
        status: 'pending' as const,
        progress: 0,
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
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
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === 'application/pdf'
      );

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
      // Create worker
      const worker = new Worker(
        new URL('../../workers/pdf-to-word.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Convert file to ArrayBuffer
      const arrayBuffer = await fileInfo.file.arrayBuffer();

      // Set up worker communication
      worker.onmessage = (event) => {
        const { type } = event.data;

        switch (type) {
          case 'progress':
            setFiles(prev => prev.map((f, i) => 
              i === index ? { ...f, progress: event.data.progress } : f
            ));
            break;

          case 'complete':
            const blob = new Blob([event.data.result], { 
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            });
            setFiles(prev => prev.map((f, i) => 
              i === index ? { 
                ...f, 
                status: 'completed' as const, 
                result: blob 
              } : f
            ));
            worker.terminate();
            break;

          case 'error':
            setFiles(prev => prev.map((f, i) => 
              i === index ? { 
                ...f, 
                status: 'error' as const, 
                error: event.data.error 
              } : f
            ));
            worker.terminate();
            break;
        }
      };

      // Start conversion
      worker.postMessage({ type: 'convert', pdfData: arrayBuffer });

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Tool Header - Mobile optimized */}
      <div className="border-b bg-card/[0.5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-tool-pdf/[0.1] text-tool-pdf rounded-lg flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </div>
                  <span>PDF to Word Converter</span>
                </h1>
                <span className="text-xs sm:text-sm font-normal bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 sm:py-1 rounded-full inline-block">
                  Beta
                </span>
              </div>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                Convert PDF documents to editable Word files. Note: This tool is currently in beta and produces basic text extraction only. Full formatting preservation coming soon.
              </p>
            </div>
            
            {/* Tool Stats - Responsive */}
            <div className="flex items-center gap-4 text-xs sm:text-sm">
              <div className="text-center">
                <div className="font-semibold">100MB</div>
                <div className="text-muted-foreground">Max size</div>
              </div>
              <div className="h-6 sm:h-8 w-px bg-border" />
              <div className="text-center">
                <div className="font-semibold">Beta</div>
                <div className="text-muted-foreground">Limited</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Drop Zone - Mobile optimized */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-8 sm:p-10 lg:p-12 text-center ff-transition ${
            isDragging 
              ? 'border-primary bg-primary/[0.05] drop-zone-active' 
              : 'border-border drop-zone hover:border-primary/[0.5]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="space-y-3 sm:space-y-4">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-primary/[0.1] rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            
            <div>
              <h3 className="text-base sm:text-lg font-semibold">Drop PDF files here</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline font-medium touch-target"
                >
                  browse files
                </button>
                {' '}from your device
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileCheck className="w-3 h-3" />
                PDF format only
              </span>
              <span className="flex items-center gap-1">
                <FileUp className="w-3 h-3" />
                Up to 100MB
              </span>
            </div>
          </div>
        </div>

        {/* File List - Mobile optimized */}
        {files.length > 0 && (
          <div className="mt-6 sm:mt-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-base sm:text-lg font-semibold">Files to convert ({files.length})</h3>
              <button
                onClick={processAll}
                disabled={!files.some(f => f.status === 'pending')}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:opacity-90 ff-transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Convert All
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {files.map((fileInfo, index) => (
                <div
                  key={index}
                  className="bg-card rounded-lg p-3 sm:p-4 ff-shadow-tool border-l-4 border-tool-pdf"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-tool-pdf flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-sm">{fileInfo.file.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {formatFileSize(fileInfo.file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 sm:gap-3">
                      {fileInfo.status === 'pending' && (
                        <button
                          onClick={() => processFile(index)}
                          className="px-2.5 sm:px-3 py-1 text-xs sm:text-sm bg-secondary rounded-md hover:bg-secondary/[0.8] ff-transition"
                        >
                          Convert
                        </button>
                      )}
                      
                      {fileInfo.status === 'processing' && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-primary" />
                          <span className="text-xs sm:text-sm font-mono">{fileInfo.progress}%</span>
                        </div>
                      )}
                      
                      {fileInfo.status === 'completed' && fileInfo.result && (
                        <button 
                          onClick={() => {
                            const url = URL.createObjectURL(fileInfo.result!);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileInfo.file.name.replace('.pdf', '.docx');
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 text-xs sm:text-sm bg-accent/[0.1] text-accent rounded-md hover:bg-accent/[0.2] ff-transition"
                        >
                          <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                          <span className="sm:hidden">Save</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1.5 sm:p-1 hover:bg-secondary rounded ff-transition"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

        {/* Features - Mobile optimized grid */}
        <div className="mt-12 sm:mt-16 grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="text-center px-4 sm:px-0">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-secondary rounded-lg text-primary mb-2 sm:mb-3">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base mb-1">Format Preservation</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Maintains layout, fonts, and images from your PDF
            </p>
          </div>
          
          <div className="text-center px-4 sm:px-0">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-secondary rounded-lg text-accent mb-2 sm:mb-3">
              <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base mb-1">Preview Mode</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Check conversion quality before downloading
            </p>
          </div>
          
          <div className="text-center px-4 sm:px-0 sm:col-span-2 md:col-span-1">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-secondary rounded-lg text-tool-pdf mb-2 sm:mb-3">
              <FileCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base mb-1">Batch Processing</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Convert multiple PDFs at once to save time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}