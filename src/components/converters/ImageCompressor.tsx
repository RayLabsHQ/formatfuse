import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  Download,
  X,
  ArrowRight,
  ArrowUpDown,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
  Sparkles,
  Info,
  Minimize2,
  Image,
  Sliders,
  Crown,
  Star,
  Scale,
  Package,
  File,
} from "lucide-react";
import { useImageCompress } from "../../hooks/useImageCompress";
import type { CompressOptions, CompressFormat } from "../../lib/image-compress";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";
import { CollapsibleSection } from "../ui/mobile/CollapsibleSection";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from '../ui/ToolHeader';
import { cn } from "../../lib/utils";
import { ImageCarouselModal } from "./ImageCarouselModal";
import JSZip from "jszip";

interface FileInfo {
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  result?: Blob;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  previewUrl?: string;
}

// Format configuration with display names and colors
const FORMATS = {
  JPEG: {
    mime: "image/jpeg",
    extension: "jpg",
    name: "JPEG",
    displayName: "JPG",
    color: "var(--tool-jpg)",
  },
  WEBP: {
    mime: "image/webp",
    extension: "webp",
    name: "WebP",
    displayName: "WebP",
    color: "oklch(0.72 0.16 210)",
  },
  PNG: {
    mime: "image/png",
    extension: "png",
    name: "PNG",
    displayName: "PNG",
    color: "var(--tool-png)",
  },
  AVIF: {
    mime: "image/avif",
    extension: "avif",
    name: "AVIF",
    displayName: "AVIF",
    color: "oklch(0.72 0.16 210)",
  },
};

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Powered by WebAssembly" },
  {
    icon: Sparkles,
    text: "Smart compression",
    description: "Optimal quality-to-size ratio",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "image-resizer",
    name: "Image Resizer",
    description: "Resize images to any dimension",
    icon: Image,
  },
  {
    id: "png-to-jpg",
    name: "PNG to JPG",
    description: "Convert PNG images to JPG format",
    icon: FileImage,
  },
  {
    id: "image-converter",
    name: "Image Converter",
    description: "Convert between all image formats",
    icon: FileImage,
  },
];

const faqs: FAQItem[] = [
  {
    question: "How does image compression work?",
    answer:
      "Our tool uses advanced algorithms to reduce file size while maintaining visual quality. For lossy formats (JPEG, WebP), it removes imperceptible details. For PNG, it optimizes the encoding.",
  },
  {
    question: "Will compression reduce image quality?",
    answer:
      "It depends on your settings. At quality levels above 85, the difference is usually imperceptible. Lower quality settings trade some visual fidelity for much smaller file sizes.",
  },
  {
    question: "What's the best format for compression?",
    answer:
      "WebP typically offers the best compression with excellent quality. JPEG is widely compatible. PNG is best for images with transparency. AVIF offers cutting-edge compression but limited browser support.",
  },
  {
    question: "Can I compress multiple images at once?",
    answer:
      "Yes! You can select or drag multiple files for batch compression. All files will be processed with the same settings and can be downloaded individually or as a ZIP.",
  },
];

export default function ImageCompressor() {
  const { compress, isCompressing, error, clearError } = useImageCompress();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState(FORMATS.JPEG);
  const [maintainFormat, setMaintainFormat] = useState(true);
  const [quality, setQuality] = useState(85);
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (selectedFiles: File[]) => {
      const imageFiles = selectedFiles.filter((file) =>
        file.type.startsWith("image/"),
      );
      const newFiles: FileInfo[] = imageFiles.map((file) => ({
        file,
        status: "pending" as const,
        progress: 0,
        originalSize: file.size,
        previewUrl: URL.createObjectURL(file),
      }));
      setFiles((prev) => [...prev, ...newFiles]);
      clearError();
    },
    [clearError],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      handleFiles(selectedFiles);
    },
    [handleFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    },
    [handleFiles],
  );

  const compressFile = useCallback(
    async (fileIndex: number) => {
      const fileInfo = files[fileIndex];
      if (!fileInfo || fileInfo.status === "processing") return;

      setFiles((prev) =>
        prev.map((f, i) =>
          i === fileIndex ? { ...f, status: "processing" as const } : f,
        ),
      );

      try {
        const options: CompressOptions = {
          quality,
          maintainFormat,
          format: maintainFormat
            ? undefined
            : (selectedFormat.extension as CompressFormat),
          maxWidth,
          maxHeight,
        };

        const result = await compress(fileInfo.file, options);

        setFiles((prev) =>
          prev.map((f, i) =>
            i === fileIndex
              ? {
                  ...f,
                  status: "completed" as const,
                  result: result?.blob,
                  compressedSize: result?.compressedSize,
                  compressionRatio: result?.compressionRatio,
                  progress: 100,
                  previewUrl:
                    f.previewUrl ||
                    (result?.blob
                      ? URL.createObjectURL(result.blob)
                      : undefined),
                }
              : f,
          ),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === fileIndex
              ? {
                  ...f,
                  status: "error" as const,
                  error:
                    err instanceof Error ? err.message : "Compression failed",
                }
              : f,
          ),
        );
      }
    },
    [
      files,
      compress,
      quality,
      maintainFormat,
      selectedFormat,
      maxWidth,
      maxHeight,
    ],
  );

  const compressAll = useCallback(async () => {
    const pendingFiles = files
      .map((f, i) => ({ file: f, index: i }))
      .filter(
        ({ file }) => file.status === "pending" || file.status === "error",
      );

    for (const { index } of pendingFiles) {
      await compressFile(index);
    }
  }, [files, compressFile]);

  const downloadFile = useCallback(
    (fileInfo: FileInfo) => {
      if (!fileInfo.result) return;

      const link = document.createElement("a");
      const outputFormat = maintainFormat
        ? fileInfo.file.name.split(".").pop()
        : selectedFormat.extension;
      const baseName =
        fileInfo.file.name.substring(0, fileInfo.file.name.lastIndexOf(".")) ||
        fileInfo.file.name;
      link.href = URL.createObjectURL(fileInfo.result);
      link.download = `${baseName}-compressed.${outputFormat}`;
      link.click();
    },
    [maintainFormat, selectedFormat],
  );

  const downloadAll = useCallback(async () => {
    const completedFiles = files.filter(
      (f) => f.status === "completed" && f.result,
    );

    if (completedFiles.length === 0) return;

    if (completedFiles.length === 1) {
      downloadFile(completedFiles[0]);
      return;
    }

    const zip = new JSZip();
    completedFiles.forEach((fileInfo) => {
      if (fileInfo.result) {
        const outputFormat = maintainFormat
          ? fileInfo.file.name.split(".").pop()
          : selectedFormat.extension;
        const baseName =
          fileInfo.file.name.substring(
            0,
            fileInfo.file.name.lastIndexOf("."),
          ) || fileInfo.file.name;
        zip.file(`${baseName}-compressed.${outputFormat}`, fileInfo.result);
      }
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipBlob);
    link.download = "compressed-images.zip";
    link.click();
  }, [files, downloadFile, maintainFormat, selectedFormat]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].previewUrl) {
        URL.revokeObjectURL(newFiles[index].previewUrl!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const clearAll = useCallback(() => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setFiles([]);
    clearError();
  }, [files, clearError]);

  const openCarousel = useCallback((index: number) => {
    setCarouselIndex(index);
    setShowCarousel(true);
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }, []);

  const completedCount = files.filter((f) => f.status === "completed").length;
  const canCompress = files.some(
    (f) => f.status === "pending" || f.status === "error",
  );
  const hasCompletedFiles = completedCount > 0;

  const formatOptions = Object.values(FORMATS);

  // Calculate total savings
  const totalOriginalSize = files.reduce(
    (sum, f) => sum + (f.originalSize || 0),
    0,
  );
  const totalCompressedSize = files.reduce(
    (sum, f) => sum + (f.compressedSize || 0),
    0,
  );
  const totalSavings = totalOriginalSize - totalCompressedSize;
  const averageRatio =
    totalOriginalSize > 0 ? (totalSavings / totalOriginalSize) * 100 : 0;

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 lg:py-6 py-6 sm:py-12">
        {/* Hero Section */}
        <ToolHeader
          title={{ highlight: "Image", main: "Compressor" }}
          subtitle="Reduce image file sizes by up to 90% while maintaining visual quality. Compress JPG, PNG, WebP, and AVIF images instantly in your browser."
          badge={{ text: "Compress Images Online Free", icon: Minimize2 }}
          features={features}
        />


        {/* Main Compressor Interface */}
        <div className="space-y-6">
          {/* Hidden file input - always available */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Settings Card - Redesigned */}
          <div
            className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up relative z-20"
            style={{ animationDelay: "0.3s" }}
          >
            {/* Card Header */}
            <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                Compression Settings
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Format Selection - Improved */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-muted-foreground" />
                    Output Format
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintainFormat}
                      onChange={(e) => setMaintainFormat(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors duration-200"></div>
                    <div className="absolute left-[2px] top-[2px] bg-background w-5 h-5 rounded-full transition-transform duration-200 peer-checked:translate-x-5"></div>
                    <span className="ml-3 text-sm text-muted-foreground">
                      Keep original
                    </span>
                  </label>
                </div>

                {!maintainFormat && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {formatOptions.map((format) => (
                      <button
                        key={format.extension}
                        onClick={() =>
                          setSelectedFormat(format as typeof selectedFormat)
                        }
                        className={cn(
                          "relative px-4 py-3 rounded-xl border-2 transition-all duration-200",
                          selectedFormat.extension === format.extension
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-primary/50 bg-card/50",
                        )}
                      >
                        <div className="text-sm font-medium">
                          {format.displayName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format.name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quality Settings - Enhanced */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                    Quality
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-primary">
                      {quality}%
                    </div>
                  </div>
                </div>

                {/* Quality Presets */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Maximum", value: 95, size: "~90%", Icon: Crown },
                    { label: "High", value: 85, size: "~70%", Icon: Star },
                    { label: "Balanced", value: 70, size: "~50%", Icon: Scale },
                    { label: "Small", value: 50, size: "~30%", Icon: Package },
                  ].map((preset) => {
                    const Icon = preset.Icon;
                    return (
                      <button
                        key={preset.value}
                        onClick={() => setQuality(preset.value)}
                        className={cn(
                          "relative p-3 rounded-xl border-2 transition-all duration-200 group",
                          quality === preset.value
                            ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                            : "border-border/50 hover:border-primary/50 bg-card/50",
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-5 h-5 mx-auto mb-1 transition-colors",
                            quality === preset.value
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-primary",
                          )}
                        />
                        <div className="text-xs font-medium">
                          {preset.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {preset.size}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Enhanced Slider */}
                <div className="relative">
                  <Slider
                    value={[quality]}
                    onValueChange={(value) => setQuality(value[0])}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-3">
                    <div className="text-xs space-y-1">
                      <div className="font-medium text-muted-foreground">
                        Smaller file
                      </div>
                      <div className="text-[10px] text-muted-foreground/70">
                        Lower quality
                      </div>
                    </div>
                    <div className="text-xs space-y-1 text-right">
                      <div className="font-medium text-muted-foreground">
                        Better quality
                      </div>
                      <div className="text-[10px] text-muted-foreground/70">
                        Larger file
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Compression Impact */}
                <div className="bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-green-500/10 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Estimated size reduction
                    </span>
                    <span className="font-bold text-primary">
                      {Math.round(100 - quality)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-black/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-500"
                      style={{ width: `${100 - quality}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Size Limits - Redesigned */}
              <CollapsibleSection title="Size Limits" defaultOpen={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      Max Width
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={maxWidth || ""}
                        onChange={(e) =>
                          setMaxWidth(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        placeholder="Original"
                        className="w-full pl-3 pr-12 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        px
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground rotate-90" />
                      Max Height
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={maxHeight || ""}
                        onChange={(e) =>
                          setMaxHeight(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        placeholder="Original"
                        className="w-full pl-3 pr-12 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        px
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Images will be resized proportionally if limits are exceeded
                </p>
              </CollapsibleSection>
            </div>
          </div>

          {/* File Upload Area - Only show when no files */}
          {files.length === 0 && (
            <div
              className="relative animate-fade-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
                  isDragging
                    ? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20"
                    : "border-border bg-card/50 hover:border-primary hover:bg-card hover:shadow-lg hover:shadow-primary/10"
                }`}
              >
                <div className="p-8 sm:p-12 text-center pointer-events-none">
                  <Upload
                    className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 transition-all duration-300 ${
                      isDragging
                        ? "text-primary scale-110 rotate-12"
                        : "text-muted-foreground"
                    }`}
                  />
                  <p className="text-base sm:text-lg font-medium mb-2">
                    Drop images here or click to browse
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground px-4">
                    Supports JPG, PNG, WebP, AVIF, and more
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Maximum 50MB per file
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Files List - Only show when files exist */}
          {files.length > 0 && (
            <div className="space-y-6">
              <div
                className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up"
                style={{ animationDelay: "0.5s" }}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
              >
                {/* Card Header */}
                <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileImage className="w-5 h-5 text-primary" />
                      Files ({files.length})
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        size="sm"
                        variant="outline"
                        className="gap-2 flex-1 sm:flex-none"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Add more</span>
                        <span className="sm:hidden">Add</span>
                      </Button>
                      {canCompress && (
                        <Button
                          onClick={compressAll}
                          disabled={isCompressing}
                          size="sm"
                          className="gap-2 flex-1 sm:flex-none"
                        >
                          {isCompressing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="hidden sm:inline">
                                Compressing...
                              </span>
                              <span className="sm:hidden">Compress</span>
                            </>
                          ) : (
                            <>
                              <Minimize2 className="w-4 h-4" />
                              <span className="hidden sm:inline">
                                Compress All
                              </span>
                              <span className="sm:hidden">Compress</span>
                            </>
                          )}
                        </Button>
                      )}
                      {hasCompletedFiles && (
                        <Button
                          onClick={downloadAll}
                          size="sm"
                          variant="default"
                          className="gap-2 flex-1 sm:flex-none"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">
                            Download {completedCount > 1 ? "All" : ""}
                          </span>
                          <span className="sm:hidden">Download</span>
                        </Button>
                      )}
                      <Button
                        onClick={clearAll}
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Files Content */}
                <div className="p-6">
                  {/* Total Savings Summary */}
                  {totalCompressedSize > 0 && (
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Total savings
                          </p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {(totalSavings / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Average reduction
                          </p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {averageRatio.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* File List */}
                  <div className="space-y-2">
                    {files.map((fileInfo, index) => (
                      <div
                        key={index}
                        className="bg-background/50 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          {/* Preview */}
                          {fileInfo.previewUrl && (
                            <button
                              onClick={() => openCarousel(index)}
                              className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all duration-200"
                            >
                              <img
                                src={fileInfo.previewUrl}
                                alt={fileInfo.file.name}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          )}

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate mb-1">
                              {fileInfo.file.name}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">
                                {formatFileSize(fileInfo.originalSize!)}
                              </span>
                              {fileInfo.compressedSize && (
                                <>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-sm font-medium text-primary">
                                    {formatFileSize(fileInfo.compressedSize)}
                                  </span>
                                  <span className="text-sm px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                                    -{fileInfo.compressionRatio?.toFixed(0)}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Status and Actions */}
                          <div className="flex items-center gap-2">
                            {fileInfo.status === "processing" && (
                              <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10">
                                  <svg className="w-10 h-10 rotate-[-90deg]">
                                    <circle
                                      cx="20"
                                      cy="20"
                                      r="16"
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      fill="none"
                                      className="text-muted-foreground/20"
                                    />
                                    <circle
                                      cx="20"
                                      cy="20"
                                      r="16"
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      fill="none"
                                      strokeDasharray={`${2 * Math.PI * 16}`}
                                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - fileInfo.progress / 100)}`}
                                      className="text-primary transition-all duration-300"
                                    />
                                  </svg>
                                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                                    {fileInfo.progress}%
                                  </span>
                                </div>
                              </div>
                            )}
                            {fileInfo.status === "completed" && (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <Button
                                  onClick={() => downloadFile(fileInfo)}
                                  size="icon"
                                  variant="ghost"
                                  className="hover:bg-primary/10"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {fileInfo.status === "error" && (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-destructive" />
                                <span className="text-xs text-destructive max-w-[150px] truncate">
                                  {fileInfo.error}
                                </span>
                              </div>
                            )}
                            {fileInfo.status === "pending" &&
                              !isCompressing && (
                                <Button
                                  onClick={() => compressFile(index)}
                                  size="icon"
                                  variant="ghost"
                                  className="hover:bg-primary/10"
                                >
                                  <Minimize2 className="w-4 h-4" />
                                </Button>
                              )}
                            <Button
                              onClick={() => removeFile(index)}
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-start gap-3 animate-fade-in-up">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button onClick={clearError}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Image Carousel Modal */}
        <ImageCarouselModal
          isOpen={showCarousel}
          onClose={() => setShowCarousel(false)}
          files={files}
          currentIndex={carouselIndex}
          formatFileSize={formatFileSize}
        />

        {/* How it works */}
        <div className="space-y-6 mt-12">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Info className="w-6 h-6 text-primary" />
            How It Works
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <h3 className="font-semibold">Select your images</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload JPG, PNG, WebP, or AVIF images
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <h3 className="font-semibold">Choose compression settings</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Adjust quality and format to your needs
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <h3 className="font-semibold">Download optimized images</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Get smaller files with preserved quality
              </p>
            </div>
          </div>
        </div>

        {/* Format Comparison */}
        <div className="space-y-6 mt-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <File className="w-6 h-6 text-primary" />
            Format Comparison
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                    JPG
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">JPEG</h3>
                  <p className="text-xs text-muted-foreground">
                    Best for photos, no transparency
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Compression</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <div className="w-2 h-2 rounded-full bg-border"></div>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quality</span>
                  <span className="text-xs">Good</span>
                </div>
              </div>
            </div>

            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                    WebP
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">WebP</h3>
                  <p className="text-xs text-muted-foreground">
                    Modern format, excellent compression
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Compression</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quality</span>
                  <span className="text-xs">Excellent</span>
                </div>
              </div>
            </div>

            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                  <span className="text-base font-bold text-green-600 dark:text-green-400">
                    PNG
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">PNG</h3>
                  <p className="text-xs text-muted-foreground">
                    Lossless, supports transparency
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Compression</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-2 h-2 rounded-full bg-border"></div>
                    <div className="w-2 h-2 rounded-full bg-border"></div>
                    <div className="w-2 h-2 rounded-full bg-border"></div>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quality</span>
                  <span className="text-xs">Lossless</span>
                </div>
              </div>
            </div>

            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                  <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                    AVIF
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">AVIF</h3>
                  <p className="text-xs text-muted-foreground">
                    Cutting-edge compression, limited support
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Compression</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quality</span>
                  <span className="text-xs">Best</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Tools */}
        <div className="mt-12 space-y-6">
          <RelatedTools tools={relatedTools} direction="responsive" />
        </div>

        {/* FAQ Section */}
        <div className="mt-12 space-y-6">
          <FAQ items={faqs} />
        </div>
      </div>
    </div>
  );
}
