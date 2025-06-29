import React, { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Image, X, Download, Loader2, Check, AlertCircle, Maximize2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

interface FileInfo {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: Blob;
  error?: string;
  isLarge?: boolean;
  dimensions?: { width: number; height: number };
}

interface SimplifiedFileListProps {
  files: FileInfo[];
  onDownload: (file: FileInfo) => void;
  onRemove: (index: number) => void;
  renderExtraInfo?: (file: FileInfo) => React.ReactNode;
}

interface FileRowProps {
  fileInfo: FileInfo;
  index: number;
  onDownload: (file: FileInfo) => void;
  onRemove: (index: number) => void;
  renderExtraInfo?: (file: FileInfo) => React.ReactNode;
}

const FileRow: React.FC<FileRowProps> = ({ 
  fileInfo, 
  index,
  onDownload,
  onRemove,
  renderExtraInfo
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImageFile = fileInfo.file.type.startsWith('image/');

  useEffect(() => {
    if (isImageFile && (fileInfo.file || fileInfo.result)) {
      const url = URL.createObjectURL(fileInfo.result || fileInfo.file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [fileInfo.file, fileInfo.result, isImageFile]);

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

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="px-2 sm:px-4 py-1.5 sm:py-2">
      <div className="bg-card rounded-lg p-3 sm:p-4 border border-border hover:border-primary/20 transition-colors">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* File Info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Preview or Icon */}
            <div className="relative shrink-0">
              {isImageFile && previewUrl ? (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden bg-muted">
                  <img 
                    src={previewUrl}
                    alt={fileInfo.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-muted flex items-center justify-center">
                  <Image className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                </div>
              )}
              {getStatusIcon() && (
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                  {getStatusIcon()}
                </div>
              )}
            </div>

            {/* File Details */}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate" title={fileInfo.file.name}>
                {fileInfo.file.name}
              </p>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                <span>{formatFileSize(fileInfo.file.size)}</span>
                {renderExtraInfo?.(fileInfo)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {fileInfo.status === 'completed' && fileInfo.result && (
              <Button
                onClick={() => onDownload(fileInfo)}
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 sm:h-8 sm:w-8"
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
    </div>
  );
};

export function SimplifiedFileList({
  files,
  onDownload,
  onRemove,
  renderExtraInfo
}: SimplifiedFileListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => window.innerWidth < 640 ? 88 : 104,
    overscan: 5,
  });

  const getListHeight = () => {
    const viewportHeight = window.innerHeight;
    const isMobile = window.innerWidth < 640;
    const maxHeight = isMobile ? 400 : 600;
    const offset = isMobile ? 300 : 400;
    return Math.min(maxHeight, viewportHeight - offset);
  };

  if (files.length === 0) return null;

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
                  onDownload={onDownload}
                  onRemove={onRemove}
                  renderExtraInfo={renderExtraInfo}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}