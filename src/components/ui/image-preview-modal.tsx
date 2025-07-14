import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<{
    url: string;
    title: string;
    data?: Uint8Array;
    mimeType?: string;
  }>;
  initialIndex?: number;
  onDownload?: (index: number) => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  onDownload,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
        case "_":
          handleZoomOut();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex]);

  if (!isOpen || !images.length) return null;

  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setScale(1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setScale(1);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const modalContent = (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-black/90 backdrop-blur-sm",
        "flex flex-col"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <h3 className="text-lg font-medium">
          {currentImage.title} ({currentIndex + 1} / {images.length})
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {/* Previous Button */}
        {images.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        {/* Image Container */}
        <div 
          className="relative overflow-auto max-w-full max-h-full"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center",
            transition: "transform 0.2s ease-out",
          }}
        >
          <img
            src={currentImage.url}
            alt={currentImage.title}
            className="max-w-full max-h-full object-contain"
            style={{
              maxHeight: isFullscreen ? "calc(100vh - 160px)" : "calc(100vh - 200px)",
            }}
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-black/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          className="text-white hover:bg-white/20"
        >
          <ZoomOut className="h-4 w-4 mr-2" />
          Zoom Out
        </Button>
        <span className="text-white text-sm min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          disabled={scale >= 3}
          className="text-white hover:bg-white/20"
        >
          <ZoomIn className="h-4 w-4 mr-2" />
          Zoom In
        </Button>
        {scale !== 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            className="text-white hover:bg-white/20"
          >
            Reset
          </Button>
        )}
        {onDownload && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDownload(currentIndex)}
            className="ml-4"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="p-4 bg-black/70">
          <div className="flex gap-2 overflow-x-auto py-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setScale(1);
                }}
                className={cn(
                  "flex-shrink-0 w-16 h-20 rounded overflow-hidden border-2 transition-all",
                  index === currentIndex
                    ? "border-primary"
                    : "border-transparent hover:border-white/50"
                )}
              >
                <img
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};