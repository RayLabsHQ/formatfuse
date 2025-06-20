import React, { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Image, X, Download, Loader2, Check, AlertCircle, Maximize2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import type { ImageFormat } from '../../lib/image-converter';

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

const FileRow: React.FC<FileRowProps> = ({ 
  fileInfo, 
  index,
  selectedTargetFormat,
  onConvert,
  onDownload,
  onRemove,
  formatFileSize
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
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
    <div className="px-4 py-2">
      <div className="bg-card rounded-lg p-4 border border-border hover:border-primary/20 transition-colors">
        <div className="flex items-center justify-between gap-4">
          {/* File Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative group">
              {isImageFile && previewUrl ? (
                <>
                  <div 
                    className="w-16 h-16 rounded-lg overflow-hidden cursor-pointer bg-muted/50 border border-border"
                    onClick={() => setShowPreview(true)}
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
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    onClick={() => setShowPreview(true)}
                  >
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted/50 border border-border flex items-center justify-center">
                  <Image className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              {getStatusIcon() && (
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                  {getStatusIcon()}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm">{fileInfo.file.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(fileInfo.file.size)}</span>
                {fileInfo.isLarge && (
                  <>
                    <span className="text-amber-600">•</span>
                    <span className="text-amber-600">Large file</span>
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

          {/* Actions */}
          <div className="flex items-center gap-2">
            {fileInfo.status === 'pending' && (
              <Button
                onClick={() => onConvert(index)}
                size="sm"
                variant="secondary"
              >
                Convert
              </Button>
            )}
            
            {fileInfo.status === 'completed' && fileInfo.result && (
              <Button
                onClick={() => onDownload(index)}
                size="sm"
                variant="ghost"
                className="text-accent hover:text-accent"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}

            {fileInfo.status === 'error' && (
              <span className="text-xs text-destructive px-2">
                Failed
              </span>
            )}
            
            <Button
              onClick={() => onRemove(index)}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
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

      {/* Image Preview Modal */}
      {showPreview && previewUrl && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img 
              src={previewUrl} 
              alt={fileInfo.file.name}
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-4 right-4"
              onClick={() => setShowPreview(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-sm font-medium">{fileInfo.file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(fileInfo.file.size)}</p>
            </div>
          </div>
        </div>
      )}
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

  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 104, // Estimated height of each item with preview
    overscan: 5, // Render 5 items outside of the visible area
  });

  return (
    <div className="relative">
      {files.length > 10 && (
        <div className="text-sm text-muted-foreground mb-2">
          Showing {files.length} files (virtualized for performance)
        </div>
      )}
      
      <div
        ref={parentRef}
        className="border border-border rounded-lg bg-background overflow-auto scrollbar-thin"
        style={{
          height: `${Math.min(600, window.innerHeight - 400)}px`,
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
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}