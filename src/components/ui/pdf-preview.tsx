import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Check, Maximize2 } from 'lucide-react';
import { Button } from './button';
import { PdfCarouselModal } from './pdf-carousel-modal';

interface PdfPreviewProps {
  pdfData: Uint8Array | ArrayBuffer;
  className?: string;
  onPageSelect?: (pages: number[]) => void;
  selectedPages?: number[];
  mode?: 'single' | 'grid' | 'strip';
  showPageNumbers?: boolean;
  selectable?: boolean;
  maxHeight?: number;
}

interface PageThumbnail {
  pageNum: number;
  canvas: HTMLCanvasElement;
  selected?: boolean;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  pdfData,
  className,
  onPageSelect,
  selectedPages = [],
  mode = 'grid',
  showPageNumbers = true,
  selectable = false,
  maxHeight = 600
}) => {
  const [pdf, setPdf] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set(selectedPages));
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselInitialPage, setCarouselInitialPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<boolean>(true);

  // Reset mounted ref on mount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load PDF - separate from selectedPages to avoid re-renders
  useEffect(() => {
    let cancelled = false;
    let pdfDoc: any = null;

    const loadPdf = async () => {
      if (!pdfData) {
        setLoading(false);
        return;
      }

      try {
        console.log('Starting PDF load...');
        setLoading(true);
        setError(null);
        setThumbnails([]);
        setPdf(null);
        
        // Dynamically import PDF.js only on client side
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set up PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.mjs',
          import.meta.url
        ).toString();
        
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        pdfDoc = await loadingTask.promise;
        
        if (cancelled || !mountedRef.current) {
          console.log('Component unmounted, cleaning up...');
          if (pdfDoc) pdfDoc.destroy();
          return;
        }

        console.log(`PDF loaded: ${pdfDoc.numPages} pages`);
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        
        // Generate thumbnails
        const thumbs: PageThumbnail[] = [];
        const maxThumbs = Math.min(pdfDoc.numPages, 50);
        
        for (let i = 1; i <= maxThumbs; i++) {
          if (cancelled || !mountedRef.current) break;
          
          try {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.3 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              await page.render({
                canvasContext: context,
                viewport: viewport,
              }).promise;
              
              thumbs.push({
                pageNum: i,
                canvas,
                selected: selectedPages.includes(i)
              });
            }
          } catch (pageError) {
            console.error(`Error rendering page ${i}:`, pageError);
          }
        }
        
        if (!cancelled && mountedRef.current) {
          console.log(`Generated ${thumbs.length} thumbnails`);
          setThumbnails(thumbs);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
        if (!cancelled && mountedRef.current) {
          setError(error instanceof Error ? error.message : 'Failed to load PDF');
          setThumbnails([]);
          setPdf(null);
          setLoading(false);
        }
      }
    };

    loadPdf();

    // Cleanup function
    return () => {
      cancelled = true;
      if (pdfDoc) {
        console.log('Destroying PDF document...');
        pdfDoc.destroy();
      }
    };
  }, [pdfData]);

  // Update selected pages
  useEffect(() => {
    setSelected(new Set(selectedPages));
  }, [selectedPages]);

  const handlePageClick = useCallback((pageNum: number, event?: React.MouseEvent) => {
    // Check if clicking on enlarge button
    if (event && (event.target as HTMLElement).closest('.enlarge-button')) {
      return;
    }
    
    if (!selectable) return;

    const newSelected = new Set(selected);
    if (newSelected.has(pageNum)) {
      newSelected.delete(pageNum);
    } else {
      newSelected.add(pageNum);
    }
    setSelected(newSelected);
    onPageSelect?.(Array.from(newSelected).sort((a, b) => a - b));
  }, [selected, selectable, onPageSelect]);

  const handleEnlarge = useCallback((pageNum: number) => {
    setCarouselInitialPage(pageNum);
    setCarouselOpen(true);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!selectable) return;
    
    const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
    setSelected(new Set(allPages));
    onPageSelect?.(allPages);
  }, [totalPages, selectable, onPageSelect]);

  const handleSelectNone = useCallback(() => {
    if (!selectable) return;
    
    setSelected(new Set());
    onPageSelect?.([]);
  }, [selectable, onPageSelect]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-48", className)}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-48 text-muted-foreground", className)}>
        <FileText className="w-8 h-8 mb-2" />
        <span>Error loading PDF</span>
        <span className="text-xs mt-1">{error}</span>
      </div>
    );
  }

  if (!pdf || thumbnails.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-48 text-muted-foreground", className)}>
        <FileText className="w-8 h-8 mr-2" />
        <span>No preview available</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {selectable && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectNone}
              >
                Select None
              </Button>
              <span className="text-sm text-muted-foreground">
                {selected.size} of {totalPages} selected
              </span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-mono min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={scale >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Container */}
      <div 
        ref={containerRef}
        className={cn(
          "overflow-auto rounded-lg border bg-secondary/20",
          mode === 'grid' && "p-4",
          mode === 'strip' && "p-2"
        )}
        style={{ maxHeight }}
      >
        {mode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {thumbnails.map((thumb) => (
              <div
                key={thumb.pageNum}
                onClick={(e) => handlePageClick(thumb.pageNum, e)}
                className={cn(
                  "relative group cursor-pointer rounded-lg overflow-hidden border-2 ff-transition",
                  selected.has(thumb.pageNum) 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-border hover:border-primary/50",
                  selectable && "hover:shadow-lg"
                )}
                style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
              >
                <div className="aspect-[3/4] bg-white flex items-center justify-center">
                  <img 
                    src={thumb.canvas.toDataURL()} 
                    alt={`Page ${thumb.pageNum}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                
                {/* Enlarge button */}
                <button
                  onClick={() => handleEnlarge(thumb.pageNum)}
                  className="enlarge-button absolute top-2 left-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  title="View full screen"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                
                {showPageNumbers && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span className="text-white text-xs font-medium">
                      Page {thumb.pageNum}
                    </span>
                  </div>
                )}
                
                {selectable && selected.has(thumb.pageNum) && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {mode === 'strip' && (
          <div className="flex gap-2 pb-2">
            {thumbnails.map((thumb) => (
              <div
                key={thumb.pageNum}
                onClick={(e) => handlePageClick(thumb.pageNum, e)}
                className={cn(
                  "relative group flex-shrink-0 cursor-pointer rounded overflow-hidden border-2 ff-transition",
                  selected.has(thumb.pageNum) 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-border hover:border-primary/50",
                  selectable && "hover:shadow-md"
                )}
                style={{ 
                  height: `${150 * scale}px`,
                  width: `${106 * scale}px` // Maintain aspect ratio
                }}
              >
                <img 
                  src={thumb.canvas.toDataURL()} 
                  alt={`Page ${thumb.pageNum}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Enlarge button */}
                <button
                  onClick={() => handleEnlarge(thumb.pageNum)}
                  className="enlarge-button absolute top-1 left-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  title="View full screen"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                </button>
                
                {showPageNumbers && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <span className="text-white text-xs">
                      {thumb.pageNum}
                    </span>
                  </div>
                )}
                
                {selectable && selected.has(thumb.pageNum) && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {mode === 'single' && (
          <div className="relative">
            <div className="flex items-center justify-center">
              <img 
                src={thumbnails[currentPage - 1]?.canvas.toDataURL()} 
                alt={`Page ${currentPage}`}
                className="max-w-full rounded-lg shadow-lg"
                style={{ transform: `scale(${scale})` }}
              />
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/90 backdrop-blur rounded-lg p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {totalPages > 50 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing first 50 pages of {totalPages} total pages
        </p>
      )}
      
      {/* Full Screen Carousel Modal */}
      {pdf && (
        <PdfCarouselModal
          isOpen={carouselOpen}
          onClose={() => setCarouselOpen(false)}
          pdfDoc={pdf}
          initialPage={carouselInitialPage}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};

export default PdfPreview;