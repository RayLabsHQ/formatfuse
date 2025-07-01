import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import {
  FileText,
  Download,
  AlertCircle,
  Upload,
  Copy,
  FileDown,
  Maximize2,
  Minimize2,
  Shield,
  Loader2,
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
import type { MarkdownToPdfWorker } from "../../workers/markdown-to-pdf.worker";

const { saveAs } = FileSaver;

const SAMPLE_MARKDOWN = `# Project Documentation

This is a sample markdown document demonstrating the conversion capabilities.

## Features

- **Bold text** and *italic text*
- Lists and bullet points
- Headers and subheaders
- Code blocks and inline code

### Code Example

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Getting Started

1. Write your markdown
2. Preview the output
3. Download as PDF

Enjoy using the Markdown to PDF converter!`;

export const MarkdownToPdf: React.FC = () => {
  const [markdownContent, setMarkdownContent] =
    useState<string>(SAMPLE_MARKDOWN);
  const [pdfResult, setPdfResult] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(
    "medium",
  );
  const [fontFamily, setFontFamily] = useState<
    "Helvetica" | "Times" | "Courier"
  >("Helvetica");
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"input" | "preview">("input");
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const workerRef = useRef<Comlink.Remote<MarkdownToPdfWorker> | null>(null);

  // Initialize worker
  useEffect(() => {
    const initWorker = async () => {
      const worker = new Worker(
        new URL("../../workers/markdown-to-pdf.worker.ts", import.meta.url),
        { type: "module" },
      );
      const Converter = Comlink.wrap<typeof MarkdownToPdfWorker>(worker);
      workerRef.current = await new Converter();
    };

    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current[Comlink.releaseProxy]();
      }
    };
  }, []);

  const handleFileSelect = useCallback(async (files: FileList) => {
    const selectedFile = files[0];
    if (!selectedFile) return;

    if (
      !selectedFile.name.endsWith(".md") &&
      !selectedFile.name.endsWith(".markdown")
    ) {
      setError(new Error("Please select a Markdown file (.md or .markdown)"));
      return;
    }

    setError(null);
    setPdfResult(null);

    try {
      const text = await selectedFile.text();
      setMarkdownContent(text);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to read file"));
    }
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setMarkdownContent(text);
        setPdfResult(null);
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (markdownContent) {
      try {
        await navigator.clipboard.writeText(markdownContent);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  }, [markdownContent]);

  const getFontSize = () => {
    switch (fontSize) {
      case "small":
        return 10;
      case "large":
        return 14;
      default:
        return 12;
    }
  };

  const handleConvert = useCallback(async () => {
    if (!markdownContent.trim() || !workerRef.current) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await workerRef.current.convert(markdownContent, {
        fontSize: getFontSize(),
        lineHeight: 1.5,
        fontFamily,
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
      });

      setPdfResult(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Conversion failed"));
    } finally {
      setIsProcessing(false);
    }
  }, [markdownContent, fontSize, fontFamily]);

  const downloadPdf = useCallback(() => {
    if (!pdfResult) return;

    const blob = new Blob([pdfResult], { type: "application/pdf" });
    const fileName = "markdown-document.pdf";
    saveAs(blob, fileName);
  }, [pdfResult]);

  const renderMarkdownPreview = (markdown: string) => {
    return markdown
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)/gim, "<li>$1</li>")
      .replace(/^\d+\. (.+)/gim, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)\s*(?=<li>)/g, "$1")
      .replace(/(<li>.*<\/li>)/s, "<ul>$&</ul>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^([^<].*)$/gim, "<p>$1</p>")
      .replace(/<p><\/p>/g, "")
      .replace(/<p>(<h|<ul|<ol|<pre)/g, "$1")
      .replace(/(<\/h\d>|<\/ul>|<\/ol>|<\/pre>)<\/p>/g, "$1");
  };

  return (
    <div className="bg-background flex flex-col">
      {/* Tool Header - Mobile optimized */}
      <div className="border-b">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-center">
            Markdown to PDF
          </h1>
          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-1">
            Convert Markdown to PDF with live preview and syntax highlighting
          </p>
        </div>
      </div>

      {/* Controls Bar - Mobile optimized */}
      <div className="border-b px-3 sm:px-6 py-2 sm:py-3 bg-card/50">
        <div className="flex flex-col gap-3">
          {/* Mobile: Show convert button prominently */}
          <div className="lg:hidden flex justify-center">
            <Button
              onClick={handleConvert}
              disabled={isProcessing || !markdownContent.trim()}
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
                  Convert to PDF
                </>
              )}
            </Button>
          </div>

          {/* Font controls - collapsible on mobile */}
          <details className="lg:hidden">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground touch-manipulation p-1">
              PDF Settings
            </summary>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Font:</span>
              <Select
                value={fontFamily}
                onValueChange={(value: "Helvetica" | "Times" | "Courier") =>
                  setFontFamily(value)
                }
              >
                <SelectTrigger className="w-[100px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times">Times</SelectItem>
                  <SelectItem value="Courier">Courier</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-xs text-muted-foreground ml-2">Size:</span>
              <Select
                value={fontSize}
                onValueChange={(value: "small" | "medium" | "large") =>
                  setFontSize(value)
                }
              >
                <SelectTrigger className="w-[80px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </details>

          {/* Desktop controls */}
          <div className="hidden lg:flex lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Font:</span>
              <Select
                value={fontFamily}
                onValueChange={(value: "Helvetica" | "Times" | "Courier") =>
                  setFontFamily(value)
                }
              >
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times">Times</SelectItem>
                  <SelectItem value="Courier">Courier</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-sm text-muted-foreground ml-4">Size:</span>
              <Select
                value={fontSize}
                onValueChange={(value: "small" | "medium" | "large") =>
                  setFontSize(value)
                }
              >
                <SelectTrigger className="w-[100px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {pdfResult && (
                <Button
                  onClick={downloadPdf}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              )}
              <Button
                onClick={handleConvert}
                disabled={isProcessing || !markdownContent.trim()}
                size="sm"
                variant={pdfResult ? "outline" : "default"}
              >
                {isProcessing ? "Converting..." : "Convert to PDF"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden border-b">
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
              <FileText className="h-4 w-4" />
              Input
            </div>
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex-1 px-4 py-3 text-sm font-medium touch-manipulation transition-colors ${
              activeTab === "preview"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileDown className="h-4 w-4" />
              Preview
              {pdfResult && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-full">
                  ✓
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Main Content - Split Screen for Desktop, Tabbed for Mobile */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Input Panel */}
        <div
          className={`flex-1 flex flex-col lg:border-r ${
            activeTab === "input" ? "block" : "hidden lg:flex"
          }`}
        >
          <div className="border-b px-3 sm:px-4 py-2 flex items-center justify-between bg-card/30">
            <span className="text-xs sm:text-sm font-medium">Input</span>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7 lg:hidden"
                onClick={() => setShowLineNumbers(!showLineNumbers)}
                title="Toggle line numbers"
              >
                <span className="text-[10px] font-mono">
                  {showLineNumbers ? "1." : "#"}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7"
                onClick={handlePaste}
                title="Paste from clipboard"
              >
                <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7"
                onClick={() => fileInputRef.current?.click()}
                title="Upload markdown file"
              >
                <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-7 sm:w-7 hidden sm:inline-flex"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title="Toggle fullscreen"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
            aria-label="Select Markdown files"
          />

          <div className="flex-1 relative min-h-[200px] lg:min-h-0">
            {showLineNumbers && (
              <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-12 bg-muted/30 border-r flex flex-col items-center pt-3 sm:pt-4 text-[9px] sm:text-xs text-muted-foreground select-none">
                {markdownContent.split("\n").map((_, index) => (
                  <div key={index} className="h-[1.5rem] flex items-center">
                    {index + 1}
                  </div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={markdownContent}
              onChange={(e) => {
                setMarkdownContent(e.target.value);
                setPdfResult(null);
              }}
              placeholder="Paste your Markdown here..."
              className={`w-full h-full ${showLineNumbers ? "pl-9 sm:pl-16" : "pl-3 sm:pl-4"} pr-3 sm:pr-4 py-3 sm:py-4 bg-transparent resize-none outline-none font-mono text-xs sm:text-sm leading-relaxed sm:leading-6 ${
                isFullscreen ? "fixed inset-0 z-50 bg-background" : ""
              }`}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div
          className={`flex-1 flex flex-col border-t lg:border-t-0 ${
            activeTab === "preview" ? "block" : "hidden lg:flex"
          }`}
        >
          <div className="border-b px-3 sm:px-4 py-2 flex items-center justify-between bg-card/30">
            <span className="text-xs sm:text-sm font-medium">Output</span>
            <div className="flex items-center gap-1 sm:gap-2">
              {pdfResult && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={downloadPdf}
                  title="Download PDF"
                >
                  <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3 sm:p-6 bg-muted/10 min-h-[300px] lg:min-h-0">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error.message}</span>
                </div>
              </div>
            )}

            {!pdfResult && !error && (
              <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none">
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownPreview(markdownContent),
                  }}
                  style={{
                    fontFamily:
                      fontFamily === "Times"
                        ? "serif"
                        : fontFamily === "Courier"
                          ? "monospace"
                          : "sans-serif",
                    fontSize: getFontSize() + "px",
                  }}
                />
              </div>
            )}

            {pdfResult && (
              <div className="text-center py-6 sm:py-8">
                <div className="inline-flex flex-col items-center gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-base sm:text-lg">
                      PDF Ready
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                      Your PDF has been generated successfully
                    </p>
                  </div>
                  <Button
                    onClick={downloadPdf}
                    className="mt-2 text-xs sm:text-sm h-10 sm:h-10 w-full max-w-xs touch-manipulation"
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Floating Action Button */}
      {markdownContent.trim() && !pdfResult && activeTab === "input" && (
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
      {pdfResult && activeTab === "preview" && (
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <Button
            onClick={downloadPdf}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white touch-manipulation"
          >
            <Download className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
        <div className="p-3 sm:p-4 rounded-lg border">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">
            Live Preview
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            See your markdown rendered in real-time as you type
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <FileDown className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">
            Professional PDFs
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Generate clean, formatted PDFs with proper styling
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border sm:col-span-2 md:col-span-1">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">
            Client-Side Only
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Your markdown stays private - all processing happens locally
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarkdownToPdf;
