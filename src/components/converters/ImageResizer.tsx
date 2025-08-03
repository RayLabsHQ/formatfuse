import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  Download,
  X,
  ArrowRight,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
  Sparkles,
  Info,
  Maximize,
  Square,
  Smartphone,
  Monitor,
  Tv,
  Image,
  Lock,
  Unlock,
} from "lucide-react";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";
import { CollapsibleSection } from "../ui/mobile/CollapsibleSection";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { FileDropZone } from "../ui/FileDropZone";
import { cn } from "../../lib/utils";
import { ImageCarouselModal } from "./ImageCarouselModal";
import JSZip from "jszip";
import { useImageResizer } from "../../hooks/useImageResizer";

interface FileInfo {
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  result?: Blob;
  error?: string;
  originalSize?: number;
  resizedSize?: number;
  originalDimensions?: { width: number; height: number };
  resizedDimensions?: { width: number; height: number };
  previewUrl?: string;
}

interface PresetDimension {
  name: string;
  width: number;
  height: number;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

const PRESET_DIMENSIONS: PresetDimension[] = [
  // Social Media
  { name: "Instagram Square", width: 1080, height: 1080, icon: Square, category: "Social Media" },
  { name: "Instagram Story", width: 1080, height: 1920, icon: Smartphone, category: "Social Media" },
  { name: "Facebook Cover", width: 1200, height: 630, icon: Monitor, category: "Social Media" },
  { name: "Twitter Header", width: 1500, height: 500, icon: Monitor, category: "Social Media" },
  
  // Standard Resolutions
  { name: "HD (720p)", width: 1280, height: 720, icon: Monitor, category: "Standard" },
  { name: "Full HD (1080p)", width: 1920, height: 1080, icon: Monitor, category: "Standard" },
  { name: "2K", width: 2560, height: 1440, icon: Tv, category: "Standard" },
  { name: "4K", width: 3840, height: 2160, icon: Tv, category: "Standard" },
  
  // Web Common
  { name: "Thumbnail", width: 400, height: 300, icon: Image, category: "Web" },
  { name: "Web Banner", width: 728, height: 90, icon: Monitor, category: "Web" },
  { name: "Hero Image", width: 1920, height: 600, icon: Monitor, category: "Web" },
  { name: "Blog Featured", width: 1200, height: 800, icon: Image, category: "Web" },
];

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Powered by WebAssembly" },
  {
    icon: Sparkles,
    text: "Smart resizing",
    description: "Multiple algorithms available",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "image-compressor",
    name: "Image Compressor",
    description: "Reduce file size without quality loss",
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
    question: "What resize methods are available?",
    answer:
      "We offer multiple algorithms: Lanczos3 (best quality), Mitchell (balanced), CatRom (sharp details), Triangle (fast), HQX (pixel art), and Magic Kernel (advanced sharpening).",
  },
  {
    question: "Can I resize multiple images at once?",
    answer:
      "Yes! You can select or drag multiple files for batch resizing. All files will be processed with the same dimensions and can be downloaded individually or as a ZIP.",
  },
  {
    question: "What's the difference between stretch and contain?",
    answer:
      "Stretch resizes the image to fill the exact dimensions, which may distort the image. Contain maintains the aspect ratio and fits the image within the dimensions, adding transparent padding if needed.",
  },
  {
    question: "What's the maximum image size supported?",
    answer:
      "We recommend images under 50MB for optimal performance. Larger images may work but could be slower to process, especially at high resolutions.",
  },
];

export default function ImageResizer() {
  const { resize, isResizing, error, clearError } = useImageResizer();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [method, setMethod] = useState<"lanczos3" | "catrom" | "mitchell" | "triangle" | "hqx" | "magicKernel">("lanczos3");
  const [fitMethod, setFitMethod] = useState<"stretch" | "contain">("stretch");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalAspectRatio = useRef<number | null>(null);

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

  const resizeFile = useCallback(
    async (fileIndex: number) => {
      const fileInfo = files[fileIndex];
      if (!fileInfo || fileInfo.status === "processing") return;

      setFiles((prev) =>
        prev.map((f, i) =>
          i === fileIndex ? { ...f, status: "processing" as const } : f,
        ),
      );

      try {
        const result = await resize(fileInfo.file, {
          width,
          height,
          method,
          fitMethod,
          onProgress: (progress) => {
            setFiles((prev) =>
              prev.map((f, i) =>
                i === fileIndex ? { ...f, progress } : f,
              ),
            );
          },
        });

        setFiles((prev) =>
          prev.map((f, i) =>
            i === fileIndex
              ? {
                  ...f,
                  status: "completed" as const,
                  result: result.blob,
                  resizedSize: result.blob.size,
                  originalDimensions: result.originalDimensions,
                  resizedDimensions: result.resizedDimensions,
                  progress: 100,
                  previewUrl: f.previewUrl || URL.createObjectURL(result.blob),
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
                  error: err instanceof Error ? err.message : "Resize failed",
                }
              : f,
          ),
        );
      }
    },
    [files, resize, width, height, method, fitMethod],
  );

  const resizeAll = useCallback(async () => {
    const pendingFiles = files
      .map((f, i) => ({ file: f, index: i }))
      .filter(
        ({ file }) => file.status === "pending" || file.status === "error",
      );

    for (const { index } of pendingFiles) {
      await resizeFile(index);
    }
  }, [files, resizeFile]);

  const downloadFile = useCallback(
    (fileInfo: FileInfo) => {
      if (!fileInfo.result) return;

      const link = document.createElement("a");
      const extension = fileInfo.file.name.split(".").pop() || "jpg";
      const baseName =
        fileInfo.file.name.substring(0, fileInfo.file.name.lastIndexOf(".")) ||
        fileInfo.file.name;
      link.href = URL.createObjectURL(fileInfo.result);
      link.download = `${baseName}-${width}x${height}.${extension}`;
      link.click();
    },
    [width, height],
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
        const extension = fileInfo.file.name.split(".").pop() || "jpg";
        const baseName =
          fileInfo.file.name.substring(
            0,
            fileInfo.file.name.lastIndexOf("."),
          ) || fileInfo.file.name;
        zip.file(`${baseName}-${width}x${height}.${extension}`, fileInfo.result);
      }
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipBlob);
    link.download = "resized-images.zip";
    link.click();
  }, [files, downloadFile, width, height]);

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

  const selectPreset = useCallback((preset: PresetDimension) => {
    setWidth(preset.width);
    setHeight(preset.height);
    setSelectedPreset(preset.name);
    originalAspectRatio.current = preset.width / preset.height;
  }, []);

  // Update height when width changes and aspect ratio is locked
  useEffect(() => {
    if (maintainAspectRatio && originalAspectRatio.current !== null) {
      const newHeight = Math.round(width / originalAspectRatio.current);
      setHeight(newHeight);
    }
  }, [width, maintainAspectRatio]);

  // Update width when height changes and aspect ratio is locked
  const handleHeightChange = useCallback((newHeight: number) => {
    setHeight(newHeight);
    if (maintainAspectRatio && originalAspectRatio.current !== null) {
      const newWidth = Math.round(newHeight * originalAspectRatio.current);
      setWidth(newWidth);
    }
  }, [maintainAspectRatio]);

  // Set initial aspect ratio when toggling maintain aspect ratio
  const handleAspectRatioToggle = useCallback(() => {
    if (!maintainAspectRatio) {
      originalAspectRatio.current = width / height;
    }
    setMaintainAspectRatio(!maintainAspectRatio);
  }, [maintainAspectRatio, width, height]);

  const completedCount = files.filter((f) => f.status === "completed").length;
  const canResize = files.some(
    (f) => f.status === "pending" || f.status === "error",
  );
  const hasCompletedFiles = completedCount > 0;

  return (
    <div className="min-h-screen w-full">
      {/* Resizing-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div className="absolute top-1/4 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 left-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 lg:py-6 py-6 sm:py-12 relative z-10">
        {/* Hero Section */}
        <ToolHeader
          title={{ highlight: "Image", main: "Resizer" }}
          subtitle="Resize images to exact dimensions with advanced algorithms. Batch processing, preset dimensions, and smart scaling options."
          badge={{ text: "Resize Images Online Free", icon: Maximize }}
          features={features}
        />

        {/* Main Resizer Interface */}
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

          {/* Settings Card - Aligned with Image Converter Design */}
          <div
            className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-4 sm:p-6 animate-fade-in-up relative z-20"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Dimension Inputs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Dimensions</label>
                  <button
                    onClick={handleAspectRatioToggle}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {maintainAspectRatio ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Aspect ratio locked
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        Aspect ratio unlocked
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Width</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setWidth(Math.max(1, Math.min(10000, val)));
                          setSelectedPreset(null);
                        }}
                        className="w-full pl-3 pr-12 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        px
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Height</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          handleHeightChange(Math.max(1, Math.min(10000, val)));
                          setSelectedPreset(null);
                        }}
                        className="w-full pl-3 pr-12 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        px
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preset Dimensions */}
              <CollapsibleSection title="Preset Dimensions" defaultOpen={false}>
                <div className="mt-4 space-y-4">
                  {["Social Media", "Standard", "Web"].map((category) => (
                    <div key={category}>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">{category}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PRESET_DIMENSIONS
                          .filter((preset) => preset.category === category)
                          .map((preset) => {
                            const Icon = preset.icon;
                            return (
                              <button
                                key={preset.name}
                                onClick={() => selectPreset(preset)}
                                className={cn(
                                  "relative p-3 rounded-lg border transition-all duration-200 group text-left",
                                  selectedPreset === preset.name
                                    ? "border-primary bg-primary/10"
                                    : "border-border/50 hover:border-primary/50 bg-background/50",
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "w-4 h-4 mb-1 transition-colors",
                                    selectedPreset === preset.name
                                      ? "text-primary"
                                      : "text-muted-foreground group-hover:text-primary",
                                  )}
                                />
                                <div className="text-xs font-medium truncate">
                                  {preset.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {preset.width} × {preset.height}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Advanced Settings */}
              <CollapsibleSection title="Advanced Settings" defaultOpen={false}>
                <div className="mt-4 space-y-4">
                  {/* Resize Method */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Resize Algorithm</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as typeof method)}
                      className="w-full px-3 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="lanczos3">Lanczos3 (Best Quality)</option>
                      <option value="mitchell">Mitchell (Balanced)</option>
                      <option value="catrom">CatRom (Sharp)</option>
                      <option value="triangle">Triangle (Fast)</option>
                      <option value="hqx">HQX (Pixel Art)</option>
                      <option value="magicKernel">Magic Kernel (Advanced)</option>
                    </select>
                  </div>

                  {/* Fit Method */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fit Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setFitMethod("stretch")}
                        className={cn(
                          "p-3 rounded-lg border transition-all duration-200",
                          fitMethod === "stretch"
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-primary/50 bg-background/50",
                        )}
                      >
                        <div className="text-sm font-medium">Stretch</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Fill exact dimensions
                        </div>
                      </button>
                      <button
                        onClick={() => setFitMethod("contain")}
                        className={cn(
                          "p-3 rounded-lg border transition-all duration-200",
                          fitMethod === "contain"
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-primary/50 bg-background/50",
                        )}
                      >
                        <div className="text-sm font-medium">Contain</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Keep aspect ratio
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>

          {/* File Upload Area - Only show when no files */}
          {files.length === 0 && (
            <div
              className="relative animate-fade-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <FileDropZone
                onFilesSelected={handleFiles}
                accept="image/*"
                multiple={true}
                isDragging={isDragging}
                onDragStateChange={setIsDragging}
                title="Drop images here"
                subtitle="or click to browse"
                infoMessage="Supports JPG, PNG, WebP, GIF, BMP, and more"
                secondaryInfo="Maximum 50MB per file"
              />
            </div>
          )}

          {/* Files List - Only show when files exist */}
          {files.length > 0 && (
            <div className="space-y-6">
              <div
                className={cn(
                  "bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up transition-all duration-300",
                  isDragging && "border-primary bg-primary/5"
                )}
                style={{ animationDelay: "0.5s" }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const droppedFiles = Array.from(e.dataTransfer.files);
                  if (droppedFiles.length > 0) {
                    handleFiles(droppedFiles);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX;
                  const y = e.clientY;
                  if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
                    setIsDragging(false);
                  }
                }}
              >
                {/* Card Header */}
                <div className="border-b border-border/50 px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="text-lg font-semibold">
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
                      {canResize && (
                        <Button
                          onClick={resizeAll}
                          disabled={isResizing}
                          size="sm"
                          className="gap-2 flex-1 sm:flex-none"
                        >
                          {isResizing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="hidden sm:inline">
                                Resizing...
                              </span>
                              <span className="sm:hidden">Resize</span>
                            </>
                          ) : (
                            <>
                              <Maximize className="w-4 h-4" />
                              <span className="hidden sm:inline">
                                Resize All
                              </span>
                              <span className="sm:hidden">Resize</span>
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
                              {fileInfo.originalDimensions && (
                                <>
                                  <span className="text-xs text-muted-foreground">
                                    {fileInfo.originalDimensions.width} × {fileInfo.originalDimensions.height}
                                  </span>
                                </>
                              )}
                              {fileInfo.resizedDimensions && (
                                <>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-sm font-medium text-primary">
                                    {fileInfo.resizedDimensions.width} × {fileInfo.resizedDimensions.height}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    ({formatFileSize(fileInfo.resizedSize!)})
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
                                      strokeDasharray={100.53}
                                      strokeDashoffset={100.53 * (1 - fileInfo.progress / 100)}
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
                              !isResizing && (
                                <Button
                                  onClick={() => resizeFile(index)}
                                  size="icon"
                                  variant="ghost"
                                  className="hover:bg-primary/10"
                                >
                                  <Maximize className="w-4 h-4" />
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
                <h3 className="font-semibold">Set dimensions</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter custom dimensions or choose from presets
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <h3 className="font-semibold">Upload images</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Drag & drop or click to select your files
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <h3 className="font-semibold">Download resized images</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Get your perfectly sized images instantly
              </p>
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