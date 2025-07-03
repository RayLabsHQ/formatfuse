import React, { useState, useCallback } from "react";
import {
  Upload,
  Download,
  Zap,
  FileImage,
  Settings2,
  AlertCircle,
  Palette,
  Maximize2,
  Shield,
} from "lucide-react";
import { Button } from "../ui/button";
// Card styling done with Tailwind classes
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Slider } from "../ui/slider";
// Label done with HTML label element
import { Input } from "../ui/input";
// Alert components not yet implemented
import { Progress } from "../ui/progress";
import { useSvgConverter } from "../../hooks/useSvgConverter";
import { VirtualizedFileList } from "./VirtualizedFileList";

interface FileInfo {
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  result?: Blob;
  error?: string;
  isLarge?: boolean;
}

type OutputFormat = "png" | "jpeg" | "webp" | "avif";

export function SvgConverter() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [quality, setQuality] = useState(90);
  const [background, setBackground] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const { convert, isConverting, progress, error, reset } = useSvgConverter();

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      const svgFiles = selectedFiles.filter(
        (file) => file.type === "image/svg+xml" || file.name.endsWith(".svg"),
      );

      if (svgFiles.length === 0) {
        alert("Please select SVG files");
        return;
      }

      const newFiles: FileInfo[] = svgFiles.map((file) => ({
        file,
        status: "pending" as const,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [],
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const svgFiles = droppedFiles.filter(
      (file) => file.type === "image/svg+xml" || file.name.endsWith(".svg"),
    );

    if (svgFiles.length === 0) {
      alert("Please drop SVG files");
      return;
    }

    const newFiles: FileInfo[] = svgFiles.map((file) => ({
      file,
      status: "pending" as const,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const convertFile = async (fileInfo: FileInfo, index: number) => {
    // Update status to processing
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, status: "processing" as const, progress: 0 } : f,
      ),
    );

    const options = {
      width,
      height,
      quality:
        outputFormat === "jpeg" || outputFormat === "webp"
          ? quality
          : undefined,
      background: background || undefined,
    };

    const result = await convert(fileInfo.file, outputFormat, options);

    if (result) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: "completed" as const,
                progress: 100,
                result: result.blob,
              }
            : f,
        ),
      );
    } else {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: "error" as const,
                error: error || "Conversion failed",
              }
            : f,
        ),
      );
    }
  };

  const handleConvert = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "pending") {
        await convertFile(files[i], i);
      }
    }
  };

  const handleDownload = (index: number) => {
    const fileInfo = files[index];
    if (!fileInfo || !fileInfo.result) return;

    const ext = outputFormat === "jpeg" ? "jpg" : outputFormat;
    const originalName = fileInfo.file.name.replace(/\.svg$/i, "");
    const url = URL.createObjectURL(fileInfo.result);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${originalName}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    files.forEach((fileInfo, index) => {
      if (fileInfo.status === "completed" && fileInfo.result) {
        handleDownload(index);
      }
    });
  };

  const clearFiles = () => {
    // No need to clean up URLs since we create them on-demand
    setFiles([]);
    reset();
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const completedCount = files.filter((f) => f.status === "completed").length;

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Vector Graphics-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] via-transparent to-accent/[0.01]" />
        <div className="absolute top-32 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="text-center mb-8 relative z-10">
        <h1 className="text-3xl font-bold mb-4">SVG Converter</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Convert SVG files to PNG, JPEG, WebP, or AVIF formats with custom
          dimensions and quality
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm justify-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="font-medium">100% client-side processing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="font-medium">No file uploads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="font-medium">Batch conversion</span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 mb-6 border border-border">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Output Format:</label>
            <Select
              value={outputFormat}
              onValueChange={(value) => setOutputFormat(value as OutputFormat)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
                <SelectItem value="avif">AVIF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        {showSettings && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="width" className="text-sm font-medium">
                  Width (px)
                </label>
                <Input
                  id="width"
                  type="number"
                  placeholder="Auto"
                  value={width || ""}
                  onChange={(e) =>
                    setWidth(
                      e.target.value ? parseInt(e.target.value) : undefined,
                    )
                  }
                />
              </div>
              <div>
                <label htmlFor="height" className="text-sm font-medium">
                  Height (px)
                </label>
                <Input
                  id="height"
                  type="number"
                  placeholder="Auto"
                  value={height || ""}
                  onChange={(e) =>
                    setHeight(
                      e.target.value ? parseInt(e.target.value) : undefined,
                    )
                  }
                />
              </div>
            </div>

            {(outputFormat === "jpeg" || outputFormat === "webp") && (
              <div>
                <label className="text-sm font-medium">Quality</label>
                <div className="flex items-center gap-2 mt-2">
                  <Slider
                    value={[quality]}
                    onValueChange={([value]) => setQuality(value)}
                    min={1}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={quality}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setQuality(Math.min(100, Math.max(1, val)));
                    }}
                    className="w-16 text-sm text-center"
                    min={1}
                    max={100}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="background" className="text-sm font-medium">
                Background Color
              </label>
              <Input
                id="background"
                type="text"
                placeholder="transparent or #FFFFFF"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {files.length === 0 ? (
        <div
          className="bg-card rounded-2xl p-12 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-border"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            Drop SVG files here or click to select
          </p>
          <p className="text-sm text-gray-500">Supports batch conversion</p>
          <input
            id="file-input"
            type="file"
            accept=".svg,image/svg+xml"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Select SVG files to convert"
          />
        </div>
      ) : (
        <>
          <div className="bg-card rounded-2xl p-6 mb-4 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                Files ({files.length} total, {pendingCount} pending,{" "}
                {completedCount} completed)
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  Add More
                </Button>
                <Button variant="outline" size="sm" onClick={clearFiles}>
                  Clear All
                </Button>
              </div>
            </div>

            <VirtualizedFileList
              files={files}
              selectedTargetFormat={{
                mime:
                  outputFormat === "jpeg"
                    ? "image/jpeg"
                    : outputFormat === "webp"
                      ? "image/webp"
                      : outputFormat === "avif"
                        ? "image/avif"
                        : "image/png",
                extension: outputFormat === "jpeg" ? "jpg" : outputFormat,
                name: outputFormat.toUpperCase(),
              }}
              onConvert={(index) => convertFile(files[index], index)}
              onRemove={(index) => {
                setFiles((prev) => prev.filter((_, i) => i !== index));
              }}
              onDownload={handleDownload}
              formatFileSize={(bytes) => {
                if (bytes < 1024) return `${bytes} B`;
                if (bytes < 1024 * 1024)
                  return `${(bytes / 1024).toFixed(1)} KB`;
                return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
              }}
            />

            <input
              id="file-input"
              type="file"
              accept=".svg,image/svg+xml"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Select additional SVG files to convert"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleConvert}
              disabled={pendingCount === 0 || isConverting}
              className="flex-1"
            >
              {isConverting ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Converting...
                </>
              ) : (
                <>
                  <FileImage className="w-4 h-4 mr-2" />
                  Convert {pendingCount > 0 ? `${pendingCount} Files` : "Files"}
                </>
              )}
            </Button>

            {completedCount > 0 && (
              <Button onClick={handleDownloadAll} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download All ({completedCount})
              </Button>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border">
          <Maximize2 className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">
            Custom Dimensions
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Resize SVGs to any pixel dimensions while maintaining quality
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Palette className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">
            Background Control
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Add custom backgrounds or keep transparency in your output
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">
            Quality Settings
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Fine-tune quality for JPEG and WebP formats with precision control
          </p>
        </div>
      </div>
    </div>
  );
}
