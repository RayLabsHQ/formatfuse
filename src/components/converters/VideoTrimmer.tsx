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
  Scissors,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useVideoConverter } from "../../hooks/useVideoConverter";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { FileDropZone } from "../ui/FileDropZone";
import { cn } from "../../lib/utils";
import { toast } from "sonner";


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
    text: "Precise trimming",
    description: "Frame-accurate cuts",
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
    id: "video-compressor",
    name: "Video Compressor",
    description: "Reduce video file size",
    icon: Download,
  },
  {
    id: "video-thumbnail-generator",
    name: "Thumbnail Generator",
    description: "Extract video thumbnails",
    icon: Scissors,
  },
];

const faqs: FAQItem[] = [
  {
    question: "Is my video data secure during trimming?",
    answer:
      "Yes! All trimming happens locally in your browser. Your videos never leave your device or get uploaded to any server.",
  },
  {
    question: "What video formats are supported?",
    answer:
      "We support MP4, WebM, MOV, and MKV formats. The trimmed video will be exported in the same format as the original.",
  },
  {
    question: "Can I make precise frame-accurate cuts?",
    answer:
      "Yes! You can use the timeline scrubber for visual selection, or enter exact timestamps in seconds for frame-accurate trimming.",
  },
  {
    question: "Is there a video length limit?",
    answer:
      "We recommend videos under 500MB for optimal performance. Longer videos work but may take more time to process.",
  },
];

// Format time as MM:SS.ms or HH:MM:SS.ms
function formatTime(seconds: number, showMs = true): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  if (hrs > 0) {
    return showMs
      ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
      : `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return showMs
    ? `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
    : `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Parse time string to seconds
function parseTime(timeStr: string): number {
  const parts = timeStr.split(":").map((p) => parseFloat(p) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

// Timeline component with draggable handles
interface TimelineProps {
  duration: number;
  currentTime: number;
  startTime: number;
  endTime: number;
  thumbnails: string[];
  onStartChange: (time: number) => void;
  onEndChange: (time: number) => void;
  onSeek: (time: number) => void;
}

function Timeline({
  duration,
  currentTime,
  startTime,
  endTime,
  thumbnails,
  onStartChange,
  onEndChange,
  onSeek,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | "playhead" | null>(null);

  const getPositionFromTime = (time: number) => {
    return (time / duration) * 100;
  };

  const getTimeFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      return (x / rect.width) * duration;
    },
    [duration],
  );

  const handleMouseDown = (e: React.MouseEvent, type: "start" | "end" | "playhead") => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (dragging) return;
    const time = getTimeFromPosition(e.clientX);
    onSeek(time);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const time = getTimeFromPosition(e.clientX);

      if (dragging === "start") {
        onStartChange(Math.min(time, endTime - 0.1));
      } else if (dragging === "end") {
        onEndChange(Math.max(time, startTime + 0.1));
      } else if (dragging === "playhead") {
        onSeek(time);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, startTime, endTime, getTimeFromPosition, onStartChange, onEndChange, onSeek]);

  // Generate time markers
  const markers = [];
  const markerInterval = duration > 120 ? 30 : duration > 60 ? 15 : duration > 30 ? 10 : 5;
  for (let t = 0; t <= duration; t += markerInterval) {
    markers.push(t);
  }

  return (
    <div className="space-y-2">
      {/* Thumbnail strip */}
      {thumbnails.length > 0 && (
        <div className="relative h-12 rounded overflow-hidden bg-muted">
          <div className="flex h-full">
            {thumbnails.map((thumb, i) => (
              <div
                key={i}
                className="flex-1 h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${thumb})` }}
              />
            ))}
          </div>
          {/* Dimmed areas outside selection */}
          <div
            className="absolute top-0 left-0 h-full bg-black/60"
            style={{ width: `${getPositionFromTime(startTime)}%` }}
          />
          <div
            className="absolute top-0 right-0 h-full bg-black/60"
            style={{ width: `${100 - getPositionFromTime(endTime)}%` }}
          />
        </div>
      )}

      {/* Main timeline track */}
      <div
        ref={trackRef}
        className="relative h-10 bg-muted rounded cursor-pointer select-none"
        onClick={handleTrackClick}
      >
        {/* Selected range background */}
        <div
          className="absolute top-0 h-full bg-primary/20 rounded"
          style={{
            left: `${getPositionFromTime(startTime)}%`,
            width: `${getPositionFromTime(endTime) - getPositionFromTime(startTime)}%`,
          }}
        />

        {/* Time markers */}
        <div className="absolute bottom-0 left-0 right-0 h-4 flex items-end">
          {markers.map((t) => (
            <div
              key={t}
              className="absolute flex flex-col items-center"
              style={{ left: `${getPositionFromTime(t)}%`, transform: "translateX(-50%)" }}
            >
              <div className="w-px h-2 bg-muted-foreground/40" />
              <span className="text-[9px] text-muted-foreground/60">{formatTime(t, false)}</span>
            </div>
          ))}
        </div>

        {/* Start handle */}
        <div
          className={cn(
            "absolute top-0 h-full w-1 bg-primary cursor-ew-resize group z-10",
            dragging === "start" && "ring-2 ring-primary/50",
          )}
          style={{ left: `${getPositionFromTime(startTime)}%`, transform: "translateX(-50%)" }}
          onMouseDown={(e) => handleMouseDown(e, "start")}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md group-hover:scale-110 transition-transform" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium text-primary whitespace-nowrap">
            {formatTime(startTime, false)}
          </div>
        </div>

        {/* End handle */}
        <div
          className={cn(
            "absolute top-0 h-full w-1 bg-primary cursor-ew-resize group z-10",
            dragging === "end" && "ring-2 ring-primary/50",
          )}
          style={{ left: `${getPositionFromTime(endTime)}%`, transform: "translateX(-50%)" }}
          onMouseDown={(e) => handleMouseDown(e, "end")}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md group-hover:scale-110 transition-transform" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium text-primary whitespace-nowrap">
            {formatTime(endTime, false)}
          </div>
        </div>

        {/* Playhead */}
        <div
          className={cn(
            "absolute top-0 h-full w-0.5 bg-white cursor-ew-resize z-20",
            dragging === "playhead" && "ring-2 ring-white/50",
          )}
          style={{ left: `${getPositionFromTime(currentTime)}%`, transform: "translateX(-50%)" }}
          onMouseDown={(e) => handleMouseDown(e, "playhead")}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-white" />
        </div>
      </div>
    </div>
  );
}

export default function VideoTrimmer() {
  const [file, setFile] = useState<FileInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { trim, getMetadata, error } = useVideoConverter();

  // Generate thumbnails for the timeline
  const generateThumbnails = useCallback(async (videoUrl: string, duration: number) => {
    setIsGeneratingThumbnails(true);
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;

    await new Promise<void>((resolve) => {
      video.onloadeddata = () => resolve();
      video.load();
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsGeneratingThumbnails(false);
      return;
    }

    const thumbnailCount = Math.min(20, Math.max(8, Math.floor(duration / 5)));
    const interval = duration / thumbnailCount;
    const thumbs: string[] = [];

    canvas.width = 160;
    canvas.height = 90;

    for (let i = 0; i < thumbnailCount; i++) {
      const time = i * interval;
      video.currentTime = time;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      thumbs.push(canvas.toDataURL("image/jpeg", 0.5));
    }

    setThumbnails(thumbs);
    setIsGeneratingThumbnails(false);
    video.remove();
  }, []);

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
    setThumbnails([]);

    const objectUrl = URL.createObjectURL(videoFile);
    const fileInfo: FileInfo = {
      file: videoFile,
      status: "pending",
      progress: 0,
      objectUrl,
    };

    setFile(fileInfo);
    setTrimStart(0);
    setCurrentTime(0);
    setIsPlaying(false);

    // Get metadata
    try {
      const metadata = await getMetadata(videoFile);
      if (metadata) {
        setFile((prev) => (prev ? { ...prev, metadata } : null));
        setTrimEnd(metadata.duration);
        generateThumbnails(objectUrl, metadata.duration);
      }
    } catch (err) {
      toast.error("Failed to read video metadata");
    }
  };

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Loop within trim range during playback
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
        if (!isPlaying) {
          video.pause();
        }
      }
    };

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
  }, [trimStart, trimEnd, isPlaying]);

  // Seek video when currentTime changes via timeline
  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      // Start from trim start if outside range
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      video.play();
    }
  }, [isPlaying, trimStart, trimEnd]);

  // Jump controls
  const jumpToStart = useCallback(() => {
    handleSeek(trimStart);
  }, [trimStart, handleSeek]);

  const jumpToEnd = useCallback(() => {
    handleSeek(Math.max(0, trimEnd - 0.5));
  }, [trimEnd, handleSeek]);

  // Process trim
  const handleTrim = async () => {
    if (!file) return;

    if (trimEnd <= trimStart) {
      toast.error("End time must be greater than start time");
      return;
    }

    setFile((prev) =>
      prev ? { ...prev, status: "processing", progress: 0 } : null,
    );

    try {
      const result = await trim(file.file, trimStart, trimEnd, (progress) => {
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
        toast.success("Video trimmed successfully!");
      } else {
        throw new Error("Trimming failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Trimming failed";
      setFile((prev) =>
        prev ? { ...prev, status: "error", error: errorMessage } : null,
      );
      toast.error(errorMessage);
    }
  };

  // Download trimmed video
  const downloadFile = () => {
    if (!file?.result) return;

    const url = URL.createObjectURL(file.result);
    const a = document.createElement("a");
    a.href = url;
    const ext = file.file.name.split(".").pop() || "mp4";
    const originalName = file.file.name.replace(/\.[^/.]+$/, "");
    a.download = `${originalName}-trimmed.${ext}`;
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
    setThumbnails([]);
    setTrimStart(0);
    setTrimEnd(0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const duration = file?.metadata?.duration || 0;
  const selectedDuration = trimEnd - trimStart;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ToolHeader
        title={{ highlight: "Video", main: "Trimmer" }}
        subtitle="Cut and trim your videos to the perfect length. Use the visual timeline to select the exact portion you want to keep."
        badge={{ text: "Trim Videos Online", icon: Scissors }}
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
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="w-8 h-8 text-primary-foreground ml-1" />
                  </div>
                </button>
              )}
            </div>

            {/* Playback controls */}
            <div className="p-3 border-t bg-muted/30 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={jumpToStart}
                  title="Jump to start"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={jumpToEnd}
                  title="Jump to end"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

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

          {/* Timeline */}
          {duration > 0 && (
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Scissors className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Timeline</h3>
                {isGeneratingThumbnails && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating previews...
                  </span>
                )}
              </div>

              <Timeline
                duration={duration}
                currentTime={currentTime}
                startTime={trimStart}
                endTime={trimEnd}
                thumbnails={thumbnails}
                onStartChange={setTrimStart}
                onEndChange={setTrimEnd}
                onSeek={handleSeek}
              />

              {/* Time inputs for fine control */}
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={formatTime(trimStart)}
                    onChange={(e) => {
                      const time = parseTime(e.target.value);
                      if (time >= 0 && time < trimEnd) {
                        setTrimStart(time);
                      }
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                    placeholder="0:00.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={formatTime(trimEnd)}
                    onChange={(e) => {
                      const time = parseTime(e.target.value);
                      if (time > trimStart && time <= duration) {
                        setTrimEnd(time);
                      }
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                    placeholder="0:00.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Selection Duration
                  </label>
                  <div className="w-full rounded-md border bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
                    {formatTime(selectedDuration)}
                  </div>
                </div>
              </div>
            </div>
          )}

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
                  <Button onClick={handleTrim} className="flex-1">
                    <Scissors className="w-4 h-4 mr-2" />
                    Trim Video
                  </Button>
                  <div className="text-sm text-muted-foreground text-center sm:text-left">
                    Output: {formatTime(selectedDuration)} (
                    {Math.round((selectedDuration / duration) * 100)}% of
                    original)
                  </div>
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
                    <span>Trimmed successfully!</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={downloadFile}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" onClick={() => setFile((prev) => prev ? { ...prev, status: "pending", result: undefined } : null)}>
                      Trim Again
                    </Button>
                  </div>
                </div>
              )}

              {file.status === "error" && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>{file.error || "Trimming failed"}</span>
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
