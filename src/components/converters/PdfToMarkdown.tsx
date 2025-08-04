import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  FileText,
  Download,
  AlertCircle,
  Upload,
  FileDown,
  Maximize2,
  Minimize2,
  Shield,
  Loader2,
  Zap,
  Type,
  Code,
  ClipboardPaste,
  Copy,
  Hash,
  ListOrdered,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import FileSaver from "file-saver";
import * as Comlink from "comlink";
import type { PdfToMarkdownWorker } from "../../workers/pdf-to-markdown.worker";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { cn } from "../../lib/utils";

const { saveAs } = FileSaver;

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Your PDF never leaves your device",
  },
  {
    icon: Zap,
    text: "Instant conversion",
    description: "No waiting or server processing",
  },
  {
    icon: Type,
    text: "Smart formatting",
    description: "Preserves headers, lists, and structure",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "markdown-to-pdf",
    name: "Markdown to PDF",
    description: "Convert Markdown to PDF",
    icon: FileText,
  },
  {
    id: "pdf-to-text",
    name: "PDF to Text",
    description: "Extract plain text from PDF",
    icon: Type,
  },
  {
    id: "pdf-merge",
    name: "PDF Merge",
    description: "Combine multiple PDFs",
    icon: FileText,
  },
];

const faqs: FAQItem[] = [
  {
    question: "How accurate is the PDF to Markdown conversion?",
    answer:
      "Our converter uses advanced text extraction to preserve document structure including headers, paragraphs, lists, and basic formatting. Complex layouts, tables, and images may require manual adjustment in the resulting Markdown.",
  },
  {
    question: "What happens to images in the PDF?",
    answer:
      "Currently, the converter focuses on text extraction. Images are noted in the output but not embedded. For PDFs with many images, you may need to manually add image references to your Markdown file.",
  },
  {
    question: "Can it handle scanned PDFs?",
    answer:
      "This tool works best with text-based PDFs. Scanned PDFs (which are essentially images) require OCR (Optical Character Recognition) first. For scanned documents, consider using an OCR tool before converting to Markdown.",
  },
  {
    question: "What PDF features are preserved?",
    answer:
      "The converter preserves headers (detected by font size), paragraphs, bullet lists, numbered lists, and basic text formatting. Tables are converted to simple text representation. Complex formatting like columns may need manual adjustment.",
  },
];

export const PdfToMarkdown: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [markdownResult, setMarkdownResult] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [includePageBreaks, setIncludePageBreaks] = useState(true);
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [visualLineCount, setVisualLineCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const workerRef = useRef<Comlink.Remote<PdfToMarkdownWorker> | null>(null);

  // Initialize worker
  useEffect(() => {
    const initWorker = async () => {
      const worker = new Worker(
        new URL("../../workers/pdf-to-markdown.worker.ts", import.meta.url),
        { type: "module" }
      );
      const Converter = Comlink.wrap<typeof PdfToMarkdownWorker>(worker);
      workerRef.current = await new Converter();
    };

    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current[Comlink.releaseProxy]();
      }
    };
  }, []);

  // Calculate visual line count based on textarea content
  useEffect(() => {
    if (textareaRef.current && markdownResult) {
      const textarea = textareaRef.current;
      // Store original height
      const originalHeight = textarea.style.height;

      // Reset height to auto to get scrollHeight
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;

      // Calculate line height (24px based on leading-6 class)
      const lineHeight = 24;
      const calculatedLines = Math.ceil(scrollHeight / lineHeight);

      // Restore original height
      textarea.style.height = originalHeight;

      setVisualLineCount(calculatedLines);
    } else {
      setVisualLineCount(0);
    }
  }, [markdownResult]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".pdf")) {
      setError(new Error("Please select a PDF file"));
      return;
    }

    setError(null);
    setPdfFile(selectedFile);
    setMarkdownResult("");
    setActiveTab("input");
    toast.success(`Loaded ${selectedFile.name}`);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleCopy = useCallback(async () => {
    if (markdownResult) {
      try {
        await navigator.clipboard.writeText(markdownResult);
        toast.success("Copied to clipboard");
      } catch (err) {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy to clipboard");
      }
    }
  }, [markdownResult]);

  const handleConvert = useCallback(async () => {
    if (!pdfFile || !workerRef.current) return;

    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfData = new Uint8Array(arrayBuffer);

      const result = await workerRef.current.convert(
        pdfData,
        {
          includePageBreaks,
          preserveFormatting,
          extractImages: false,
        },
        Comlink.proxy((progress) => {
          // Progress callback if needed
        })
      );

      setMarkdownResult(result);
      setActiveTab("output");
      toast.success("Conversion completed successfully");
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Conversion failed"));
      toast.error("Failed to convert PDF");
    } finally {
      setIsProcessing(false);
    }
  }, [pdfFile, includePageBreaks, preserveFormatting]);

  const downloadMarkdown = useCallback(() => {
    if (!markdownResult) return;

    const blob = new Blob([markdownResult], { type: "text/markdown" });
    const fileName = pdfFile
      ? pdfFile.name.replace(/\.pdf$/i, ".md")
      : "document.md";
    saveAs(blob, fileName);
    toast.success("Markdown file downloaded successfully");
  }, [markdownResult, pdfFile]);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      {/* Document Extraction-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] via-transparent to-accent/[0.01]" />
        <div className="absolute top-1/4 left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/8 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <section className="flex-1 w-full max-w-7xl mx-auto px-0 py-4 sm:p-4 md:p-6 lg:px-8 lg:py-6 flex flex-col h-full relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ main: "Markdown", highlight: "PDF to" }}
          subtitle="Extract text from PDFs and convert to clean, formatted Markdown with smart structure detection."
          badge={{ text: "PDF Text Extraction", icon: Code }}
          features={features}
        />

        {/* Controls Bar - Mobile optimized */}
        <div className="border-b px-3 sm:px-6 py-2 sm:py-3 bg-card/50">
          <div className="flex flex-col gap-3">
            {/* Mobile: Show convert or download button based on state */}
            <div className="lg:hidden flex justify-center">
              {markdownResult && activeTab === "output" ? (
                <Button
                  onClick={downloadMarkdown}
                  size="default"
                  className="w-full max-w-xs touch-manipulation bg-primary hover:bg-primary/90"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Markdown
                </Button>
              ) : (
                <Button
                  onClick={handleConvert}
                  disabled={isProcessing || !pdfFile}
                  size="default"
                  className="w-full max-w-xs touch-manipulation"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 mr-2" />
                      Convert to Markdown
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Options controls - collapsible on mobile */}
            <details className="lg:hidden">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground touch-manipulation p-1">
                Conversion Settings
              </summary>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={includePageBreaks}
                    onChange={(e) => setIncludePageBreaks(e.target.checked)}
                    className="rounded"
                  />
                  Include page breaks
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={preserveFormatting}
                    onChange={(e) => setPreserveFormatting(e.target.checked)}
                    className="rounded"
                  />
                  Detect headers
                </label>
              </div>
            </details>

            {/* Desktop controls */}
            <div className="hidden lg:flex lg:items-center lg:justify-between">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includePageBreaks}
                    onChange={(e) => setIncludePageBreaks(e.target.checked)}
                    className="rounded"
                  />
                  Include page breaks
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={preserveFormatting}
                    onChange={(e) => setPreserveFormatting(e.target.checked)}
                    className="rounded"
                  />
                  Detect headers & formatting
                </label>
              </div>

              <div className="flex items-center gap-2">
                {markdownResult && (
                  <Button
                    onClick={downloadMarkdown}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Markdown
                  </Button>
                )}
                <Button
                  onClick={handleConvert}
                  disabled={isProcessing || !pdfFile}
                  size="sm"
                  variant={markdownResult ? "outline" : "default"}
                >
                  {isProcessing ? "Converting..." : "Convert to Markdown"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Tab Navigation - Moved to top on mobile/tablet */}
        <div className="lg:hidden border-b sticky top-0 z-20 bg-background">
          <div className="flex">
            <button
              onClick={() => setActiveTab("input")}
              className={`flex-1 px-4 py-3 text-sm font-medium touch-manipulation transition-colors ${
                activeTab === "input"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" />
                Input
              </div>
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={`flex-1 px-4 py-3 text-sm font-medium touch-manipulation transition-colors ${
                activeTab === "output"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" />
                Output
                {markdownResult && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-full">
                    ✓
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>


        {/* Main Content - Split Screen for Desktop, Tabbed for Mobile */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Input Panel */}
          <div
            className={`flex-1 flex flex-col min-h-0 lg:border-r ${
              activeTab === "input" ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="border-b px-3 sm:px-4 py-2 flex items-center justify-between bg-card/30">
              <span className="text-xs sm:text-sm font-medium">Input</span>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload PDF file"
                >
                  <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Select PDF file"
            />

            <div className="flex-1 relative min-h-0 p-4 sm:p-6">
              {!pdfFile ? (
                <div
                  className={cn(
                    "h-full border-2 border-dashed rounded-lg transition-colors cursor-pointer",
                    "flex items-center justify-center p-8 sm:p-12",
                    isDragging
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-base sm:text-lg font-medium mb-2">
                      Drop your PDF here or click to browse
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Supports PDF files up to 100MB
                    </p>
                    <Button
                      //onClick={() => fileInputRef.current?.click()}
                      className="mt-4"
                      variant="outline"
                    >
                      Select PDF File
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="text-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-lg font-medium mb-2">{pdfFile.name}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {pdfFile.size < 10240 
                        ? `${(pdfFile.size / 1024).toFixed(2)} KB`
                        : `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB`
                      }
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => {
                          setPdfFile(null);
                          setMarkdownResult("");
                          setError(null);
                          // Reset file input to allow re-uploading the same file
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Remove
                      </Button>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                      >
                        Replace
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Output Panel */}
          <div
            className={`flex-1 flex flex-col min-h-0 border-t lg:border-t-0 ${
              activeTab === "output" ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="border-b px-3 sm:px-4 py-2 flex items-center justify-between bg-card/30">
              <span className="text-xs sm:text-sm font-medium">Output</span>
              <div className="flex items-center gap-1 sm:gap-2">
                {markdownResult && (
                  // Action buttons for output
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-7 sm:w-7 hidden sm:inline-flex"
                      onClick={() => setShowLineNumbers(!showLineNumbers)}
                      title="Toggle line numbers"
                    >
                      {showLineNumbers ? (
                        <ListOrdered className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : (
                        <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-7 sm:w-7"
                      onClick={handleCopy}
                      title="Copy markdown"
                    >
                      <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-7 sm:w-7"
                      onClick={downloadMarkdown}
                      title="Download markdown"
                    >
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-7 sm:w-7"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      title="Toggle fullscreen"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : (
                        <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 flex overflow-auto p-3 sm:p-6 bg-muted/10 min-h-0">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{error.message}</span>
                  </div>
                </div>
              )}

              {!markdownResult && !error && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {pdfFile
                      ? "Click 'Convert to Markdown' to extract text from your PDF"
                      : "Upload a PDF file to get started"}
                  </p>
                </div>
              )}

              {markdownResult && (
                <div className="flex-1 flex relative min-h-0">
                  {/* Fullscreen Container */}
                  {isFullscreen && (
                    <div className="fixed inset-0 z-50 bg-background flex flex-col">
                      <div className="border-b px-4 py-2 flex items-center justify-between bg-card">
                        <span className="text-sm font-medium">
                          Markdown Output - Fullscreen
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsFullscreen(false)}
                          title="Exit fullscreen"
                        >
                          <Minimize2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 relative">
                        {showLineNumbers && (
                          <div className="absolute left-0 top-0 bottom-0 w-12 bg-muted/30 border-r flex flex-col items-center pt-4 text-xs text-muted-foreground select-none">
                            {markdownResult.split("\n").map((_, index) => (
                              <div
                                key={index}
                                className="h-6 flex items-center"
                              >
                                {index + 1}
                              </div>
                            ))}
                          </div>
                        )}
                        <textarea
                          ref={textareaRef}
                          value={markdownResult}
                          onChange={(e) => setMarkdownResult(e.target.value)}
                          className={`w-full h-full ${
                            showLineNumbers ? "pl-16" : "pl-4"
                          } pr-4 py-4 bg-background resize-none outline-none font-mono text-sm leading-6 overflow-auto`}
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  )}

                  {/* Normal Output */}
                  {!isFullscreen && (
                    //control the height of the textarea based on content from here
                    <div className="w-full h-full max-h-[40rem] overflow-auto relative">
                      <div className="flex">
                        {showLineNumbers && (
                          <div className="flex-shrink-0 w-6 sm:w-12 bg-muted/30 border-r flex flex-col items-center pt-3 sm:pt-4 text-[9px] sm:text-xs text-muted-foreground select-none">
                            {Array.from(
                              {
                                length:
                                  visualLineCount ||
                                  markdownResult.split("\n").length,
                              },
                              (_, index) => (
                                <div
                                  key={index}
                                  className="h-6 flex items-center"
                                >
                                  {index + 1}
                                </div>
                              )
                            )}
                          </div>
                        )}
                        <textarea
                          ref={textareaRef}
                          value={markdownResult}
                          onChange={(e) => setMarkdownResult(e.target.value)}
                          placeholder="Markdown output will appear here..."
                          className={`flex-1 ${
                            showLineNumbers ? "pl-3 sm:pl-4" : "pl-3 sm:pl-4"
                          } pr-3 sm:pr-4 py-3 sm:py-4 bg-transparent resize-none outline-none font-mono text-xs sm:text-sm leading-6 overflow-hidden`}
                          style={{
                            minHeight: `${
                              (visualLineCount ||
                                markdownResult.split("\n").length) * 1.5
                            }rem`,
                          }}
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related Tools and FAQ - Hidden on mobile */}
      <div className="hidden lg:block w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mt-12 pt-12 border-t">
          <RelatedTools tools={relatedTools} direction="horizontal" />
        </div>
        <div className="mt-12">
          <FAQ items={faqs} />
        </div>
      </div>

      {/* Mobile Floating Action Button */}
      {pdfFile && !markdownResult && activeTab === "input" && (
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <Button
            onClick={handleConvert}
            disabled={isProcessing}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 touch-manipulation"
          >
            {isProcessing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <FileDown className="h-6 w-6" />
            )}
          </Button>
        </div>
      )}

      {/* Mobile Download FAB */}
      {markdownResult && activeTab === "output" && (
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <Button
            onClick={downloadMarkdown}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white touch-manipulation"
          >
            <Download className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PdfToMarkdown;
