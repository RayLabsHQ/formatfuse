import React, { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Image, Download, FileText, AlertCircle, Upload, FileUp,
  FileCheck, CheckCircle, Loader2, X, GripVertical, Plus
} from 'lucide-react';
import FileSaver from 'file-saver';
const { saveAs } = FileSaver;

interface ImageWithPreview {
  file: File;
  id: string;
  preview: string;
}

interface WorkerMessage {
  type: 'convert';
  images: Array<{ data: ArrayBuffer; name: string }>;
}

interface ResponseMessage {
  type: 'progress' | 'complete' | 'error';
  progress?: number;
  result?: ArrayBuffer;
  error?: string;
}

export const JpgToPdf: React.FC = () => {
  const [images, setImages] = useState<ImageWithPreview[]>([]);
  const [pdfResult, setPdfResult] = useState<ArrayBuffer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  React.useEffect(() => {
    workerRef.current = new Worker(
      new URL('../../workers/jpg-to-pdf.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.addEventListener('message', (event: MessageEvent<ResponseMessage>) => {
      const { type } = event.data;
      
      if (type === 'progress' && event.data.progress !== undefined) {
        setProgress(event.data.progress);
      } else if (type === 'complete' && event.data.result) {
        setPdfResult(event.data.result);
        setIsProcessing(false);
      } else if (type === 'error') {
        setError(new Error(event.data.error || 'Conversion failed'));
        setIsProcessing(false);
      }
    });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleFileSelect = useCallback(async (selectedFiles: FileList) => {
    const newImages: ImageWithPreview[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newImages.push({
          file,
          id: `${Date.now()}-${i}`,
          preview
        });
      }
    }
    
    setImages(prev => [...prev, ...newImages]);
    setPdfResult(null);
    setError(null);
  }, []);

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

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== id);
    });
    setPdfResult(null);
  }, []);

  // Drag and drop reordering
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedImage(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOverImage = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDropImage = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedImage === null) return;
    
    const draggedIndex = images.findIndex(img => img.id === draggedImage);
    if (draggedIndex === -1) return;
    
    const newImages = [...images];
    const [removed] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, removed);
    
    setImages(newImages);
    setDraggedImage(null);
    setDragOverIndex(null);
    setPdfResult(null);
  }, [images, draggedImage]);

  const handleConvert = useCallback(async () => {
    if (images.length === 0 || !workerRef.current) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const imageDataArray = await Promise.all(
        images.map(async (img) => ({
          data: await img.file.arrayBuffer(),
          name: img.file.name
        }))
      );

      const message: WorkerMessage = {
        type: 'convert',
        images: imageDataArray
      };

      workerRef.current.postMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Conversion failed'));
      setIsProcessing(false);
    }
  }, [images]);

  const downloadPdf = useCallback(() => {
    if (!pdfResult) return;
    
    const blob = new Blob([pdfResult], { type: 'application/pdf' });
    const fileName = images.length === 1 
      ? `${images[0].file.name.replace(/\.[^/.]+$/, '')}.pdf`
      : `images_to_pdf_${new Date().getTime()}.pdf`;
    saveAs(blob, fileName);
  }, [pdfResult, images]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  return (
    <div className="min-h-screen bg-background">
      {/* Tool Header */}
      <div className="border-b bg-card/[0.5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-tool-jpg/[0.1] text-tool-jpg rounded-lg">
                <Image className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              JPG to PDF Converter
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
              Convert JPG, PNG, and other image formats to PDF. Combine multiple images into a single PDF document.
              100% private - all processing happens in your browser.
            </p>
            
            {/* Tool Features */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Multiple images</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Drag to reorder</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="font-medium">Preserves quality</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Drop Zone */}
        {images.length === 0 && (
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
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/[0.1] rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">Drop images here</h3>
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
                  JPG, PNG, GIF, BMP
                </span>
                <span className="flex items-center gap-1">
                  <FileUp className="w-3 h-3" />
                  Multiple files
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Image List */}
        {images.length > 0 && (
          <div className="space-y-6">
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">Images to convert</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {images.length} image{images.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add more
                </Button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((imageInfo, index) => (
                  <div
                    key={imageInfo.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, imageInfo.id)}
                    onDragOver={(e) => handleDragOverImage(e, index)}
                    onDrop={(e) => handleDropImage(e, index)}
                    onDragEnd={() => {
                      setDragOverIndex(null);
                      setDraggedImage(null);
                    }}
                    className={`relative group cursor-move ff-transition ${
                      dragOverIndex === index ? 'ring-2 ring-primary' : ''
                    } ${draggedImage === imageInfo.id ? 'opacity-50' : ''}`}
                  >
                    <div className="aspect-square bg-secondary/[0.3] rounded-lg overflow-hidden">
                      <img 
                        src={imageInfo.preview} 
                        alt={imageInfo.file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-2 left-2 p-1 bg-background/90 rounded">
                      <GripVertical className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 ff-transition"
                      onClick={() => removeImage(imageInfo.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="mt-2">
                      <p className="text-xs font-medium truncate">{imageInfo.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(imageInfo.file.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                Drag images to reorder them in the PDF
              </p>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleConvert}
              disabled={isProcessing || images.length === 0}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting to PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Convert to PDF
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
                <span>Creating PDF...</span>
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
        {pdfResult && (
          <div className="space-y-4 mt-6">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">PDF created successfully!</span>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-tool-pdf/[0.1] text-tool-pdf rounded">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Your PDF is ready</h3>
                    <p className="text-sm text-muted-foreground">
                      {images.length} image{images.length !== 1 ? 's' : ''} combined • {formatFileSize(pdfResult.byteLength)}
                    </p>
                  </div>
                </div>
                <Button onClick={downloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JpgToPdf;