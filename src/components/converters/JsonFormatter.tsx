import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Copy,
  Download,
  AlertCircle,
  Check,
  Minimize2,
  Maximize2,
  FileJson,
  Settings,
  Wrench,
} from "lucide-react";
import { CodeEditor } from "../ui/code-editor";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  MobileToolLayout,
  MobileToolHeader,
  MobileToolContent,
  BottomSheet,
  ActionButton,
  ActionIconButton,
  MobileTabs,
  MobileTabsList,
  MobileTabsTrigger,
  MobileTabsContent,
  SegmentedControl,
  CollapsibleSection,
} from "../ui/mobile";
import { cn } from "@/lib/utils";

interface JsonError {
  line?: number;
  column?: number;
  message: string;
}

export default function JsonFormatter() {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  const [input, setInput] = useState("");
  const [indentSize, setIndentSize] = useState("2");
  const [error, setError] = useState<JsonError | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"formatted" | "minified">(
    "formatted",
  );
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);

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

  // Auto-switch to output tab on mobile when valid JSON is detected
  useEffect(() => {
    if (isMobile && isValid && activeTab === "input") {
      setActiveTab("output");
    }
  }, [isValid, isMobile, activeTab]);

  const displayValue = viewMode === "formatted" ? formatted : minified;

  const handleCopy = useCallback(async () => {
    if (!displayValue) return;

    try {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [displayValue]);

  const handleDownload = useCallback(() => {
    if (!displayValue) return;

    const blob = new Blob([displayValue], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatted.${viewMode === "minified" ? "min." : ""}json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayValue, viewMode]);

  const handleFormat = useCallback(() => {
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
    } catch (e) {
      // If still invalid, just format what we can
      setInput(fixedInput);
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
          Object.values(obj).reduce((sum, val) => sum + countKeys(val), 0)
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

  // Mobile layout
  if (isMobile) {
    return (
      <MobileToolLayout>
        <MobileToolHeader
          title="JSON Formatter"
          description="Format & validate JSON"
          action={
            <ActionIconButton
              onClick={() => setShowSettingsSheet(true)}
              icon={<Settings />}
              label="Settings"
              variant="ghost"
            />
          }
        />

        <MobileTabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "input" | "output")}
          defaultValue="input"
        >
          <div className="px-4 pt-2">
            <MobileTabsList variant="default">
              <MobileTabsTrigger
                value="input"
                badge={error ? "Error" : undefined}
              >
                Input
              </MobileTabsTrigger>
              <MobileTabsTrigger
                value="output"
                badge={isValid ? "Valid" : undefined}
              >
                Output
              </MobileTabsTrigger>
            </MobileTabsList>
          </div>

          <MobileTabsContent value="input">
            <MobileToolContent noPadding>
              <div className="p-4 pb-2">
                <ActionButton
                  onClick={handleFormat}
                  icon={<Wrench />}
                  label="Auto-fix & Format"
                  variant="secondary"
                  fullWidth
                />
              </div>

              <div className="px-4">
                {error && (
                  <div className="mb-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {error.line && error.column
                          ? `Line ${error.line}, Column ${error.column}`
                          : "Invalid JSON"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {error.message}
                      </p>
                    </div>
                  </div>
                )}

                <CodeEditor
                  value={input}
                  onChange={setInput}
                  placeholder="Paste your JSON here..."
                  className="h-[400px]"
                  error={!!error}
                  language="json"
                />
              </div>
            </MobileToolContent>
          </MobileTabsContent>

          <MobileTabsContent value="output">
            <MobileToolContent noPadding>
              <div className="p-4 pb-2">
                <SegmentedControl
                  options={[
                    {
                      value: "formatted",
                      label: "Formatted",
                      icon: <Maximize2 className="h-4 w-4" />,
                    },
                    {
                      value: "minified",
                      label: "Minified",
                      icon: <Minimize2 className="h-4 w-4" />,
                    },
                  ]}
                  value={viewMode}
                  onChange={(v) => setViewMode(v as "formatted" | "minified")}
                />
              </div>

              <div className="px-4">
                <CodeEditor
                  value={displayValue}
                  readOnly
                  placeholder={
                    error ? "Invalid JSON" : "Output will appear here..."
                  }
                  className="h-[400px] mb-4"
                  language="json"
                />

                {isValid && (
                  <div className="flex gap-3 justify-center mb-4">
                    <ActionButton
                      onClick={handleCopy}
                      icon={copied ? <Check /> : <Copy />}
                      label={copied ? "Copied!" : "Copy"}
                      variant="secondary"
                    />
                    <ActionButton
                      onClick={handleDownload}
                      icon={<Download />}
                      label="Download"
                      variant="secondary"
                    />
                  </div>
                )}

                {stats && (
                  <CollapsibleSection
                    title="Statistics"
                    defaultOpen={true}
                    className="mb-4"
                  >
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Keys:</span>
                        <span className="ml-2 font-medium">{stats.keys}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Formatted:
                        </span>
                        <span className="ml-2 font-medium">
                          {formatFileSize(stats.formattedSize)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Minified:</span>
                        <span className="ml-2 font-medium">
                          {formatFileSize(stats.size)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Compression:
                        </span>
                        <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                          {stats.compression}% smaller
                        </span>
                      </div>
                    </div>
                  </CollapsibleSection>
                )}
              </div>
            </MobileToolContent>
          </MobileTabsContent>
        </MobileTabs>

        {/* Settings bottom sheet */}
        <BottomSheet
          open={showSettingsSheet}
          onOpenChange={setShowSettingsSheet}
          title="Formatting Options"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="mobile-indent-size" className="mb-2 block">
                Indentation
              </Label>
              <Select value={indentSize} onValueChange={setIndentSize}>
                <SelectTrigger id="mobile-indent-size" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 spaces</SelectItem>
                  <SelectItem value="4">4 spaces</SelectItem>
                  <SelectItem value="8">Tab (8 spaces)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </BottomSheet>
      </MobileToolLayout>
    );
  }

  // Desktop layout
  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <div className="p-1.5 sm:p-2 bg-primary/10 text-primary rounded-lg">
            <FileJson className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          JSON Formatter
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground px-2">
          Validate, format, and minify JSON data with syntax highlighting
        </p>
      </div>

      {/* Options Bar - Mobile optimized */}
      <div className="mb-4 p-3 sm:p-4 rounded-lg border bg-card">
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="indent-size" className="text-sm">
              Indent:
            </Label>
            <Select value={indentSize} onValueChange={setIndentSize}>
              <SelectTrigger
                id="indent-size"
                className="w-[100px] sm:w-[120px] text-xs sm:text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 spaces</SelectItem>
                <SelectItem value="4">4 spaces</SelectItem>
                <SelectItem value="8">Tab (8)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "formatted" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("formatted")}
              className="text-xs sm:text-sm"
            >
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden sm:inline">Formatted</span>
              <span className="sm:hidden">Format</span>
            </Button>
            <Button
              variant={viewMode === "minified" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("minified")}
              className="text-xs sm:text-sm"
            >
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden sm:inline">Minified</span>
              <span className="sm:hidden">Minify</span>
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleFormat}
            className="text-xs sm:text-sm"
          >
            Auto-fix & Format
          </Button>
        </div>
      </div>

      {/* Main Editor Area - Mobile optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between h-8 sm:h-10">
            <Label className="text-sm">Input</Label>
            {error && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error.line && error.column
                  ? `Line ${error.line}, Column ${error.column}`
                  : "Invalid JSON"}
              </span>
            )}
          </div>
          <CodeEditor
            value={input}
            onChange={setInput}
            placeholder="Paste your JSON here..."
            className="h-[300px] sm:h-[400px] lg:h-[500px]"
            error={!!error}
            language="json"
          />
          {error && (
            <p className="text-sm text-destructive mt-1">{error.message}</p>
          )}
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between h-10">
            <Label>Output</Label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                disabled={!isValid}
                title="Copy to clipboard"
                className="h-8 w-8"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                disabled={!isValid}
                title="Download JSON"
                className="h-8 w-8"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <CodeEditor
            value={displayValue}
            readOnly
            placeholder={error ? "Invalid JSON" : "Output will appear here..."}
            className="h-[300px] sm:h-[400px] lg:h-[500px]"
            language="json"
          />
        </div>
      </div>

      {/* Statistics - Mobile optimized */}
      {stats && (
        <div className="mt-4 p-3 sm:p-4 rounded-lg border bg-card">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
            <div>
              <span className="text-muted-foreground">Keys:</span>
              <span className="ml-1 sm:ml-2 font-medium">{stats.keys}</span>
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

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border">
          <FileJson className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">
            Smart Validation
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Identifies and highlights JSON syntax errors with line numbers
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Maximize2 className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">
            Format & Minify
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Switch between beautified and minified views instantly
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <Check className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Auto-fix Errors</h3>
          <p className="text-sm text-muted-foreground">
            Automatically fixes common issues like trailing commas
          </p>
        </div>
      </div>
    </div>
  );
}
