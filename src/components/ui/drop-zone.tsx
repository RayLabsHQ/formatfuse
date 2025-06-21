import React, { useState, useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';
import { Upload, FileUp, File, FileCheck, Loader2 } from 'lucide-react';

interface DropZoneProps {
  onDrop: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onDrop,
  accept,
  multiple = false,
  maxFiles,
  maxSize,
  className,
  children,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const validateFiles = useCallback((files: FileList): string | null => {
    if (maxFiles && files.length > maxFiles) {
      return `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed`;
    }

    if (maxSize) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxSize) {
          const sizeMB = (maxSize / (1024 * 1024)).toFixed(1);
          return `File size must be less than ${sizeMB}MB`;
        }
      }
    }

    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          if (type.includes('*')) {
            const [mainType] = type.split('/');
            return file.type.startsWith(mainType);
          }
          return file.type === type;
        });
        
        if (!isAccepted) {
          return `File type not accepted. Allowed: ${accept}`;
        }
      }
    }

    return null;
  }, [accept, maxFiles, maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    setDragCounter(0);
    setError(null);

    if (disabled) return;

    const files = e.dataTransfer.files;
    const validationError = validateFiles(files);
    
    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(null), 3000);
      return;
    }

    onDrop(files);
  }, [disabled, onDrop, validateFiles]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.dropEffect) {
      e.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
    }
  }, [disabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validationError = validateFiles(files);
    
    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(null), 3000);
      return;
    }

    onDrop(files);
  }, [onDrop, validateFiles]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div
      ref={dropZoneRef}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={cn(
        "relative border-2 border-dashed rounded-lg ff-transition cursor-pointer",
        "hover:border-primary/50 hover:bg-primary/[0.02]",
        isDragging && !disabled && "border-primary bg-primary/[0.05] drop-zone-active",
        disabled && "opacity-50 cursor-not-allowed",
        error && "border-destructive",
        !isDragging && !error && "border-border",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      
      {/* Drag Overlay */}
      {isDragging && !disabled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/[0.05] backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-primary/10 rounded-full animate-pulse">
              <FileUp className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-primary">Drop files here</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute top-2 left-2 right-2 z-20 bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-md text-sm animate-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* Content */}
      {children || (
        <div className="p-12 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/[0.1] rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">
              Drop {multiple ? 'files' : 'file'} here
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              or <span className="text-primary hover:underline font-medium">browse</span> from your computer
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            {accept && (
              <span className="flex items-center gap-1">
                <FileCheck className="w-3 h-3" />
                {accept.split(',').join(', ')}
              </span>
            )}
            {maxSize && (
              <span className="flex items-center gap-1">
                <FileUp className="w-3 h-3" />
                Max {(maxSize / (1024 * 1024)).toFixed(0)}MB
              </span>
            )}
            {maxFiles && multiple && (
              <span className="flex items-center gap-1">
                <File className="w-3 h-3" />
                Max {maxFiles} files
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Animated drop indicator for reordering
export const DropIndicator: React.FC<{ active?: boolean }> = ({ active }) => {
  return (
    <div
      className={cn(
        "absolute left-0 right-0 h-0.5 ff-transition",
        active ? "bg-primary" : "bg-transparent"
      )}
    >
      {active && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full animate-pulse" />
      )}
    </div>
  );
};

export default DropZone;