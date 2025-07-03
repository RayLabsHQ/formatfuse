import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  Download,
  FileText,
  Settings2,
  AlertCircle,
  Shield,
  Zap,
  ChevronRight,
  Loader2,
  Info,
  Image,
  CheckCircle2,
  FileImage,
  Package,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from '../ui/ToolHeader';
import { CollapsibleSection } from "../ui/mobile/CollapsibleSection";
import { cn } from "../../lib/utils";
import { Slider } from "../ui/slider";
import { usePdfOperations } from "../../hooks/usePdfOperations";
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
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [pageCount, setPageCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    pdfToImages,
    getPageCount,
    isProcessing,
    progress,
    error,
  } = usePdfOperations();

  const [options, setOptions] = useState<ConversionOptions>({
    format: "jpeg",
    quality: 85,
    scale: 1.5,
    pages: "all",
    specificPages: "",
  });

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      if (!selectedFile || selectedFile.type !== "application/pdf") return;

      setFile(selectedFile);
      setResults([]);
      
      try {
        const fileData = new Uint8Array(await selectedFile.arrayBuffer());
        const count = await getPageCount(fileData);
        setPageCount(count);
        setOptions((prev) => ({
          ...prev,
          specificPages: `1-${count}`,
        }));
      } catch (err) {
        console.error("Error reading PDF:", err);
      }
    },
    [getPageCount]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const parsePageRanges = (input: string): number[] => {
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
    if (!file) return;

    setResults([]);
    
    try {
      const fileData = new Uint8Array(await file.arrayBuffer());
      const pagesToConvert = options.pages === "all" 
        ? undefined 
        : parsePageRanges(options.specificPages);

      const conversionResults = await pdfToImages(fileData, {
        pages: pagesToConvert,
        format: options.format,
        quality: options.quality / 100,
        scale: options.scale,
      });

      // Create object URLs for preview
      const resultsWithUrls = conversionResults.map((result) => ({
        ...result,
        url: URL.createObjectURL(new Blob([result.data], { type: result.mimeType })),
      }));

      setResults(resultsWithUrls);
    } catch (err) {
      console.error("Conversion failed:", err);
    }
  };

  const handleDownload = (result: ConversionResult) => {
    const ext = options.format === "png" ? "png" : "jpg";
    const baseName = file!.name.replace(/\.pdf$/i, "");
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
    const baseName = file!.name.replace(/\.pdf$/i, "");

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
      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6">
        {/* Header */}
        <ToolHeader
          title={{ main: "PDF to", highlight: "JPG" }}
          subtitle="Convert PDF pages to high-quality images. Extract all pages or select specific ones with customizable quality settings."
          badge={{ text: "PDF to Image Converter", icon: Image }}
          features={features}
        />

        {/* Main Interface */}
        <div className="space-y-6">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {error && (
            <div className="mb-4 px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error.message || 'An error occurred'}</span>
            </div>
          )}

          {/* Settings Card */}
          <div
            className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            {/* Card Header */}
            <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Conversion Settings
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Output Format */}
              <div className="space-y-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-muted-foreground" />
                  Output Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["jpeg", "png"].map((format) => (
                    <button
                      key={format}
                      onClick={() =>
                        setOptions((prev) => ({
                          ...prev,
                          format: format as any,
                        }))
                      }
                      className={cn(
                        "px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm uppercase",
                        options.format === format
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/50 bg-card/50"
                      )}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Slider (for JPEG) */}
              {options.format === "jpeg" && (
                <div className="space-y-4">
                  <label className="text-sm font-medium">
                    Image Quality: {options.quality}%
                  </label>
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
                  <p className="text-xs text-muted-foreground">
                    Higher quality means larger file size
                  </p>
                </div>
              )}

              {/* Page Selection */}
              <div className="space-y-4">
                <label className="text-sm font-medium">Pages to Convert</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setOptions((prev) => ({ ...prev, pages: "all" }))
                    }
                    className={cn(
                      "px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm",
                      options.pages === "all"
                        ? "border-primary bg-primary/10"
                        : "border-border/50 hover:border-primary/50 bg-card/50"
                    )}
                  >
                    All Pages
                  </button>
                  <button
                    onClick={() =>
                      setOptions((prev) => ({ ...prev, pages: "specific" }))
                    }
                    className={cn(
                      "px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm",
                      options.pages === "specific"
                        ? "border-primary bg-primary/10"
                        : "border-border/50 hover:border-primary/50 bg-card/50"
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
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter page ranges (1-5) or individual pages (1,3,5)
                  </p>
                </div>
              )}

              {/* Advanced Options - Collapsible on Mobile */}
              <div className="sm:hidden">
                <CollapsibleSection
                  title="Advanced Options"
                  defaultOpen={false}
                >
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Resolution Scale: {options.scale}x
                      </label>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Higher scale = higher resolution
                      </p>
                    </div>
                  </div>
                </CollapsibleSection>
              </div>

              {/* Desktop Advanced Options */}
              <div className="hidden sm:block space-y-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  Advanced Options
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 ml-auto transition-transform",
                      showAdvanced && "rotate-90"
                    )}
                  />
                </button>

                {showAdvanced && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Resolution Scale: {options.scale}x
                      </label>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Higher scale = higher resolution
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Drop Zone / File Display */}
          {!file ? (
            <label
              htmlFor="file-upload"
              className="group relative block cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <div
                className={cn(
                  "relative p-12 sm:p-16 md:p-20 rounded-2xl border-2 border-dashed transition-all duration-300",
                  isDragging
                    ? "border-primary bg-primary/10 scale-[1.02]"
                    : "border-border bg-card/50 hover:border-primary hover:bg-card group-hover:scale-[1.01]"
                )}
              >
                <div className="text-center">
                  <Upload
                    className={cn(
                      "w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 transition-all duration-300",
                      isDragging
                        ? "text-primary scale-110"
                        : "text-muted-foreground group-hover:text-primary"
                    )}
                  />
                  <p className="text-lg sm:text-xl font-medium mb-2">
                    Drop PDF here
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    or click to browse
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Convert PDF pages to images
                    </span>
                  </div>
                </div>
              </div>
            </label>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • {pageCount} page{pageCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setFile(null);
                      setResults([]);
                      setPageCount(0);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

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
                <>
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-200">
                        Conversion complete!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {results.length} image{results.length !== 1 ? 's' : ''} created
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleDownloadAll}>
                      <Download className="w-4 h-4 mr-2" />
                      Download All ({results.length})
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {results.map((result) => (
                      <div
                        key={result.page}
                        className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden group"
                      >
                        <div className="aspect-[3/4] relative">
                          {result.url && (
                            <img
                              src={result.url}
                              alt={`Page ${result.page}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Button
                            size="sm"
                            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDownload(result)}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium">Page {result.page}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(result.data.byteLength)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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