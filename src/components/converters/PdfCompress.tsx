import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  Package,
  Minimize2,
  Check,
  ArrowRight,
  FileDown,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { FileDropZone } from "../ui/FileDropZone";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { cn } from "../../lib/utils";
import { Slider } from "../ui/slider";
import { usePdfOperations } from "../../hooks/usePdfOperations";
import { type PdfFile } from "../ui/PdfFileList";
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

interface FileInfo extends PdfFile {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { compress, getPageCount, isProcessing, error } = usePdfOperations();

  const [options, setOptions] = useState<CompressionOptions>({
    quality: "medium",
    removeMetadata: true,
    optimizeImages: true,
    grayscale: false,
    imageQuality: 0.65,
  });

  const handleFilesSelected = useCallback(
    async (selectedFiles: File[]) => {
      const pdfFiles = selectedFiles.filter(
        (file) => file.type === "application/pdf",
      );
      const newFiles: FileInfo[] = [];
      
      for (const file of pdfFiles) {
        try {
          const data = new Uint8Array(await file.arrayBuffer());
          const pageCount = await getPageCount(data);
          newFiles.push({
            file,
            id: `${Date.now()}-${Math.random()}`,
            pageCount,
            data,
            showPreview: true,
            status: "pending" as const,
            progress: 0,
            originalSize: file.size,
          });
        } catch (err) {
          newFiles.push({
            file,
            id: `${Date.now()}-${Math.random()}`,
            showPreview: true,
            status: "pending" as const,
            progress: 0,
            originalSize: file.size,
          });
        }
      }
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [getPageCount],
  );

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
        f.status === "pending" ? { ...f, status: "processing" as const } : f,
      ),
    );

    // Process each file
    for (let i = 0; i < pendingFiles.length; i++) {
      const fileInfo = pendingFiles[i];
      try {
        const fileData = fileInfo.data || new Uint8Array(await fileInfo.file.arrayBuffer());

        // Call compress function with progress callback
        const compressed = await compress(
          fileData,
          {
            imageQuality: options.imageQuality,
            removeMetadata: options.removeMetadata,
            optimizeImages: options.optimizeImages,
            grayscale: options.grayscale,
          },
          (progress: number) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileInfo.id ? { ...f, progress } : f,
              ),
            );
          },
        );

        const compressedBlob = new Blob([compressed], {
          type: "application/pdf",
        });
        const compressionRatio =
          ((fileInfo.originalSize - compressedBlob.size) /
            fileInfo.originalSize) *
          100;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileInfo.id
              ? {
                  ...f,
                  status: "completed" as const,
                  progress: 100,
                  result: compressedBlob,
                  compressedSize: compressedBlob.size,
                  compressionRatio,
                }
              : f,
          ),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileInfo.id
              ? {
                  ...f,
                  status: "error" as const,
                  error: "Compression failed",
                }
              : f,
          ),
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
      (f) => f.status === "completed" && f.result,
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
    0,
  );

  return (
    <div className="w-full">
      {/* Compression-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div className="absolute top-1/2 -translate-y-1/2 right-10 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div 
          className="absolute bottom-10 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-10"
          style={{ background: "radial-gradient(circle, var(--tool-pdf), transparent)" }}
        />
      </div>

      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6 relative z-10">
        {/* Header */}
        <ToolHeader
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
            onChange={(e) => {
              const selectedFiles = Array.from(e.target.files || []);
              handleFilesSelected(selectedFiles);
            }}
            className="hidden"
          />

          {error && (
            <div className="mb-4 px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {error.message || "An error occurred"}
              </span>
            </div>
          )}

          {/* Settings Card - Minimalistic Design */}
          <div
            className="rounded-2xl animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="space-y-6">
              {/* Quality Presets - Compact on Mobile, Single Row on Desktop */}
              <div className="flex flex-col sm:flex-row gap-2">
                {(["high", "medium", "low"] as const).map((preset) => {
                  const isSelected = options.quality === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQualityPreset(preset)}
                      className={cn(
                        "relative w-full sm:flex-1 p-3 rounded-xl transition-all duration-200 group cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-card/50 hover:bg-card border border-border/50 hover:border-primary/30",
                      )}
                    >
                      <div className="flex items-center sm:flex-col gap-3">
                        {/* Quality Icon */}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 pointer-events-none",
                          isSelected 
                            ? "bg-primary-foreground/20" 
                            : "bg-primary/10 group-hover:bg-primary/20"
                        )}>
                          {preset === "high" && (
                            <svg className={cn("w-5 h-5 pointer-events-none", isSelected ? "text-primary-foreground" : "text-primary")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="4" y="14" width="4" height="6" />
                              <rect x="10" y="10" width="4" height="10" />
                              <rect x="16" y="6" width="4" height="14" />
                            </svg>
                          )}
                          {preset === "medium" && (
                            <svg className={cn("w-5 h-5 pointer-events-none", isSelected ? "text-primary-foreground" : "text-primary")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="4" y="14" width="4" height="6" />
                              <rect x="10" y="10" width="4" height="10" />
                              <rect x="16" y="10" width="4" height="10" />
                            </svg>
                          )}
                          {preset === "low" && (
                            <svg className={cn("w-5 h-5 pointer-events-none", isSelected ? "text-primary-foreground" : "text-primary")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="4" y="14" width="4" height="6" />
                              <rect x="10" y="14" width="4" height="6" />
                              <rect x="16" y="14" width="4" height="6" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Text content */}
                        <div className="flex-1 text-left sm:text-center pointer-events-none">
                          <div className={cn(
                            "font-medium text-sm",
                            isSelected ? "text-primary-foreground" : "text-foreground"
                          )}>
                            {QUALITY_PRESETS[preset].label}
                          </div>
                          <div className={cn(
                            "text-xs",
                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}>
                            {QUALITY_PRESETS[preset].description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
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

              {/* Optimization Toggles - Single Row on Desktop */}
              <div className="flex flex-col sm:flex-row gap-2">
                <label className={cn(
                  "relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 sm:flex-1",
                  options.optimizeImages 
                    ? "bg-primary/10 border-2 border-primary/30" 
                    : "bg-card/50 border-2 border-border/50 hover:border-primary/20"
                )}>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={options.optimizeImages}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          optimizeImages: e.target.checked,
                        }))
                      }
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-md transition-all duration-200 flex items-center justify-center",
                      options.optimizeImages 
                        ? "bg-primary" 
                        : "bg-background border-2 border-border"
                    )}>
                      {options.optimizeImages && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Optimize images</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">Compress embedded images</div>
                  </div>
                  {options.optimizeImages && (
                    <span className="text-xs font-medium text-primary sm:hidden">ON</span>
                  )}
                </label>

                <label className={cn(
                  "relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 sm:flex-1",
                  options.removeMetadata 
                    ? "bg-primary/10 border-2 border-primary/30" 
                    : "bg-card/50 border-2 border-border/50 hover:border-primary/20"
                )}>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={options.removeMetadata}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          removeMetadata: e.target.checked,
                        }))
                      }
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-md transition-all duration-200 flex items-center justify-center",
                      options.removeMetadata 
                        ? "bg-primary" 
                        : "bg-background border-2 border-border"
                    )}>
                      {options.removeMetadata && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Remove metadata</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">Strip document properties</div>
                  </div>
                  {options.removeMetadata && (
                    <span className="text-xs font-medium text-primary sm:hidden">ON</span>
                  )}
                </label>
              </div>

              {/* Helpful tip */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Most PDFs compress best with "Balanced" settings
                </p>
              </div>
            </div>
          </div>

          {/* Drop Zone / File List */}
          {!hasFiles ? (
            <FileDropZone
              onFilesSelected={handleFilesSelected}
              accept="application/pdf"
              multiple={true}
              title="Drop your PDFs here"
              subtitle="or click to browse"
              customInfoContent={
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Compress multiple PDFs at once
                  </span>
                </div>
              }
            />
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
                          <Check className="w-4 h-4 text-green-600" />
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
