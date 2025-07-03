import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  Download,
  FileText,
  Settings2,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  Info,
  Scissors,
  CheckCircle2,
  FileOutput,
  Package,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { CollapsibleSection } from "../ui/mobile/CollapsibleSection";
import { cn } from "../../lib/utils";
import { usePdfOperations } from "../../hooks/usePdfOperations";
import { parsePageRanges, formatPageRanges } from "../../lib/pdf-operations";
import { PdfPreview } from "../ui/pdf-preview";
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
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [pageCount, setPageCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { split, getPageCount, isProcessing, progress, error } =
    usePdfOperations();

  const [options, setOptions] = useState<SplitOptions>({
    mode: "preset",
    preset: "individual",
    customRanges: "",
  });

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      if (!selectedFile || selectedFile.type !== "application/pdf") return;

      setFile(selectedFile);
      setResults([]);

      try {
        const data = new Uint8Array(await selectedFile.arrayBuffer());
        setFileData(data);
        const count = await getPageCount(data);
        setPageCount(count);
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

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect],
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
    [handleFileSelect],
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

  const getPageRanges = (): Array<{ start: number; end: number }> => {
    if (options.mode === "preset") {
      return SPLIT_PRESETS[options.preset].getRanges(pageCount);
    } else {
      return parsePageRanges(options.customRanges, pageCount);
    }
  };

  const handleSplit = async () => {
    if (!file || !fileData) return;

    const ranges = getPageRanges();
    if (ranges.length === 0) {
      alert("Please specify valid page ranges");
      return;
    }

    setResults([]);

    try {
      const splitResults = await split(fileData, { pageRanges: ranges });

      const resultsWithMetadata = splitResults.map((data, index) => {
        const range = ranges[index];
        const baseName = file.name.replace(/\.pdf$/i, "");
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
    const baseName = file!.name.replace(/\.pdf$/i, "");
    saveAs(content, `${baseName}_split.zip`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const previewRanges = getPageRanges();

  return (
    <div className="w-full">
      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6">
        {/* Header */}
        <ToolHeader
          title={{ main: "PDF", highlight: "Split" }}
          subtitle="Split PDFs into multiple files by pages. Extract specific sections or divide documents with flexible splitting options."
          badge={{ text: "Extract PDF Pages Online", icon: Scissors }}
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
                Split Settings
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Split Mode */}
              <div className="space-y-4">
                <label className="text-sm font-medium">Split Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setOptions((prev) => ({ ...prev, mode: "preset" }))
                    }
                    className={cn(
                      "px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm",
                      options.mode === "preset"
                        ? "border-primary bg-primary/10"
                        : "border-border/50 hover:border-primary/50 bg-card/50",
                    )}
                  >
                    Presets
                  </button>
                  <button
                    onClick={() =>
                      setOptions((prev) => ({ ...prev, mode: "custom" }))
                    }
                    className={cn(
                      "px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm",
                      options.mode === "custom"
                        ? "border-primary bg-primary/10"
                        : "border-border/50 hover:border-primary/50 bg-card/50",
                    )}
                  >
                    Custom Ranges
                  </button>
                </div>
              </div>

              {/* Preset Options */}
              {options.mode === "preset" && (
                <div className="space-y-4">
                  <label className="text-sm font-medium">Select Preset</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      Object.keys(SPLIT_PRESETS) as Array<
                        keyof typeof SPLIT_PRESETS
                      >
                    ).map((preset) => (
                      <button
                        key={preset}
                        onClick={() =>
                          setOptions((prev) => ({ ...prev, preset }))
                        }
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all duration-200 text-left",
                          options.preset === preset
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-primary/50 bg-card/50",
                        )}
                      >
                        <div className="font-medium text-sm">
                          {SPLIT_PRESETS[preset].name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {SPLIT_PRESETS[preset].description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Ranges Input */}
              {options.mode === "custom" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Page Ranges</label>
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
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter comma-separated ranges. Each range creates a separate
                    PDF.
                  </p>
                </div>
              )}

              {/* Preview of splits */}
              {pageCount > 0 && previewRanges.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Preview: {previewRanges.length} file
                    {previewRanges.length !== 1 ? "s" : ""} will be created
                  </label>
                  <div className="space-y-1 text-xs text-muted-foreground max-h-32 overflow-y-auto">
                    {previewRanges.map((range, index) => (
                      <div key={index}>
                        File {index + 1}: {formatPageRanges([range])}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                    Drop PDF here
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    or click to browse
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Split PDF into multiple files
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
                      setResults([]);
                      setPageCount(0);
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
                      mode="strip"
                      maxHeight={200}
                    />
                  </div>
                )}
              </div>

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

              {/* Results */}
              {results.length > 0 && (
                <>
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-200">
                        Split complete!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {results.length} file{results.length !== 1 ? "s" : ""}{" "}
                        created
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleDownloadAll}>
                      <Download className="w-4 h-4 mr-2" />
                      Download All ({results.length})
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 flex items-center gap-3"
                      >
                        <FileText className="w-6 h-6 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {result.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pages {formatPageRanges([result.pageRange])} •{" "}
                            {formatFileSize(result.data.byteLength)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(result)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
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
