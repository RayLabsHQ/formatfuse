import React, { useState, useCallback } from "react";
import {
  Download,
  FileText,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  Eye,
  FileOutput,
  Info,
} from "lucide-react";
import { Button } from "../ui/button";
import { FileDropZone } from "../ui/FileDropZone";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { cn } from "../../lib/utils";
import { usePdfOperations } from "../../hooks/usePdfOperations";
import { parsePageRanges } from "../../lib/pdf-operations";
import { PdfPreview } from "../ui/pdf-preview";
import { PdfFileList, type PdfFile } from "../ui/PdfFileList";
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
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [rotatedResult, setRotatedResult] = useState<Uint8Array | null>(null);

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

      setRotatedResult(null);

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
    const pageCount = files[0]?.pageCount || 0;
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
    const file = files[0];
    if (!file || !file.data) return;

    setRotatedResult(null);

    try {
      const pageNumbers = getPageNumbers();
      const rotated = await rotate(file.data, {
        angle: options.angle,
        pages: pageNumbers,
      });
      setRotatedResult(rotated);
    } catch (err) {
      console.error("Error rotating PDF:", err);
    }
  };

  const handleDownload = () => {
    if (!rotatedResult || !files[0]) return;

    const blob = new Blob([rotatedResult], { type: "application/pdf" });
    const baseName = files[0].file.name.replace(/\.pdf$/i, "");
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

          {/* Rotation Settings - No card wrapper, inline style */}
          <div className="space-y-6">
            {/* Rotation Angle */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Rotation angle</h3>
              <div className="grid grid-cols-3 gap-3">
                {ROTATION_OPTIONS.map(({ angle, label, icon: Icon }) => {
                  const isSelected = options.angle === angle;
                  return (
                    <button
                      key={angle}
                      onClick={() => setOptions((prev) => ({ ...prev, angle }))}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all group",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/50 hover:bg-muted/50",
                      )}
                    >
                        <div className="flex flex-col items-center gap-3">
                          {/* Visual rotation preview */}
                          <div className="relative w-16 h-16 bg-muted/50 rounded flex items-center justify-center">
                            <div
                              className={cn(
                                "w-12 h-16 border-2 rounded transition-all duration-300",
                                isSelected
                                  ? "bg-background border-primary/40"
                                  : "bg-card border-border"
                              )}
                              style={{ transform: `rotate(${angle}deg)` }}
                            >
                              <div className="h-full flex flex-col">
                                <div className={cn(
                                  "h-2 rounded-t",
                                  isSelected ? "bg-primary/30" : "bg-muted"
                                )} />
                                <div className="flex-1 p-1 space-y-1">
                                  <div className="h-0.5 bg-muted-foreground/20 rounded" />
                                  <div className="h-0.5 bg-muted-foreground/20 rounded" />
                                  <div className="h-0.5 bg-muted-foreground/20 rounded" />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <Icon className={cn(
                                "w-4 h-4",
                                isSelected ? "text-primary" : "text-muted-foreground"
                              )} />
                              <span className={cn(
                                "font-medium text-sm",
                                isSelected ? "text-primary" : "text-foreground"
                              )}>
                                {angle}°
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {label}
                            </span>
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

            {/* Page Selection Mode */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Pages to rotate</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { mode: "all" as const, icon: FileOutput, title: "All Pages", desc: "Rotate entire document" },
                  { mode: "visual" as const, icon: Eye, title: "Visual Selection", desc: "Click pages to select" },
                  { mode: "manual" as const, icon: FileText, title: "Manual Ranges", desc: "Enter page numbers" },
                ].map(({ mode, icon: Icon, title, desc }) => {
                  const isSelected = options.mode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setOptions((prev) => ({ ...prev, mode }))}
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

            {/* Visual Selection Info */}
            {options.mode === "visual" && files.length > 0 && (
              <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-900/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                    Click on pages below to select them for rotation
                  </p>
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
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter page numbers or ranges separated by commas
                </p>
              </div>
            )}

            {/* Selected Pages Summary */}
            {options.mode !== "all" && files[0]?.pageCount > 0 && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {options.mode === "visual"
                      ? options.selectedPages.length
                      : getPageNumbers().length}{" "}
                    page{(options.mode === "visual"
                      ? options.selectedPages.length
                      : getPageNumbers().length) !== 1
                      ? "s"
                      : ""}{" "}
                    will be rotated {options.angle}°
                  </span>
                </div>
                {options.mode === "visual" && options.selectedPages.length > 0 && (
                  <p className="text-xs text-muted-foreground pl-6">
                    Pages: {options.selectedPages.sort((a, b) => a - b).join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Drop Zone / File Display */}
          {files.length === 0 ? (
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
              {/* File List with Visual Selection */}
              {options.mode === "visual" && files[0]?.data ? (
                <div className="rounded-xl border border-border p-4">
                  <PdfPreview
                    pdfData={files[0].data}
                    mode="grid"
                    maxHeight={400}
                    selectable={true}
                    selectedPages={options.selectedPages}
                    onPageSelect={handlePageSelect}
                  />
                </div>
              ) : (
                <PdfFileList
                  files={files}
                  onFilesChange={setFiles}
                  onFileRemove={() => {
                    setFiles([]);
                    setRotatedResult(null);
                    setOptions((prev) => ({ ...prev, selectedPages: [] }));
                  }}
                  title="PDF to rotate"
                  enableReordering={false}
                  enablePreviews={true}
                  showAddButton={false}
                  multiple={false}
                  maxVisibleFiles={{ desktop: 1, mobile: 1 }}
                  emptyMessage="No PDF loaded"
                />
              )}

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
                <div className="space-y-4">
                  {/* Success message */}
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900 dark:text-green-200">
                          Rotation complete!
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          {options.mode === "all"
                            ? `All ${files[0]?.pageCount || 0} pages`
                            : `${getPageNumbers().length} pages`}{" "}
                          rotated {options.angle}°
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Download button */}
                  <div className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Rotated PDF</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(rotatedResult.byteLength)}
                      </p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleDownload}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
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
