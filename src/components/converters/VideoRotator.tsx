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
  RotateCw,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FlipHorizontal,
  FlipVertical,
} from "lucide-react";
import { useVideoConverter } from "../../hooks/useVideoConverter";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { FileDropZone } from "../ui/FileDropZone";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

interface VideoRotatorProps {
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
    text: "Live preview",
    description: "See rotation before applying",
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
    question: "Is my video data secure during rotation?",
    answer:
      "Yes! All rotation happens locally in your browser. Your videos never leave your device or get uploaded to any server.",
  },
  {
    question: "What video formats are supported?",
    answer:
      "We support MP4, WebM, MOV, and MKV formats. The rotated video will maintain the same format as the original.",
  },
  {
    question: "Will rotating change my video quality?",
    answer:
      "We use high-quality encoding to minimize quality loss. The output maintains similar quality to the original video.",
  },
  {
    question: "What does 0° rotation do?",
    answer:
      "0° rotation normalizes video orientation metadata. This is useful for fixing videos that appear rotated due to incorrect orientation tags.",
  },
];

const ROTATION_OPTIONS = [
  { value: 0, label: "0°", description: "Normalize orientation" },
  { value: 90, label: "90°", description: "Rotate right" },
  { value: 180, label: "180°", description: "Flip upside down" },
  { value: 270, label: "270°", description: "Rotate left" },
] as const;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function VideoRotator({
  title = "Video Rotator",
  description = "Rotate your videos with a live preview. See the rotation effect before applying.",
}: VideoRotatorProps) {
  const [file, setFile] = useState<FileInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(90);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { rotate, getMetadata, error } = useVideoConverter();

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

  // Rotate buttons
  const rotateLeft = () => {
    setRotation((prev) => (prev === 0 ? 270 : prev - 90));
  };

  const rotateRight = () => {
    setRotation((prev) => (prev === 270 ? 0 : prev + 90));
  };

  // Process rotation
  const handleRotate = async () => {
    if (!file) return;

    setFile((prev) =>
      prev ? { ...prev, status: "processing", progress: 0 } : null,
    );

    try {
      const result = await rotate(file.file, rotation, (progress) => {
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
        toast.success("Video rotated successfully!");
      } else {
        throw new Error("Rotation failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Rotation failed";
      setFile((prev) =>
        prev ? { ...prev, status: "error", error: errorMessage } : null,
      );
      toast.error(errorMessage);
    }
  };

  // Download rotated video
  const downloadFile = () => {
    if (!file?.result) return;

    const url = URL.createObjectURL(file.result);
    const a = document.createElement("a");
    a.href = url;
    const ext = file.file.name.split(".").pop() || "mp4";
    const originalName = file.file.name.replace(/\.[^/.]+$/, "");
    a.download = `${originalName}-rotated-${rotation}deg.${ext}`;
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
    setRotation(90);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const duration = file?.metadata?.duration || 0;

  // Calculate output dimensions after rotation
  const getOutputDimensions = () => {
    if (!file?.metadata) return null;
    const { width, height } = file.metadata;
    if (rotation === 90 || rotation === 270) {
      return { width: height, height: width };
    }
    return { width, height };
  };

  const outputDimensions = getOutputDimensions();

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
          {/* Video Preview with Rotation */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
              {file.objectUrl ? (
                <div
                  className="transition-transform duration-300 ease-out"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    // Scale down if rotated 90/270 to fit in container
                    ...(rotation === 90 || rotation === 270
                      ? {
                          maxWidth: "56.25%", // 9/16 aspect ratio adjustment
                          maxHeight: "177.78%",
                        }
                      : {}),
                  }}
                >
                  <video
                    ref={videoRef}
                    src={file.objectUrl}
                    className="max-h-full max-w-full"
                    muted={isMuted}
                    playsInline
                    onClick={togglePlay}
                    style={{
                      maxHeight: rotation === 90 || rotation === 270 ? "56.25vw" : "100%",
                    }}
                  />
                </div>
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
              {/* Rotation indicator */}
              <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium z-20">
                {rotation}° rotation
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

          {/* Rotation Controls */}
          <div className="bg-card rounded-lg border">
            <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b flex items-center gap-2">
              <RotateCw className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Rotation Settings</h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Quick rotate buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={rotateLeft}
                  className="gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Rotate Left
                </Button>
                <div className="text-3xl font-bold text-primary min-w-[80px] text-center">
                  {rotation}°
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={rotateRight}
                  className="gap-2"
                >
                  Rotate Right
                  <RotateCw className="w-5 h-5" />
                </Button>
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ROTATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRotation(option.value)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all",
                      rotation === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted",
                    )}
                  >
                    <div className="text-2xl font-bold">{option.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>

              {/* Dimension info */}
              {file.metadata && outputDimensions && (
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Original:</span>
                    <span>{file.metadata.width} x {file.metadata.height}</span>
                  </div>
                  <div className="text-primary">→</div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Output:</span>
                    <span className="text-primary font-medium">
                      {outputDimensions.width} x {outputDimensions.height}
                    </span>
                  </div>
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
                  <Button onClick={handleRotate} className="flex-1">
                    <RotateCw className="w-4 h-4 mr-2" />
                    Apply {rotation}° Rotation
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
                    <span>Rotated successfully!</span>
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
                      Rotate Again
                    </Button>
                  </div>
                </div>
              )}

              {file.status === "error" && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>{file.error || "Rotation failed"}</span>
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
