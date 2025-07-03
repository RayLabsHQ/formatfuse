import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  Hash,
  Copy,
  Download,
  Upload,
  Shield,
  Zap,
  Lock,
  FileText,
  ClipboardPaste,
  Trash2,
  Settings,
  Key,
  Binary,
  Info,
} from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { CodeEditor } from "../ui/code-editor";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface HashType {
  id: string;
  name: string;
  description: string;
  bits: number;
  color: string;
  webCryptoAlg: string | null;
}

const hashTypes: HashType[] = [
  {
    id: "md5",
    name: "MD5",
    description: "128-bit. Legacy, not secure for most uses.",
    bits: 128,
    color: "text-rose-600 dark:text-rose-500",
    webCryptoAlg: null,
  },
  {
    id: "sha1",
    name: "SHA-1",
    description: "160-bit. Legacy, deprecated for security.",
    bits: 160,
    color: "text-amber-600 dark:text-amber-500",
    webCryptoAlg: "SHA-1",
  },
  {
    id: "sha256",
    name: "SHA-256",
    description: "256-bit. Widely used, recommended standard.",
    bits: 256,
    color: "text-green-600 dark:text-green-500",
    webCryptoAlg: "SHA-256",
  },
  {
    id: "sha384",
    name: "SHA-384",
    description: "384-bit. Higher security variant.",
    bits: 384,
    color: "text-blue-600 dark:text-blue-500",
    webCryptoAlg: "SHA-384",
  },
  {
    id: "sha512",
    name: "SHA-512",
    description: "512-bit. Very high security, robust.",
    bits: 512,
    color: "text-purple-600 dark:text-purple-500",
    webCryptoAlg: "SHA-512",
  },
];

interface HashResult {
  typeId: string;
  hash: string;
  timeMs: number;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "All hashing done locally",
  },
  {
    icon: Zap,
    text: "Multiple algorithms",
    description: "MD5, SHA-1, SHA-256, SHA-512",
  },
  {
    icon: Lock,
    text: "HMAC support",
    description: "Keyed-hash authentication",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64",
    icon: FileText,
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generate unique IDs",
    icon: FileText,
  },
  {
    id: "password-generator",
    name: "Password Generator",
    description: "Create strong passwords",
    icon: FileText,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What is a hash function?",
    answer:
      "A hash function is a mathematical algorithm that transforms any input data into a fixed-size string of characters. This output, called a hash or digest, uniquely represents the original data. Hash functions are one-way - you cannot reverse the process to get the original data from the hash.",
  },
  {
    question: "Which hash algorithm should I use?",
    answer:
      "For new applications, use SHA-256 or higher. SHA-256 is widely supported and provides excellent security. SHA-384 and SHA-512 offer even more security but produce longer hashes. Avoid MD5 and SHA-1 for security purposes as they have known vulnerabilities.",
  },
  {
    question: "What is HMAC?",
    answer:
      "HMAC (Hash-based Message Authentication Code) combines a hash function with a secret key to provide both data integrity and authentication. It's useful when you need to verify that a message hasn't been tampered with and comes from a trusted source.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes, all hashing is performed locally in your browser using the Web Crypto API. Your data never leaves your device, and we don't store or transmit any of your input or generated hashes. The entire process happens client-side for maximum privacy.",
  },
];

const SAMPLE_TEXT =
  "Hello, World! 👋\nThis is a sample text for hash generation.";

type InputType = "text" | "file";

export default function HashGenerator() {
  const [inputType, setInputType] = useState<InputType>("text");
  const [textInput, setTextInput] = useState(SAMPLE_TEXT);
  const [file, setFile] = useState<File | null>(null);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>([
    "sha256",
  ]);
  const [hmacKey, setHmacKey] = useState("");
  const [useHmac, setUseHmac] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<HashResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme detection for CodeEditor
  const [theme, setTheme] = useState("github-dark");
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "github-dark" : "github-light");
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const bufferToHex = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const generateSingleHash = async (
    algorithm: string,
    data: ArrayBuffer,
    hmacSecret?: string,
  ): Promise<string> => {
    if (hmacSecret) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(hmacSecret);
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: algorithm },
        false,
        ["sign"],
      );
      const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
      return bufferToHex(signature);
    } else {
      const hashBuffer = await crypto.subtle.digest(algorithm, data);
      return bufferToHex(hashBuffer);
    }
  };

  const processInput = useCallback(async () => {
    if (inputType === "text" && !textInput) {
      setError("Please enter text to hash");
      return;
    }
    if (inputType === "file" && !file) {
      setError("Please select a file to hash");
      return;
    }
    if (useHmac && !hmacKey) {
      setError("Please enter an HMAC key");
      return;
    }
    if (selectedAlgorithms.length === 0) {
      setError("Please select at least one algorithm");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults([]);

    try {
      let dataBuffer: ArrayBuffer;
      if (inputType === "text") {
        const encoded = new TextEncoder().encode(textInput);
        dataBuffer = encoded.buffer.slice(
          encoded.byteOffset,
          encoded.byteOffset + encoded.byteLength,
        ) as ArrayBuffer;
      } else if (file) {
        dataBuffer = await file.arrayBuffer();
      } else {
        throw new Error("No input data available");
      }

      const newResults: HashResult[] = [];
      for (const algorithmId of selectedAlgorithms) {
        const hashType = hashTypes.find((h) => h.id === algorithmId);
        if (!hashType) continue;

        const startTime = performance.now();
        let hashValue = "";
        try {
          if (hashType.webCryptoAlg) {
            hashValue = await generateSingleHash(
              hashType.webCryptoAlg,
              dataBuffer,
              useHmac ? hmacKey : undefined,
            );
          } else if (hashType.id === "md5") {
            hashValue = "MD5 not supported via Web Crypto API";
            if (useHmac)
              hashValue = "MD5-HMAC not supported via Web Crypto API";
          }
        } catch (err) {
          console.error(`Error generating ${hashType.name} hash:`, err);
          hashValue = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
        }
        const timeMs = performance.now() - startTime;
        newResults.push({ typeId: hashType.id, hash: hashValue, timeMs });
      }
      setResults(newResults);
      toast.success("Hashes generated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process input");
      console.error(err);
      toast.error("Failed to generate hashes");
    } finally {
      setIsProcessing(false);
    }
  }, [textInput, file, inputType, useHmac, hmacKey, selectedAlgorithms]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setError(null);
      setFile(selectedFile);
      toast.success(`Loaded ${selectedFile.name}`);
    },
    [],
  );

  const handleCopy = useCallback(async (hash: string, typeName: string) => {
    if (
      hash.toLowerCase().includes("error") ||
      hash.toLowerCase().includes("not supported")
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(hash);
      toast.success(`${typeName} hash copied`);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTextInput(text);
        setActiveTab("input");
        toast.success("Pasted from clipboard");
      }
    } catch (err) {
      console.error("Failed to paste:", err);
      toast.error("Failed to paste from clipboard");
    }
  }, []);

  const handleClear = useCallback(() => {
    setTextInput("");
    setFile(null);
    setError(null);
    setResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("Cleared input");
  }, []);

  const handleDownloadResults = useCallback(() => {
    if (results.length === 0) return;

    const content = results
      .map((result) => {
        const hashType = hashTypes.find((h) => h.id === result.typeId);
        return `${hashType?.name}: ${result.hash}`;
      })
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hashes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded hash results");
  }, [results]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Auto-switch to output tab when results are generated
  useEffect(() => {
    if (results.length > 0) {
      setActiveTab("output");
    }
  }, [results]);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      {/* Security-themed Gradient Blobs - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <section className="flex-1 w-full max-w-7xl mx-auto px-0 py-4 sm:p-4 md:p-6 lg:px-8 lg:py-6 flex flex-col h-full relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ highlight: "Hash", main: "Generator" }}
          subtitle="Free online hash generator - MD5, SHA-1, SHA-256, SHA-512 with HMAC support"
          badge={{ text: "Cryptography Tool", icon: Hash }}
          features={features}
        />

        {/* Settings Card - Desktop only */}
        <div className="hidden sm:block mb-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <h3 className="font-medium">Hash Options</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={inputType === "text" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setInputType("text");
                        setError(null);
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Text
                    </Button>
                    <Button
                      variant={inputType === "file" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setInputType("file");
                        setError(null);
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      File
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Algorithms:</Label>
                  <Select
                    value={selectedAlgorithms.join(",")}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedAlgorithms(hashTypes.map((h) => h.id));
                      } else {
                        setSelectedAlgorithms([value]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Algorithms</SelectItem>
                      {hashTypes.map((hashType) => (
                        <SelectItem key={hashType.id} value={hashType.id}>
                          {hashType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="use-hmac"
                    checked={useHmac}
                    onCheckedChange={setUseHmac}
                  />
                  <Label htmlFor="use-hmac" className="text-sm cursor-pointer">
                    Use HMAC
                  </Label>
                </div>

                {useHmac && (
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      type="text"
                      value={hmacKey}
                      onChange={(e) => setHmacKey(e.target.value)}
                      placeholder="Enter HMAC secret key"
                      className="font-mono text-sm"
                    />
                  </div>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={processInput}
                  disabled={
                    isProcessing ||
                    (inputType === "text" && !textInput) ||
                    (inputType === "file" && !file)
                  }
                >
                  <Hash className="w-4 h-4 mr-2" />
                  Generate Hashes
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
                Input
              </span>
              <div className="flex gap-2">
                <Button
                  variant={inputType === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputType("text")}
                  className="h-7 text-xs"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Text
                </Button>
                <Button
                  variant={inputType === "file" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputType("file")}
                  className="h-7 text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  File
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Algorithms
              </span>
              <Select
                value={
                  selectedAlgorithms.length === hashTypes.length
                    ? "all"
                    : selectedAlgorithms[0]
                }
                onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedAlgorithms(hashTypes.map((h) => h.id));
                  } else {
                    setSelectedAlgorithms([value]);
                  }
                }}
              >
                <SelectTrigger className="w-[120px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {hashTypes.map((hashType) => (
                    <SelectItem key={hashType.id} value={hashType.id}>
                      {hashType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="use-hmac-mobile"
                checked={useHmac}
                onCheckedChange={setUseHmac}
                className="h-4 w-8"
              />
              <Label
                htmlFor="use-hmac-mobile"
                className="text-xs cursor-pointer"
              >
                HMAC
              </Label>
              {useHmac && (
                <Input
                  type="text"
                  value={hmacKey}
                  onChange={(e) => setHmacKey(e.target.value)}
                  placeholder="Secret key"
                  className="flex-1 h-7 text-xs font-mono"
                />
              )}
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
                <Hash className="h-4 w-4" />
                Hashes
                {results.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-full">
                    {results.length}
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
                {inputType === "text" ? "Text Input" : "File Input"}
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
                      disabled={!textInput && !file}
                      title="Clear input"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </>
                )}
                {inputType === "file" && (
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
              aria-label="Select file to hash"
            />

            <div className="flex-1 relative min-h-0 p-3 sm:p-4">
              {inputType === "file" ? (
                <div
                  className="h-full border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? (
                    <div className="text-center space-y-2">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
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
                  value={textInput}
                  onChange={setTextInput}
                  placeholder="Enter text to hash..."
                  className="h-full"
                  language="text"
                  theme={theme}
                />
              )}
              {error && (
                <div className="absolute bottom-3 left-3 right-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-destructive">
                    <Info className="h-4 w-4 flex-shrink-0" />
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
                Hash Results
              </span>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={handleDownloadResults}
                  disabled={results.length === 0}
                  title="Download all hashes"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((result) => {
                    const hashType = hashTypes.find(
                      (h) => h.id === result.typeId,
                    );
                    if (!hashType) return null;
                    const canCopy = !(
                      result.hash.toLowerCase().includes("error") ||
                      result.hash.toLowerCase().includes("not supported")
                    );

                    return (
                      <div
                        key={hashType.id}
                        className="border rounded-lg p-3 sm:p-4 space-y-2 bg-muted/20"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-medium", hashType.color)}>
                              {hashType.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {hashType.bits}-bit
                            </span>
                            {["md5", "sha1"].includes(hashType.id) && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded">
                                Legacy
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-7 sm:w-7"
                            onClick={() =>
                              handleCopy(result.hash, hashType.name)
                            }
                            disabled={!canCopy}
                            title="Copy hash"
                          >
                            <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                        <p
                          className={cn(
                            "font-mono text-xs sm:text-sm break-all select-all p-2 sm:p-3 rounded-md",
                            canCopy
                              ? "bg-muted/50"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {result.hash}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {hashType.description} • Generated in{" "}
                          {result.timeMs.toFixed(2)}ms
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Hash className="w-12 h-12 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {isProcessing
                        ? "Generating hashes..."
                        : "No hashes generated yet"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Generate Button */}
        <div className="sm:hidden fixed bottom-6 right-6 z-40">
          <Button
            onClick={processInput}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 touch-manipulation"
            disabled={
              isProcessing ||
              (inputType === "text" && !textInput) ||
              (inputType === "file" && !file)
            }
          >
            <Hash className="h-6 w-6" />
          </Button>
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
