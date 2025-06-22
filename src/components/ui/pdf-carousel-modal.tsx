import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';
import useEmblaCarousel from 'embla-carousel-react';

interface PdfCarouselModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: any;
  initialPage?: number;
  totalPages: number;
}

export const PdfCarouselModal: React.FC<PdfCarouselModalProps> = ({
  isOpen,
  onClose,
  pdfDoc,
  initialPage = 1,
  totalPages
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [renderedPages, setRenderedPages] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(false);
  
  // Carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    skipSnaps: false
  });
  
  const [thumbEmblaRef, thumbEmblaApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true
  });

  // Render PDF page to canvas
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || renderedPages.has(pageNum)) return;
    
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 }); // High res for full screen
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      const dataUrl = canvas.toDataURL();
      setRenderedPages(prev => new Map(prev).set(pageNum, dataUrl));
    } catch (error) {
      console.error(`Error rendering page ${pageNum}:`, error);
    }
  }, [pdfDoc, renderedPages]);

  // Pre-render initial page and adjacent pages on mount
  useEffect(() => {
    if (!pdfDoc) return;
    
    const pagesToRender = [
      initialPage,
      initialPage - 1,
      initialPage + 1
    ].filter(p => p >= 1 && p <= totalPages);
    
    pagesToRender.forEach(renderPage);
  }, [pdfDoc, initialPage, totalPages, renderPage]);

  // Pre-render current and adjacent pages
  useEffect(() => {
    if (!pdfDoc) return;
    
    const pagesToRender = [
      currentPage,
      currentPage - 1,
      currentPage + 1
    ].filter(p => p >= 1 && p <= totalPages);
    
    pagesToRender.forEach(renderPage);
  }, [currentPage, pdfDoc, totalPages, renderPage]);

  // Initial scroll to the requested page when carousel is ready
  useEffect(() => {
    if (emblaApi && initialPage !== 1) {
      // Use setTimeout to ensure the carousel is fully initialized
      setTimeout(() => {
        emblaApi.scrollTo(initialPage - 1, false);
        setCurrentPage(initialPage);
      }, 0);
    }
  }, [emblaApi, initialPage]);

  // Sync carousel with current page changes
  useEffect(() => {
    if (emblaApi && currentPage !== emblaApi.selectedScrollSnap() + 1) {
      emblaApi.scrollTo(currentPage - 1, false);
    }
    thumbEmblaApi?.scrollTo(currentPage - 1, false);
  }, [currentPage, emblaApi, thumbEmblaApi]);

  // Handle carousel selection
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setCurrentPage(index + 1);
    thumbEmblaApi?.scrollTo(index);
  }, [emblaApi, thumbEmblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentPage > 1) setCurrentPage(prev => prev - 1);
          break;
        case 'ArrowRight':
          if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, totalPages, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4 bg-background/10 backdrop-blur">
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">
              Page {currentPage} of {totalPages}
            </span>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm font-mono min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setScale(prev => Math.min(prev + 0.25, 3))}
                disabled={scale >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Main Carousel */}
        <div className="flex-1 overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <div
                key={pageNum}
                className="flex-[0_0_100%] flex items-center justify-center p-8"
              >
                {renderedPages.has(pageNum) ? (
                  <img
                    src={renderedPages.get(pageNum)}
                    alt={`Page ${pageNum}`}
                    className="max-w-full max-h-full object-contain shadow-2xl"
                    style={{ transform: `scale(${scale})` }}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <div className="animate-pulse bg-white/10 rounded-lg w-96 h-[600px]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Navigation Buttons */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 disabled:opacity-50"
          onClick={() => emblaApi?.scrollPrev()}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 disabled:opacity-50"
          onClick={() => emblaApi?.scrollNext()}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
        
        {/* Thumbnail Carousel */}
        <div className="relative bg-background/10 backdrop-blur p-4">
          <div className="overflow-hidden" ref={thumbEmblaRef}>
            <div className="flex gap-2">
              {Array.from({ length: Math.min(totalPages, 50) }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  className={cn(
                    "flex-[0_0_80px] aspect-[3/4] rounded border-2 overflow-hidden transition-all",
                    pageNum === currentPage 
                      ? "border-primary ring-2 ring-primary/50" 
                      : "border-white/20 hover:border-white/40"
                  )}
                  onClick={() => {
                    setCurrentPage(pageNum);
                    emblaApi?.scrollTo(pageNum - 1, false);
                  }}
                >
                  {renderedPages.has(pageNum) ? (
                    <img
                      src={renderedPages.get(pageNum)}
                      alt={`Thumbnail ${pageNum}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10 animate-pulse" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <span className="text-white text-xs">{pageNum}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default PdfCarouselModal;