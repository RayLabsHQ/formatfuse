import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  Info,
  X,
  GripVertical,
  Plus,
  ChevronUp,
  ChevronDown,
  Layers,
  Package,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { TbFileTypePdf } from "react-icons/tb";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { cn } from "../../lib/utils";
import { usePdfOperations } from "../../hooks/usePdfOperations";
import { PdfPreview } from "../ui/pdf-preview";
import FileSaver from "file-saver";

const { saveAs } = FileSaver;

interface FileWithPreview {
  file: File;
  id: string;
  pageCount?: number;
  data?: Uint8Array;
  showPreview?: boolean;
  previewKey?: number;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Instant PDF merging" },
  {
    icon: Layers,
    text: "Unlimited files",
    description: "Merge as many PDFs as needed",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "pdf-split",
    name: "PDF Split",
    description: "Split PDFs into separate files",
    icon: TbFileTypePdf,
  },
  {
    id: "pdf-compress",
    name: "PDF Compress",
    description: "Reduce PDF file size",
    icon: Package,
  },
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Convert images to PDF",
    icon: FileText,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What's the maximum file size for merging?",
    answer:
      "Each PDF can be up to 100MB in size. There's no limit on the number of PDFs you can merge, but we recommend keeping the total size under 500MB for optimal performance.",
  },
  {
    question: "Can I rearrange pages from different PDFs?",
    answer:
      "Currently, you can rearrange the order of entire PDFs. To rearrange individual pages, merge the PDFs first, then use our PDF Split tool to reorganize pages.",
  },
  {
    question: "Will the merged PDF maintain original quality?",
    answer:
      "Yes! The merge process preserves the original quality of all PDFs. No compression is applied unless you specifically use our PDF Compress tool afterward.",
  },
  {
    question: "Can I preview PDFs before merging?",
    answer:
      "Yes, click the eye icon next to any PDF to preview its contents. This helps ensure you're merging files in the correct order.",
  },
];

export default function PdfMerge() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFile, setDraggedFile] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [mergedResult, setMergedResult] = useState<Uint8Array | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { merge, getPageCount, isProcessing, progress, error } =
    usePdfOperations();

  const handleFiles = useCallback(
    async (selectedFiles: File[]) => {
      const pdfFiles = selectedFiles.filter(
        (file) => file.type === "application/pdf",
      );
      const newFiles: FileWithPreview[] = [];

      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        try {
          const fileData = new Uint8Array(await file.arrayBuffer());
          const pageCount = await getPageCount(fileData);
          newFiles.push({
            file,
            id: `${Date.now()}-${i}`,
            pageCount,
            data: fileData,
            showPreview: true,
            previewKey: 0,
          });
        } catch (err) {
          console.error("Error reading PDF:", err);
          newFiles.push({
            file,
            id: `${Date.now()}-${i}`,
            pageCount: undefined,
            showPreview: true,
          });
        }
      }

      setFiles((prev) => [...prev, ...newFiles]);
      setMergedResult(null);
    },
    [getPageCount],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      handleFiles(selectedFiles);
    },
    [handleFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    },
    [handleFiles],
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

  // File reordering functions
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedFile(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOverFile = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    [],
  );

  const handleDropFile = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      if (draggedFile === null) return;

      const draggedIndex = files.findIndex((f) => f.id === draggedFile);
      if (draggedIndex === -1) return;

      const newFiles = [...files];
      const [removed] = newFiles.splice(draggedIndex, 1);
      newFiles.splice(dropIndex, 0, removed);

      setFiles(newFiles);
      setDraggedFile(null);
      setDragOverIndex(null);
      setMergedResult(null);
    },
    [files, draggedFile],
  );

  const moveFile = useCallback(
    (index: number, direction: "up" | "down") => {
      const newFiles = [...files];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= files.length) return;

      [newFiles[index], newFiles[newIndex]] = [
        newFiles[newIndex],
        newFiles[index],
      ];
      setFiles(newFiles);
      setMergedResult(null);
    },
    [files],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setMergedResult(null);
  }, []);

  const togglePreview = useCallback((id: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              showPreview: !f.showPreview,
              previewKey: (f.previewKey || 0) + 1,
            }
          : f,
      ),
    );
  }, []);

  const handleMerge = async () => {
    if (files.length < 2) return;

    const validFiles = files.filter((f) => f.data);
    if (validFiles.length < 2) {
      alert("Need at least 2 valid PDFs to merge");
      return;
    }

    try {
      const result = await merge({ files: validFiles.map((f) => f.data!) });
      setMergedResult(result);
    } catch (err) {
      console.error("Merge failed:", err);
    }
  };

  const downloadMerged = useCallback(() => {
    if (!mergedResult) return;

    const blob = new Blob([mergedResult], { type: "application/pdf" });
    const fileName = `merged_${new Date().getTime()}.pdf`;
    saveAs(blob, fileName);
  }, [mergedResult]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const hasFiles = files.length > 0;
  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0);

  return (
    <div className="w-full">
      {/* Merge-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div 
          className="absolute bottom-20 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-5"
          style={{ background: "radial-gradient(circle, var(--tool-pdf), transparent)" }}
        />
      </div>

      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6 relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ main: "PDF", highlight: "Merge" }}
          subtitle="Combine multiple PDFs into a single document. Drag to reorder, preview contents, and create the perfect merged PDF."
          badge={{ text: "Combine PDF Files Online", icon: Layers }}
          features={features}
        />

        {/* Main Interface */}
        <div className="space-y-6">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {error && (
            <div className="mb-4 px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {error.message || "An error occurred"}
              </span>
            </div>
          )}

          {/* Drop Zone / File List */}
          {!hasFiles ? (
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
                    : "border-border bg-card/50 hover:border-primary hover:bg-card group-hover:scale-[1.01]",
                )}
              >
                <div className="text-center">
                  <Upload
                    className={cn(
                      "w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 transition-all duration-300",
                      isDragging
                        ? "text-primary scale-110"
                        : "text-muted-foreground group-hover:text-primary",
                    )}
                  />
                  <p className="text-lg sm:text-xl font-medium mb-2">
                    Drop PDFs here
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    or click to browse
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Select multiple PDFs to merge
                    </span>
                  </div>
                </div>
              </div>
            </label>
          ) : (
            <div className="space-y-4">
              {/* File List */}
              <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-medium text-base sm:text-lg">
                      PDFs to merge
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {files.length} file{files.length !== 1 ? "s" : ""} •{" "}
                      {totalPages} total page{totalPages !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add more
                  </Button>
                </div>

                <div className="space-y-3">
                  {files.map((fileInfo, index) => (
                    <div
                      key={fileInfo.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, fileInfo.id)}
                      onDragOver={(e) => handleDragOverFile(e, index)}
                      onDrop={(e) => handleDropFile(e, index)}
                      onDragEnd={() => {
                        setDragOverIndex(null);
                        setDraggedFile(null);
                      }}
                      className={cn(
                        "group relative bg-background rounded-lg border p-4 transition-all duration-200",
                        dragOverIndex === index && "ring-2 ring-primary",
                        draggedFile === fileInfo.id && "opacity-50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="cursor-move hidden sm:block">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {fileInfo.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(fileInfo.file.size)} •{" "}
                            {fileInfo.pageCount
                              ? `${fileInfo.pageCount} page${
                                  fileInfo.pageCount !== 1 ? "s" : ""
                                }`
                              : "Loading..."}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Mobile reorder buttons */}
                          <div className="flex gap-1 sm:hidden">
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveFile(index, "up")}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                            )}
                            {index < files.length - 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => moveFile(index, "down")}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {fileInfo.data && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => togglePreview(fileInfo.id)}
                            >
                              {fileInfo.showPreview ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeFile(fileInfo.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* PDF Preview */}
                      {fileInfo.showPreview && fileInfo.data && (
                        <div className="mt-4 border-t pt-4">
                          <PdfPreview
                            pdfData={fileInfo.data}
                            mode="strip"
                            maxHeight={200}
                            key={fileInfo.previewKey}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  <span className="hidden sm:inline">
                    Drag PDFs to reorder them
                  </span>
                  <span className="sm:hidden">Use arrows to reorder files</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleMerge}
                  disabled={isProcessing || files.length < 2}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Merging PDFs ({Math.round(progress)}%)
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 mr-2" />
                      Merge {files.length} PDFs
                    </>
                  )}
                </Button>

                {mergedResult && (
                  <Button
                    onClick={downloadMerged}
                    variant="default"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Merged PDF
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          {mergedResult && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-200">
                  PDFs merged successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {totalPages} pages combined •{" "}
                  {formatFileSize(mergedResult.byteLength)}
                </p>
              </div>
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
