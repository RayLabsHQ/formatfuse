import React, { useRef } from 'react';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileFileUploadProps {
  accept?: string;
  multiple?: boolean;
  onFileSelect: (files: FileList) => void;
  selectedFile?: File | null;
  onClear?: () => void;
  className?: string;
  compact?: boolean;
}

export function MobileFileUpload({
  accept,
  multiple = false,
  onFileSelect,
  selectedFile,
  onClear,
  className,
  compact = true
}: MobileFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (compact && selectedFile) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3",
        "bg-muted/50 rounded-lg",
        "min-h-[56px]", // Good touch target
        className
      )}>
        <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(selectedFile.size)}
          </p>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Clear file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {compact ? (
        <button
          onClick={() => inputRef.current?.click()}
          className={cn(
            "w-full flex items-center gap-3 p-4",
            "bg-muted/50 hover:bg-muted/70",
            "rounded-lg transition-colors",
            "min-h-[64px]" // Larger touch target
          )}
        >
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">
            {multiple ? 'Choose Files' : 'Choose File'}
          </span>
        </button>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className={cn(
            "w-full p-8",
            "border-2 border-dashed rounded-lg",
            "hover:bg-muted/50 transition-colors",
            "flex flex-col items-center gap-3"
          )}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">
              {multiple ? 'Choose Files' : 'Choose File'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tap to browse
            </p>
          </div>
        </button>
      )}
    </div>
  );
}

interface FileListItemProps {
  file: File;
  onRemove?: () => void;
  progress?: number;
  error?: string;
}

export function FileListItem({ file, onRemove, progress, error }: FileListItemProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3",
      "bg-muted/30 rounded-lg",
      "min-h-[56px]",
      error && "bg-destructive/10"
    )}>
      <File className={cn(
        "h-5 w-5 flex-shrink-0",
        error ? "text-destructive" : "text-muted-foreground"
      )} />
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          error && "text-destructive"
        )}>
          {file.name}
        </p>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </p>
        )}
        
        {progress !== undefined && progress < 100 && (
          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}