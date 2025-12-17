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
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
} from "lucide-react";
import { useVideoConverter } from "../../hooks/useVideoConverter";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { FileDropZone } from "../ui/FileDropZone";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

interface VideoResizerProps {
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
    icon: Sparkles,
    text: "Visual preview",
    description: "See dimensions before resizing",
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
    id: "video-compressor",
    name: "Video Compressor",
    description: "Reduce video file size",
    icon: Download,
  },
];

const faqs: FAQItem[] = [
  {
    question: "Is my video data secure during resizing?",
    answer:
      "Yes! All resizing happens locally in your browser. Your videos never leave your device or get uploaded to any server.",
  },
  {
    question: "What video formats are supported?",
    answer:
      "We support MP4, WebM, MOV, and MKV formats. The resized video will maintain the same format as the original.",
  },
  {
    question: "Will resizing affect video quality?",
    answer:
      "Upscaling (making larger) may reduce perceived quality. Downscaling (making smaller) typically maintains good quality while reducing file size.",
  },
  {
    question: "What does 'maintain aspect ratio' mean?",
    answer:
      "When enabled, changing width automatically adjusts height (and vice versa) to keep the video's proportions intact, preventing distortion.",
  },
];

// Resolution presets defined by their longer edge (works for both orientations)
const RESOLUTION_PRESETS = [
  { label: "4K", longEdge: 3840, shortEdge: 2160 },
  { label: "1080p", longEdge: 1920, shortEdge: 1080 },
  { label: "720p", longEdge: 1280, shortEdge: 720 },
  { label: "480p", longEdge: 854, shortEdge: 480 },
  { label: "360p", longEdge: 640, shortEdge: 360 },
  { label: "240p", longEdge: 426, shortEdge: 240 },
] as const;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function VideoResizer({
  title = "Video Resizer",
  description = "Resize your videos with a visual preview. See dimension changes before applying.",
}: VideoResizerProps) {
  const [file, setFile] = useState<FileInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetWidth, setTargetWidth] = useState(1920);
  const [targetHeight, setTargetHeight] = useState(1080);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const aspectRatioRef = useRef<number>(16 / 9);

  const { resize, getMetadata, error } = useVideoConverter();

  // Get preset dimensions based on video orientation
  const getPresetDimensions = (preset: (typeof RESOLUTION_PRESETS)[number]) => {
    if (isPortrait) {
      return { width: preset.shortEdge, height: preset.longEdge };
    }
    return { width: preset.longEdge, height: preset.shortEdge };
  };

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
        setTargetWidth(metadata.width);
        setTargetHeight(metadata.height);
        aspectRatioRef.current = metadata.width / metadata.height;
        // Detect portrait orientation (height > width)
        setIsPortrait(metadata.height > metadata.width);
      }
    } catch (err) {
      toast.error("Failed to read video metadata");
    }
  };

  // Handle width change with aspect ratio lock
  const handleWidthChange = (newWidth: number) => {
    setTargetWidth(newWidth);
    if (maintainAspectRatio && newWidth > 0) {
      setTargetHeight(Math.round(newWidth / aspectRatioRef.current));
    }
  };

  // Handle height change with aspect ratio lock
  const handleHeightChange = (newHeight: number) => {
    setTargetHeight(newHeight);
    if (maintainAspectRatio && newHeight > 0) {
      setTargetWidth(Math.round(newHeight * aspectRatioRef.current));
    }
  };

  // Apply preset - respects video orientation
  const applyPreset = (preset: (typeof RESOLUTION_PRESETS)[number]) => {
    const { width: presetWidth, height: presetHeight } = getPresetDimensions(preset);

    if (maintainAspectRatio) {
      // Fit within preset dimensions while maintaining aspect ratio
      const presetAspect = presetWidth / presetHeight;
      if (aspectRatioRef.current > presetAspect) {
        // Video is wider than preset, constrain by width
        setTargetWidth(presetWidth);
        setTargetHeight(Math.round(presetWidth / aspectRatioRef.current));
      } else {
        // Video is taller than preset, constrain by height
        setTargetHeight(presetHeight);
        setTargetWidth(Math.round(presetHeight * aspectRatioRef.current));
      }
    } else {
      setTargetWidth(presetWidth);
      setTargetHeight(presetHeight);
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

  // Process resize
  const handleResize = async () => {
    if (!file) return;

    if (targetWidth <= 0 || targetHeight <= 0) {
      toast.error("Width and height must be positive values");
      return;
    }

    setFile((prev) =>
      prev ? { ...prev, status: "processing", progress: 0 } : null,
    );

    try {
      const result = await resize(file.file, targetWidth, targetHeight, (progress) => {
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
        toast.success("Video resized successfully!");
      } else {
        throw new Error("Resize failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Resize failed";
      setFile((prev) =>
        prev ? { ...prev, status: "error", error: errorMessage } : null,
      );
      toast.error(errorMessage);
    }
  };

  // Download resized video
  const downloadFile = () => {
    if (!file?.result) return;

    const url = URL.createObjectURL(file.result);
    const a = document.createElement("a");
    a.href = url;
    const ext = file.file.name.split(".").pop() || "mp4";
    const originalName = file.file.name.replace(/\.[^/.]+$/, "");
    a.download = `${originalName}-${targetWidth}x${targetHeight}.${ext}`;
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
    setTargetWidth(1920);
    setTargetHeight(1080);
    setIsPortrait(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const duration = file?.metadata?.duration || 0;

  // Calculate scale factor and direction
  const getScaleInfo = () => {
    if (!file?.metadata) return null;
    const { width, height } = file.metadata;
    const widthScale = targetWidth / width;
    const heightScale = targetHeight / height;
    const avgScale = (widthScale + heightScale) / 2;
    const isUpscale = avgScale > 1;
    const isDownscale = avgScale < 1;
    const percentChange = Math.abs(Math.round((avgScale - 1) * 100));
    return { widthScale, heightScale, avgScale, isUpscale, isDownscale, percentChange };
  };

  const scaleInfo = getScaleInfo();

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
          {/* Video Preview with Dimension Overlay */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="aspect-video bg-black flex items-center justify-center relative">
              {file.objectUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={file.objectUrl}
                    className="max-h-full max-w-full"
                    muted={isMuted}
                    playsInline
                    onClick={togglePlay}
                  />
                  {/* Dimension overlay showing target size */}
                  {file.metadata && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div
                        className="border-2 border-primary/50 border-dashed bg-primary/5"
                        style={{
                          width: `${Math.min((targetWidth / file.metadata.width) * 100, 100)}%`,
                          height: `${Math.min((targetHeight / file.metadata.height) * 100, 100)}%`,
                          maxWidth: "100%",
                          maxHeight: "100%",
                        }}
                      />
                    </div>
                  )}
                </>
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
              {/* Dimension badge */}
              <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium z-20">
                {targetWidth} x {targetHeight}
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

          {/* Resize Controls */}
          <div className="bg-card rounded-lg border">
            <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b flex items-center gap-2">
              <Maximize2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Resize Settings</h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Dimension inputs */}
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Width (px)</label>
                  <input
                    type="number"
                    min={1}
                    value={targetWidth}
                    onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-lg font-mono"
                  />
                </div>

                <button
                  onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                  className={cn(
                    "mt-6 p-2 rounded-md border-2 transition-all",
                    maintainAspectRatio
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50",
                  )}
                  title={maintainAspectRatio ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                >
                  {maintainAspectRatio ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Unlock className="w-5 h-5" />
                  )}
                </button>

                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Height (px)</label>
                  <input
                    type="number"
                    min={1}
                    value={targetHeight}
                    onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-lg font-mono"
                  />
                </div>
              </div>

              {/* Aspect ratio lock info */}
              <div className="text-sm text-muted-foreground text-center">
                {maintainAspectRatio ? (
                  <span className="flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    Aspect ratio locked ({(aspectRatioRef.current).toFixed(2)}:1)
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <Unlock className="w-3 h-3" />
                    Aspect ratio unlocked - dimensions can vary independently
                  </span>
                )}
              </div>

              {/* Preset buttons */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Quick Presets {isPortrait && <span className="text-muted-foreground font-normal">(Portrait)</span>}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {RESOLUTION_PRESETS.map((preset) => {
                    const { width: pWidth, height: pHeight } = getPresetDimensions(preset);
                    const isSelected = targetWidth === pWidth && targetHeight === pHeight;
                    return (
                      <button
                        key={preset.label}
                        onClick={() => applyPreset(preset)}
                        className={cn(
                          "px-3 py-2 rounded-md border text-sm font-medium transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50 hover:bg-muted",
                        )}
                        title={`${pWidth} x ${pHeight}`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scale info */}
              {file.metadata && scaleInfo && (
                <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted/50">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Original</div>
                    <div className="font-mono font-medium">
                      {file.metadata.width} x {file.metadata.height}
                    </div>
                  </div>
                  <div className="text-2xl text-primary">→</div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Target</div>
                    <div className="font-mono font-medium text-primary">
                      {targetWidth} x {targetHeight}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      scaleInfo.isUpscale
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : scaleInfo.isDownscale
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {scaleInfo.isUpscale
                      ? `+${scaleInfo.percentChange}%`
                      : scaleInfo.isDownscale
                        ? `-${scaleInfo.percentChange}%`
                        : "No change"}
                  </div>
                </div>
              )}

              {/* Upscale warning */}
              {scaleInfo?.isUpscale && (
                <div className="p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> Upscaling may reduce perceived quality. The output will be larger but may appear less sharp.
                </div>
              )}
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
                  <Button onClick={handleResize} className="flex-1">
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Resize to {targetWidth} x {targetHeight}
                  </Button>
                </div>
              )}

              {file.status === "processing" && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing... {Math.round(file.progress)}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {file.status === "completed" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resized successfully!</span>
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
                      Resize Again
                    </Button>
                  </div>
                </div>
              )}

              {file.status === "error" && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>{file.error || "Resize failed"}</span>
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
