import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  Download,
  Zap,
  FileImage,
  AlertCircle,
  Palette,
  Maximize2,
  Shield,
  Image,
  Loader2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { Input } from "../ui/input";
import { useSvgConverter } from "../../hooks/useSvgConverter";
import { SimplifiedFileList } from "./SimplifiedFileList";
import { ToolHeader } from "../ui/ToolHeader";
import { FileDropZone } from "../ui/FileDropZone";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { cn } from "../../lib/utils";
import JSZip from "jszip";

interface FileInfo {
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  result?: Blob;
  error?: string;
  isLarge?: boolean;
}

type OutputFormat = "png" | "jpeg" | "webp" | "avif";

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  {
    icon: Zap,
    text: "Lightning fast",
    description: "Powered by WebAssembly",
  },
  {
    icon: Maximize2,
    text: "Scalable",
    description: "Perfect quality at any size",
  },
];

const faqItems: FAQItem[] = [
  {
    question: "What output formats are supported?",
    answer:
      "SVG files can be converted to PNG, JPEG, WebP, and AVIF formats. PNG supports transparency, while JPEG and WebP offer adjustable quality settings.",
  },
  {
    question: "Can I set custom dimensions?",
    answer:
      "Yes! You can specify custom width and height in pixels. Leave one dimension empty to maintain the original aspect ratio automatically.",
  },
  {
    question: "How is the quality maintained during conversion?",
    answer:
      "We use the resvg library which provides high-quality SVG rendering. Vector graphics are rasterized at the specified resolution, ensuring crisp results.",
  },
  {
    question: "What happens to transparent backgrounds?",
    answer:
      "PNG format preserves transparency. For JPEG, transparent areas become white unless you specify a custom background color. WebP and AVIF can also preserve transparency.",
  }
];

const relatedTools: RelatedTool[] = [
  {
    id: "image-converter",
    icon: Image,
    name: "Image Converter",
    description: "Convert between PNG, JPEG, WebP, and more",
  },
  {
    id: "image-resizer",
    icon: FileImage,
    name: "Image Resizer",
    description: "Resize images to exact dimensions",
  },
  {
    id: "image-compressor",
    icon: Palette,
    name: "Image Compressor",
    description: "Reduce file size without quality loss",
  },
];

export function SvgConverter() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [quality, setQuality] = useState(90);
  const [background, setBackground] = useState<string>("");
  const { convert, isConverting, error } = useSvgConverter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (selectedFiles: File[]) => {
      const svgFiles = selectedFiles.filter((file) => file.type === "image/svg+xml");

      if (svgFiles.length === 0) {
        return;
      }

      const newFiles = svgFiles.map((file) => ({
        file,
        status: "pending" as const,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      handleFiles(selectedFiles);
    },
    [handleFiles],
  );

  const convertFile = useCallback(async (index: number) => {
    const fileInfo = files[index];
    if (!fileInfo) return;

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
                error: "Conversion failed",
              }
            : f,
        ),
      );
    }
  }, [files, convert, outputFormat, width, height, quality, background]);

  const handleConvert = useCallback(async () => {
    for (let i = 0; i < files.length; i++) {
      const fileInfo = files[i];
      if (fileInfo.status !== "pending") continue;

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "processing" as const, progress: 0 } : f,
        ),
      );

      try {
        await convertFile(i);
      } catch (err) {
        console.error("Conversion error:", err);
      }
    }
  }, [files, convertFile]);

  const handleDownload = useCallback((fileInfo: FileInfo) => {
    if (!fileInfo.result) return;

    const url = URL.createObjectURL(fileInfo.result);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileInfo.file.name.replace(/\.svg$/i, `.${outputFormat}`);
    a.click();
    URL.revokeObjectURL(url);
  }, [outputFormat]);

  const handleDownloadAll = useCallback(async () => {
    const completedFiles = files.filter((f) => f.status === "completed" && f.result);

    if (completedFiles.length === 0) return;

    if (completedFiles.length === 1) {
      const file = completedFiles[0];
      const url = URL.createObjectURL(file.result!);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file.name.replace(/\.svg$/i, `.${outputFormat}`);
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const zip = new JSZip();

      for (const file of completedFiles) {
        if (file.result) {
          const newName = file.file.name.replace(/\.svg$/i, `.${outputFormat}`);
          zip.file(newName, file.result);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "converted-images.zip";
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [files, outputFormat]);

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const completedCount = files.filter((f) => f.status === "completed").length;

  return (
    <div className="min-h-screen w-full">
      {/* SVG-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div className="absolute top-1/4 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 left-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 lg:py-6 py-6 sm:py-12 relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ main: "SVG to", highlight: outputFormat.toUpperCase() }}
          subtitle="Convert SVG files to raster formats with custom dimensions and quality settings. Perfect for web optimization and cross-platform compatibility."
          badge={{ text: "Vector to Raster Converter", icon: Image }}
          features={features}
        />

      {/* Main Converter Interface */}
      <div className="space-y-6">
        {/* Settings Card - Aligned with Image Converter Design */}
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-4 sm:p-6 animate-fade-in-up relative z-20" style={{ animationDelay: "0.3s" }}>
          <div className="max-w-2xl mx-auto space-y-6">
              {/* Output Format */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Output Format</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["png", "jpeg", "webp", "avif"].map((format) => (
                    <Button
                      key={format}
                      variant={outputFormat === format ? "default" : "outline"}
                      size="sm"
                      onClick={() => setOutputFormat(format as OutputFormat)}
                      className="w-full"
                    >
                      {format.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="width" className="text-sm font-medium">
                    Width (px)
                  </label>
                  <Input
                    id="width"
                    type="number"
                    placeholder="Auto"
                    value={width || ""}
                    onChange={(e) =>
                      setWidth(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="height" className="text-sm font-medium">
                    Height (px)
                  </label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="Auto"
                    value={height || ""}
                    onChange={(e) =>
                      setHeight(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                  />
                </div>
              </div>

              {/* Quality Controls (for JPEG and WebP) */}
              {(outputFormat === "jpeg" || outputFormat === "webp") && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Quality</label>
                    <div className="flex gap-2 mt-2">
                      {[30, 60, 80, 90, 100].map((q) => (
                        <button
                          key={q}
                          onClick={() => setQuality(q)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-md border transition-all",
                            quality === q
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {q}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Slider
                      value={[quality]}
                      onValueChange={([value]) => setQuality(value)}
                      min={1}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">Quality: {quality}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Background Color */}
              <div className="space-y-2">
                <label htmlFor="background" className="text-sm font-medium">
                  Background Color (optional)
                </label>
                <div className="flex gap-2">
                  <Input
                    id="background"
                    type="text"
                    placeholder="#FFFFFF or transparent"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="color"
                    value={background || "#FFFFFF"}
                    onChange={(e) => setBackground(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty for transparent (PNG/WebP/AVIF only)
                </p>
              </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* File Upload Area */}
        {files.length === 0 ? (
          <div className="relative animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <FileDropZone
              onFilesSelected={handleFiles}
              accept=".svg,image/svg+xml"
              multiple={true}
              title="Drop SVG files here"
              subtitle="or click to browse"
              infoMessage="Convert multiple SVG files at once"
            />
          </div>
        ) : (
          <>
            {/* File List */}
            <SimplifiedFileList
              files={files}
              onDownload={handleDownload}
              onRemove={(index) => {
                setFiles((prev) => prev.filter((_, i) => i !== index));
              }}
            />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleConvert}
                disabled={pendingCount === 0 || isConverting}
                className="flex-1"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Convert {pendingCount > 0 ? `${pendingCount} Files` : "Files"}
                  </>
                )}
              </Button>

              {completedCount > 0 && (
                <Button
                  onClick={handleDownloadAll}
                  variant="outline"
                  className="sm:w-auto"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All ({completedCount})
                </Button>
              )}

              <Button
                onClick={() => additionalInputRef.current?.click()}
                variant="outline"
                className="sm:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                Add More
              </Button>

              <input
                ref={additionalInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

        {/* Related Tools */}
        <div className="mt-12 space-y-6">
          <RelatedTools tools={relatedTools} direction="responsive" />
        </div>

        {/* FAQ Section */}
        <div className="mt-12 space-y-6">
          <FAQ items={faqItems} />
        </div>
      </div>
    </div>
  );
}