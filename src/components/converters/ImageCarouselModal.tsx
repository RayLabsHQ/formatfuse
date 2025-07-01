import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "../ui/carousel";

interface FileInfo {
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  result?: Blob;
  error?: string;
  isLarge?: boolean;
}

interface ImageCarouselModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileInfo[];
  currentIndex: number;
  formatFileSize: (bytes: number) => string;
}

export function ImageCarouselModal({
  isOpen,
  onClose,
  files,
  currentIndex,
  formatFileSize,
}: ImageCarouselModalProps) {
  const [mainApi, setMainApi] = useState<CarouselApi>();
  const [thumbsApi, setThumbsApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);
  const [previewUrls, setPreviewUrls] = useState<Map<number, string>>(
    new Map(),
  );

  // Filter only image files
  const imageFiles = files
    .map((fileInfo, index) => ({ fileInfo, originalIndex: index }))
    .filter(({ fileInfo }) => fileInfo.file.type.startsWith("image/"));

  // Find the actual index in the filtered array
  const initialIndex = imageFiles.findIndex(
    ({ originalIndex }) => originalIndex === currentIndex,
  );

  useEffect(() => {
    // Generate preview URLs for all image files
    const urls = new Map<number, string>();
    imageFiles.forEach(({ fileInfo, originalIndex }) => {
      const url = URL.createObjectURL(fileInfo.file);
      urls.set(originalIndex, url);
    });
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && mainApi) {
        mainApi.scrollPrev();
      } else if (e.key === "ArrowRight" && mainApi) {
        mainApi.scrollNext();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyPress);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, mainApi]);

  const onThumbClick = useCallback(
    (index: number) => {
      if (!mainApi || !thumbsApi) return;
      mainApi.scrollTo(index);
    },
    [mainApi, thumbsApi],
  );

  const onSelect = useCallback(() => {
    if (!mainApi || !thumbsApi) return;
    const selected = mainApi.selectedScrollSnap();
    setSelectedIndex(selected);
    thumbsApi.scrollTo(selected);
  }, [mainApi, thumbsApi]);

  useEffect(() => {
    if (!mainApi) return;

    // Scroll to initial index when API is ready
    if (initialIndex >= 0) {
      mainApi.scrollTo(initialIndex);
    }

    onSelect();
    mainApi.on("select", onSelect).on("reInit", onSelect);
  }, [mainApi, onSelect, initialIndex]);

  if (!isOpen || imageFiles.length === 0) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto p-4 flex flex-col h-full max-h-screen">
        {/* Header with close button and image counter */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
          {imageFiles.length > 1 && (
            <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <p className="text-sm font-medium">
                {selectedIndex + 1} / {imageFiles.length}
              </p>
            </div>
          )}
          <Button size="sm" variant="secondary" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Main carousel */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <Carousel
            setApi={setMainApi}
            className="w-full max-w-4xl relative group"
            opts={{
              loop: false,
              startIndex: initialIndex >= 0 ? initialIndex : 0,
            }}
          >
            <CarouselContent>
              {imageFiles.map(({ fileInfo, originalIndex }) => (
                <CarouselItem
                  key={originalIndex}
                  className="flex items-center justify-center"
                >
                  <div className="relative">
                    <img
                      src={previewUrls.get(originalIndex)}
                      alt={fileInfo.file.name}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    />
                    <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
                      <p className="text-sm font-medium">
                        {fileInfo.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileInfo.file.size)}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {imageFiles.length > 1 && (
              <>
                <CarouselPrevious className="absolute left-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CarouselNext className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </Carousel>
        </div>

        {/* Thumbnail carousel */}
        {imageFiles.length > 1 && (
          <div className="w-full max-w-4xl mx-auto">
            <Carousel
              setApi={setThumbsApi}
              opts={{
                containScroll: "keepSnaps",
                dragFree: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2">
                {imageFiles.map(({ fileInfo, originalIndex }, index) => (
                  <CarouselItem
                    key={originalIndex}
                    className="pl-2 basis-1/6 md:basis-1/8 lg:basis-1/10"
                  >
                    <button
                      onClick={() => onThumbClick(index)}
                      className={`relative w-full aspect-square rounded-md overflow-hidden border-2 transition-all ${
                        index === selectedIndex
                          ? "border-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={previewUrls.get(originalIndex)}
                        alt={fileInfo.file.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
