import React, { useState, useCallback } from "react";
import {
  Download,
  FileText,
  Settings2,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  Eye,
  EyeOff,
  X,
  FileOutput,
} from "lucide-react";
import { Button } from "../ui/button";
import { FileDropZone } from "../ui/FileDropZone";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { CollapsibleSection } from "../ui/mobile/CollapsibleSection";
import { cn } from "../../lib/utils";
import { usePdfOperations } from "../../hooks/usePdfOperations";
import { parsePageRanges } from "../../lib/pdf-operations";
import { PdfPreview } from "../ui/pdf-preview";
import FileSaver from "file-saver";

const { saveAs } = FileSaver;

interface RotateOptions {
  angle: 90 | 180 | 270;
  mode: "all" | "visual" | "manual";
  selectedPages: number[];
  manualPages: string;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Instant rotation" },
  {
    icon: Eye,
    text: "Visual selection",
    description: "Click pages to rotate",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "pdf-split",
    name: "PDF Split",
    description: "Split PDFs into parts",
    icon: FileText,
  },
  {
    id: "pdf-merge",
    name: "PDF Merge",
    description: "Combine multiple PDFs",
    icon: FileText,
  },
  {
    id: "pdf-compress",
    name: "PDF Compress",
    description: "Reduce PDF file size",
    icon: FileText,
  },
];

const faqs: FAQItem[] = [
  {
    question: "How do I rotate specific pages?",
    answer:
      "You have three options: 'All Pages' rotates the entire document, 'Visual Selection' lets you click on specific pages to rotate, and 'Manual Ranges' allows you to enter page numbers like '1-3, 5, 7-10'.",
  },
  {
    question: "What rotation angles are available?",
    answer:
      "You can rotate pages 90° clockwise, 180° (upside down), or 270° counter-clockwise. The visual preview shows exactly how your pages will be oriented after rotation.",
  },
  {
    question: "Will rotating affect the quality of my PDF?",
    answer:
      "No, rotating a PDF is a lossless operation. All text, images, and formatting remain exactly as they were, just in a different orientation. The file quality and resolution are preserved.",
  },
  {
    question: "Can I rotate different pages in different directions?",
    answer:
      "Currently, all selected pages are rotated by the same angle in a single operation. To rotate different pages in different directions, you'll need to process the PDF multiple times, selecting different pages each time.",
  },
];

const ROTATION_OPTIONS = [
  { angle: 90 as const, label: "Clockwise", icon: RotateCw },
  { angle: 180 as const, label: "Upside down", icon: RotateCw },
  { angle: 270 as const, label: "Counter-clockwise", icon: RotateCcw },
];

export default function PdfRotate() {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [rotatedResult, setRotatedResult] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);

  const { rotate, getPageCount, isProcessing, progress, error } =
    usePdfOperations();

  const [options, setOptions] = useState<RotateOptions>({
    angle: 90,
    mode: "all",
    selectedPages: [],
    manualPages: "",
  });

  const handleFilesSelected = useCallback(
    async (selectedFiles: File[]) => {
      const selectedFile = selectedFiles[0];
      if (!selectedFile || selectedFile.type !== "application/pdf") return;

      setFile(selectedFile);
      setRotatedResult(null);

      try {
        const data = new Uint8Array(await selectedFile.arrayBuffer());
        setFileData(data);
        const count = await getPageCount(data);
        setPageCount(count);
        setOptions((prev) => ({
          ...prev,
          manualPages: `1-${count}`,
          selectedPages: [],
        }));
      } catch (err) {
        console.error("Error reading PDF:", err);
      }
    },
    [getPageCount],
  );

  const handlePageSelect = useCallback((pages: number[]) => {
    setOptions((prev) => ({ ...prev, selectedPages: pages }));
  }, []);

  const getPageNumbers = (): number[] => {
    if (options.mode === "all") {
      return []; // Empty array means all pages
    } else if (options.mode === "visual") {
      return options.selectedPages;
    } else {
      const ranges = parsePageRanges(options.manualPages, pageCount);
      return ranges.flatMap((range) => {
        const pages = [];
        for (let i = range.start; i <= range.end; i++) {
          pages.push(i);
        }
        return pages;
      });
    }
  };

  const handleRotate = async () => {
    if (!file || !fileData) return;

    setRotatedResult(null);

    try {
      const pageNumbers = getPageNumbers();
      const rotated = await rotate(fileData, {
        angle: options.angle,
        pages: pageNumbers,
      });
      setRotatedResult(rotated);
    } catch (err) {
      console.error("Error rotating PDF:", err);
    }
  };

  const handleDownload = () => {
    if (!rotatedResult || !file) return;

    const blob = new Blob([rotatedResult], { type: "application/pdf" });
    const baseName = file.name.replace(/\.pdf$/i, "");
    saveAs(blob, `${baseName}_rotated_${options.angle}deg.pdf`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="w-full">
      {/* Rotation-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] via-transparent to-accent/[0.01]" />
        <div 
          className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-8 animate-blob"
          style={{ background: "radial-gradient(circle, var(--tool-pdf), transparent)" }}
        />
        <div className="absolute bottom-1/3 left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6 relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ main: "Rotate", highlight: "PDF" }}
          subtitle="Rotate PDF pages or entire documents. Choose specific pages visually or rotate everything at once with multiple angle options."
          badge={{ text: "Rotate PDF Pages Free", icon: RotateCw }}
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

          {/* Settings Card */}
          <div
            className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            {/* Card Header */}
            <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Rotation Settings
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Rotation Angle */}
              <div className="space-y-4">
                <label className="text-sm font-medium">Rotation Angle</label>
                <div className="grid grid-cols-3 gap-3">
                  {ROTATION_OPTIONS.map(({ angle, label, icon: Icon }) => (
                    <button
                      key={angle}
                      onClick={() => setOptions((prev) => ({ ...prev, angle }))}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-200",
                        options.angle === angle
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/50 bg-card/50",
                      )}
                    >
                      <div className="flex flex-col items-center gap-3">
                        {/* Visual rotation preview */}
                        <div className="relative w-16 h-16 bg-secondary rounded flex items-center justify-center">
                          <div
                            className="w-12 h-16 bg-card border-2 border-primary/20 rounded transition-transform duration-300"
                            style={{ transform: `rotate(${angle}deg)` }}
                          >
                            <div className="h-full flex flex-col">
                              <div className="h-2 bg-primary/20 rounded-t" />
                              <div className="flex-1 p-1">
                                <div className="h-1 bg-border rounded mb-1" />
                                <div className="h-1 bg-border rounded mb-1" />
                                <div className="h-1 bg-border rounded" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <Icon className="w-4 h-4" />
                            <span className="font-medium text-sm">
                              {angle}°
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {label}
                          </span>
                        </div>
                      </div>
                      {options.angle === angle && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Selection Mode */}
              <div className="space-y-4">
                <label className="text-sm font-medium">Pages to Rotate</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() =>
                      setOptions((prev) => ({ ...prev, mode: "all" }))
                    }
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all duration-200 text-left",
                      options.mode === "all"
                        ? "border-primary bg-primary/10"
                        : "border-border/50 hover:border-primary/50 bg-card/50",
                    )}
                  >
                    <FileOutput className="w-5 h-5 text-primary mb-2" />
                    <div className="font-medium text-sm">All Pages</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Rotate entire document
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      setOptions((prev) => ({ ...prev, mode: "visual" }))
                    }
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all duration-200 text-left",
                      options.mode === "visual"
                        ? "border-primary bg-primary/10"
                        : "border-border/50 hover:border-primary/50 bg-card/50",
                    )}
                  >
                    <Eye className="w-5 h-5 text-primary mb-2" />
                    <div className="font-medium text-sm">Visual Selection</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Click pages to select
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      setOptions((prev) => ({ ...prev, mode: "manual" }))
                    }
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all duration-200 text-left",
                      options.mode === "manual"
                        ? "border-primary bg-primary/10"
                        : "border-border/50 hover:border-primary/50 bg-card/50",
                    )}
                  >
                    <FileText className="w-5 h-5 text-primary mb-2" />
                    <div className="font-medium text-sm">Manual Ranges</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Enter page numbers
                    </div>
                  </button>
                </div>
              </div>

              {/* Visual Selection Info */}
              {options.mode === "visual" && file && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                      Click on pages below to select them for rotation. Selected
                      pages will be highlighted and rotated by your chosen
                      angle.
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Range Input */}
              {options.mode === "manual" && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={options.manualPages}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        manualPages: e.target.value,
                      }))
                    }
                    placeholder="e.g., 1-3, 5, 7-10"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter page numbers or ranges separated by commas
                  </p>
                </div>
              )}

              {/* Selected Pages Summary */}
              {options.mode !== "all" && pageCount > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Preview:{" "}
                    {options.mode === "visual"
                      ? options.selectedPages.length
                      : getPageNumbers().length}{" "}
                    page
                    {(options.mode === "visual"
                      ? options.selectedPages.length
                      : getPageNumbers().length) !== 1
                      ? "s"
                      : ""}{" "}
                    will be rotated
                  </label>
                  {options.mode === "visual" &&
                    options.selectedPages.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Pages:{" "}
                        {options.selectedPages.sort((a, b) => a - b).join(", ")}
                      </p>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Drop Zone / File Display */}
          {!file ? (
            <FileDropZone
              onFilesSelected={handleFilesSelected}
              accept="application/pdf"
              multiple={false}
              title="Drop PDF here"
              subtitle="or click to browse"
              infoMessage="Rotate PDF pages to any angle"
            />
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • {pageCount} page
                      {pageCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setFile(null);
                      setFileData(null);
                      setRotatedResult(null);
                      setPageCount(0);
                      setOptions((prev) => ({ ...prev, selectedPages: [] }));
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* PDF Preview */}
                {showPreview && fileData && (
                  <div className="mt-4 border-t pt-4">
                    <PdfPreview
                      pdfData={fileData}
                      mode={options.mode === "visual" ? "grid" : "strip"}
                      maxHeight={options.mode === "visual" ? 400 : 200}
                      selectable={options.mode === "visual"}
                      selectedPages={options.selectedPages}
                      onPageSelect={handlePageSelect}
                    />
                  </div>
                )}
              </div>

              {/* Action Button */}
              <Button
                onClick={handleRotate}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rotating... ({Math.round(progress)}%)
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4 mr-2" />
                    Rotate PDF
                  </>
                )}
              </Button>

              {/* Result */}
              {rotatedResult && (
                <>
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-200">
                        Rotation complete!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {options.mode === "all"
                          ? `All ${pageCount} pages`
                          : `${getPageNumbers().length} pages`}{" "}
                        rotated {options.angle}°
                      </p>
                    </div>
                  </div>

                  <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 flex items-center gap-3">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Rotated PDF</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(rotatedResult.byteLength)}
                      </p>
                    </div>
                    <Button size="sm" onClick={handleDownload}>
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
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
