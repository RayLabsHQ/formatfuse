import React, { useState, useCallback, useMemo, useEffect } from "react";
import yaml from "js-yaml";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  Copy,
  Download,
  ArrowLeftRight,
  FileJson,
  FileCode,
  Shield,
  Zap,
  Sparkles,
  ClipboardPaste,
  Trash2,
  Settings,
  FileText,
  Info,
  Upload,
  Code,
} from "lucide-react";
import { Label } from "../ui/label";
import { CodeEditor } from "../ui/code-editor";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeaderWithFeatures } from "../ui/ToolHeaderWithFeatures";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type ConversionMode = "json-to-yaml" | "yaml-to-json";

interface ConversionError {
  message: string;
  line?: number;
  column?: number;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "All conversion happens locally",
  },
  {
    icon: Zap,
    text: "Bidirectional",
    description: "JSON ↔ YAML conversion",
  },
  {
    icon: Sparkles,
    text: "Smart formatting",
    description: "Auto-prettify & validation",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Format and validate JSON",
    icon: FileText,
  },
  {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64",
    icon: FileText,
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    description: "Decode JWT tokens",
    icon: FileText,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What's the difference between JSON and YAML?",
    answer:
      "JSON (JavaScript Object Notation) uses braces and brackets with strict syntax, while YAML (YAML Ain't Markup Language) uses indentation and is more human-readable. YAML supports comments, multi-line strings, and references, while JSON is simpler and more widely supported.",
  },
  {
    question: "When should I use JSON vs YAML?",
    answer:
      "Use JSON for APIs, web applications, and when you need maximum compatibility. Use YAML for configuration files, Docker Compose, Kubernetes manifests, and when human readability is important. YAML is great for complex configurations with comments.",
  },
  {
    question: "Can I convert complex nested structures?",
    answer:
      "Yes! The converter handles all valid JSON and YAML structures including nested objects, arrays, booleans, numbers, and strings. It preserves the structure and data types during conversion.",
  },
  {
    question: "What happens to YAML-specific features when converting to JSON?",
    answer:
      "YAML features like comments, anchors, and aliases are lost when converting to JSON since JSON doesn't support them. Multi-line strings are converted to single-line strings with escaped newlines. The converter ensures the output is valid JSON.",
  },
];

const SAMPLE_JSON = `{
  "name": "FormatFuse",
  "version": "1.0.0",
  "features": ["json-yaml", "base64", "hash"],
  "settings": {
    "theme": "dark",
    "autoSave": true
  }
}`;

const SAMPLE_YAML = `name: FormatFuse
version: 1.0.0
features:
  - json-yaml
  - base64
  - hash
settings:
  theme: dark
  autoSave: true`;

export default function JsonYamlConverter() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ConversionMode>("json-to-yaml");
  const [error, setError] = useState<ConversionError | null>(null);
  const [indentSize, setIndentSize] = useState("2");
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Theme detection for CodeEditor
  const [theme, setTheme] = useState("github-dark");
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'github-dark' : 'github-light');
    };
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Set sample data on mount
  useEffect(() => {
    setInput(mode === "json-to-yaml" ? SAMPLE_JSON : SAMPLE_YAML);
  }, []);

  // Convert between formats
  const output = useMemo(() => {
    if (!input.trim()) {
      setError(null);
      return "";
    }

    try {
      if (mode === "json-to-yaml") {
        // Parse JSON and convert to YAML
        const parsed = JSON.parse(input);
        setError(null);
        return yaml.dump(parsed, {
          indent: parseInt(indentSize),
          lineWidth: -1, // Don't wrap lines
          quotingType: '"',
          forceQuotes: false,
          noRefs: true,
        });
      } else {
        // Parse YAML and convert to JSON
        const parsed = yaml.load(input);
        setError(null);
        return JSON.stringify(parsed, null, parseInt(indentSize));
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Invalid input";

      // Try to extract line/column from error message
      if (mode === "json-to-yaml") {
        const match = errorMessage.match(/position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          const lines = input.substring(0, position).split("\n");
          const line = lines.length;
          const column = lines[lines.length - 1].length + 1;
          setError({ message: errorMessage, line, column });
        } else {
          setError({ message: errorMessage });
        }
      } else {
        // YAML errors often include line/column info
        const lineMatch = errorMessage.match(/line (\d+)/);
        const colMatch = errorMessage.match(/column (\d+)/);
        setError({
          message: errorMessage,
          line: lineMatch ? parseInt(lineMatch[1]) : undefined,
          column: colMatch ? parseInt(colMatch[1]) : undefined,
        });
      }

      return "";
    }
  }, [input, mode, indentSize]);

  const handleSwapMode = useCallback(() => {
    // If we have valid output, use it as the new input
    if (output && !error) {
      setInput(output);
      setMode(mode === "json-to-yaml" ? "yaml-to-json" : "json-to-yaml");
      toast.success("Swapped conversion direction");
    } else {
      // Just swap the mode and set appropriate sample
      setMode(mode === "json-to-yaml" ? "yaml-to-json" : "json-to-yaml");
      setInput(mode === "json-to-yaml" ? SAMPLE_YAML : SAMPLE_JSON);
    }
    setError(null);
  }, [output, error, mode]);

  const handleCopy = useCallback(async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      toast.success("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  }, [output]);

  const handleDownload = useCallback(() => {
    if (!output) return;

    const extension = mode === "json-to-yaml" ? "yaml" : "json";
    const mimeType = mode === "json-to-yaml" ? "text/yaml" : "application/json";
    const blob = new Blob([output], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as ${extension} file`);
  }, [output, mode]);

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

  const handlePrettify = useCallback(() => {
    if (!input.trim()) return;

    try {
      if (mode === "json-to-yaml") {
        // Pretty format JSON
        const parsed = JSON.parse(input);
        setInput(JSON.stringify(parsed, null, parseInt(indentSize)));
        toast.success("Prettified JSON");
      } else {
        // Re-format YAML
        const parsed = yaml.load(input);
        setInput(
          yaml.dump(parsed, {
            indent: parseInt(indentSize),
            lineWidth: -1,
            quotingType: '"',
            forceQuotes: false,
            noRefs: true,
          }),
        );
        toast.success("Prettified YAML");
      }
      setError(null);
    } catch (e) {
      toast.error("Failed to prettify - invalid format");
    }
  }, [input, mode, indentSize]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  const stats = useMemo(() => {
    if (!output || error) return null;

    const inputSize = new Blob([input]).size;
    const outputSize = new Blob([output]).size;
    const ratio = ((outputSize / inputSize - 1) * 100).toFixed(0);

    return {
      inputSize,
      outputSize,
      ratio: parseInt(ratio),
      inputLines: input.split("\n").length,
      outputLines: output.split("\n").length,
    };
  }, [input, output, error]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  // Auto-switch to output tab when conversion succeeds
  useEffect(() => {
    if (output && !error && input) {
      setActiveTab("output");
    }
  }, [output, error, input]);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <section className="flex-1 w-full max-w-7xl mx-auto p-0 sm:p-4 md:p-6 lg:px-8 lg:py-6 flex flex-col h-full">
        {/* Header */}
        <ToolHeaderWithFeatures
          title={{ highlight: "JSON ↔ YAML", main: "Converter" }}
          subtitle="Free online JSON to YAML converter with syntax validation and formatting"
          badge={{ text: "Data Format Tool", icon: Code }}
          features={features}
        />

        {/* Settings Card - Desktop only */}
        <div className="hidden sm:block mb-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <h3 className="font-medium">Conversion Options</h3>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSwapMode}
                  >
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    {mode === "json-to-yaml" ? "JSON → YAML" : "YAML → JSON"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Indentation:</Label>
                  <Select value={indentSize} onValueChange={setIndentSize}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 spaces</SelectItem>
                      <SelectItem value="4">4 spaces</SelectItem>
                      <SelectItem value="8">Tab (8 spaces)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePrettify}
                  disabled={!input.trim()}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Prettify Input
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Settings Bar */}
        <div className="sm:hidden px-4 pb-3">
          <div className="bg-card/50 rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Mode</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwapMode}
                className="h-7 text-xs"
              >
                <ArrowLeftRight className="w-3 h-3 mr-1" />
                {mode === "json-to-yaml" ? "JSON → YAML" : "YAML → JSON"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Format</span>
              <div className="flex gap-2">
                <Select value={indentSize} onValueChange={setIndentSize}>
                  <SelectTrigger className="w-[80px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 spaces</SelectItem>
                    <SelectItem value="4">4 spaces</SelectItem>
                    <SelectItem value="8">Tab</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePrettify}
                  disabled={!input.trim()}
                  className="h-7 text-xs"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Pretty
                </Button>
              </div>
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
                {mode === "json-to-yaml" ? <FileJson className="h-4 w-4" /> : <FileCode className="h-4 w-4" />}
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
                {mode === "json-to-yaml" ? <FileCode className="h-4 w-4" /> : <FileJson className="h-4 w-4" />}
                Output
                {output && (
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
              <span className="text-xs sm:text-sm font-medium flex items-center gap-2">
                {mode === "json-to-yaml" ? <FileJson className="h-4 w-4" /> : <FileCode className="h-4 w-4" />}
                {mode === "json-to-yaml" ? "JSON Input" : "YAML Input"}
              </span>
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
                  title="Upload file"
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
              accept=".json,.yaml,.yml"
              onChange={handleFileUpload}
              className="hidden"
              aria-label="Select file"
            />

            <div className="flex-1 relative min-h-0 p-3 sm:p-4">
              <CodeEditor
                value={input}
                onChange={setInput}
                placeholder={
                  mode === "json-to-yaml"
                    ? "Paste your JSON here..."
                    : "Paste your YAML here..."
                }
                className="h-full"
                error={!!error}
                language={mode === "json-to-yaml" ? "json" : "yaml"}
                theme={theme}
              />
              {error && (
                <div className="absolute bottom-3 left-3 right-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-destructive">
                    <Info className="h-4 w-4 flex-shrink-0" />
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
              <span className="text-xs sm:text-sm font-medium flex items-center gap-2">
                {mode === "json-to-yaml" ? <FileCode className="h-4 w-4" /> : <FileJson className="h-4 w-4" />}
                {mode === "json-to-yaml" ? "YAML Output" : "JSON Output"}
              </span>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={handleCopy}
                  disabled={!output}
                  title="Copy to clipboard"
                >
                  <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={handleDownload}
                  disabled={!output}
                  title="Download file"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 relative min-h-0 p-3 sm:p-4">
              <CodeEditor
                value={output}
                readOnly
                placeholder={error ? "Invalid input" : "Output will appear here..."}
                className="h-full"
                language={mode === "json-to-yaml" ? "yaml" : "json"}
                theme={theme}
              />
            </div>

            {/* Statistics */}
            {stats && (
              <div className="border-t p-3 sm:p-4 bg-muted/10">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
                  <div>
                    <span className="text-muted-foreground">Input:</span>
                    <span className="ml-1 sm:ml-2 font-medium">
                      {formatFileSize(stats.inputSize)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Output:</span>
                    <span className="ml-1 sm:ml-2 font-medium">
                      {formatFileSize(stats.outputSize)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size change:</span>
                    <span
                      className={cn(
                        "ml-1 sm:ml-2 font-medium",
                        stats.ratio > 0
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-green-600 dark:text-green-400"
                      )}
                    >
                      {stats.ratio > 0 ? "+" : ""}
                      {stats.ratio}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lines:</span>
                    <span className="ml-1 sm:ml-2 font-medium">
                      {stats.inputLines} → {stats.outputLines}
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
    </div>
  );
}