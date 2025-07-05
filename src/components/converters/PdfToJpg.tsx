import React, { useState, useCallback } from "react";
import {
  Download,
  FileText,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  Image,
  CheckCircle2,
  FileImage,
  Package,
} from "lucide-react";
import { Button } from "../ui/button";
import { FileDropZone } from "../ui/FileDropZone";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { cn } from "../../lib/utils";
import { Slider } from "../ui/slider";
import { usePdfOperations } from "../../hooks/usePdfOperations";
import { PdfFileList, type PdfFile } from "../ui/PdfFileList";
import FileSaver from "file-saver";
import JSZip from "jszip";

const { saveAs } = FileSaver;

interface ConversionOptions {
  format: "png" | "jpeg";
  quality: number;
  scale: number;
  pages: "all" | "specific";
  specificPages: string;
}

interface ConversionResult {
  page: number;
  data: Uint8Array;
  mimeType: string;
  url?: string;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Instant conversion" },
  {
    icon: Image,
    text: "High quality",
    description: "Crystal clear images",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Convert images to PDF",
    icon: FileText,
  },
  {
    id: "pdf-compress",
    name: "PDF Compress",
    description: "Reduce PDF file size",
    icon: Package,
  },
  {
    id: "pdf-split",
    name: "PDF Split",
    description: "Split PDFs into parts",
    icon: FileText,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What image formats can I convert PDFs to?",
    answer:
      "You can convert PDF pages to JPG or PNG format. JPG is best for photos and documents without transparency, while PNG is ideal for images with transparency or when you need lossless quality.",
  },
  {
    question: "Can I convert specific pages only?",
    answer:
      "Yes! You can choose to convert all pages or specify which pages to convert. Use ranges like '1-5' or individual pages like '1,3,5' or combinations like '1-3,7,9-12'.",
  },
  {
    question: "What quality settings should I use?",
    answer:
      "For most uses, 85% quality provides excellent results with reasonable file sizes. Use 95%+ for print-quality images, or 70% for web use where smaller files are important. The scale setting controls resolution - 1.5x is standard, 2x for high quality.",
  },
  {
    question: "Can I batch download converted images?",
    answer:
      "Yes! After conversion, you can download images individually or all at once as a ZIP file. Each image is named with the page number for easy identification.",
  },
];

export default function PdfToJpg() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [results, setResults] = useState<ConversionResult[]>([]);

  const { pdfToImages, getPageCount, isProcessing, progress, error } =
    usePdfOperations();

  const [options, setOptions] = useState<ConversionOptions>({
    format: "jpeg",
    quality: 85,
    scale: 1.5,
    pages: "all",
    specificPages: "",
  });

  const handleFilesSelected = useCallback(
    async (selectedFiles: File[]) => {
      const selectedFile = selectedFiles[0];
      if (!selectedFile || selectedFile.type !== "application/pdf") return;

      setResults([]);

      try {
        const data = new Uint8Array(await selectedFile.arrayBuffer());
        const count = await getPageCount(data);
        
        const newFile: PdfFile = {
          file: selectedFile,
          id: `${Date.now()}`,
          pageCount: count,
          data: data,
          showPreview: true,
        };
        
        setFiles([newFile]);
        setOptions((prev) => ({
          ...prev,
          specificPages: `1-${count}`,
        }));
      } catch (err) {
        console.error("Error reading PDF:", err);
      }
    },
    [getPageCount],
  );

  const parsePageRanges = (input: string): number[] => {
    const pageCount = files[0]?.pageCount || 0;
    const pages = new Set<number>();
    const ranges = input.split(",").map((s) => s.trim());

    for (const range of ranges) {
      if (range.includes("-")) {
        const [start, end] = range.split("-").map((n) => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(pageCount, end); i++) {
            pages.add(i);
          }
        }
      } else {
        const page = parseInt(range);
        if (!isNaN(page) && page >= 1 && page <= pageCount) {
          pages.add(page);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleConvert = async () => {
    const file = files[0];
    if (!file || !file.data) return;

    setResults([]);

    try {
      const pagesToConvert =
        options.pages === "all"
          ? undefined
          : parsePageRanges(options.specificPages);

      const conversionResults = await pdfToImages(file.data, {
        pages: pagesToConvert,
        format: options.format,
        quality: options.quality / 100,
        scale: options.scale,
      });

      // Create object URLs for preview
      const resultsWithUrls = conversionResults.map((result) => ({
        ...result,
        url: URL.createObjectURL(
          new Blob([result.data], { type: result.mimeType }),
        ),
      }));

      setResults(resultsWithUrls);
    } catch (err) {
      console.error("Conversion failed:", err);
    }
  };

  const handleDownload = (result: ConversionResult) => {
    const ext = options.format === "png" ? "png" : "jpg";
    const baseName = files[0]!.file.name.replace(/\.pdf$/i, "");
    const fileName = `${baseName}_page_${result.page}.${ext}`;

    const blob = new Blob([result.data], { type: result.mimeType });
    saveAs(blob, fileName);
  };

  const handleDownloadAll = async () => {
    if (results.length === 1) {
      handleDownload(results[0]);
      return;
    }

    const zip = new JSZip();
    const ext = options.format === "png" ? "png" : "jpg";
    const baseName = files[0]!.file.name.replace(/\.pdf$/i, "");

    results.forEach((result) => {
      const fileName = `${baseName}_page_${result.page}.${ext}`;
      zip.file(fileName, result.data);
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${baseName}_images.zip`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Cleanup URLs on unmount
  React.useEffect(() => {
    return () => {
      results.forEach((result) => {
        if (result.url) URL.revokeObjectURL(result.url);
      });
    };
  }, [results]);

  return (
    <div className="w-full">
      {/* Conversion-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div 
          className="absolute top-20 left-1/3 w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ background: "radial-gradient(circle, var(--tool-pdf), transparent)" }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-5 animate-blob animation-delay-4000"
          style={{ background: "radial-gradient(circle, var(--tool-jpg), transparent)" }}
        />
      </div>

      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6 relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ main: "PDF to", highlight: "JPG" }}
          subtitle="Convert PDF pages to high-quality images. Extract all pages or select specific ones with customizable quality settings."
          badge={{ text: "PDF to Image Converter", icon: Image }}
          features={features}
        />

        {/* Main Interface */}
        <div className="space-y-6">

          {error && (
            <div className="mb-4 px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {error.message || "An error occurred"}
              </span>
            </div>
          )}

          {/* Conversion Settings - No card wrapper, inline style */}
          <div className="space-y-6">
            {/* Output Format */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Output format</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { format: "jpeg", icon: FileImage, title: "JPEG", desc: "Best for photos" },
                  { format: "png", icon: Image, title: "PNG", desc: "Lossless quality" },
                ].map(({ format, icon: Icon, title, desc }) => {
                  const isSelected = options.format === format;
                  return (
                    <button
                      key={format}
                      onClick={() =>
                        setOptions((prev) => ({
                          ...prev,
                          format: format as any,
                        }))
                      }
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all text-left group",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={cn(
                          "w-5 h-5 mt-0.5",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )} />
                        <div className="flex-1">
                          <div className={cn(
                            "font-medium text-sm",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {desc}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quality Slider (for JPEG) */}
            {options.format === "jpeg" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Image quality</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={options.quality}
                      onChange={(e) => {
                        const value = Math.max(50, Math.min(100, parseInt(e.target.value) || 50));
                        setOptions((prev) => ({ ...prev, quality: value }));
                      }}
                      className="w-14 px-2 py-1 text-sm text-center border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      min={50}
                      max={100}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <Slider
                  value={[options.quality]}
                  onValueChange={(value) =>
                    setOptions((prev) => ({ ...prev, quality: value[0] }))
                  }
                  min={50}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Smaller file</span>
                  <span>Higher quality</span>
                </div>
              </div>
            )}

            {/* Page Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Pages to convert</h3>
              <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                <button
                  onClick={() =>
                    setOptions((prev) => ({ ...prev, pages: "all" }))
                  }
                  className={cn(
                    "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    options.pages === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All Pages
                </button>
                <button
                  onClick={() =>
                    setOptions((prev) => ({ ...prev, pages: "specific" }))
                  }
                  className={cn(
                    "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    options.pages === "specific"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Specific Pages
                </button>
              </div>
            </div>

            {/* Specific Pages Input */}
            {options.pages === "specific" && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={options.specificPages}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      specificPages: e.target.value,
                    }))
                  }
                  placeholder="e.g., 1-5, 8, 10-15"
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter page ranges (1-5) or individual pages (1,3,5)
                </p>
              </div>
            )}

            {/* Resolution Scale */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Resolution scale</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={options.scale}
                    onChange={(e) => {
                      const value = Math.max(0.5, Math.min(3, parseFloat(e.target.value) || 0.5));
                      setOptions((prev) => ({ ...prev, scale: value }));
                    }}
                    step={0.5}
                    className="w-14 px-2 py-1 text-sm text-center border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    min={0.5}
                    max={3}
                  />
                  <span className="text-sm text-muted-foreground">x</span>
                </div>
              </div>
              <Slider
                value={[options.scale]}
                onValueChange={(value) =>
                  setOptions((prev) => ({ ...prev, scale: value[0] }))
                }
                min={0.5}
                max={3}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Lower resolution</span>
                <span>Higher resolution</span>
              </div>
            </div>
          </div>

          {/* Drop Zone / File Display */}
          {files.length === 0 ? (
            <FileDropZone
              onFilesSelected={handleFilesSelected}
              accept="application/pdf"
              multiple={false}
              title="Drop PDF here"
              subtitle="or click to browse"
              infoMessage="Convert PDF pages to images"
            />
          ) : (
            <div className="space-y-4">
              {/* File List */}
              <PdfFileList
                files={files}
                onFilesChange={setFiles}
                onFileRemove={() => {
                  setFiles([]);
                  setResults([]);
                }}
                title="PDF to convert"
                enableReordering={false}
                enablePreviews={true}
                showAddButton={false}
                multiple={false}
                maxVisibleFiles={{ desktop: 1, mobile: 1 }}
                emptyMessage="No PDF loaded"
              />

              {/* Action Button */}
              <Button
                onClick={handleConvert}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Converting... ({Math.round(progress)}%)
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4 mr-2" />
                    Convert to Images
                  </>
                )}
              </Button>

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-4">
                  {/* Success message */}
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900 dark:text-green-200">
                          Conversion complete!
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          {results.length} image{results.length !== 1 ? "s" : ""} created successfully
                        </p>
                      </div>
                      <Button 
                        onClick={handleDownloadAll}
                        variant="outline"
                        size="sm"
                        className="border-green-300 hover:bg-green-100 dark:border-green-800 dark:hover:bg-green-900/50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download All
                      </Button>
                    </div>
                  </div>

                  {/* Image grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {results.map((result) => (
                      <div
                        key={result.page}
                        className="group relative rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                      >
                        <div className="aspect-[3/4] bg-muted">
                          {result.url && (
                            <img
                              src={result.url}
                              alt={`Page ${result.page}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-white">
                                  Page {result.page}
                                </p>
                                <p className="text-xs text-white/80">
                                  {formatFileSize(result.data.byteLength)}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDownload(result)}
                                className="h-8 px-2"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
