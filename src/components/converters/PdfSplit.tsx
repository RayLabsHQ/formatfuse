import React, { useState, useCallback, useRef } from "react";
import {
  Download,
  FileText,
  Settings2,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  Scissors,
  CheckCircle2,
  FileOutput,
  Package,
  Eye,
} from "lucide-react";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { FileDropZone } from "../ui/FileDropZone";
import { cn } from "../../lib/utils";
import { usePdfOperations } from "../../hooks/usePdfOperations";
import { parsePageRanges, formatPageRanges } from "../../lib/pdf-operations";
import { PdfPreview } from "../ui/pdf-preview";
import { PdfFileList, type PdfFile } from "../ui/PdfFileList";
import FileSaver from "file-saver";
import JSZip from "jszip";

const { saveAs } = FileSaver;

interface SplitOptions {
  mode: "preset" | "custom";
  preset: "individual" | "halves" | "thirds" | "quarters";
  customRanges: string;
}

interface SplitResult {
  data: Uint8Array;
  pageRange: { start: number; end: number };
  filename: string;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Instant splitting" },
  {
    icon: Scissors,
    text: "Flexible splitting",
    description: "Multiple split options",
  },
];

const relatedTools: RelatedTool[] = [
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
    icon: Package,
  },
  {
    id: "pdf-to-jpg",
    name: "PDF to JPG",
    description: "Convert PDF to images",
    icon: FileOutput,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What are the different split modes?",
    answer:
      "Individual Pages creates a separate PDF for each page. Split in Half divides the PDF into two equal parts. Split in Thirds creates three equal parts. Split in Quarters creates four equal parts. Custom mode lets you define specific page ranges.",
  },
  {
    question: "How do I specify custom page ranges?",
    answer:
      "Use comma-separated ranges like '1-5, 8, 10-15' to create multiple PDFs. Each range becomes a separate file. For example, '1-5' creates a PDF with pages 1 through 5.",
  },
  {
    question: "Can I preview before splitting?",
    answer:
      "Yes! Click the eye icon to preview your PDF and see exactly which pages will be included in each split file. This helps ensure you're splitting at the right places.",
  },
  {
    question: "How are the split files named?",
    answer:
      "Files are automatically named based on the original filename and page range. For example, 'document.pdf' split into pages 1-5 becomes 'document_pages_1-5.pdf'.",
  },
];

const SPLIT_PRESETS = {
  individual: {
    name: "Individual Pages",
    description: "One file per page",
    getRanges: (pageCount: number) =>
      Array.from({ length: pageCount }, (_, i) => ({
        start: i + 1,
        end: i + 1,
      })),
  },
  halves: {
    name: "Split in Half",
    description: "Two equal parts",
    getRanges: (pageCount: number) => {
      const mid = Math.ceil(pageCount / 2);
      return [
        { start: 1, end: mid },
        { start: mid + 1, end: pageCount },
      ];
    },
  },
  thirds: {
    name: "Split in Thirds",
    description: "Three equal parts",
    getRanges: (pageCount: number) => {
      const third = Math.ceil(pageCount / 3);
      return [
        { start: 1, end: third },
        { start: third + 1, end: Math.min(third * 2, pageCount) },
        { start: third * 2 + 1, end: pageCount },
      ].filter((range) => range.start <= pageCount);
    },
  },
  quarters: {
    name: "Split in Quarters",
    description: "Four equal parts",
    getRanges: (pageCount: number) => {
      const quarter = Math.ceil(pageCount / 4);
      return [
        { start: 1, end: quarter },
        { start: quarter + 1, end: Math.min(quarter * 2, pageCount) },
        { start: quarter * 2 + 1, end: Math.min(quarter * 3, pageCount) },
        { start: quarter * 3 + 1, end: pageCount },
      ].filter((range) => range.start <= pageCount);
    },
  },
};

export default function PdfSplit() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [results, setResults] = useState<SplitResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { split, getPageCount, isProcessing, progress, error } =
    usePdfOperations();

  const [options, setOptions] = useState<SplitOptions>({
    mode: "preset",
    preset: "individual",
    customRanges: "",
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
          customRanges: `1-${count}`,
        }));
      } catch (err) {
        console.error("Error reading PDF:", err);
      }
    },
    [getPageCount],
  );


  const getPageRanges = (): Array<{ start: number; end: number }> => {
    const pageCount = files[0]?.pageCount || 0;
    if (options.mode === "preset") {
      return SPLIT_PRESETS[options.preset].getRanges(pageCount);
    } else {
      return parsePageRanges(options.customRanges, pageCount);
    }
  };

  const handleSplit = async () => {
    const file = files[0];
    if (!file || !file.data) return;

    const ranges = getPageRanges();
    if (ranges.length === 0) {
      alert("Please specify valid page ranges");
      return;
    }

    setResults([]);

    try {
      const splitResults = await split(file.data, { pageRanges: ranges });

      const resultsWithMetadata = splitResults.map((data, index) => {
        const range = ranges[index];
        const baseName = file.file.name.replace(/\.pdf$/i, "");
        const filename =
          range.start === range.end
            ? `${baseName}_page_${range.start}.pdf`
            : `${baseName}_pages_${range.start}-${range.end}.pdf`;

        return {
          data,
          pageRange: range,
          filename,
        };
      });

      setResults(resultsWithMetadata);
    } catch (err) {
      console.error("Split failed:", err);
    }
  };

  const handleDownload = (result: SplitResult) => {
    const blob = new Blob([result.data], { type: "application/pdf" });
    saveAs(blob, result.filename);
  };

  const handleDownloadAll = async () => {
    if (results.length === 1) {
      handleDownload(results[0]);
      return;
    }

    const zip = new JSZip();

    results.forEach((result) => {
      zip.file(result.filename, result.data);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const baseName = files[0]!.file.name.replace(/\.pdf$/i, "");
    saveAs(content, `${baseName}_split.zip`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const previewRanges = getPageRanges();
  const pageCount = files[0]?.pageCount || 0;

  return (
    <div className="w-full">
      {/* Split-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div 
          className="absolute top-32 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-10"
          style={{ background: "radial-gradient(circle, var(--tool-pdf), transparent)" }}
        />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6 relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ main: "PDF", highlight: "Split" }}
          subtitle="Split PDFs into multiple files by pages. Extract specific sections or divide documents with flexible splitting options."
          badge={{ text: "Extract PDF Pages Online", icon: Scissors }}
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

          {/* Split Settings - No card wrapper, inline style like PDF Compress */}
          <div className="space-y-6">
            {/* Split Mode Tabs */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Split Mode</h3>
              <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                <button
                  onClick={() =>
                    setOptions((prev) => ({ ...prev, mode: "preset" }))
                  }
                  className={cn(
                    "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    options.mode === "preset"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Scissors className="w-4 h-4 inline-block mr-2" />
                  Presets
                </button>
                <button
                  onClick={() =>
                    setOptions((prev) => ({ ...prev, mode: "custom" }))
                  }
                  className={cn(
                    "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    options.mode === "custom"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Settings2 className="w-4 h-4 inline-block mr-2" />
                  Custom
                </button>
              </div>
            </div>

            {/* Preset Options - Visual style like PDF Compress quality presets */}
            {options.mode === "preset" && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Choose how to split</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    Object.keys(SPLIT_PRESETS) as Array<
                      keyof typeof SPLIT_PRESETS
                    >
                  ).map((preset) => {
                    const isSelected = options.preset === preset;
                    const presetInfo = SPLIT_PRESETS[preset];
                    
                    // Icons for each preset
                    const icons = {
                      individual: FileText,
                      halves: Scissors,
                      thirds: Package,
                      quarters: FileOutput,
                    };
                    const Icon = icons[preset] || FileText;
                    
                    return (
                      <button
                        key={preset}
                        onClick={() =>
                          setOptions((prev) => ({ ...prev, preset }))
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
                              {presetInfo.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {presetInfo.description}
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
            )}

            {/* Custom Ranges Input - Cleaner style */}
            {options.mode === "custom" && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Page ranges</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={options.customRanges}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        customRanges: e.target.value,
                      }))
                    }
                    placeholder="e.g., 1-5, 8, 10-15"
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter comma-separated ranges. Each range creates a separate PDF.
                  </p>
                </div>
              </div>
            )}

            {/* Preview of splits - Compact inline style */}
            {pageCount > 0 && previewRanges.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {previewRanges.length} file{previewRanges.length !== 1 ? "s" : ""} will be created
                  </span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground pl-6">
                  {previewRanges.slice(0, 5).map((range, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      <span>File {index + 1}: Pages {formatPageRanges([range])}</span>
                    </div>
                  ))}
                  {previewRanges.length > 5 && (
                    <div className="text-muted-foreground italic">
                      ... and {previewRanges.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Drop Zone / File Display */}
          {files.length === 0 ? (
            <FileDropZone
              onFilesSelected={handleFilesSelected}
              accept="application/pdf"
              multiple={false}
              isDragging={isDragging}
              onDragStateChange={setIsDragging}
              title="Drop PDF here"
              subtitle="or click to browse"
              infoMessage="Split PDF into multiple files"
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
                title="PDF to split"
                enableReordering={false}
                enablePreviews={true}
                showAddButton={false}
                multiple={false}
                maxVisibleFiles={{ desktop: 1, mobile: 1 }}
                emptyMessage="No PDF loaded"
              />

              {/* Action Button */}
              <Button
                onClick={handleSplit}
                disabled={isProcessing || previewRanges.length === 0}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Splitting... ({Math.round(progress)}%)
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 mr-2" />
                    Split into {previewRanges.length} file
                    {previewRanges.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>

              {/* Results - Cleaner style matching PDF Compress */}
              {results.length > 0 && (
                <div className="space-y-4">
                  {/* Success message */}
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900 dark:text-green-200">
                          Split complete!
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          {results.length} file{results.length !== 1 ? "s" : ""} created successfully
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

                  {/* File list - Compact style */}
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {result.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pages {formatPageRanges([result.pageRange])} • {formatFileSize(result.data.byteLength)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(result)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
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
