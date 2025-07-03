import React, { useState, useRef, useCallback, useEffect } from "react";
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
  FileText,
  Image,
  FileQuestionMark,
} from "lucide-react";
import {
  getImageConverterComlink as getImageConverter,
  IMAGE_FORMATS,
  type ImageFormat,
} from "../../lib/image-converter-comlink";
import { getHeicImageConverter } from "../../lib/heic-image-converter";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { FormatSelect } from "../ui/format-select";
import { ToolHeader } from '../ui/ToolHeader';
import { cn } from "../../lib/utils";
import { ImageCarouselModal } from "./ImageCarouselModal";
import JSZip from "jszip";
import { useVirtualizer } from "@tanstack/react-virtual";

interface FileInfo {
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  result?: Blob;
  error?: string;
  previewUrl?: string;
}

interface ImageConverterProps {
  sourceFormat?: string;
  targetFormat?: string;
}

// Format configuration with display names and colors
const FORMATS: Record<
  string,
  ImageFormat & { displayName: string; color: string }
> = {
  PNG: { ...IMAGE_FORMATS.PNG, displayName: "PNG", color: "var(--tool-png)" },
  JPEG: { ...IMAGE_FORMATS.JPEG, displayName: "JPG", color: "var(--tool-jpg)" },
  WEBP: {
    ...IMAGE_FORMATS.WEBP,
    displayName: "WebP",
    color: "oklch(0.72 0.16 210)",
  },
  GIF: {
    ...IMAGE_FORMATS.GIF,
    displayName: "GIF",
    color: "oklch(0.72 0.18 152)",
  },
  BMP: {
    ...IMAGE_FORMATS.BMP,
    displayName: "BMP",
    color: "oklch(0.65 0.2 15)",
  },
  ICO: {
    ...IMAGE_FORMATS.ICO,
    displayName: "ICO",
    color: "oklch(0.75 0.16 73)",
  },
  TIFF: {
    ...IMAGE_FORMATS.TIFF,
    displayName: "TIFF",
    color: "oklch(0.7 0.18 285)",
  },
  AVIF: {
    ...IMAGE_FORMATS.AVIF,
    displayName: "AVIF",
    color: "oklch(0.72 0.16 210)",
  },
  HEIC: {
    ...IMAGE_FORMATS.HEIC,
    displayName: "HEIC",
    color: "oklch(0.72 0.18 15)",
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
    text: "Premium quality",
    description: "Lossless conversion options",
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
    id: "image-compressor",
    name: "Image Compressor",
    description: "Reduce file size without quality loss",
    icon: FileImage,
  },
  {
    id: "pdf-to-jpg",
    name: "PDF to JPG",
    description: "Convert PDF pages to images",
    icon: FileText,
  },
];

const faqs: FAQItem[] = [
  {
    question: "Is my data secure during conversion?",
    answer:
      "Yes! All conversions happen locally in your browser. Your files never leave your device or get uploaded to any server.",
  },
  {
    question: "What image formats are supported?",
    answer:
      "We support PNG, JPG/JPEG, WebP, GIF, BMP, ICO, TIFF, AVIF, and HEIC formats. You can convert between any of these formats.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "We recommend files under 100MB for optimal performance. Larger files may work but could be slower to process.",
  },
  {
    question: "Can I convert multiple images at once?",
    answer:
      "Yes! You can select or drag multiple files for batch conversion. All files will be processed and can be downloaded individually or as a ZIP.",
  },
];

export default function ImageConverter({
  sourceFormat,
  targetFormat,
}: ImageConverterProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isLossless, setIsLossless] = useState(true);
  const [qualityInput, setQualityInput] = useState("100");
  const parentRef = useRef<HTMLDivElement>(null);

  // Handle format lookup
  const getFormat = (formatName?: string) => {
    if (!formatName) return null;
    const upperFormat = formatName.toUpperCase();
    if (upperFormat === "JPG") return FORMATS.JPEG;
    return FORMATS[upperFormat];
  };

  const [selectedSourceFormat, setSelectedSourceFormat] = useState(
    getFormat(sourceFormat) || FORMATS.PNG,
  );
  const [selectedTargetFormat, setSelectedTargetFormat] = useState(
    getFormat(targetFormat) || FORMATS.JPEG,
  );
  const [quality, setQuality] = useState(100); // Default to lossless
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync quality input when quality changes from buttons
  useEffect(() => {
    setQualityInput(quality.toString());
  }, [quality]);

  // Update formats when props change
  useEffect(() => {
    const newSourceFormat = getFormat(sourceFormat);
    const newTargetFormat = getFormat(targetFormat);

    if (newSourceFormat) setSelectedSourceFormat(newSourceFormat);
    if (newTargetFormat) setSelectedTargetFormat(newTargetFormat);
  }, [sourceFormat, targetFormat]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, []);

  const showQualitySlider =
    selectedTargetFormat &&
    ["JPEG", "WEBP", "AVIF"].includes(selectedTargetFormat.name);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);

      // Auto-detect source format
      if (droppedFiles.length > 0) {
        const firstFile = droppedFiles[0];
        const extension = firstFile.name.split(".").pop()?.toUpperCase();
        const detectedFormat = getFormat(extension);
        if (detectedFormat) {
          setSelectedSourceFormat(detectedFormat);
        }
      }

      const newFiles = droppedFiles.map((file) => ({
        file,
        status: "pending" as const,
        progress: 0,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      }));

      setFiles((prev) => {
        const newFilesList = [...prev, ...newFiles];

        // Always auto-process files
        if (newFiles.length > 0) {
          setTimeout(() => {
            newFiles.forEach((fileInfo, index) => {
              processFile(fileInfo.file, prev.length + index);
            });
          }, 100);
        }

        return newFilesList;
      });
    },
    [files.length],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);

      // Auto-detect source format
      if (selectedFiles.length > 0) {
        const firstFile = selectedFiles[0];
        const extension = firstFile.name.split(".").pop()?.toUpperCase();
        const detectedFormat = getFormat(extension);
        if (detectedFormat) {
          setSelectedSourceFormat(detectedFormat);
        }
      }

      const newFiles = selectedFiles.map((file) => ({
        file,
        status: "pending" as const,
        progress: 0,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      }));

      setFiles((prev) => {
        const newFilesList = [...prev, ...newFiles];

        // Always auto-process files
        if (newFiles.length > 0) {
          setTimeout(() => {
            newFiles.forEach((fileInfo, index) => {
              processFile(fileInfo.file, prev.length + index);
            });
          }, 100);
        }

        return newFilesList;
      });
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove?.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    if (fileToRemove?.result && fileToRemove.status === "completed") {
      // Clean up result blob URL if it was created
      const resultUrl =
        fileToRemove.result instanceof Blob
          ? URL.createObjectURL(fileToRemove.result)
          : null;
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAllFiles = () => {
    // Clean up all preview URLs and result URLs
    files.forEach((file) => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      if (file.result && file.status === "completed") {
        const resultUrl =
          file.result instanceof Blob ? URL.createObjectURL(file.result) : null;
        if (resultUrl) URL.revokeObjectURL(resultUrl);
      }
    });
    setFiles([]);
  };

  const processFile = useCallback(
    async (fileToProcess: File, fileIndex: number) => {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === fileIndex
            ? { ...f, status: "processing" as const, progress: 0 }
            : f,
        ),
      );

      try {
        let convertedBlob: Blob;

        const isHeicSource =
          fileToProcess.type === "image/heic" ||
          fileToProcess.name.toLowerCase().endsWith(".heic") ||
          fileToProcess.name.toLowerCase().endsWith(".heif");

        if (isHeicSource) {
          const heicConverter = getHeicImageConverter();
          convertedBlob = await heicConverter.convert(
            fileToProcess,
            selectedTargetFormat,
            (progress) => {
              setFiles((prev) =>
                prev.map((f, i) => (i === fileIndex ? { ...f, progress } : f)),
              );
            },
            isLossless ? 100 : quality,
          );
        } else {
          const converter = getImageConverter();
          convertedBlob = await converter.convert(
            fileToProcess,
            selectedTargetFormat,
            (progress) => {
              setFiles((prev) =>
                prev.map((f, i) => (i === fileIndex ? { ...f, progress } : f)),
              );
            },
            isLossless ? 100 : quality,
          );
        }

        setFiles((prev) =>
          prev.map((f, i) =>
            i === fileIndex
              ? {
                  ...f,
                  status: "completed" as const,
                  result: convertedBlob,
                  progress: 100,
                  previewUrl:
                    f.previewUrl || URL.createObjectURL(convertedBlob),
                }
              : f,
          ),
        );
      } catch (error) {
        console.error("Conversion error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Conversion failed";
        setFiles((prev) =>
          prev.map((f, i) =>
            i === fileIndex
              ? {
                  ...f,
                  status: "error" as const,
                  error: errorMessage,
                }
              : f,
          ),
        );
      }
    },
    [selectedTargetFormat, isLossless, quality],
  );

  const downloadFile = (index: number) => {
    const fileInfo = files[index];
    if (!fileInfo || fileInfo.status !== "completed" || !fileInfo.result)
      return;

    const url = URL.createObjectURL(fileInfo.result);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      fileInfo.file.name.replace(/\.[^/.]+$/, "") +
      "." +
      (selectedTargetFormat?.extension || "jpg");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    try {
      const completedFiles = files.filter(
        (f) => f.status === "completed" && f.result,
      );

      if (completedFiles.length === 0) {
        console.error("No completed files to download");
        return;
      }

      if (completedFiles.length === 1) {
        const file = completedFiles[0];
        const url = URL.createObjectURL(file.result!);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          file.file.name.replace(/\.[^/.]+$/, "") +
          "." +
          (selectedTargetFormat?.extension || "jpg");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (completedFiles.length > 1) {
        const zip = new JSZip();

        completedFiles.forEach((file) => {
          const newName =
            file.file.name.replace(/\.[^/.]+$/, "") +
            "." +
            (selectedTargetFormat?.extension || "jpg");
          zip.file(newName, file.result!);
        });

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "converted-images.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading files:", error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const openPreview = (index: number) => {
    setCarouselIndex(index);
    setShowCarousel(true);
  };

  const hasCompletedFiles = files.some((f) => f.status === "completed");

  // Virtual list setup
  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated height of each file item
    overscan: 5, // Number of items to render outside visible area
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle background gradient */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
          <div
            className="absolute top-20 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
            style={{
              background: `radial-gradient(circle, ${selectedSourceFormat?.color}, transparent)`,
            }}
          />
          <div
            className="absolute bottom-20 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
            style={{
              background: `radial-gradient(circle, ${selectedTargetFormat?.color}, transparent)`,
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-6">
          {/* Header with Badge */}
          <ToolHeader
            title={
              <span>
                Convert{" "}
                <span style={{ color: selectedSourceFormat?.color }}>
                  {selectedSourceFormat?.displayName}
                </span>
                {" to "}
                <span style={{ color: selectedTargetFormat?.color }}>
                  {selectedTargetFormat?.displayName}
                </span>
              </span>
            }
            subtitle="Fast, secure image conversion right in your browser. No uploads, no servers, no limits."
            badge={{ text: "Convert Images Online Free", icon: Zap }}
            features={features}
          />


          {/* Main Converter Interface */}
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

            {/* Format Selection */}
            <div className="space-y-6">
              {/* Format Selection Card */}
              <div
                className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-4 sm:p-6 animate-fade-in-up relative z-20"
                style={{ animationDelay: "0.3s" }}
              >
                {/* Format Selectors - Mobile Optimized */}
                <div className="max-w-2xl mx-auto">
                  {/* Desktop Layout */}
                  <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] items-end gap-4">
                    <FormatSelect
                      label="From"
                      formats={Object.values(FORMATS)}
                      value={selectedSourceFormat}
                      onChange={(format) =>
                        setSelectedSourceFormat(
                          format as typeof selectedSourceFormat,
                        )
                      }
                    />

                    <div className="mb-1">
                      <button
                        type="button"
                        onClick={() => {
                          const temp = selectedSourceFormat;
                          setSelectedSourceFormat(selectedTargetFormat);
                          setSelectedTargetFormat(temp);
                        }}
                        className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 hover:scale-110 active:scale-95 transition-all duration-300 group"
                        aria-label="Swap formats"
                      >
                        <ArrowRight className="w-5 h-5 text-primary group-hover:rotate-180 transition-transform duration-300" />
                      </button>
                    </div>

                    <FormatSelect
                      label="To"
                      formats={Object.values(FORMATS)}
                      value={selectedTargetFormat}
                      onChange={(format) =>
                        setSelectedTargetFormat(
                          format as typeof selectedTargetFormat,
                        )
                      }
                    />
                  </div>

                  {/* Mobile Layout - Compact */}
                  <div className="sm:hidden space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-muted-foreground flex-shrink-0 w-12">
                        From
                      </label>
                      <div className="flex-1">
                        <FormatSelect
                          formats={Object.values(FORMATS)}
                          value={selectedSourceFormat}
                          onChange={(format) =>
                            setSelectedSourceFormat(
                              format as typeof selectedSourceFormat,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          const temp = selectedSourceFormat;
                          setSelectedSourceFormat(selectedTargetFormat);
                          setSelectedTargetFormat(temp);
                        }}
                        className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 active:scale-95 active:bg-primary/30 transition-all duration-300 touch-manipulation"
                        aria-label="Swap formats"
                      >
                        <ArrowUpDown className="w-6 h-6 text-primary" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-sm text-muted-foreground flex-shrink-0 w-12">
                        To
                      </label>
                      <div className="flex-1">
                        <FormatSelect
                          formats={Object.values(FORMATS)}
                          value={selectedTargetFormat}
                          onChange={(format) =>
                            setSelectedTargetFormat(
                              format as typeof selectedTargetFormat,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quality Selector - Mobile Optimized */}
                {showQualitySlider && (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <div className="max-w-2xl mx-auto">
                      {/* Desktop Layout */}
                      <div className="hidden sm:flex items-center justify-between mb-4">
                        <label className="text-sm font-medium">Quality</label>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 p-1 bg-background/50 rounded-lg">
                            <button
                              onClick={() => {
                                setIsLossless(true);
                                setQuality(100);
                              }}
                              className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                                isLossless
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-primary/10",
                              )}
                            >
                              Lossless
                            </button>
                            <button
                              onClick={() => {
                                setIsLossless(false);
                                setQuality(95);
                              }}
                              className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                                !isLossless && quality === 95
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-primary/10",
                              )}
                            >
                              High
                            </button>
                            <button
                              onClick={() => {
                                setIsLossless(false);
                                setQuality(85);
                              }}
                              className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                                !isLossless && quality === 85
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-primary/10",
                              )}
                            >
                              Balanced
                            </button>
                            <button
                              onClick={() => {
                                setIsLossless(false);
                                setQuality(70);
                              }}
                              className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                                !isLossless && quality === 70
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-primary/10",
                              )}
                            >
                              Small
                            </button>
                          </div>
                          {!isLossless && (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={qualityInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Allow only numbers
                                  if (val === "" || /^\d{0,3}$/.test(val)) {
                                    setQualityInput(val);
                                  }
                                }}
                                onBlur={() => {
                                  const num = parseInt(qualityInput);
                                  if (!qualityInput || isNaN(num)) {
                                    setQuality(85);
                                    setQualityInput("85");
                                  } else {
                                    const clamped = Math.min(
                                      100,
                                      Math.max(10, num),
                                    );
                                    setQuality(clamped);
                                    setQualityInput(clamped.toString());
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  }
                                }}
                                className="w-14 px-2 py-1 text-sm text-center bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                              />
                              <span className="text-sm text-muted-foreground">
                                %
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mobile Layout - Vertical Stack */}
                      <div className="sm:hidden space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Quality</label>
                          {!isLossless && (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={qualityInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Allow only numbers
                                  if (val === "" || /^\d{0,3}$/.test(val)) {
                                    setQualityInput(val);
                                  }
                                }}
                                onBlur={() => {
                                  const num = parseInt(qualityInput);
                                  if (!qualityInput || isNaN(num)) {
                                    setQuality(85);
                                    setQualityInput("85");
                                  } else {
                                    const clamped = Math.min(
                                      100,
                                      Math.max(10, num),
                                    );
                                    setQuality(clamped);
                                    setQualityInput(clamped.toString());
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  }
                                }}
                                className="w-12 px-1 py-1 text-sm text-center bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                              />
                              <span className="text-sm text-muted-foreground">
                                %
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-1 p-1 bg-background/50 rounded-lg">
                          <button
                            onClick={() => {
                              setIsLossless(true);
                              setQuality(100);
                            }}
                            className={cn(
                              "px-2 py-2 text-[11px] font-medium rounded-md transition-all duration-200",
                              isLossless
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-primary/10",
                            )}
                          >
                            Lossless
                          </button>
                          <button
                            onClick={() => {
                              setIsLossless(false);
                              setQuality(95);
                            }}
                            className={cn(
                              "px-2 py-2 text-[11px] font-medium rounded-md transition-all duration-200",
                              !isLossless && quality === 95
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-primary/10",
                            )}
                          >
                            High
                          </button>
                          <button
                            onClick={() => {
                              setIsLossless(false);
                              setQuality(85);
                            }}
                            className={cn(
                              "px-2 py-2 text-[11px] font-medium rounded-md transition-all duration-200",
                              !isLossless && quality === 85
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-primary/10",
                            )}
                          >
                            Balanced
                          </button>
                          <button
                            onClick={() => {
                              setIsLossless(false);
                              setQuality(70);
                            }}
                            className={cn(
                              "px-2 py-2 text-[11px] font-medium rounded-md transition-all duration-200",
                              !isLossless && quality === 70
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-primary/10",
                            )}
                          >
                            Small
                          </button>
                        </div>
                      </div>

                      {/* Slider - Both Desktop and Mobile */}
                      {!isLossless && (
                        <>
                          <Slider
                            value={[quality]}
                            onValueChange={(value) => setQuality(value[0])}
                            min={10}
                            max={100}
                            step={5}
                            className="w-full mt-4"
                          />
                          <div className="flex justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              Smaller file
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Better quality
                            </span>
                          </div>
                        </>
                      )}
                      {isLossless && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Maximum quality with no compression artifacts
                        </p>
                      )}
                    </div>
                  </div>
                )}
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
                        Support for PNG, JPG, WebP, GIF, BMP, ICO, TIFF, AVIF,
                        HEIC
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Max recommended size: 100MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Files List - Only show when files exist */}
            {files.length > 0 && (
              <div className="space-y-6">
                <div
                  className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6 animate-fade-in-up"
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
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
                      {hasCompletedFiles && (
                        <Button
                          onClick={downloadAll}
                          size="sm"
                          variant="default"
                          className="gap-2 flex-1 sm:flex-none"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">
                            {files.filter((f) => f.status === "completed")
                              .length > 1
                              ? "Download All"
                              : "Download"}
                          </span>
                          <span className="sm:hidden">Download</span>
                        </Button>
                      )}
                      <Button
                        onClick={removeAllFiles}
                        size="sm"
                        variant="outline"
                        className="gap-2 hover:border-destructive hover:bg-destructive/10 hover:text-destructive flex-1 sm:flex-none"
                      >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove all</span>
                        <span className="sm:hidden">Clear</span>
                      </Button>
                    </div>
                  </div>

                  <div
                    ref={parentRef}
                    className="max-h-[600px] overflow-auto rounded-lg"
                    style={{
                      height: Math.min(600, files.length * 80 + 16),
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
                        const file = files[virtualItem.index];
                        const index = virtualItem.index;
                        return (
                          <div
                            key={virtualItem.key}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: `${virtualItem.size}px`,
                              transform: `translateY(${virtualItem.start}px)`,
                            }}
                          >
                            <div className="p-3 m-1 rounded-lg bg-background/50 border border-border/30 hover:border-border/50 transition-all duration-300">
                              <div className="flex items-center gap-3">
                                <div
                                  className="relative w-12 h-12 flex-shrink-0 cursor-pointer group/preview rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-all duration-300"
                                  onClick={() => openPreview(index)}
                                >
                                  {file.previewUrl ? (
                                    <>
                                      <img
                                        src={file.previewUrl}
                                        alt={file.file.name}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                        <div className="opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300">
                                          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                            <svg
                                              className="w-4 h-4 text-gray-800"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                              />
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                              />
                                            </svg>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted/50">
                                      <FileImage className="w-6 h-6 text-muted-foreground group-hover/preview:text-primary transition-colors" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {file.file.name}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                    <span>
                                      {formatFileSize(file.file.size)}
                                    </span>
                                    {file.status === "processing" && (
                                      <span className="flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        {file.progress}%
                                      </span>
                                    )}
                                    {file.status === "completed" &&
                                      file.result && (
                                        <span className="flex items-center gap-1 text-green-500">
                                          <CheckCircle2 className="w-3 h-3" />
                                          {formatFileSize(file.result.size)}
                                        </span>
                                      )}
                                    {file.status === "error" && (
                                      <span className="flex items-center gap-1 text-destructive">
                                        <AlertCircle className="w-3 h-3" />
                                        {file.error || "Error"}
                                      </span>
                                    )}
                                  </div>

                                  {/* Progress Bar */}
                                  {file.status === "processing" && (
                                    <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                                        style={{ width: `${file.progress}%` }}
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  {file.status === "completed" && (
                                    <Button
                                      onClick={() => downloadFile(index)}
                                      size="sm"
                                      variant="ghost"
                                      className="gap-1"
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  )}

                                  <Button
                                    onClick={() => removeFile(index)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Info Sections */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* How It Works */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Info className="w-6 h-6 text-primary" />
                How It Works
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Select formats</p>
                    <p className="text-sm text-muted-foreground">
                      Choose your source and target image formats
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Upload images</p>
                    <p className="text-sm text-muted-foreground">
                      Drag & drop or click to select your files
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Download results</p>
                    <p className="text-sm text-muted-foreground">
                      Get your converted images instantly
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Format Information */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <FileQuestionMark className="w-6 h-6 text-primary" />
                Supported Formats
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {Object.values(FORMATS).map((format) => {
                  const formatKey = format.displayName.toLowerCase();
                  const currentFrom = sourceFormat?.toLowerCase() || "png";
                  const currentTo = targetFormat?.toLowerCase() || "jpg";

                  // Determine the conversion URL
                  let href = "#";
                  if (formatKey !== currentTo) {
                    // If clicking a format different from target, make it the new target
                    href = `/convert/${currentFrom}-to-${formatKey}`;
                  } else if (formatKey !== currentFrom) {
                    // If clicking the current target format, swap it to source
                    href = `/convert/${formatKey}-to-${currentFrom}`;
                  }
                  // If it's both source and target (same format conversion), don't link

                  const isClickable = !(
                    formatKey === currentFrom && formatKey === currentTo
                  );

                  return isClickable ? (
                    <a
                      key={format.name}
                      href={href}
                      className="p-3 rounded-lg bg-card/30 border border-border/30 text-center hover:bg-card/50 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                    >
                      <p
                        className="font-medium text-sm"
                        style={{ color: format.color }}
                      >
                        {format.displayName}
                      </p>
                    </a>
                  ) : (
                    <div
                      key={format.name}
                      className="p-3 rounded-lg bg-card/30 border border-border/30 text-center opacity-50 cursor-not-allowed"
                    >
                      <p
                        className="font-medium text-sm"
                        style={{ color: format.color }}
                      >
                        {format.displayName}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground">
                All major image formats supported with high-quality conversion
                algorithms.
              </p>
            </div>

            {/* Related Tools */}
            <div className="space-y-6">
              <RelatedTools tools={relatedTools} direction="vertical" />
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 space-y-6">
            <FAQ items={faqs} />
          </div>
        </div>
      </section>

      {/* Image Carousel Modal */}
      <ImageCarouselModal
        isOpen={showCarousel}
        onClose={() => setShowCarousel(false)}
        files={files}
        currentIndex={carouselIndex}
        formatFileSize={formatFileSize}
      />
    </div>
  );
}
