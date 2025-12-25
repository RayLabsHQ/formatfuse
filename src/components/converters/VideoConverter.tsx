import React, { useState } from "react";
import {
  Download,
  X,
  Video,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
  Sparkles,
  Info,
  Film,
  Scissors,
  RotateCw,
  Scan,
} from "lucide-react";
import { useVideoConverter } from "../../hooks/useVideoConverter";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { FileDropZone } from "../ui/FileDropZone";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

interface VideoConverterProps {
  sourceFormat?: string;
  targetFormat?: string;
  mode?: "convert" | "compress" | "trim" | "resize" | "rotate";
}

interface FileInfo {
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  result?: Blob;
  error?: string;
  metadata?: {
    duration: number;
    width: number;
    height: number;
  };
}

const VIDEO_FORMATS = [
  { key: "mp4", name: "MP4", mime: "video/mp4", color: "oklch(0.72 0.18 15)" },
  { key: "webm", name: "WebM", mime: "video/webm", color: "oklch(0.72 0.16 210)" },
  { key: "mov", name: "MOV", mime: "video/quicktime", color: "oklch(0.75 0.16 73)" },
  { key: "mkv", name: "MKV", mime: "video/x-matroska", color: "oklch(0.7 0.18 285)" },
];

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Videos never leave your device",
  },
  { icon: Zap, text: "Fast processing", description: "Powered by WebCodecs" },
  {
    icon: Sparkles,
    text: "High quality",
    description: "Maintain video quality",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "video-compressor",
    name: "Video Compressor",
    description: "Reduce video file size",
    icon: Download,
  },
  {
    id: "video-trimmer",
    name: "Video Trimmer",
    description: "Cut and trim videos",
    icon: Scissors,
  },
  {
    id: "video-resizer",
    name: "Video Resizer",
    description: "Change video resolution",
    icon: Film,
  },
];

const faqs: FAQItem[] = [
  {
    question: "Is my video data secure during conversion?",
    answer:
      "Yes! All conversions happen locally in your browser using WebCodecs. Your videos never leave your device or get uploaded to any server.",
  },
  {
    question: "What video formats are supported?",
    answer:
      "We support MP4, WebM, MOV, and MKV formats. You can convert between any of these formats with various codec options.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "We recommend videos under 500MB for optimal performance. Larger files may work but could take longer to process depending on your device.",
  },
  {
    question: "Can I adjust quality settings?",
    answer:
      "Yes! You can choose from Low, Medium, High, or Ultra quality presets which control the bitrate and overall quality of the output video.",
  },
];

export default function VideoConverter({
  sourceFormat,
  targetFormat,
  mode = "convert",
}: VideoConverterProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [quality, setQuality] = useState<"low" | "medium" | "high" | "ultra">("high");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(5);
  const [resizeWidth, setResizeWidth] = useState(1920);
  const [resizeHeight, setResizeHeight] = useState(1080);
  const [rotation, setRotation] = useState(90);
  const {
    convert,
    getMetadata,
    compress,
    trim,
    resize,
    rotate,
    error,
  } = useVideoConverter();

  const getTargetFormat = () => {
    return targetFormat || "mp4";
  };

  const formatDisplayName = (format: string) => {
    const videoFormat = VIDEO_FORMATS.find((f) => f.key === format.toLowerCase());
    return videoFormat?.name || format.toUpperCase();
  };

  const updateFileProgress = (index: number, percent: number) => {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, progress: Math.min(100, Math.max(0, percent)) } : f,
      ),
    );
  };

  const validateInputs = (metadata?: FileInfo["metadata"]): string | null => {
    switch (mode) {
      case "trim": {
        if (trimStart < 0 || trimEnd <= 0) return "Please enter valid start and end times.";
        if (trimEnd <= trimStart) return "End time must be greater than start time.";
        if (metadata?.duration && trimStart >= metadata.duration) {
          return "Start time must be within the video duration.";
        }
        return null;
      }
      case "resize": {
        if (resizeWidth <= 0 || resizeHeight <= 0) return "Width and height must be positive.";
        return null;
      }
      case "rotate": {
        if (![0, 90, 180, 270].includes(rotation)) return "Rotation must be 0, 90, 180, or 270.";
        return null;
      }
      default:
        return null;
    }
  };

  const handleFiles = async (newFiles: File[]) => {
    const videoFiles = newFiles.filter((file) =>
      file.type.startsWith("video/"),
    );

    if (videoFiles.length === 0) {
      toast.error("Please select valid video files");
      return;
    }

    // Add files to state
    const fileInfos: FileInfo[] = videoFiles.map((file) => ({
      file,
      status: "pending" as const,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...fileInfos]);

    // Process each file
    for (let i = 0; i < fileInfos.length; i++) {
      await processFile(files.length + i, fileInfos[i]);
    }
  };

  const processFile = async (index: number, fileInfo: FileInfo) => {
    try {
      // Update status to processing
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: "processing" as const, progress: 0 } : f,
        ),
      );

      // Get metadata first
      const metadata = await getMetadata(fileInfo.file, (percent) =>
        updateFileProgress(index, percent / 2),
      );
      if (metadata) {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, metadata } : f,
          ),
        );
        if (mode === "trim" && trimEnd === 5 && metadata.duration > 0) {
          setTrimEnd(Math.min(metadata.duration, trimEnd));
        }
      }

      const validationError = validateInputs(metadata);
      if (validationError) {
        throw new Error(validationError);
      }

      // Convert the video
      const progressHandler = (percent: number) => {
        updateFileProgress(index, 50 + percent / 2);
      };

      const effectiveTargetFormat = getTargetFormat();
      const effectiveTrimEnd =
        mode === "trim" && metadata?.duration
          ? Math.min(trimEnd, metadata.duration)
          : trimEnd;

      let result: Blob | null = null;
      switch (mode) {
        case "compress":
          result = await compress(fileInfo.file, quality, progressHandler);
          break;
        case "trim":
          result = await trim(fileInfo.file, trimStart, effectiveTrimEnd, progressHandler);
          break;
        case "resize":
          result = await resize(
            fileInfo.file,
            resizeWidth,
            resizeHeight,
            progressHandler,
          );
          break;
        case "rotate":
          result = await rotate(fileInfo.file, rotation, progressHandler);
          break;
        default:
          result = await convert(
            fileInfo.file,
            effectiveTargetFormat,
            { quality },
            progressHandler,
          );
          break;
      }

      if (result) {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index
              ? { ...f, status: "completed" as const, result, progress: 100 }
              : f,
          ),
        );
        toast.success(`Converted ${fileInfo.file.name}`);
      } else {
        throw new Error("Conversion failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Conversion failed";
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: "error" as const, error: errorMessage }
            : f,
        ),
      );
      toast.error(`Failed to process ${fileInfo.file.name}: ${errorMessage}`);
    }
  };

  const downloadFile = (fileInfo: FileInfo) => {
    if (!fileInfo.result) return;

    const url = URL.createObjectURL(fileInfo.result);
    const a = document.createElement("a");
    a.href = url;
    const newExtension = getTargetFormat();
    const originalName = fileInfo.file.name.replace(/\.[^/.]+$/, "");
    a.download = `${originalName}.${newExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ToolHeader
        title={
          sourceFormat
            ? { main: `${formatDisplayName(sourceFormat)} to`, highlight: formatDisplayName(getTargetFormat()) }
            : { highlight: "Video", main: "Converter" }
        }
        subtitle={`Convert your videos to ${formatDisplayName(getTargetFormat())} format with high quality and fast processing. All conversions happen locally in your browser.`}
        badge={{ text: "Convert Videos Online", icon: Video }}
        features={features}
      />

      {/* Mode-specific settings */}
      {(mode === "convert" || mode === "compress") && (
        <div className="mb-8 bg-card rounded-lg border">
          <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Quality Settings</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              {(["low", "medium", "high", "ultra"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-md border-2 ff-transition capitalize",
                    quality === q
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <Info className="w-4 h-4 inline mr-1" />
              Higher quality produces larger files but better visual fidelity
            </div>
          </div>
        </div>
      )}

      {mode === "trim" && (
        <div className="mb-8 bg-card rounded-lg border">
          <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Trim Settings</h2>
          </div>
          <div className="p-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Start time (seconds)</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={trimStart}
                onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">End time (seconds)</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={trimEnd}
                onChange={(e) => setTrimEnd(parseFloat(e.target.value) || 0)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Make sure the end time is greater than the start time. If metadata is available, you will see duration next to each file.
            </p>
          </div>
        </div>
      )}

      {mode === "resize" && (
        <div className="mb-8 bg-card rounded-lg border">
          <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b flex items-center gap-2">
            <Scan className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Resize Settings</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Width (px)</span>
                <input
                  type="number"
                  min={1}
                  value={resizeWidth}
                  onChange={(e) => setResizeWidth(parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Height (px)</span>
                <input
                  type="number"
                  min={1}
                  value={resizeHeight}
                  onChange={(e) => setResizeHeight(parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { w: 1920, h: 1080, label: "1080p" },
                { w: 1280, h: 720, label: "720p" },
                { w: 854, h: 480, label: "480p" },
                { w: 640, h: 360, label: "360p" },
              ].map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setResizeWidth(preset.w);
                    setResizeHeight(preset.h);
                  }}
                >
                  {preset.label} ({preset.w}x{preset.h})
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === "rotate" && (
        <div className="mb-8 bg-card rounded-lg border">
          <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b flex items-center gap-2">
            <RotateCw className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Rotation</h2>
          </div>
          <div className="p-6 flex flex-wrap gap-3">
            {[0, 90, 180, 270].map((angle) => (
              <button
                key={angle}
                onClick={() => setRotation(angle)}
                className={cn(
                  "px-4 py-2 rounded-md border-2 ff-transition",
                  rotation === angle
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:border-primary/50",
                )}
              >
                {angle}°
              </button>
            ))}
            <div className="text-sm text-muted-foreground w-full">
              Rotation is clockwise. 0° can be used to normalize orientation.
            </div>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <FileDropZone
        onFilesSelected={handleFiles}
        accept="video/*"
        multiple
        isDragging={isDragging}
        onDragStateChange={setIsDragging}
        title="Drop videos here"
        subtitle="or click to browse"
        infoMessage="Supports MP4, WebM, MOV, and MKV formats"
      />

      {error && (
        <div className="mt-4 bg-destructive/10 border border-destructive rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/90">{error}</p>
          </div>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="mt-8 bg-card rounded-lg border">
          <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Files ({files.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>
          <div className="divide-y">
            {files.map((fileInfo, index) => (
              <div key={index} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-primary/10">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">
                        {fileInfo.file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        {fileInfo.status === "completed" && (
                          <Button
                            size="sm"
                            onClick={() => downloadFile(fileInfo)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 rounded hover:bg-secondary"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatFileSize(fileInfo.file.size)}</span>
                      {fileInfo.metadata && (
                        <>
                          <span>{formatDuration(fileInfo.metadata.duration)}</span>
                          <span>
                            {fileInfo.metadata.width}x{fileInfo.metadata.height}
                          </span>
                        </>
                      )}
                    </div>
                    {fileInfo.status === "processing" && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing... {Math.round(fileInfo.progress)}%</span>
                        </div>
                        <div className="mt-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary ff-transition"
                            style={{ width: `${fileInfo.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {fileInfo.status === "completed" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Conversion complete</span>
                      </div>
                    )}
                    {fileInfo.status === "error" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>{fileInfo.error || "Conversion failed"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Tools */}
      <div className="mt-12">
        <RelatedTools tools={relatedTools} direction="horizontal" />
      </div>

      {/* FAQ Section */}
      <div className="mt-12">
        <FAQ items={faqs} title="Frequently Asked Questions" />
      </div>
    </div>
  );
}
