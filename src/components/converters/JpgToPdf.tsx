import React, { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Image, Download, FileText, AlertCircle, Upload, FileUp,
  FileCheck, CheckCircle, Loader2, X, GripVertical, Plus,
  ChevronUp, ChevronDown
} from 'lucide-react';
import FileSaver from 'file-saver';
import { DropZone } from '../ui/drop-zone';
import { ProgressIndicator, MultiStepProgress } from '../ui/progress-indicator';
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
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [processingSteps, setProcessingSteps] = useState<any[]>([]);
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
        setProcessingSteps(prev => prev.map(step => ({
          ...step,
          status: step.id === 'finalize' ? 'processing' : step.status === 'pending' ? 'completed' : step.status
        })));
        setPdfResult(event.data.result);
        setIsProcessing(false);
        setProcessingSteps(prev => prev.map(step => ({
          ...step,
          status: 'completed'
        })));
      } else if (type === 'error') {
        setError(new Error(event.data.error || 'Conversion failed'));
        setIsProcessing(false);
        setProcessingSteps(prev => prev.map((step, idx) => ({
          ...step,
          status: idx === 0 ? 'error' : 'pending'
        })));
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

  const moveImage = useCallback((index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;
    
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setImages(newImages);
    setPdfResult(null);
  }, [images]);

  const handleConvert = useCallback(async () => {
    if (images.length === 0 || !workerRef.current) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    
    // Set up processing steps for visual feedback
    setProcessingSteps([
      { id: 'prepare', label: 'Preparing images', status: 'processing' },
      { id: 'convert', label: `Converting ${images.length} images`, status: 'pending' },
      { id: 'finalize', label: 'Creating PDF', status: 'pending' }
    ]);

    try {
      const imageDataArray = await Promise.all(
        images.map(async (img) => ({
          data: await img.file.arrayBuffer(),
          name: img.file.name
        }))
      );
      
      setProcessingSteps(prev => prev.map(step => ({
        ...step,
        status: step.id === 'prepare' ? 'completed' : step.id === 'convert' ? 'processing' : step.status
      })));

      const message: WorkerMessage = {
        type: 'convert',
        images: imageDataArray
      };

      workerRef.current.postMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Conversion failed'));
      setIsProcessing(false);
      setProcessingSteps(prev => prev.map((step, idx) => ({
        ...step,
        status: idx === 0 ? 'error' : 'pending'
      })));
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
      {/* Tool Header - Mobile optimized */}
      <div className="border-b bg-card/[0.5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-tool-jpg/[0.1] text-tool-jpg rounded-lg flex-shrink-0">
                <Image className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
              <span>JPG to PDF Converter</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
              Convert multiple images into a single PDF document. Preview pages, drag to reorder, and create perfect PDFs.
              100% private - all processing happens in your browser.
            </p>
            
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Drop Zone - Mobile optimized */}
        {images.length === 0 && (
          <DropZone
            onDrop={handleFileSelect}
            accept="image/*"
            multiple={true}
            maxSize={50 * 1024 * 1024} // 50MB per image
            className="h-48 sm:h-64"
          />
        )}

        {/* Image List */}
        {images.length > 0 && (
          <div className="space-y-6">
            <div className="bg-card border rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-medium text-base sm:text-lg">Images to convert</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    {images.length} image{images.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="self-end"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Add more
                </Button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
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
                    className={`relative group sm:cursor-move ff-transition ${
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
                    <div className="absolute top-1 left-1 sm:top-2 sm:left-2 p-0.5 sm:p-1 bg-background/90 rounded hidden sm:block">
                      <GripVertical className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 sm:top-2 sm:right-2 h-6 w-6 sm:opacity-0 sm:group-hover:opacity-100 ff-transition"
                      onClick={() => removeImage(imageInfo.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {/* Mobile reorder buttons */}
                    <div className="absolute bottom-1 right-1 flex gap-0.5 sm:hidden">
                      {index > 0 && (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveImage(index, 'up')}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                      )}
                      {index < images.length - 1 && (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveImage(index, 'down')}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                      <p className="text-[10px] sm:text-xs font-medium truncate">{imageInfo.file.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{formatFileSize(imageInfo.file.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground mt-3 sm:mt-4">
                <span className="hidden sm:inline">Drag images to reorder them in the PDF</span>
                <span className="sm:hidden">Use arrows to reorder pages</span>
              </p>
            </div>

            {/* Action Button - Mobile optimized */}
            <Button
              onClick={handleConvert}
              disabled={isProcessing || images.length === 0}
              size="default"
              className="w-full h-11 text-sm sm:text-base"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                  Converting to PDF...
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
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

            <div className="bg-card border rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-tool-pdf/[0.1] text-tool-pdf rounded flex-shrink-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm sm:text-base">Your PDF is ready</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {images.length} image{images.length !== 1 ? 's' : ''} • {formatFileSize(pdfResult.byteLength)}
                    </p>
                  </div>
                </div>
                <Button onClick={downloadPdf} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-3 sm:p-4 rounded-lg border">
          <Image className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Image Preview</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            See all images before converting them to PDF
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <GripVertical className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Drag to Reorder</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Arrange images in the perfect order for your PDF
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">High Quality PDF</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Creates professional PDFs with optimal compression
          </p>
        </div>
      </div>
    </div>
  );
};

export default JpgToPdf;