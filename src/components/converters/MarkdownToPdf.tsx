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
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { cn } from "../../lib/utils";

const { saveAs } = FileSaver;

const SAMPLE_MARKDOWN = `# Welcome to Markdown to PDF Converter

Transform your Markdown documents into professional PDFs with ease. This tool supports all standard Markdown features.

## Key Features

- **Bold text** and *italic text* formatting
- Headers and subheaders (H1 through H6)
- Ordered and unordered lists
- Code blocks with syntax highlighting
- Tables and blockquotes
- Links and images

### Code Example

\`\`\`javascript
function convertToPDF(markdown) {
  // Your markdown is converted to PDF
  // with proper formatting and styling
  return pdf;
}
\`\`\`

## Why Use This Tool?

1. **Privacy-First**: All processing happens in your browser
2. **No File Size Limits**: Convert documents of any size
3. **Professional Output**: Clean, well-formatted PDFs
4. **Instant Conversion**: No waiting or processing queues

> "The best markdown to PDF converter I've used!" - Happy User

## Getting Started

1. Paste or type your markdown in the editor
2. Customize font and styling options
3. Click "Convert to PDF"
4. Download your professional PDF

---

*Start writing your markdown above to see it transformed into a beautiful PDF!*`;

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Your markdown never leaves your device",
  },
  {
    icon: Zap,
    text: "Instant conversion",
    description: "No waiting or server processing",
  },
  {
    icon: Type,
    text: "Custom styling",
    description: "Choose fonts and sizes for your PDF",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "text-to-pdf",
    name: "Text to PDF",
    description: "Convert plain text to PDF",
    icon: FileText,
  },
  {
    id: "html-to-pdf",
    name: "HTML to PDF",
    description: "Convert HTML documents to PDF",
    icon: Code,
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
    question: "What Markdown features are supported?",
    answer:
      "We support all standard Markdown features including headers (H1-H6), bold/italic text, lists (ordered/unordered), code blocks, inline code, blockquotes, horizontal rules, links, and basic tables. Extended features like footnotes and task lists are also supported.",
  },
  {
    question: "Can I customize the PDF appearance?",
    answer:
      "Yes! You can choose from three font families (Helvetica, Times, Courier) and three font sizes (small, medium, large). The PDF will have proper margins and professional formatting. Future updates will include more customization options like color themes and page layouts.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "No, there's no file size limit since all processing happens in your browser. However, very large documents may take longer to convert depending on your device's processing power. The tool handles documents with thousands of lines efficiently.",
  },
  {
    question: "How do I include images in my PDF?",
    answer:
      "Use standard Markdown image syntax: ![alt text](image-url). The images will be embedded in the PDF. For best results, use web-hosted images or base64-encoded images. Local file paths won't work due to browser security restrictions.",
  },
];


// Theme presets removed - can be added back when implementing theme selection

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

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

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile) return;

    if (
      !selectedFile.name.endsWith(".md") &&
      !selectedFile.name.endsWith(".markdown") &&
      !selectedFile.name.endsWith(".txt")
    ) {
      setError(new Error("Please select a Markdown file (.md, .markdown, or .txt)"));
      return;
    }

    setError(null);
    setPdfResult(null);

    try {
      const text = await selectedFile.text();
      setMarkdownContent(text);
      setActiveTab("editor");
      toast.success(`Loaded ${selectedFile.name}`);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to read file"));
      toast.error("Failed to read file");
    }
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


  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setMarkdownContent(text);
        setPdfResult(null);
        setActiveTab("editor");
        toast.success("Pasted from clipboard");
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      toast.error("Failed to paste from clipboard");
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (markdownContent) {
      try {
        await navigator.clipboard.writeText(markdownContent);
        toast.success("Copied to clipboard");
      } catch (err) {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy to clipboard");
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
      setActiveTab("preview");
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
    toast.success("PDF downloaded successfully");
  }, [pdfResult]);

  const renderMarkdownPreview = (markdown: string) => {
    // Enhanced markdown rendering with more features
    return markdown
      .replace(/^###### (.*$)/gim, "<h6 class='text-sm font-semibold mb-2'>$1</h6>")
      .replace(/^##### (.*$)/gim, "<h5 class='text-base font-semibold mb-2'>$1</h5>")
      .replace(/^#### (.*$)/gim, "<h4 class='text-lg font-semibold mb-3'>$1</h4>")
      .replace(/^### (.*$)/gim, "<h3 class='text-xl font-bold mb-3'>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2 class='text-2xl font-bold mb-4'>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1 class='text-3xl font-bold mb-4'>$1</h1>")
      .replace(/```([\s\S]*?)```/g, "<pre class='bg-muted p-4 rounded-lg overflow-x-auto mb-4'><code>$1</code></pre>")
      .replace(/`([^`]+)`/g, "<code class='bg-muted px-1 py-0.5 rounded text-sm'>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong class='font-bold'>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em class='italic'>$1</em>")
      .replace(/^> (.+)/gim, "<blockquote class='border-l-4 border-primary pl-4 italic my-4'>$1</blockquote>")
      .replace(/^- (.+)/gim, "<li class='ml-4'>$1</li>")
      .replace(/^\d+\. (.+)/gim, "<li class='ml-4'>$1</li>")
      .replace(/(<li.*<\/li>)\s*(?=<li)/g, "$1")
      .replace(/(<li.*<\/li>)/s, "<ul class='list-disc mb-4'>$&</ul>")
      .replace(/^---$/gim, "<hr class='my-6 border-t border-border'>")
      .replace(/\n\n/g, "</p><p class='mb-4'>")
      .replace(/^([^<].*)$/gim, "<p class='mb-4'>$1</p>")
      .replace(/<p class='mb-4'><\/p>/g, "")
      .replace(/<p class='mb-4'>(<h|<ul|<ol|<pre|<blockquote|<hr)/g, "$1")
      .replace(/(<\/h\d>|<\/ul>|<\/ol>|<\/pre>|<\/blockquote>|<hr[^>]*>)<\/p>/g, "$1");
  };


  return (
    <div className="w-full flex flex-col flex-1 min-h-0 h-full">
      <section className="flex-1 w-full max-w-7xl mx-auto sm:p-4 md:p-6 lg:p-8 flex flex-col h-full overflow-hidden lg:overflow-visible">
        {/* Header - Hide on mobile to save space */}
        <div className="hidden sm:block text-center mb-8 sm:mb-12 space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold animate-fade-in flex items-center justify-center flex-wrap gap-3">
            <span>Markdown to</span>
            <span className="text-primary">PDF</span>
          </h1>

          <p
            className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            Transform your Markdown documents into professional PDFs with
            custom styling, live preview, and instant conversion.
          </p>
        </div>

        {/* Features - Hide on mobile to save space */}
        <div className="hidden sm:block animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          {/* Desktop view */}
          <div className="hidden sm:flex flex-wrap justify-center gap-6 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{feature.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile view - Compact icons */}
          <div className="sm:hidden space-y-3 mb-8">
            <div className="flex justify-center gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <button
                    key={index}
                    onClick={() =>
                      setActiveFeature(activeFeature === index ? null : index)
                    }
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
                      activeFeature === index
                        ? "bg-primary text-primary-foreground scale-105"
                        : "bg-primary/10 hover:bg-primary/20"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                );
              })}
            </div>

            {/* Mobile feature details */}
            {activeFeature !== null && (
              <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 mx-4 animate-in slide-in-from-top-2 duration-300">
                <p className="font-medium text-sm mb-1">
                  {features[activeFeature].text}
                </p>
                <p className="text-xs text-muted-foreground">
                  {features[activeFeature].description}
                </p>
              </div>
            )}
          </div>
        </div>

      {/* Controls Bar - Mobile optimized */}
      <div className="hidden sm:block border-b px-3 sm:px-6 py-2 sm:py-3 bg-card/50">
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

      {/* Mobile Tab Navigation - Moved to top on mobile */}
      <div className="sm:hidden border-b sticky top-0 z-20 bg-background">
        <div className="flex">
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex-1 px-4 py-3 text-sm font-medium touch-manipulation transition-colors ${
              activeTab === "editor"
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

      {/* Mobile Convert Button - Show above tabs */}
      <div className="sm:hidden px-4 py-3 bg-card/50 border-b">
        <Button
          onClick={handleConvert}
          disabled={isProcessing || !markdownContent.trim()}
          size="sm"
          className="w-full touch-manipulation"
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

      {/* Main Content - Split Screen for Desktop, Tabbed for Mobile */}
      <div className="flex-1 flex flex-col lg:flex-row lg:min-h-0">
        {/* Input Panel */}
        <div
          className={`flex-1 flex flex-col min-h-0 lg:border-r ${
            activeTab === "editor" ? "flex" : "hidden lg:flex"
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
                <ClipboardPaste className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                onClick={() => fileInputRef.current?.click()}
                title="Upload markdown file"
              >
                <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Select Markdown files"
          />

          <div className="flex-1 relative min-h-0">
            {showLineNumbers && (
              <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-12 bg-muted/30 border-r flex flex-col items-center pt-3 sm:pt-4 text-[9px] sm:text-xs text-muted-foreground select-none">
                {markdownContent.split("\n").map((_, index) => (
                  <div key={index} className="h-6 flex items-center">
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
              className={`w-full h-full ${showLineNumbers ? "pl-9 sm:pl-16" : "pl-3 sm:pl-4"} pr-3 sm:pr-4 py-3 sm:py-4 bg-transparent resize-none outline-none font-mono text-xs sm:text-sm leading-6 sm:leading-6 overflow-auto ${
                isFullscreen ? "fixed inset-0 z-50 bg-background" : ""
              }`}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div
          className={`flex-1 flex flex-col min-h-0 border-t lg:border-t-0 ${
            activeTab === "preview" ? "flex" : "hidden lg:flex"
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

          <div className="flex-1 overflow-auto p-3 sm:p-6 bg-muted/10 lg:min-h-0">
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
      </section>
      
      {/* Related Tools and FAQ - Outside main flex container */}
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 lg:block hidden">
        <div className="mt-12 pt-12 border-t">
          <RelatedTools tools={relatedTools} direction="horizontal" />
        </div>
        <div className="mt-12">
          <FAQ items={faqs} />
        </div>
      </div>

      {/* Mobile Related Tools and FAQ - Always hidden on mobile for markdown editor */}
      {false && (
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:hidden">
          <div className="mt-12 pt-12 border-t">
            <RelatedTools tools={relatedTools} direction="horizontal" />
          </div>
          <div className="mt-12">
            <FAQ items={faqs} />
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button */}
      {markdownContent.trim() && !pdfResult && activeTab === "editor" && (
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
    </div>
  );
};

export default MarkdownToPdf;
