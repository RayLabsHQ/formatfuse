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
      {/* Tool Header */}
      <div className="border-b bg-card/[0.5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="p-2 bg-tool-pdf/[0.1] text-tool-pdf rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                PDF to Word Converter
              </h1>
              <p className="mt-2 text-muted-foreground">
                Convert PDF documents to editable Word files. Preserves formatting and layout.
              </p>
            </div>
            
            {/* Tool Stats */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold">450k</div>
                <div className="text-muted-foreground">Monthly users</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="font-semibold">100MB</div>
                <div className="text-muted-foreground">Max file size</div>
              </div>
            </div>
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
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
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
                PDF format only
              </span>
              <span className="flex items-center gap-1">
                <FileUp className="w-3 h-3" />
                Up to 100MB
              </span>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Files to convert</h3>
              <button
                onClick={processAll}
                disabled={!files.some(f => f.status === 'pending')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 ff-transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Convert All
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {files.map((fileInfo, index) => (
                <div
                  key={index}
                  className="bg-card rounded-lg p-4 ff-shadow-tool border-l-4 border-tool-pdf"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-5 h-5 text-tool-pdf flex-shrink-0" />
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
                          <span className="text-sm font-mono">{fileInfo.progress}%</span>
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
                          className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-accent/[0.1] text-accent rounded-md hover:bg-accent/[0.2] ff-transition"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
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
            <h3 className="font-semibold mb-1">Format Preservation</h3>
            <p className="text-sm text-muted-foreground">
              Maintains layout, fonts, and images from your PDF
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary rounded-lg text-accent mb-3">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">Preview Mode</h3>
            <p className="text-sm text-muted-foreground">
              Check conversion quality before downloading
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary rounded-lg text-tool-pdf mb-3">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">Batch Processing</h3>
            <p className="text-sm text-muted-foreground">
              Convert multiple PDFs at once to save time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}