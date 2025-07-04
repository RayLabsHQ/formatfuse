import React, { useRef, useCallback } from "react";
import { Upload, Info } from "lucide-react";
import { cn } from "../../lib/utils";

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  isDragging?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
  title?: string;
  subtitle?: string;
  infoMessage?: string;
  secondaryInfo?: string;
  className?: string;
  disabled?: boolean;
}

export function FileDropZone({
  onFilesSelected,
  accept = "*/*",
  multiple = true,
  isDragging: externalIsDragging,
  onDragStateChange,
  title = "Drop files here",
  subtitle = "or click to browse",
  infoMessage,
  secondaryInfo,
  className,
  disabled = false,
}: FileDropZoneProps) {
  const [internalIsDragging, setInternalIsDragging] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use external dragging state if provided, otherwise use internal
  const isDragging = externalIsDragging !== undefined ? externalIsDragging : internalIsDragging;
  const setIsDragging = onDragStateChange || setInternalIsDragging;

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) {
        onFilesSelected(selectedFiles);
      }
      // Reset input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (disabled) return;
      
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onFilesSelected(droppedFiles);
      }
    },
    [onFilesSelected, setIsDragging, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [setIsDragging, disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setIsDragging(false);
      }
    },
    [setIsDragging]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div
      className={cn("group relative block", !disabled && "cursor-pointer", className)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
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
      
      <div
        onClick={handleClick}
        className={cn(
          "relative p-12 sm:p-16 md:p-20 rounded-2xl border-2 border-dashed transition-all duration-300",
          isDragging
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-border bg-card/50 hover:border-primary hover:bg-card group-hover:scale-[1.01]",
          disabled && "opacity-50 cursor-not-allowed hover:border-border hover:bg-card/50"
        )}
      >
        <div className="text-center">
          <Upload
            className={cn(
              "w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 transition-all duration-300",
              isDragging
                ? "text-primary scale-110"
                : "text-muted-foreground group-hover:text-primary",
              disabled && "group-hover:text-muted-foreground"
            )}
          />
          <p className="text-lg sm:text-xl font-medium mb-2">
            {title}
          </p>
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            {subtitle}
          </p>
          {infoMessage && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {infoMessage}
              </span>
            </div>
          )}
          {secondaryInfo && (
            <p className="text-xs text-muted-foreground mt-3">
              {secondaryInfo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}