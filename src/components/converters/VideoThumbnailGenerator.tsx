import React, { useState, useCallback } from "react";
import {
  Download,
  Video,
  AlertCircle,
  Loader2,
  Shield,
  Zap,
  Sparkles,
  Image as ImageIcon,
  Grid3x3,
  Clock,
} from "lucide-react";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { FileDropZone } from "../ui/FileDropZone";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import {
  Input,
  ALL_FORMATS,
  BlobSource,
  CanvasSink,
} from "mediabunny";

interface Thumbnail {
  canvas: HTMLCanvasElement;
  timestamp: number;
  index: number;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Videos never leave your device",
  },
  { icon: Zap, text: "Fast extraction", description: "Quick thumbnail generation" },
  {
    icon: Sparkles,
    text: "High quality",
    description: "HD thumbnails",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "video-converter",
    name: "Video Converter",
    description: "Convert between video formats",
    icon: Video,
  },
  {
    id: "video-trimmer",
    name: "Video Trimmer",
    description: "Cut and trim videos",
    icon: Clock,
  },
  {
    id: "image-converter",
    name: "Image Converter",
    description: "Convert image formats",
    icon: ImageIcon,
  },
];

const faqs: FAQItem[] = [
  {
    question: "How many thumbnails can I generate?",
    answer:
      "You can generate anywhere from 4 to 64 thumbnails per video. The thumbnails are evenly spaced throughout the video's duration.",
  },
  {
    question: "What video formats are supported?",
    answer:
      "All common video formats are supported including MP4, WebM, MOV, MKV, and more. The tool uses WebCodecs for extraction.",
  },
  {
    question: "Can I download the thumbnails?",
    answer:
      "Yes! You can download individual thumbnails as PNG images or download all of them as a ZIP file for batch processing.",
  },
  {
    question: "Are my videos uploaded anywhere?",
    answer:
      "No! All thumbnail extraction happens locally in your browser. Your videos never leave your device.",
  },
];

export default function VideoThumbnailGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailCount, setThumbnailCount] = useState(16);
  const [thumbnailSize, setThumbnailSize] = useState(200);

  const handleFiles = useCallback((files: File[]) => {
    const videoFile = files.find((f) => f.type.startsWith("video/"));
    if (!videoFile) {
      toast.error("Please select a valid video file");
      return;
    }

    setFile(videoFile);
    setThumbnails([]);
    setError(null);
  }, []);

  const generateThumbnails = async () => {
    if (!file) return;

    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setThumbnails([]);

    try {
      // Create input from the file
      const source = new BlobSource(file);
      const input = new Input({
        source,
        formats: ALL_FORMATS,
      });

      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) {
        throw new Error("File has no video track");
      }

      if (videoTrack.codec === null) {
        throw new Error("Unsupported video codec");
      }

      if (!(await videoTrack.canDecode())) {
        throw new Error("Unable to decode the video track");
      }

      setProgress(10);

      // Compute thumbnail dimensions
      const width =
        videoTrack.displayWidth > videoTrack.displayHeight
          ? thumbnailSize
          : Math.floor(
              (thumbnailSize * videoTrack.displayWidth) /
                videoTrack.displayHeight,
            );
      const height =
        videoTrack.displayHeight > videoTrack.displayWidth
          ? thumbnailSize
          : Math.floor(
              (thumbnailSize * videoTrack.displayHeight) /
                videoTrack.displayWidth,
            );

      // Prepare timestamps
      const firstTimestamp = await videoTrack.getFirstTimestamp();
      const lastTimestamp = await videoTrack.computeDuration();
      const timestamps = Array.from(
        { length: thumbnailCount },
        (_, i) =>
          firstTimestamp +
          (i * (lastTimestamp - firstTimestamp)) / thumbnailCount,
      );

      setProgress(20);

      // Create CanvasSink for extracting frames
      const sink = new CanvasSink(videoTrack, {
        width: Math.floor(width * window.devicePixelRatio),
        height: Math.floor(height * window.devicePixelRatio),
        fit: "fill",
      });

      const extractedThumbnails: Thumbnail[] = [];
      let i = 0;

      // Extract thumbnails
      for await (const wrappedCanvas of sink.canvasesAtTimestamps(
        timestamps,
      )) {
        if (wrappedCanvas) {
          const canvas = wrappedCanvas.canvas as HTMLCanvasElement;
          extractedThumbnails.push({
            canvas,
            timestamp: wrappedCanvas.timestamp,
            index: i,
          });
        }

        i++;
        setProgress(20 + (i / thumbnailCount) * 80);
      }

      setThumbnails(extractedThumbnails);
      toast.success(`Generated ${extractedThumbnails.length} thumbnails`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate thumbnails";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Thumbnail generation error:", err);
    } finally {
      setIsGenerating(false);
      setProgress(100);
    }
  };

  const downloadThumbnail = (thumbnail: Thumbnail) => {
    thumbnail.canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thumbnail-${thumbnail.timestamp.toFixed(2)}s.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const downloadAllThumbnails = async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const thumbnail of thumbnails) {
      await new Promise<void>((resolve) => {
        thumbnail.canvas.toBlob((blob) => {
          if (blob) {
            zip.file(
              `thumbnail-${thumbnail.timestamp.toFixed(2)}s.png`,
              blob,
            );
          }
          resolve();
        });
      });
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name || "video"}-thumbnails.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("All thumbnails downloaded");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <ToolHeader
        title={{ highlight: "Video", main: "Thumbnail Generator" }}
        subtitle="Extract high-quality thumbnails from your videos at different timestamps. Perfect for video previews, galleries, and content management."
        badge={{ text: "Generate Thumbnails Online", icon: ImageIcon }}
        features={features}
      />

      {/* Settings Card */}
      <div className="mb-8 bg-card rounded-lg border">
        <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Thumbnail Settings</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Thumbnail Count */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of Thumbnails: {thumbnailCount}
            </label>
            <div className="flex gap-3 mb-2">
              {[4, 8, 16, 24, 32].map((count) => (
                <button
                  key={count}
                  onClick={() => setThumbnailCount(count)}
                  className={cn(
                    "px-4 py-2 rounded-md border-2 ff-transition",
                    thumbnailCount === count
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="4"
              max="64"
              value={thumbnailCount}
              onChange={(e) => setThumbnailCount(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Thumbnail Size */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Thumbnail Size: {thumbnailSize}px
            </label>
            <div className="flex gap-3 mb-2">
              {[150, 200, 300, 400].map((size) => (
                <button
                  key={size}
                  onClick={() => setThumbnailSize(size)}
                  className={cn(
                    "px-4 py-2 rounded-md border-2 ff-transition",
                    thumbnailSize === size
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  {size}px
                </button>
              ))}
            </div>
            <input
              type="range"
              min="100"
              max="500"
              step="50"
              value={thumbnailSize}
              onChange={(e) => setThumbnailSize(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <FileDropZone
        onFilesSelected={handleFiles}
        accept="video/*"
        multiple={false}
        isDragging={isDragging}
        onDragStateChange={setIsDragging}
        title="Drop video here"
        subtitle="or click to browse"
        infoMessage="Supports MP4, WebM, MOV, MKV, and more"
        primaryButtonLabel="Select video"
      />

      {/* File Info and Generate Button */}
      {file && !isGenerating && thumbnails.length === 0 && (
        <div className="mt-6 bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-primary/10">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button onClick={generateThumbnails} size="lg">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Thumbnails
            </Button>
          </div>
        </div>
      )}

      {/* Progress */}
      {isGenerating && (
        <div className="mt-6 bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="font-medium">Generating thumbnails...</span>
            <span className="text-sm text-muted-foreground ml-auto">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary ff-transition"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 bg-destructive/10 border border-destructive rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/90">{error}</p>
          </div>
        </div>
      )}

      {/* Thumbnails Grid */}
      {thumbnails.length > 0 && (
        <div className="mt-8 bg-card rounded-lg border">
          <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Thumbnails ({thumbnails.length})
            </h2>
            <Button onClick={downloadAllThumbnails} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download All as ZIP
            </Button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {thumbnails.map((thumbnail) => (
                <div
                  key={thumbnail.index}
                  className="group relative rounded-lg overflow-hidden bg-secondary/20 border hover:border-primary ff-transition"
                >
                  <div className="aspect-video relative">
                    <img
                      src={thumbnail.canvas.toDataURL()}
                      alt={`Thumbnail at ${thumbnail.timestamp.toFixed(2)}s`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 bg-black/70 text-white px-2 py-1 text-xs rounded-tl">
                      {formatDuration(thumbnail.timestamp)}
                    </div>
                  </div>
                  <button
                    onClick={() => downloadThumbnail(thumbnail)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 ff-transition flex items-center justify-center"
                  >
                    <Download className="w-6 h-6 text-white" />
                  </button>
                </div>
              ))}
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
