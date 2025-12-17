import React, { useState, useRef, useEffect, useCallback } from "react";
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
  FileDown,
  Play,
  Pause,
  Volume2,
  VolumeX,
  HardDrive,
  TrendingDown,
} from "lucide-react";
import { useVideoConverter } from "../../hooks/useVideoConverter";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { FileDropZone } from "../ui/FileDropZone";
import { Slider } from "../ui/slider";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

interface VideoCompressorProps {
  title?: string;
  description?: string;
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
  objectUrl?: string;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Videos never leave your device",
  },
  { icon: Zap, text: "Fast processing", description: "Powered by WebCodecs" },
  {
    icon: TrendingDown,
    text: "Size estimation",
    description: "See estimated size before compressing",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "video-converter",
    name: "Video Converter",
    description: "Convert video formats",
    icon: Video,
  },
  {
    id: "video-trimmer",
    name: "Video Trimmer",
    description: "Cut and trim videos",
    icon: Video,
  },
  {
    id: "video-resizer",
    name: "Video Resizer",
    description: "Change video resolution",
    icon: Video,
  },
];

const faqs: FAQItem[] = [
  {
    question: "Is my video data secure during compression?",
    answer:
      "Yes! All compression happens locally in your browser. Your videos never leave your device or get uploaded to any server.",
  },
  {
    question: "How much can I compress my video?",
    answer:
      "Compression depends on the original video. Typically, you can reduce file size by 30-70% with minimal quality loss. Higher compression will reduce quality more noticeably.",
  },
  {
    question: "What's the difference between quality levels?",
    answer:
      "Low quality provides maximum compression (smallest file), while Ultra provides minimal compression (highest quality). Medium and High are good balances between size and quality.",
  },
  {
    question: "Will compression affect video resolution?",
    answer:
      "No, compression only affects the bitrate (data rate). Resolution stays the same. For resolution changes, use our Video Resizer tool.",
  },
];

type QualityLevel = "low" | "medium" | "high" | "ultra";

const QUALITY_PRESETS: {
  key: QualityLevel;
  label: string;
  description: string;
  compressionRatio: number;
  color: string;
}[] = [
  {
    key: "low",
    label: "Low",
    description: "Maximum compression, smaller file",
    compressionRatio: 0.25,
    color: "text-red-500",
  },
  {
    key: "medium",
    label: "Medium",
    description: "Balanced size and quality",
    compressionRatio: 0.45,
    color: "text-amber-500",
  },
  {
    key: "high",
    label: "High",
    description: "Good quality, moderate compression",
    compressionRatio: 0.65,
    color: "text-green-500",
  },
  {
    key: "ultra",
    label: "Ultra",
    description: "Best quality, minimal compression",
    compressionRatio: 0.85,
    color: "text-blue-500",
  },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

export default function VideoCompressor({
  title = "Video Compressor",
  description = "Compress your videos with size estimation. See the expected file size before compressing.",
}: VideoCompressorProps) {
  const [file, setFile] = useState<FileInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [quality, setQuality] = useState<QualityLevel>("high");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { compress, getMetadata, error } = useVideoConverter();

  // Handle file selection
  const handleFiles = async (newFiles: File[]) => {
    const videoFile = newFiles.find((f) => f.type.startsWith("video/"));
    if (!videoFile) {
      toast.error("Please select a valid video file");
      return;
    }

    // Clean up previous file
    if (file?.objectUrl) {
      URL.revokeObjectURL(file.objectUrl);
    }

    const objectUrl = URL.createObjectURL(videoFile);
    const fileInfo: FileInfo = {
      file: videoFile,
      status: "pending",
      progress: 0,
      objectUrl,
    };

    setFile(fileInfo);
    setCurrentTime(0);
    setIsPlaying(false);

    // Get metadata
    try {
      const metadata = await getMetadata(videoFile);
      if (metadata) {
        setFile((prev) => (prev ? { ...prev, metadata } : null));
      }
    } catch (err) {
      toast.error("Failed to read video metadata");
    }
  };

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);

  // Calculate estimated file size
  const getEstimatedSize = useCallback(() => {
    if (!file) return 0;
    const preset = QUALITY_PRESETS.find((p) => p.key === quality);
    return Math.round(file.file.size * (preset?.compressionRatio || 0.5));
  }, [file, quality]);

  // Calculate savings
  const getSavings = useCallback(() => {
    if (!file) return { bytes: 0, percent: 0 };
    const estimated = getEstimatedSize();
    const savedBytes = file.file.size - estimated;
    const savedPercent = Math.round((savedBytes / file.file.size) * 100);
    return { bytes: savedBytes, percent: savedPercent };
  }, [file, getEstimatedSize]);

  // Process compression
  const handleCompress = async () => {
    if (!file) return;

    setFile((prev) =>
      prev ? { ...prev, status: "processing", progress: 0 } : null,
    );

    try {
      const result = await compress(file.file, quality, (progress) => {
        setFile((prev) =>
          prev ? { ...prev, progress: Math.min(100, Math.max(0, progress)) } : null,
        );
      });

      if (result) {
        setFile((prev) =>
          prev
            ? { ...prev, status: "completed", result, progress: 100 }
            : null,
        );
        toast.success("Video compressed successfully!");
      } else {
        throw new Error("Compression failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Compression failed";
      setFile((prev) =>
        prev ? { ...prev, status: "error", error: errorMessage } : null,
      );
      toast.error(errorMessage);
    }
  };

  // Download compressed video
  const downloadFile = () => {
    if (!file?.result) return;

    const url = URL.createObjectURL(file.result);
    const a = document.createElement("a");
    a.href = url;
    const ext = file.file.name.split(".").pop() || "mp4";
    const originalName = file.file.name.replace(/\.[^/.]+$/, "");
    a.download = `${originalName}-compressed.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear file
  const clearFile = () => {
    if (file?.objectUrl) {
      URL.revokeObjectURL(file.objectUrl);
    }
    setFile(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setQuality("high");
  };

  const duration = file?.metadata?.duration || 0;
  const estimatedSize = getEstimatedSize();
  const savings = getSavings();
  const selectedPreset = QUALITY_PRESETS.find((p) => p.key === quality);

  // Calculate actual savings after compression
  const getActualSavings = () => {
    if (!file?.result) return null;
    const actualSize = file.result.size;
    const savedBytes = file.file.size - actualSize;
    const savedPercent = Math.round((savedBytes / file.file.size) * 100);
    return { size: actualSize, savedBytes, savedPercent };
  };

  const actualSavings = getActualSavings();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ToolHeader
        title={title}
        description={description}
        features={features}
      />

      {/* File Drop Zone (shown when no file selected) */}
      {!file && (
        <FileDropZone
          onFilesSelected={handleFiles}
          accept="video/*"
          multiple={false}
          isDragging={isDragging}
          onDragStateChange={setIsDragging}
          title="Drop video here"
          subtitle="or click to browse"
          infoMessage="Supports MP4, WebM, MOV, and MKV formats"
        />
      )}

      {error && (
        <div className="mt-4 bg-destructive/10 border border-destructive rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/90">{error}</p>
          </div>
        </div>
      )}

      {/* Video Editor */}
      {file && (
        <div className="space-y-6">
          {/* Video Preview */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="aspect-video bg-black flex items-center justify-center relative">
              {file.objectUrl ? (
                <video
                  ref={videoRef}
                  src={file.objectUrl}
                  className="max-h-full max-w-full"
                  muted={isMuted}
                  playsInline
                  onClick={togglePlay}
                />
              ) : (
                <div className="text-muted-foreground">Loading video...</div>
              )}
              {/* Play overlay */}
              {!isPlaying && file.objectUrl && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors z-10"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="w-8 h-8 text-primary-foreground ml-1" />
                  </div>
                </button>
              )}
              {/* Quality badge */}
              <div className={cn(
                "absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium z-20",
                selectedPreset?.color,
              )}>
                {selectedPreset?.label} Quality
              </div>
            </div>

            {/* Playback controls */}
            <div className="p-3 border-t bg-muted/30 flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              <div className="flex-1 text-sm text-center font-mono">
                <span className="text-muted-foreground">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Compression Settings */}
          <div className="bg-card rounded-lg border">
            <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b flex items-center gap-2">
              <FileDown className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Compression Settings</h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Quality presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {QUALITY_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => setQuality(preset.key)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      quality === preset.key
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted",
                    )}
                  >
                    <div className={cn("text-lg font-bold", preset.color)}>
                      {preset.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>

              {/* Size estimation */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-sm">Original Size</span>
                  </div>
                  <span className="font-mono font-medium">
                    {formatFileSize(file.file.size)}
                  </span>
                </div>

                <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
                  {/* Original size (full bar) */}
                  <div className="absolute inset-0 bg-muted-foreground/20" />
                  {/* Estimated size */}
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 transition-all duration-300",
                      quality === "low"
                        ? "bg-red-500"
                        : quality === "medium"
                          ? "bg-amber-500"
                          : quality === "high"
                            ? "bg-green-500"
                            : "bg-blue-500",
                    )}
                    style={{ width: `${(selectedPreset?.compressionRatio || 0.5) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm">Estimated Output</span>
                  </div>
                  <span className={cn("font-mono font-medium", selectedPreset?.color)}>
                    ~{formatFileSize(estimatedSize)}
                  </span>
                </div>

                <div className="flex items-center justify-center pt-2 border-t">
                  <div
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium",
                      savings.percent > 50
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : savings.percent > 25
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    )}
                  >
                    Estimated savings: ~{formatFileSize(savings.bytes)} ({savings.percent}%)
                  </div>
                </div>
              </div>

              {/* Quality info */}
              <div className="text-sm text-muted-foreground text-center">
                {quality === "low" && (
                  <span>Maximum compression - best for sharing, may have visible quality loss</span>
                )}
                {quality === "medium" && (
                  <span>Balanced compression - good for most uses, minor quality impact</span>
                )}
                {quality === "high" && (
                  <span>Good quality - preserves most detail, moderate compression</span>
                )}
                {quality === "ultra" && (
                  <span>Best quality - minimal compression, nearly lossless</span>
                )}
              </div>
            </div>
          </div>

          {/* File info and actions */}
          <div className="bg-card rounded-lg border">
            <div className="p-4 border-b flex items-start gap-3">
              <div className="p-2 rounded bg-primary/10">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.file.name}</p>
                <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatFileSize(file.file.size)}</span>
                  {file.metadata && (
                    <>
                      <span>{formatTime(file.metadata.duration)}</span>
                      <span>
                        {file.metadata.width}x{file.metadata.height}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={clearFile}
                className="p-1 rounded hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status and actions */}
            <div className="p-4">
              {file.status === "pending" && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleCompress} className="flex-1">
                    <FileDown className="w-4 h-4 mr-2" />
                    Compress to ~{formatFileSize(estimatedSize)}
                  </Button>
                </div>
              )}

              {file.status === "processing" && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compressing... {Math.round(file.progress)}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {file.status === "completed" && actualSavings && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Compressed successfully!</span>
                  </div>

                  {/* Actual results */}
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Original</span>
                      <span className="font-mono">{formatFileSize(file.file.size)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Compressed</span>
                      <span className="font-mono text-green-600 dark:text-green-400">
                        {formatFileSize(actualSavings.size)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-green-200 dark:border-green-800">
                      <span className="font-medium">Saved</span>
                      <span className="font-mono font-medium text-green-600 dark:text-green-400">
                        {formatFileSize(actualSavings.savedBytes)} ({actualSavings.savedPercent}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={downloadFile}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setFile((prev) =>
                          prev ? { ...prev, status: "pending", result: undefined } : null
                        )
                      }
                    >
                      Compress Again
                    </Button>
                  </div>
                </div>
              )}

              {file.status === "error" && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>{file.error || "Compression failed"}</span>
                </div>
              )}
            </div>
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
