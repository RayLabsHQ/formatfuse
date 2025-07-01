import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Upload,
  ArrowRightLeft,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Shield,
  Zap,
  Lock,
  ClipboardPaste,
  Trash2,
} from "lucide-react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { CodeEditor } from "../ui/code-editor";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { cn } from "@/lib/utils";

type Mode = "encode" | "decode";
type InputType = "text" | "file";

interface FileData {
  name: string;
  type: string;
  size: number;
  data: string;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "All encoding happens locally",
  },
  {
    icon: Zap,
    text: "Auto-detect",
    description: "Detects encode/decode needs",
  },
  {
    icon: Lock,
    text: "URL-safe mode",
    description: "Web-compatible encoding",
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
    id: "jwt-decoder",
    name: "JWT Decoder",
    description: "Decode JWT tokens",
    icon: FileText,
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    description: "Generate MD5, SHA hashes",
    icon: FileText,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What is Base64 encoding?",
    answer:
      "Base64 is a binary-to-text encoding scheme that converts binary data into ASCII string format using 64 printable characters. It's commonly used for transmitting data in environments that only support text, such as email attachments or embedding images in HTML/CSS.",
  },
  {
    question: "When should I use URL-safe encoding?",
    answer:
      "Use URL-safe encoding when the Base64 string will be used in URLs or filenames. It replaces '+' with '-', '/' with '_', and removes '=' padding to avoid conflicts with URL reserved characters.",
  },
  {
    question: "What file types can I encode?",
    answer:
      "You can encode any file type including images (PNG, JPG, GIF), documents (PDF, DOC), videos, audio files, and more. The tool converts the binary data to Base64 text format that can be safely transmitted or stored as text.",
  },
  {
    question: "Is there a size limit for encoding?",
    answer:
      "There's no hard limit since all processing happens in your browser. However, very large files (>50MB) may cause performance issues. Note that Base64 encoding increases file size by approximately 33%.",
  },
];

const SAMPLE_TEXT = "Hello, World! 👋\nThis is a sample text for Base64 encoding.";

export default function Base64Encoder() {
  const [mode, setMode] = useState<Mode>("encode");
  const [inputType, setInputType] = useState<InputType>("text");
  const [textInput, setTextInput] = useState(SAMPLE_TEXT);
  const [base64Input, setBase64Input] = useState("");
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urlSafe, setUrlSafe] = useState(false);
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  
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

  // Auto-detect mode based on input
  const autoDetectMode = useCallback((input: string) => {
    if (!input.trim()) return;

    // Check if input looks like base64
    const base64Regex = /^[A-Za-z0-9+/\-_]+=*$/;
    const trimmed = input.trim();

    // If it's valid base64 and we're in encode mode, switch to decode
    if (base64Regex.test(trimmed) && trimmed.length % 4 === 0) {
      try {
        // Try to decode it
        atob(trimmed.replace(/-/g, "+").replace(/_/g, "/"));
        setMode("decode");
        setBase64Input(input);
        setTextInput("");
      } catch {
        // Not valid base64, keep in encode mode
      }
    }
  }, []);

  const handleTextChange = (value: string) => {
    setError(null);
    if (mode === "encode") {
      setTextInput(value);
      autoDetectMode(value);
    } else {
      setBase64Input(value);
    }
  };

  const encodeText = useCallback((text: string): string => {
    const encoded = btoa(unescape(encodeURIComponent(text)));
    return urlSafe
      ? encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
      : encoded;
  }, [urlSafe]);

  const decodeBase64 = useCallback((base64: string): string => {
    try {
      // Handle URL-safe base64
      let normalized = base64.replace(/-/g, "+").replace(/_/g, "/");

      // Add padding if necessary
      const padding = normalized.length % 4;
      if (padding) {
        normalized += "=".repeat(4 - padding);
      }

      return decodeURIComponent(escape(atob(normalized)));
    } catch (e) {
      throw new Error("Invalid Base64 string");
    }
  }, []);

  const result = useMemo(() => {
    setError(null);

    try {
      if (mode === "encode") {
        if (inputType === "text" && textInput) {
          return encodeText(textInput);
        } else if (inputType === "file" && fileData) {
          return fileData.data;
        }
      } else {
        if (base64Input) {
          return decodeBase64(base64Input);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    }

    return "";
  }, [mode, inputType, textInput, base64Input, fileData, encodeText, decodeBase64]);

  // Auto-switch to output tab when valid result
  useEffect(() => {
    if (result) {
      setActiveTab("output");
    }
  }, [result]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];

      setFileData({
        name: file.name,
        type: file.type,
        size: file.size,
        data: urlSafe
          ? base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
          : base64,
      });
      toast.success(`Loaded ${file.name}`);
    };

    reader.onerror = () => {
      setError("Failed to read file");
      toast.error("Failed to read file");
    };

    reader.readAsDataURL(file);
  }, [urlSafe]);

  const handleCopy = useCallback(async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      toast.success("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  }, [result]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleTextChange(text);
        toast.success("Pasted from clipboard");
      }
    } catch (err) {
      console.error("Failed to paste:", err);
      toast.error("Failed to paste from clipboard");
    }
  }, []);

  const handleClear = useCallback(() => {
    setTextInput("");
    setBase64Input("");
    setFileData(null);
    setError(null);
    toast.success("Cleared input");
  }, []);

  const handleDownload = useCallback(() => {
    if (!result) return;

    if (mode === "encode") {
      // Download as .txt file with base64 content
      const blob = new Blob([result], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileData
        ? `${fileData.name}.base64.txt`
        : "encoded.base64.txt";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded Base64 file");
    } else {
      // Download decoded content
      if (fileData?.type.startsWith("image/") || fileData?.type === "application/pdf") {
        // For binary files, convert back to blob
        const binaryString = atob(base64Input.replace(/-/g, "+").replace(/_/g, "/"));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: fileData.type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileData.name || "decoded-file";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For text, download as text file
        const blob = new Blob([result], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "decoded.txt";
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success("Downloaded decoded file");
    }
  }, [result, mode, fileData, base64Input]);

  const getDataUri = useCallback(() => {
    if (!fileData || mode !== "encode") return "";
    return `data:${fileData.type};base64,${fileData.data}`;
  }, [fileData, mode]);

  const handleCopyDataUri = useCallback(async () => {
    const dataUri = getDataUri();
    if (!dataUri) return;
    
    try {
      await navigator.clipboard.writeText(dataUri);
      toast.success("Copied Data URI");
    } catch (err) {
      toast.error("Failed to copy Data URI");
    }
  }, [getDataUri]);

  const showPreview = useMemo(() => {
    if (mode === "decode" && base64Input) {
      try {
        const decoded = atob(base64Input.replace(/-/g, "+").replace(/_/g, "/"));
        // Check if it might be an image by looking for image signatures
        const firstBytes = decoded.substring(0, 10);
        return (
          firstBytes.includes("PNG") ||
          firstBytes.includes("JFIF") ||
          firstBytes.includes("GIF")
        );
      } catch {
        return false;
      }
    }
    return false;
  }, [mode, base64Input]);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <section className="flex-1 w-full max-w-7xl mx-auto p-0 sm:p-4 md:p-6 lg:p-8 flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8 md:mb-12 space-y-2 sm:space-y-4 px-4 sm:px-0 pt-4 sm:pt-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold animate-fade-in flex items-center justify-center flex-wrap gap-2 sm:gap-3">
            <span>Base64</span>
            <span className="text-primary">Encoder</span>
          </h1>

          <p
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            Encode and decode Base64 strings with support for text, files,
            and URL-safe encoding
          </p>
        </div>

        {/* Features - Hide on mobile to save space */}
        <div className="hidden sm:block animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
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
        </div>

        {/* Settings Card - Desktop only */}
        <div className="hidden sm:block mb-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary" />
                  <h3 className="font-medium">Encoding Options</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={mode === "encode" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setMode("encode");
                        setError(null);
                      }}
                    >
                      Encode
                    </Button>
                    <Button
                      variant={mode === "decode" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setMode("decode");
                        setError(null);
                        setInputType("text");
                      }}
                    >
                      Decode
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                {mode === "encode" && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Input type:</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={inputType === "text" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setInputType("text")}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Text
                      </Button>
                      <Button
                        variant={inputType === "file" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setInputType("file")}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        File
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="url-safe"
                    checked={urlSafe}
                    onCheckedChange={setUrlSafe}
                  />
                  <Label htmlFor="url-safe" className="text-sm cursor-pointer">
                    URL-safe encoding
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Settings Bar */}
        <div className="sm:hidden px-4 pb-3">
          <div className="bg-card/50 rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Mode</span>
              <div className="flex gap-2">
                <Button
                  variant={mode === "encode" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMode("encode");
                    setError(null);
                  }}
                  className="h-7 text-xs"
                >
                  Encode
                </Button>
                <Button
                  variant={mode === "decode" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMode("decode");
                    setError(null);
                    setInputType("text");
                  }}
                  className="h-7 text-xs"
                >
                  Decode
                </Button>
              </div>
            </div>
            {mode === "encode" && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Input</span>
                <div className="flex gap-2">
                  <Button
                    variant={inputType === "text" ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setInputType("text")}
                    className="h-7 text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Text
                  </Button>
                  <Button
                    variant={inputType === "file" ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setInputType("file")}
                    className="h-7 text-xs"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    File
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="url-safe-mobile"
                checked={urlSafe}
                onCheckedChange={setUrlSafe}
                className="h-4 w-8"
              />
              <Label htmlFor="url-safe-mobile" className="text-xs cursor-pointer">
                URL-safe
              </Label>
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
                <FileText className="h-4 w-4" />
                {mode === "encode" ? "Input" : "Base64"}
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
                <FileText className="h-4 w-4" />
                {mode === "encode" ? "Base64" : "Decoded"}
                {result && (
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
              <span className="text-xs sm:text-sm font-medium">
                {mode === "encode" ? "Input" : "Base64 String"}
              </span>
              <div className="flex items-center gap-1 sm:gap-2">
                {inputType === "text" && (
                  <>
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
                      onClick={handleClear}
                      disabled={!textInput && !base64Input}
                      title="Clear input"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </>
                )}
                {mode === "encode" && inputType === "file" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload file"
                  >
                    <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              aria-label="Select file to encode"
            />

            <div className="flex-1 relative min-h-0 p-3 sm:p-4">
              {mode === "encode" && inputType === "file" ? (
                <div
                  className="h-full border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {fileData ? (
                    <div className="text-center space-y-2">
                      <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="font-medium">{fileData.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(fileData.size / 1024).toFixed(1)} KB
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click to change file
                      </p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="font-medium">Click to upload file</p>
                      <p className="text-sm text-muted-foreground">
                        Any file type supported
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <CodeEditor
                  value={mode === "encode" ? textInput : base64Input}
                  onChange={handleTextChange}
                  placeholder={
                    mode === "encode"
                      ? "Enter text to encode..."
                      : "Paste Base64 string to decode..."
                  }
                  className="h-full"
                  language="text"
                  theme={theme}
                />
              )}
              {error && (
                <div className="absolute bottom-3 left-3 right-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{error}</span>
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
              <span className="text-xs sm:text-sm font-medium">
                {mode === "encode" ? "Base64 Output" : "Decoded Output"}
              </span>
              <div className="flex items-center gap-1 sm:gap-2">
                {result && inputType === "file" && mode === "encode" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    onClick={handleCopyDataUri}
                    title="Copy as Data URI"
                  >
                    <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={handleCopy}
                  disabled={!result}
                  title="Copy to clipboard"
                >
                  <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={handleDownload}
                  disabled={!result}
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 relative min-h-0 p-3 sm:p-4">
              {showPreview ? (
                <div className="h-full border rounded-lg overflow-hidden bg-muted/10 flex items-center justify-center">
                  <img
                    src={`data:image/png;base64,${base64Input}`}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <CodeEditor
                  value={result}
                  readOnly
                  placeholder={error || "Output will appear here..."}
                  className="h-full"
                  language="text"
                  theme={theme}
                />
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
    </div>
  );
}