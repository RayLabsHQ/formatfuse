import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  Download,
  FileText,
  Settings2,
  AlertCircle,
  Shield,
  Zap,
  ChevronRight,
  Loader2,
  Info,
  Package,
  Minimize2,
  CheckCircle2,
  ArrowRight,
  FileDown,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeaderWithFeatures } from "../ui/ToolHeaderWithFeatures";
import { CollapsibleSection } from "../ui/mobile/CollapsibleSection";
import { cn } from "../../lib/utils";
import { Slider } from "../ui/slider";
import { usePdfOperations } from "../../hooks/usePdfOperations";
import FileSaver from "file-saver";

const { saveAs } = FileSaver;

interface CompressionOptions {
  quality: "low" | "medium" | "high" | "custom";
  customQuality?: number;
  removeMetadata: boolean;
  optimizeImages: boolean;
  grayscale: boolean;
  imageQuality: number;
}

interface FileInfo {
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  result?: Blob;
  error?: string;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Instant compression" },
  {
    icon: Package,
    text: "Smart optimization",
    description: "Best quality-to-size ratio",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "pdf-merge",
    name: "PDF Merge",
    description: "Combine multiple PDFs",
    icon: FileText,
  },
  {
    id: "pdf-split",
    name: "PDF Split",
    description: "Split PDFs into parts",
    icon: FileText,
  },
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Convert images to PDF",
    icon: FileDown,
  },
];

const faqs: FAQItem[] = [
  {
    question: "How much can PDF compression reduce file size?",
    answer:
      "Compression typically reduces file size by 20-80% depending on the content. PDFs with many images see the most reduction, while text-only PDFs compress less. Our smart compression maintains readability while achieving optimal size reduction.",
  },
  {
    question: "What's the difference between compression quality levels?",
    answer:
      "High quality preserves almost all detail (10-30% reduction), Medium balances quality and size (30-60% reduction), and Low maximizes compression (50-80% reduction). Custom mode lets you fine-tune the exact balance you need.",
  },
  {
    question: "Will compression affect text quality?",
    answer:
      "Text remains sharp and searchable at all compression levels. Only embedded images are compressed. If you enable grayscale conversion, color images become black and white but text quality is preserved.",
  },
  {
    question: "Can I batch compress multiple PDFs?",
    answer:
      "Yes! You can select multiple PDFs and compress them all with the same settings. Each file is processed individually and can be downloaded separately or all together as a ZIP file.",
  },
];

const QUALITY_PRESETS = {
  high: {
    label: "High Quality",
    description: "Minimal compression",
    imageQuality: 0.85,
    value: 85,
  },
  medium: {
    label: "Balanced",
    description: "Good quality & size",
    imageQuality: 0.65,
    value: 65,
  },
  low: {
    label: "Max Compression",
    description: "Smallest file size",
    imageQuality: 0.45,
    value: 45,
  },
};

export default function PdfCompress() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { compress, isProcessing, error } = usePdfOperations();

  const [options, setOptions] = useState<CompressionOptions>({
    quality: "medium",
    removeMetadata: true,
    optimizeImages: true,
    grayscale: false,
    imageQuality: 0.65,
  });

  const handleFiles = useCallback((selectedFiles: File[]) => {
    const pdfFiles = selectedFiles.filter(
      (file) => file.type === "application/pdf"
    );
    const newFiles: FileInfo[] = pdfFiles.map((file) => ({
      file,
      status: "pending" as const,
      progress: 0,
      originalSize: file.size,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      handleFiles(selectedFiles);
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleQualityPreset = (preset: "low" | "medium" | "high") => {
    setOptions((prev) => ({
      ...prev,
      quality: preset,
      imageQuality: QUALITY_PRESETS[preset].imageQuality,
    }));
  };

  const handleCompress = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    // Update status to processing
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" ? { ...f, status: "processing" as const } : f
      )
    );

    // Process each file
    for (let i = 0; i < pendingFiles.length; i++) {
      const fileInfo = pendingFiles[i];
      try {
        const fileData = new Uint8Array(await fileInfo.file.arrayBuffer());
        
        // Call compress function with progress callback
        const compressed = await compress(fileData, {
          imageQuality: options.imageQuality,
          removeMetadata: options.removeMetadata,
          optimizeImages: options.optimizeImages,
          grayscale: options.grayscale,
        }, (progress: number) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileInfo.file ? { ...f, progress } : f
            )
          );
        });

        const compressedBlob = new Blob([compressed], { type: "application/pdf" });
        const compressionRatio = ((fileInfo.originalSize - compressedBlob.size) / fileInfo.originalSize) * 100;

        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileInfo.file
              ? {
                  ...f,
                  status: "completed" as const,
                  progress: 100,
                  result: compressedBlob,
                  compressedSize: compressedBlob.size,
                  compressionRatio,
                }
              : f
          )
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === fileInfo.file
              ? {
                  ...f,
                  status: "error" as const,
                  error: "Compression failed",
                }
              : f
          )
        );
      }
    }
  };

  const handleDownload = (file: FileInfo) => {
    if (!file.result) return;

    const baseName = file.file.name.replace(/\.pdf$/i, "");
    const fileName = `${baseName}_compressed.pdf`;
    saveAs(file.result, fileName);
  };

  const handleDownloadAll = async () => {
    const completedFiles = files.filter(
      (f) => f.status === "completed" && f.result
    );

    if (completedFiles.length === 1) {
      handleDownload(completedFiles[0]);
      return;
    }

    // For multiple files, create a ZIP
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    completedFiles.forEach((file) => {
      if (file.result) {
        const baseName = file.file.name.replace(/\.pdf$/i, "");
        const fileName = `${baseName}_compressed.pdf`;
        zip.file(fileName, file.result);
      }
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "compressed-pdfs.zip");
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const completedCount = files.filter((f) => f.status === "completed").length;
  const hasFiles = files.length > 0;
  const hasCompleted = completedCount > 0;
  const totalSaved = files.reduce(
    (sum, f) => sum + (f.originalSize - (f.compressedSize || f.originalSize)),
    0
  );

  return (
    <div className="w-full">
      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6">
        {/* Header */}
        <ToolHeaderWithFeatures
          title={{ main: "PDF", highlight: "Compress" }}
          subtitle="Reduce PDF file size while maintaining quality. Smart compression with customizable settings for the perfect balance."
          badge={{ text: "Reduce PDF Size Online", icon: Package }}
          features={features}
        />

        {/* Main Interface */}
        <div className="space-y-6">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {error && (
            <div className="mb-4 px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error.message || 'An error occurred'}</span>
            </div>
          )}

          {/* Settings Card */}
          <div
            className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            {/* Card Header */}
            <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Compression Settings
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Quality Presets */}
              <div className="space-y-4">
                <label className="text-sm font-medium">Quality Level</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["high", "medium", "low"] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleQualityPreset(preset)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
                        options.quality === preset
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/50 bg-card/50"
                      )}
                    >
                      <div className="font-medium text-sm">
                        {QUALITY_PRESETS[preset].label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {QUALITY_PRESETS[preset].description}
                      </div>
                      <div className="text-xs font-mono mt-2">
                        ~{QUALITY_PRESETS[preset].value}% quality
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Quality Slider */}
              {options.quality === "custom" && (
                <div className="space-y-4">
                  <label className="text-sm font-medium">
                    Custom Quality: {Math.round(options.imageQuality * 100)}%
                  </label>
                  <Slider
                    value={[options.imageQuality * 100]}
                    onValueChange={(value) =>
                      setOptions((prev) => ({
                        ...prev,
                        imageQuality: value[0] / 100,
                      }))
                    }
                    min={20}
                    max={95}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}

              {/* Quick Options */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Optimization Options</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.optimizeImages}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          optimizeImages: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm">Optimize embedded images</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.removeMetadata}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          removeMetadata: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm">Remove metadata</span>
                  </label>
                </div>
              </div>

              {/* Advanced Options - Collapsible on Mobile */}
              <div className="sm:hidden">
                <CollapsibleSection
                  title="Advanced Options"
                  defaultOpen={false}
                >
                  <div className="space-y-4 pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.grayscale}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            grayscale: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded border-border"
                      />
                      <div>
                        <span className="text-sm">Convert to grayscale</span>
                        <p className="text-xs text-muted-foreground">
                          Reduces file size by removing color
                        </p>
                      </div>
                    </label>
                  </div>
                </CollapsibleSection>
              </div>

              {/* Desktop Advanced Options */}
              <div className="hidden sm:block space-y-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  Advanced Options
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 ml-auto transition-transform",
                      showAdvanced && "rotate-90"
                    )}
                  />
                </button>

                {showAdvanced && (
                  <div className="space-y-4 pt-4 border-t">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.grayscale}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            grayscale: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded border-border"
                      />
                      <div>
                        <span className="text-sm">Convert to grayscale</span>
                        <p className="text-xs text-muted-foreground">
                          Reduces file size by removing color
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Drop Zone / File List */}
          {!hasFiles ? (
            <label
              htmlFor="file-upload"
              className="group relative block cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <div
                className={cn(
                  "relative p-12 sm:p-16 md:p-20 rounded-2xl border-2 border-dashed transition-all duration-300",
                  isDragging
                    ? "border-primary bg-primary/10 scale-[1.02]"
                    : "border-border bg-card/50 hover:border-primary hover:bg-card group-hover:scale-[1.01]"
                )}
              >
                <div className="text-center">
                  <Upload
                    className={cn(
                      "w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 transition-all duration-300",
                      isDragging
                        ? "text-primary scale-110"
                        : "text-muted-foreground group-hover:text-primary"
                    )}
                  />
                  <p className="text-lg sm:text-xl font-medium mb-2">
                    Drop PDFs here
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    or click to browse
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Compress multiple PDFs at once
                    </span>
                  </div>
                </div>
              </div>
            </label>
          ) : (
            <div className="space-y-4">
              {/* File List */}
              <div className="space-y-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {file.file.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.originalSize)}</span>
                          {file.compressedSize && (
                            <>
                              <ArrowRight className="w-3 h-3" />
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                {formatFileSize(file.compressedSize)}
                              </span>
                              <span className="text-green-600 dark:text-green-400">
                                (-{file.compressionRatio?.toFixed(1)}%)
                              </span>
                            </>
                          )}
                        </div>
                        {file.status === "processing" && (
                          <div className="mt-2">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {file.status === "completed" && file.result && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {file.status === "processing" && (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        )}
                        {file.status === "completed" && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                        {file.status === "error" && (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              {hasCompleted && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Minimize2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-200">
                          Compression complete!
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {completedCount} file{completedCount !== 1 ? "s" : ""}{" "}
                          compressed • {formatFileSize(totalSaved)} saved
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add More PDFs
                </Button>

                <Button
                  onClick={handleCompress}
                  disabled={
                    isProcessing ||
                    files.filter((f) => f.status === "pending").length === 0
                  }
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Compressing...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4 mr-2" />
                      Compress{" "}
                      {files.filter((f) => f.status === "pending").length} PDFs
                    </>
                  )}
                </Button>

                {hasCompleted && (
                  <Button
                    onClick={handleDownloadAll}
                    variant="default"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download All ({completedCount})
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Related Tools */}
          <div className="mt-12 pt-12 border-t">
            <RelatedTools tools={relatedTools} direction="horizontal" />
          </div>

          {/* FAQ Section */}
          <div className="mt-12">
            <FAQ items={faqs} />
          </div>
        </div>
      </section>
    </div>
  );
}