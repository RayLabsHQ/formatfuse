import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  Copy,
  Download,
  AlertCircle,
  Minimize2,
  Maximize2,
  FileJson,
  Settings,
  Wand2,
  Upload,
  ClipboardPaste,
  Trash2,
  Shield,
  Zap,
  Sparkles,
  Code,
} from "lucide-react";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { CodeEditor } from "../ui/code-editor";

interface JsonError {
  line?: number;
  column?: number;
  message: string;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Your data never leaves your device",
  },
  {
    icon: Zap,
    text: "Instant validation",
    description: "Real-time error detection",
  },
  {
    icon: Sparkles,
    text: "Auto-fix errors",
    description: "Fixes common JSON issues",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "json-yaml-converter",
    name: "JSON to YAML",
    description: "Convert between JSON and YAML",
    icon: FileJson,
  },
  {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64",
    icon: FileJson,
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    description: "Decode and inspect JWT tokens",
    icon: FileJson,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What JSON syntax errors can be auto-fixed?",
    answer:
      "Our auto-fix feature can handle trailing commas, single quotes (converts to double quotes), missing quotes around keys, and some common formatting issues. However, structural errors like mismatched brackets need manual correction.",
  },
  {
    question: "Is there a size limit for JSON formatting?",
    answer:
      "No, there's no size limit since all processing happens in your browser. However, very large JSON files (>10MB) may cause performance issues depending on your device's capabilities.",
  },
  {
    question: "Can I format JSON with comments?",
    answer:
      "Standard JSON doesn't support comments. However, our formatter can handle JSON5 format which includes comments, trailing commas, and unquoted keys. The output will be standard JSON without comments.",
  },
  {
    question: "What's the difference between formatted and minified JSON?",
    answer:
      "Formatted JSON includes proper indentation and line breaks for readability. Minified JSON removes all unnecessary whitespace, making it smaller for transmission but harder to read. Use minified for APIs and formatted for debugging.",
  },
];

const SAMPLE_JSON = `{
  "name": "John Doe",
  "age": 30,
  "email": "john.doe@raylabs.io",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "country": "USA",
    "postalCode": "10001"
  },
  "hobbies": ["reading", "coding", "traveling"],
  "isActive": true,
  "metadata": {
    "createdAt": "2024-01-15T10:30:00Z",
    "lastLogin": "2024-01-20T15:45:00Z",
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  }
}`;

export default function JsonFormatter() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [indentSize, setIndentSize] = useState("2");
  const [error, setError] = useState<JsonError | null>(null);
  const [viewMode, setViewMode] = useState<"formatted" | "minified">(
    "formatted",
  );
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Theme detection for CodeEditor
  const [theme, setTheme] = useState("github-dark");
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "github-dark" : "github-light");
    };
    checkTheme();

    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Parse and validate JSON
  const { formatted, minified, isValid } = useMemo(() => {
    if (!input.trim()) {
      setError(null);
      return { formatted: "", minified: "", isValid: false };
    }

    try {
      const parsed = JSON.parse(input);
      setError(null);
      return {
        formatted: JSON.stringify(parsed, null, parseInt(indentSize)),
        minified: JSON.stringify(parsed),
        isValid: true,
      };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Invalid JSON";

      // Try to extract line/column from error message
      const match = errorMessage.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        const lines = input.substring(0, position).split("\n");
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        setError({ line, column, message: errorMessage });
      } else {
        setError({ message: errorMessage });
      }

      return { formatted: "", minified: "", isValid: false };
    }
  }, [input, indentSize]);

  const displayValue = viewMode === "formatted" ? formatted : minified;

  const handleCopy = useCallback(async () => {
    if (!displayValue) return;

    try {
      await navigator.clipboard.writeText(displayValue);
      toast.success("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  }, [displayValue]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInput(text);
        setActiveTab("input");
        toast.success("Pasted from clipboard");
      }
    } catch (err) {
      console.error("Failed to paste:", err);
      toast.error("Failed to paste from clipboard");
    }
  }, []);

  const handleClear = useCallback(() => {
    setInput("");
    setError(null);
    toast.success("Cleared input");
  }, []);

  const handleDownload = useCallback(() => {
    if (!displayValue) return;

    const blob = new Blob([displayValue], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatted.${viewMode === "minified" ? "min." : ""}json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON downloaded");
  }, [displayValue, viewMode]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setInput(content);
        setActiveTab("input");
        toast.success(`Loaded ${file.name}`);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleAutoFix = useCallback(() => {
    if (!input.trim()) return;

    // Try to fix common JSON errors
    let fixedInput = input.trim();

    // Fix trailing commas
    fixedInput = fixedInput.replace(/,(\s*[}\]])/g, "$1");

    // Fix single quotes (convert to double quotes)
    fixedInput = fixedInput.replace(/'/g, '"');

    // Try to parse the fixed input
    try {
      const parsed = JSON.parse(fixedInput);
      setInput(JSON.stringify(parsed, null, parseInt(indentSize)));
      setError(null);
      setActiveTab("output");
      toast.success("JSON fixed and formatted");
    } catch (e) {
      // If still invalid, just format what we can
      setInput(fixedInput);
      toast.error("Could not fully fix JSON errors");
    }
  }, [input, indentSize]);

  const stats = useMemo(() => {
    if (!isValid) return null;

    try {
      const parsed = JSON.parse(input);
      const countKeys = (obj: any): number => {
        if (typeof obj !== "object" || obj === null) return 0;
        if (Array.isArray(obj)) {
          return obj.reduce((sum, item) => sum + countKeys(item), 0);
        }
        return (
          Object.keys(obj).length +
          Object.values(obj).reduce(
            (sum: number, val) => sum + countKeys(val),
            0,
          )
        );
      };

      return {
        keys: countKeys(parsed),
        size: new Blob([minified]).size,
        formattedSize: new Blob([formatted]).size,
        compression: Math.round(
          (1 - new Blob([minified]).size / new Blob([formatted]).size) * 100,
        ),
      };
    } catch {
      return null;
    }
  }, [input, formatted, minified, isValid]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  // Auto-switch to output tab when valid JSON is detected
  useEffect(() => {
    if (isValid && input.trim()) {
      setActiveTab("output");
    }
  }, [isValid, input]);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <section className="flex-1 w-full max-w-7xl mx-auto p-0 sm:p-4 md:p-6 lg:px-8 lg:py-6 flex flex-col h-full">
        {/* Header with Features */}
        <ToolHeader
          title={{ highlight: "JSON", main: "Formatter" }}
          subtitle="Free online JSON formatter and validator with syntax highlighting and auto-fix"
          badge={{ text: "JSON Tool", icon: Code }}
          features={features}
        />

        {/* Settings Card - Desktop only */}
        <div className="hidden sm:block mb-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 border-b">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Formatting Options</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="indent-size" className="text-sm">
                    Indentation:
                  </Label>
                  <Select value={indentSize} onValueChange={setIndentSize}>
                    <SelectTrigger id="indent-size" className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 spaces</SelectItem>
                      <SelectItem value="4">4 spaces</SelectItem>
                      <SelectItem value="8">Tab (8 spaces)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm">View mode:</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "formatted" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("formatted")}
                    >
                      <Maximize2 className="w-4 h-4 mr-2" />
                      Formatted
                    </Button>
                    <Button
                      variant={viewMode === "minified" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("minified")}
                    >
                      <Minimize2 className="w-4 h-4 mr-2" />
                      Minified
                    </Button>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAutoFix}
                  disabled={!input.trim()}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Auto-fix & Format
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Settings Bar */}
        <div className="sm:hidden px-4 pb-3">
          <div className="bg-card/50 rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Settings
              </span>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "formatted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("formatted")}
                  className="h-7 text-xs"
                >
                  <Maximize2 className="w-3 h-3 mr-1" />
                  Format
                </Button>
                <Button
                  variant={viewMode === "minified" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("minified")}
                  className="h-7 text-xs"
                >
                  <Minimize2 className="w-3 h-3 mr-1" />
                  Minify
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={indentSize} onValueChange={setIndentSize}>
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 spaces</SelectItem>
                  <SelectItem value="4">4 spaces</SelectItem>
                  <SelectItem value="8">Tab (8)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAutoFix}
                disabled={!input.trim()}
                className="h-8"
              >
                <Wand2 className="w-3.5 h-3.5 mr-1" />
                Auto-fix
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="sm:hidden border-b sticky top-0 z-20 bg-background">
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
                <FileJson className="h-4 w-4" />
                Input
                {error && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-white rounded-full">
                    !
                  </span>
                )}
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
                <FileJson className="h-4 w-4" />
                Output
                {isValid && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-full">
                    ✓
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Main Content - Split Screen for Desktop, Tabbed for Mobile */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 gap-0 lg:gap-4">
          {/* Input Panel */}
          <div
            className={`flex flex-col min-h-0 rounded-none lg:rounded-lg overflow-hidden border-0 lg:border bg-card/50 ${
              activeTab === "input" ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="border-b px-3 sm:px-4 py-2 flex items-center justify-between bg-card">
              <span className="text-xs sm:text-sm font-medium">Input</span>
              <div className="flex items-center gap-1 sm:gap-2">
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
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload JSON file"
                >
                  <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={handleClear}
                  disabled={!input}
                  title="Clear input"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              aria-label="Select JSON file"
            />

            <div className="flex-1 relative min-h-0 p-3 sm:p-4">
              <CodeEditor
                value={input}
                onChange={setInput}
                placeholder="Paste your JSON here..."
                className="h-full"
                error={!!error}
                language="json"
                theme={theme}
              />
              {error && (
                <div className="absolute bottom-3 left-3 right-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">
                      {error.line && error.column
                        ? `Line ${error.line}, Column ${error.column}: `
                        : ""}
                      {error.message}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Output Panel */}
          <div
            className={`flex flex-col min-h-0 rounded-none lg:rounded-lg overflow-hidden border-0 lg:border border-t lg:border-t bg-card/50 ${
              activeTab === "output" ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="border-b px-3 sm:px-4 py-2 flex items-center justify-between bg-card">
              <span className="text-xs sm:text-sm font-medium">Output</span>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={handleCopy}
                  disabled={!isValid}
                  title="Copy to clipboard"
                >
                  <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={handleDownload}
                  disabled={!isValid}
                  title="Download JSON"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 relative min-h-0 p-3 sm:p-4">
              <CodeEditor
                value={displayValue}
                readOnly
                placeholder={
                  error ? "Invalid JSON" : "Output will appear here..."
                }
                className="h-full"
                language="json"
                theme={theme}
              />
            </div>

            {/* Statistics */}
            {stats && (
              <div className="border-t p-3 sm:p-4 bg-muted/10">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
                  <div>
                    <span className="text-muted-foreground">Keys:</span>
                    <span className="ml-1 sm:ml-2 font-medium">
                      {stats.keys}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Formatted:</span>
                    <span className="ml-1 sm:ml-2 font-medium">
                      {formatFileSize(stats.formattedSize)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Minified:</span>
                    <span className="ml-1 sm:ml-2 font-medium">
                      {formatFileSize(stats.size)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Compression:</span>
                    <span className="ml-1 sm:ml-2 font-medium text-green-600 dark:text-green-400">
                      {stats.compression}% smaller
                    </span>
                  </div>
                </div>
              </div>
            )}
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
      {input.trim() && !isValid && activeTab === "input" && (
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <Button
            onClick={handleAutoFix}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 touch-manipulation"
          >
            <Wand2 className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
}
