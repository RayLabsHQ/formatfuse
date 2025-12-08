import React, { useState, useCallback, useRef } from "react";
import {
  Download,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  Package,
  Check,
  ArrowRight,
  FileDown,
  X,
  Plus,
  Target,
  Mail,
  MessageCircle,
  Globe,
  Upload,
} from "lucide-react";
import { FaRegFilePdf } from "react-icons/fa6";
import { FaDiscord } from "react-icons/fa";
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
import type { PdfSeoData } from "../../data/pdf-seo";

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
  compressionGoalMet?: boolean;
  targetBytes?: number;
}

interface Props {
  targetSize?: number; // in KB
  targetDisplay: string;
  useCase?: string;
  useCaseDescription?: string;
  reductionPercent?: number;
  seoData: PdfSeoData;
}

const useCaseIcons: Record<string, React.ElementType> = {
  email: Mail,
  whatsapp: MessageCircle,
  web: Globe,
  discord: FaDiscord,
  upload: Upload,
};

const relatedSizePages = [
  { size: "50kb", display: "50KB" },
  { size: "100kb", display: "100KB" },
  { size: "200kb", display: "200KB" },
  { size: "300kb", display: "300KB" },
  { size: "500kb", display: "500KB" },
  { size: "1mb", display: "1MB" },
  { size: "2mb", display: "2MB" },
];

const relatedTools: RelatedTool[] = [
  {
    id: "pdf-merge",
    name: "PDF Merge",
    description: "Combine multiple PDFs",
    icon: FaRegFilePdf,
  },
  {
    id: "pdf-split",
    name: "PDF Split",
    description: "Split PDFs into parts",
    icon: FaRegFilePdf,
  },
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Convert images to PDF",
    icon: FileDown,
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

export default function PdfCompressWithTarget({
  targetSize,
  targetDisplay,
  useCase,
  useCaseDescription,
  reductionPercent,
  seoData,
}: Props) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { compress, getPageCount, isProcessing, error } = usePdfOperations();

  const goalLabel = useCase
    ? `Optimized for ${useCase.charAt(0).toUpperCase() + useCase.slice(1)}`
    : typeof reductionPercent === "number"
      ? `Target: ${targetDisplay} smaller`
      : `Target: ${targetDisplay}`;

  const goalDescription = useCase
    ? `Auto-tuned ${useCaseDescription || `for ${useCase}`}`
    : typeof reductionPercent === "number"
      ? `Reduce size by about ${targetDisplay}`
      : "Optimized settings";

  const primaryActionLabel = useCase
    ? `Compress for ${targetDisplay}`
    : typeof reductionPercent === "number"
      ? `Reduce by ${targetDisplay}`
      : `Compress to ${targetDisplay}`;

  // Auto-select quality based on target size
  const getDefaultQuality = () => {
    if (typeof reductionPercent === "number") {
      if (reductionPercent >= 80) return "low";
      if (reductionPercent >= 60) return "medium";
      return "high";
    }
    if (targetSize && targetSize <= 200) return "low";
    if (targetSize && targetSize <= 1024) return "medium";
    return "high";
  };

  const [options, setOptions] = useState<CompressionOptions>({
    quality: getDefaultQuality(),
    removeMetadata: true,
    optimizeImages: true,
    grayscale: false,
    imageQuality: QUALITY_PRESETS[getDefaultQuality()].imageQuality,
  });

  const features = [
    {
      icon: Target,
      text: goalLabel,
      description: goalDescription,
    },
    {
      icon: Shield,
      text: "Privacy-first",
      description: "Files never leave your device",
    },
    { icon: Zap, text: "Lightning fast", description: "Instant compression" },
  ];

  const handleFilesSelected = useCallback(
    async (selectedFiles: File[]) => {
      const pdfFiles = selectedFiles.filter(
        (file) => file.type === "application/pdf"
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
        } catch {
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
    [getPageCount]
  );

  const handleQualityPreset = (preset: "low" | "medium" | "high") => {
    setOptions((prev) => ({
      ...prev,
      quality: preset,
      imageQuality: QUALITY_PRESETS[preset].imageQuality,
    }));
  };

  const getTargetBytes = useCallback(
    (file: FileInfo) => {
      if (typeof targetSize === "number") {
        return targetSize * 1024;
      }
      if (typeof reductionPercent === "number") {
        return file.originalSize * (1 - reductionPercent / 100);
      }
      return undefined;
    },
    [reductionPercent, targetSize]
  );

  const getSafeTargetToken = () =>
    targetDisplay.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "target";

  const handleCompress = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    const MIN_IMAGE_QUALITY = 0.25;
    const QUALITY_STEP = 0.15;
    const MAX_ATTEMPTS = 4;

    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" ? { ...f, status: "processing" as const } : f
      )
    );

    for (const fileInfo of pendingFiles) {
      try {
        const fileData =
          fileInfo.data || new Uint8Array(await fileInfo.file.arrayBuffer());
        const targetBytes = getTargetBytes(fileInfo);

        let attempt = 0;
        let quality = options.imageQuality;
        let lastBlob: Blob | null = null;
        let lastRatio = 0;
        let goalMet = true;

        while (attempt < MAX_ATTEMPTS) {
          const compressed = await compress(
            fileData,
            {
              imageQuality: quality,
              removeMetadata: options.removeMetadata,
              optimizeImages: options.optimizeImages,
              grayscale: options.grayscale,
            },
            (progress: number) => {
              if (attempt === 0) {
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === fileInfo.id ? { ...f, progress } : f
                  )
                );
              }
            }
          );

          const compressedBlob = new Blob([compressed], {
            type: "application/pdf",
          });
          lastBlob = compressedBlob;

          lastRatio =
            ((fileInfo.originalSize - compressedBlob.size) /
              fileInfo.originalSize) *
            100;

          goalMet = targetBytes ? compressedBlob.size <= targetBytes : true;

          if (goalMet || quality <= MIN_IMAGE_QUALITY || attempt === MAX_ATTEMPTS - 1) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileInfo.id
                  ? {
                      ...f,
                      status: "completed" as const,
                      progress: 100,
                      result: compressedBlob,
                      compressedSize: compressedBlob.size,
                      compressionRatio: lastRatio,
                      compressionGoalMet: goalMet,
                      targetBytes,
                    }
                  : f
              )
            );
            break;
          }

          quality = Math.max(MIN_IMAGE_QUALITY, quality - QUALITY_STEP);
          attempt += 1;
        }

        if (!lastBlob) {
          throw new Error("Compression failed");
        }
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileInfo.id
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
    const fileName = `${baseName}_compressed_${getSafeTargetToken()}.pdf`;
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

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    completedFiles.forEach((file) => {
      if (file.result) {
        const baseName = file.file.name.replace(/\.pdf$/i, "");
        const fileName = `${baseName}_compressed_${getSafeTargetToken()}.pdf`;
        zip.file(fileName, file.result);
      }
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `compressed-pdfs-${getSafeTargetToken()}.zip`);
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

  const UseCaseIcon = useCase ? useCaseIcons[useCase] || Target : Target;
  const targetHeadline = useCase
    ? `Optimizing for ${useCase.charAt(0).toUpperCase() + useCase.slice(1)}`
    : typeof reductionPercent === "number"
      ? `Target Reduction: ${targetDisplay} smaller`
      : `Target Size: Under ${targetDisplay}`;
  const targetHelperText = useCase
    ? `Files will be compressed ${useCaseDescription || `for ${useCase}`}`
    : typeof reductionPercent === "number"
      ? `We'll tune compression to reduce your PDF by about ${targetDisplay}. Final size can vary based on images and existing optimization.`
      : `Files will be compressed to fit under ${targetDisplay}`;

  return (
    <div className="w-full">
      {/* Gradient Effects */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div className="absolute top-1/2 -translate-y-1/2 right-10 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6 relative z-10">
        {/* Header */}
        <ToolHeader
          title={{
            main: useCase ? `Compress PDF for` : `Compress PDF to`,
            highlight: useCase
              ? useCase.charAt(0).toUpperCase() + useCase.slice(1)
              : targetDisplay,
          }}
          subtitle={seoData.subtitle}
          badge={{
            text: useCase
              ? `Optimized for ${useCase}`
              : `Target: ${targetDisplay}`,
            icon: UseCaseIcon,
          }}
          features={features}
        />

        {/* Target Size Indicator */}
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{targetHeadline}</p>
              <p className="text-sm text-muted-foreground">{targetHelperText}</p>
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="space-y-6">
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

          {/* Quality Presets */}
          <div className="rounded-2xl animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="space-y-6">
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
                          : "bg-card/50 hover:bg-card border border-border/50 hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center sm:flex-col gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 pointer-events-none",
                            isSelected
                              ? "bg-primary-foreground/20"
                              : "bg-primary/10 group-hover:bg-primary/20"
                          )}
                        >
                          {preset === "high" && (
                            <svg
                              className={cn(
                                "w-5 h-5 pointer-events-none",
                                isSelected
                                  ? "text-primary-foreground"
                                  : "text-primary"
                              )}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect x="4" y="14" width="4" height="6" />
                              <rect x="10" y="10" width="4" height="10" />
                              <rect x="16" y="6" width="4" height="14" />
                            </svg>
                          )}
                          {preset === "medium" && (
                            <svg
                              className={cn(
                                "w-5 h-5 pointer-events-none",
                                isSelected
                                  ? "text-primary-foreground"
                                  : "text-primary"
                              )}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect x="4" y="14" width="4" height="6" />
                              <rect x="10" y="10" width="4" height="10" />
                              <rect x="16" y="10" width="4" height="10" />
                            </svg>
                          )}
                          {preset === "low" && (
                            <svg
                              className={cn(
                                "w-5 h-5 pointer-events-none",
                                isSelected
                                  ? "text-primary-foreground"
                                  : "text-primary"
                              )}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect x="4" y="14" width="4" height="6" />
                              <rect x="10" y="14" width="4" height="6" />
                              <rect x="16" y="14" width="4" height="6" />
                            </svg>
                          )}
                        </div>

                        <div className="flex-1 text-left sm:text-center pointer-events-none">
                          <div
                            className={cn(
                              "font-medium text-sm",
                              isSelected
                                ? "text-primary-foreground"
                                : "text-foreground"
                            )}
                          >
                            {QUALITY_PRESETS[preset].label}
                          </div>
                          <div
                            className={cn(
                              "text-xs",
                              isSelected
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground"
                            )}
                          >
                            {QUALITY_PRESETS[preset].description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Optimization Toggles */}
              <div className="flex flex-col sm:flex-row gap-2">
                <label
                  className={cn(
                    "relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 sm:flex-1",
                    options.optimizeImages
                      ? "bg-primary/10 border-2 border-primary/30"
                      : "bg-card/50 border-2 border-border/50 hover:border-primary/20"
                  )}
                >
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
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md transition-all duration-200 flex items-center justify-center",
                        options.optimizeImages
                          ? "bg-primary"
                          : "bg-background border-2 border-border"
                      )}
                    >
                      {options.optimizeImages && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Optimize images</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      Compress embedded images
                    </div>
                  </div>
                </label>

                <label
                  className={cn(
                    "relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 sm:flex-1",
                    options.removeMetadata
                      ? "bg-primary/10 border-2 border-primary/30"
                      : "bg-card/50 border-2 border-border/50 hover:border-primary/20"
                  )}
                >
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
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md transition-all duration-200 flex items-center justify-center",
                        options.removeMetadata
                          ? "bg-primary"
                          : "bg-background border-2 border-border"
                      )}
                    >
                      {options.removeMetadata && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Remove metadata</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      Strip document properties
                    </div>
                  </div>
                </label>
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
                  <FaRegFilePdf className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {primaryActionLabel}
                  </span>
                </div>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {files.map((file, index) => {
                  const isCompleted = file.status === "completed";
                  const isProcessingFile = file.status === "processing";
                  const hasError = file.status === "error";
                  const goalBytes =
                    file.targetBytes ?? (isCompleted || isProcessingFile ? getTargetBytes(file) : undefined);
                  const meetsGoal =
                    isCompleted &&
                    typeof goalBytes === "number" &&
                    file.compressedSize !== undefined
                      ? file.compressedSize <= goalBytes
                      : isCompleted;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "group relative rounded-lg border transition-all duration-200 p-2.5 sm:p-3",
                        isCompleted
                          ? meetsGoal
                            ? "bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-900/30"
                            : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30"
                          : hasError
                            ? "bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/30"
                            : "bg-card/30 border-border/50 hover:border-primary/20"
                      )}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="relative flex-shrink-0">
                          <FaRegFilePdf
                              className={cn(
                                "w-5 h-5 sm:w-6 sm:h-6",
                                isCompleted
                                ? meetsGoal
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-amber-600 dark:text-amber-400"
                                : hasError
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-muted-foreground"
                            )}
                          />
                          {isProcessingFile && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <p className="text-sm font-medium truncate max-w-[150px] sm:max-w-none">
                              {file.file.name}
                            </p>
                            <span className="sm:hidden text-xs text-muted-foreground">
                              {file.compressedSize
                                ? formatFileSize(file.compressedSize)
                                : formatFileSize(file.originalSize)}
                            </span>
                          </div>

                          <div className="hidden sm:flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">
                              {formatFileSize(file.originalSize)}
                            </span>
                            {file.compressedSize && (
                              <>
                                <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                                <span
                                  className={cn(
                                    "font-medium",
                                    meetsGoal
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-amber-600 dark:text-amber-400"
                                  )}
                                >
                                  {formatFileSize(file.compressedSize)}
                                </span>
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-xs font-medium",
                                    meetsGoal
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                  )}
                                >
                                  {meetsGoal
                                    ? "On target"
                                    : "Above target"}
                                </span>
                              </>
                            )}
                          </div>

                          {isProcessingFile && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/20 overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {isCompleted && file.result && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(file)}
                              className="h-7 w-7 sm:h-8 sm:w-8"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isProcessingFile && (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFile(index)}
                            className="h-7 w-7 sm:h-8 sm:w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasCompleted && (
                <div className="flex items-center justify-between p-2.5 sm:p-3 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200/50 dark:border-green-900/30">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-200">
                      {completedCount} compressed
                    </span>
                    <span className="text-sm text-green-700 dark:text-green-300">
                      - {formatFileSize(totalSaved)} saved
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleDownloadAll}
                    className="h-7 px-3 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1.5" />
                    Download All
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Files
                </Button>

                {files.filter((f) => f.status === "pending").length > 0 && (
                  <Button
                    onClick={handleCompress}
                    disabled={isProcessing}
                    size="sm"
                    className="h-8 flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Compressing...
                      </>
                    ) : (
                      <>
                        <Package className="w-3.5 h-3.5 mr-1.5" />
                        {primaryActionLabel}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Other Size Options */}
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-lg font-semibold mb-4">
              Need a different size?
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedSizePages
                .filter((p) => p.display !== targetDisplay)
                .map((page) => (
                  <a
                    key={page.size}
                    href={`/convert/compress-pdf-to-${page.size}`}
                    className="px-4 py-2 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card transition-all text-sm"
                  >
                    Compress to {page.display}
                  </a>
                ))}
              <a
                href="/convert/pdf-compress"
                className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all text-sm font-medium text-primary"
              >
                Custom Settings
              </a>
            </div>
          </div>

          {/* Related Tools */}
          <div className="mt-12 pt-12 border-t">
            <RelatedTools tools={relatedTools} direction="horizontal" />
          </div>

          {/* FAQ Section */}
          <div className="mt-12">
            <FAQ items={seoData.faqs} />
          </div>
        </div>
      </section>
    </div>
  );
}
