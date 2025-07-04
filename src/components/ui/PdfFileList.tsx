import React, { useRef, useCallback, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  GripVertical,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  FileX,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { TbFileTypePdf } from "react-icons/tb";
import { Button } from "./button";
import { cn } from "../../lib/utils";
import { PdfPreview } from "./pdf-preview";

export interface PdfFile {
  file: File;
  id: string;
  pageCount?: number;
  data?: Uint8Array;
  showPreview?: boolean;
  previewKey?: number;
}

export interface PdfFileListProps {
  files: PdfFile[];
  onFilesChange: (files: PdfFile[]) => void;
  onFilesAdd?: (files: File[]) => void;
  onFileRemove?: (id: string) => void;
  onMergedResultChange?: (result: Uint8Array | null) => void;
  showAddButton?: boolean;
  enableReordering?: boolean;
  enablePreviews?: boolean;
  maxVisibleFiles?: {
    desktop: number;
    mobile: number;
  };
  className?: string;
  title?: string;
  subtitle?: React.ReactNode;
}

export function PdfFileList({
  files,
  onFilesChange,
  onFilesAdd,
  onFileRemove,
  onMergedResultChange,
  showAddButton = true,
  enableReordering = true,
  enablePreviews = true,
  maxVisibleFiles = { desktop: 10, mobile: 5 },
  className,
  title = "PDFs to merge",
  subtitle,
}: PdfFileListProps) {
  const [draggedFile, setDraggedFile] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAllPreviews, setShowAllPreviews] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Calculate item heights dynamically based on preview state
  const getItemHeight = useCallback((index: number) => {
    const file = files[index];
    if (!file) return 80; // Base height
    
    // Base height + preview height if showing previews
    return showAllPreviews && enablePreviews && file.data ? 280 : 80;
  }, [files, showAllPreviews, enablePreviews]);

  // Setup virtualizer with dynamic sizing
  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: getItemHeight,
    overscan: 2,
  });

  // Recalculate sizes when preview state changes
  useEffect(() => {
    virtualizer.measure();
  }, [showAllPreviews, virtualizer]);

  // File utilities
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedFile(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOverFile = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    []
  );

  const handleDropFile = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      if (draggedFile === null) return;

      const draggedIndex = files.findIndex((f) => f.id === draggedFile);
      if (draggedIndex === -1) return;

      const newFiles = [...files];
      const [removed] = newFiles.splice(draggedIndex, 1);
      newFiles.splice(dropIndex, 0, removed);

      onFilesChange(newFiles);
      setDraggedFile(null);
      setDragOverIndex(null);
      onMergedResultChange?.(null);
    },
    [files, draggedFile, onFilesChange, onMergedResultChange]
  );

  // Mobile reorder functions
  const moveFile = useCallback(
    (index: number, direction: "up" | "down") => {
      const newFiles = [...files];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= files.length) return;

      [newFiles[index], newFiles[newIndex]] = [
        newFiles[newIndex],
        newFiles[index],
      ];
      onFilesChange(newFiles);
      onMergedResultChange?.(null);
    },
    [files, onFilesChange, onMergedResultChange]
  );

  // File operations
  const removeFile = useCallback(
    (id: string) => {
      const newFiles = files.filter((f) => f.id !== id);
      onFilesChange(newFiles);
      onFileRemove?.(id);
      onMergedResultChange?.(null);
    },
    [files, onFilesChange, onFileRemove, onMergedResultChange]
  );

  const toggleAllPreviews = useCallback(() => {
    setShowAllPreviews((prev) => !prev);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      onFilesAdd?.(selectedFiles);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onFilesAdd]
  );

  // Calculate totals
  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0);
  const maxVisible = isMobile ? maxVisibleFiles.mobile : maxVisibleFiles.desktop;
  const needsScroll = files.length > maxVisible;

  return (
    <div className={cn("bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50", className)}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-base sm:text-lg">{title}</h3>
            {subtitle || (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {files.length} file{files.length !== 1 ? "s" : ""} • {totalPages}{" "}
                total page{totalPages !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {showAddButton && onFilesAdd && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add more
              </Button>
            </>
          )}
        </div>
        {/* Toggle all previews button */}
        {enablePreviews && files.length > 0 && files.some(f => f.data) && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAllPreviews}
              className="text-xs"
            >
              {showAllPreviews ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hide all previews
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Show all previews
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* File list container */}
      {files.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <FileX className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No PDFs added yet</p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className={cn(
            "overflow-auto",
            needsScroll && "border-b border-border/50"
          )}
          style={{
            maxHeight: needsScroll ? `${maxVisible * 85}px` : "auto",
          }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const fileInfo = files[virtualItem.index];
              const index = virtualItem.index;
              const isExpanded = showAllPreviews;

              return (
                <div
                  key={fileInfo.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div
                    draggable={enableReordering && !isMobile}
                    onDragStart={(e) => enableReordering && handleDragStart(e, fileInfo.id)}
                    onDragOver={(e) => enableReordering && handleDragOverFile(e, index)}
                    onDrop={(e) => enableReordering && handleDropFile(e, index)}
                    onDragEnd={() => {
                      setDragOverIndex(null);
                      setDraggedFile(null);
                    }}
                    className={cn(
                      "group relative transition-all duration-200 p-4",
                      index !== 0 && "border-t border-border/50",
                      dragOverIndex === index && "bg-primary/5",
                      draggedFile === fileInfo.id && "opacity-50"
                    )}
                  >
                    {/* Main content row */}
                    <div className="flex items-center gap-3">
                      {/* Drag handle for desktop */}
                      {enableReordering && !isMobile && (
                        <div className="cursor-move">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}

                      {/* PDF Icon */}
                      <TbFileTypePdf className="w-8 h-8 sm:w-10 sm:h-10 text-foreground flex-shrink-0" />

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate max-w-[200px] sm:max-w-[300px]">
                            {fileInfo.file.name}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatFileSize(fileInfo.file.size)} •{" "}
                          {fileInfo.pageCount
                            ? `${fileInfo.pageCount} page${fileInfo.pageCount !== 1 ? "s" : ""}`
                            : "Loading..."}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 sm:gap-2">
                        {/* Mobile reorder buttons */}
                        {enableReordering && isMobile && (
                          <>
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveFile(index, "up")}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                            )}
                            {index < files.length - 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveFile(index, "down")}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}

                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => removeFile(fileInfo.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* PDF Preview - Show if previews are enabled and toggled on */}
                    {enablePreviews && showAllPreviews && fileInfo.data && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-border/50">
                        <PdfPreview
                          pdfData={fileInfo.data}
                          mode="strip"
                          maxHeight={180}
                          key={`${fileInfo.id}-${showAllPreviews}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer hint */}
      {enableReordering && files.length > 1 && (
        <div className="p-3 sm:p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            <span className="hidden sm:inline">
              Drag PDFs to reorder
            </span>
            <span className="sm:hidden">
              Use arrows to reorder
            </span>
          </p>
        </div>
      )}
    </div>
  );
}