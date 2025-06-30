import React, { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Image, X, Download, Loader2, Check, AlertCircle, Maximize2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { ImageCarouselModal } from './ImageCarouselModal';
import type { ImageFormat } from '../../lib/image-converter-comlink';

interface FileInfo {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: Blob;
  error?: string;
  isLarge?: boolean;
}

interface VirtualizedFileListProps {
  files: FileInfo[];
  selectedTargetFormat: ImageFormat;
  onConvert: (index: number) => void;
  onDownload: (index: number) => void;
  onRemove: (index: number) => void;
  formatFileSize: (bytes: number) => string;
}

interface FileRowProps {
  fileInfo: FileInfo;
  index: number;
  selectedTargetFormat: ImageFormat;
  onConvert: (index: number) => void;
  onDownload: (index: number) => void;
  onRemove: (index: number) => void;
  formatFileSize: (bytes: number) => string;
}

interface ExtendedFileRowProps extends FileRowProps {
  onPreviewClick: (index: number) => void;
}

const FileRow: React.FC<ExtendedFileRowProps> = ({ 
  fileInfo, 
  index,
  onConvert,
  onDownload,
  onRemove,
  formatFileSize,
  onPreviewClick
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImageFile = fileInfo.file.type.startsWith('image/');

  useEffect(() => {
    if (isImageFile) {
      const url = URL.createObjectURL(fileInfo.file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [fileInfo.file, isImageFile]);

  const getStatusIcon = () => {
    switch (fileInfo.status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className="px-2 sm:px-4 py-1.5 sm:py-2">
      <div className="bg-card rounded-lg p-3 sm:p-4 border border-border hover:border-primary/20 transition-colors">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* File Info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="relative group">
              {isImageFile && previewUrl ? (
                <>
                  <div 
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden cursor-pointer bg-muted/50 border border-border"
                    onClick={() => onPreviewClick(index)}
                  >
                    <img 
                      src={previewUrl} 
                      alt={fileInfo.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hidden sm:flex"
                    onClick={() => onPreviewClick(index)}
                  >
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-muted/50 border border-border flex items-center justify-center">
                  <Image className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                </div>
              )}
              {getStatusIcon() && (
                <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 bg-background rounded-full p-0.5">
                  {getStatusIcon()}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-xs sm:text-sm">{fileInfo.file.name}</p>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                <span>{formatFileSize(fileInfo.file.size)}</span>
                {fileInfo.isLarge && (
                  <>
                    <span className="text-amber-600">•</span>
                    <span className="text-amber-600 hidden sm:inline">Large file</span>
                    <span className="text-amber-600 sm:hidden">Large</span>
                  </>
                )}
                {fileInfo.status === 'processing' && (
                  <>
                    <span>•</span>
                    <span>{Math.round(fileInfo.progress)}%</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions - Mobile optimized */}
          <div className="flex items-center gap-1 sm:gap-2">
            {fileInfo.status === 'pending' && (
              <Button
                onClick={() => onConvert(index)}
                size="sm"
                variant="secondary"
                className="text-xs px-2 py-1 h-7 sm:text-sm sm:px-3 sm:py-2 sm:h-auto"
              >
                <span className="hidden sm:inline">Convert</span>
                <span className="sm:hidden">Go</span>
              </Button>
            )}
            
            {fileInfo.status === 'completed' && fileInfo.result && (
              <Button
                onClick={() => onDownload(index)}
                size="sm"
                variant="ghost"
                className="text-accent hover:text-accent h-7 w-7 p-0 sm:h-8 sm:w-8"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            )}

            {fileInfo.status === 'error' && (
              <span className="text-[10px] sm:text-xs text-destructive px-1 sm:px-2">
                Failed
              </span>
            )}
            
            <Button
              onClick={() => onRemove(index)}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 sm:h-8 sm:w-8"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {fileInfo.status === 'processing' && (
          <div className="mt-3">
            <Progress value={fileInfo.progress} className="h-1" />
          </div>
        )}

        {/* Error Message */}
        {fileInfo.status === 'error' && fileInfo.error && (
          <div className="mt-2 text-xs text-destructive">
            {fileInfo.error}
          </div>
        )}
      </div>

      {/* Image Preview Modal will be rendered at the parent level */}
    </div>
  );
};

export default function VirtualizedFileList({
  files,
  selectedTargetFormat,
  onConvert,
  onDownload,
  onRemove,
  formatFileSize
}: VirtualizedFileListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => window.innerWidth < 640 ? 88 : 104, // Smaller height on mobile
    overscan: 5, // Render 5 items outside of the visible area
  });

  // Calculate responsive height based on viewport
  const getListHeight = () => {
    const viewportHeight = window.innerHeight;
    const isMobile = window.innerWidth < 640;
    const maxHeight = isMobile ? 400 : 600;
    const offset = isMobile ? 300 : 400;
    return Math.min(maxHeight, viewportHeight - offset);
  };

  return (
    <div className="relative">
      {files.length > 10 && (
        <div className="text-xs sm:text-sm text-muted-foreground mb-2">
          Showing {files.length} files (virtualized for performance)
        </div>
      )}
      
      <div
        ref={parentRef}
        className="border border-border rounded-lg bg-background overflow-auto scrollbar-thin"
        style={{
          height: `${getListHeight()}px`,
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const fileInfo = files[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <FileRow
                  fileInfo={fileInfo}
                  index={virtualItem.index}
                  selectedTargetFormat={selectedTargetFormat}
                  onConvert={onConvert}
                  onDownload={onDownload}
                  onRemove={onRemove}
                  formatFileSize={formatFileSize}
                  onPreviewClick={(idx) => {
                    setCarouselStartIndex(idx);
                    setShowCarousel(true);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Carousel Modal */}
      <ImageCarouselModal
        isOpen={showCarousel}
        onClose={() => setShowCarousel(false)}
        files={files}
        currentIndex={carouselStartIndex}
        formatFileSize={formatFileSize}
      />
    </div>
  );
}

export { VirtualizedFileList };