import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  Copy,
  RefreshCw,
  Hash,
  Shield,
  Zap,
  Sparkles,
  Download,
  Settings,
  FileText,
  Dices,
  History,
  Key,
} from "lucide-react";
import {
  v4 as uuidv4,
  v1 as uuidv1,
  v5 as uuidv5,
  v3 as uuidv3,
  validate,
  version as getVersion,
} from "uuid";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { cn } from "@/lib/utils";

type UuidVersion = "v4" | "v1" | "v5" | "v3";
type UuidFormat = "standard" | "uppercase" | "no-hyphens" | "braces" | "urn";

interface GeneratedUuid {
  id: string;
  uuid: string;
  version: UuidVersion;
  timestamp: number;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Generated locally in browser",
  },
  {
    icon: Zap,
    text: "Multiple versions",
    description: "v1, v3, v4, v5 UUID support",
  },
  {
    icon: Sparkles,
    text: "Format options",
    description: "Standard, URN, braces & more",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "password-generator",
    name: "Password Generator",
    description: "Create strong passwords",
    icon: FileText,
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    description: "Generate MD5, SHA hashes",
    icon: FileText,
  },
  {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64",
    icon: FileText,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What is a UUID?",
    answer:
      "A UUID (Universally Unique Identifier) is a 128-bit number used to uniquely identify information in computer systems. The probability of generating duplicate UUIDs is so low that they can be considered unique for practical purposes.",
  },
  {
    question: "What's the difference between UUID versions?",
    answer:
      "v1 uses timestamp and MAC address, v3 uses MD5 hashing of a namespace/name, v4 uses random or pseudo-random numbers (most common), and v5 uses SHA-1 hashing of a namespace/name. v4 is recommended for most use cases as it doesn't leak information about when or where it was generated.",
  },
  {
    question: "When should I use each UUID version?",
    answer:
      "Use v4 for general purposes (random IDs), v1 when you need chronological sorting (but be aware it exposes MAC address), v3/v5 when you need deterministic IDs from a namespace and name (v5 preferred over v3). Most applications use v4.",
  },
  {
    question: "Are UUIDs truly unique?",
    answer:
      "While not mathematically guaranteed to be unique, the probability of generating duplicate UUIDs is negligible. For v4 UUIDs, you'd need to generate billions of UUIDs before having a meaningful chance of collision. They're considered unique for all practical purposes.",
  },
];

// Predefined namespaces for v3/v5
const namespaces = {
  dns: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  url: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  oid: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  x500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
};

export default function UuidGenerator() {
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [format, setFormat] = useState<UuidFormat>("standard");
  const [count, setCount] = useState("1");
  const [namespace, setNamespace] = useState("dns");
  const [customNamespace, setCustomNamespace] = useState("");
  const [name, setName] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [uuids, setUuids] = useState<GeneratedUuid[]>([]);
  const [validationInput, setValidationInput] = useState("");
  const [activeTab, setActiveTab] = useState<
    "generate" | "validate" | "history"
  >("generate");

  const generateUuid = useCallback(
    (ver: UuidVersion = version): string => {
      switch (ver) {
        case "v1":
          return uuidv1();
        case "v3":
          if ((namespace || customNamespace) && name) {
            const ns =
              customNamespace ||
              namespaces[namespace as keyof typeof namespaces];
            return uuidv3(name, ns);
          }
          return "";
        case "v5":
          if ((namespace || customNamespace) && name) {
            const ns =
              customNamespace ||
              namespaces[namespace as keyof typeof namespaces];
            return uuidv5(name, ns);
          }
          return "";
        case "v4":
        default:
          return uuidv4();
      }
    },
    [version, namespace, customNamespace, name],
  );

  const formatUuid = useCallback(
    (uuid: string, fmt: UuidFormat = format): string => {
      if (!uuid) return "";

      switch (fmt) {
        case "uppercase":
          return uuid.toUpperCase();
        case "no-hyphens":
          return uuid.replace(/-/g, "");
        case "braces":
          return `{${uuid}}`;
        case "urn":
          return `urn:uuid:${uuid}`;
        case "standard":
        default:
          return uuid;
      }
    },
    [format],
  );

  const handleGenerate = useCallback(() => {
    const newUuids: GeneratedUuid[] = [];
    const generateCount = bulkMode ? parseInt(count) || 1 : 1;

    // Validate namespace requirements
    if (
      (version === "v3" || version === "v5") &&
      (!name || (!namespace && !customNamespace))
    ) {
      toast.error("Namespace and name are required for v3/v5 UUIDs");
      return;
    }

    for (let i = 0; i < generateCount; i++) {
      const uuid = generateUuid();
      if (uuid) {
        newUuids.push({
          id: Date.now().toString() + i,
          uuid,
          version,
          timestamp: Date.now(),
        });
      }
    }

    if (bulkMode) {
      setUuids((prev) => [...newUuids, ...prev].slice(0, 100)); // Keep max 100
    } else {
      setUuids(newUuids);
    }

    toast.success(
      `Generated ${generateCount} UUID${generateCount > 1 ? "s" : ""}`,
    );
  }, [
    generateUuid,
    version,
    bulkMode,
    count,
    name,
    namespace,
    customNamespace,
  ]);

  const handleCopy = useCallback(
    async (uuid: string) => {
      try {
        await navigator.clipboard.writeText(formatUuid(uuid));
        toast.success("UUID copied to clipboard");
      } catch (err) {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy to clipboard");
      }
    },
    [formatUuid],
  );

  const handleCopyAll = useCallback(async () => {
    const allUuids = uuids.map((u) => formatUuid(u.uuid)).join("\n");
    try {
      await navigator.clipboard.writeText(allUuids);
      toast.success("All UUIDs copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  }, [uuids, formatUuid]);

  const handleDownload = useCallback(() => {
    const content = uuids.map((u) => formatUuid(u.uuid)).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uuids-${version}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded UUIDs");
  }, [uuids, version, formatUuid]);

  const validationResult = useMemo(() => {
    if (!validationInput.trim()) return null;

    const isValid = validate(validationInput);
    if (!isValid) return { valid: false };

    const ver = getVersion(validationInput);
    return { valid: true, version: ver };
  }, [validationInput]);

  const handleValidate = useCallback(() => {
    if (!validationInput.trim()) {
      toast.error("Please enter a UUID to validate");
      return;
    }

    if (validationResult?.valid) {
      toast.success(`Valid UUID v${validationResult.version}`);
    } else {
      toast.error("Invalid UUID format");
    }
  }, [validationInput, validationResult]);

  const needsNamespace = version === "v3" || version === "v5";

  // Generate initial UUID on mount
  useEffect(() => {
    handleGenerate();
  }, []);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <section className="flex-1 w-full max-w-7xl mx-auto p-0 sm:p-4 md:p-6 lg:px-8 lg:py-6 flex flex-col h-full">
        {/* Header */}
        <ToolHeader
          title={{ highlight: "UUID", main: "Generator" }}
          subtitle="Free online UUID generator - Generate v1, v3, v4, v5 UUIDs with custom formatting"
          badge={{ text: "Unique ID Generator", icon: Key }}
          features={features}
        />

        {/* Settings Card - Desktop only */}
        <div className="hidden sm:block mb-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <h3 className="font-medium">Generation Options</h3>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerate}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate New
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm">Version</Label>
                  <Select
                    value={version}
                    onValueChange={(v) => setVersion(v as UuidVersion)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v4">v4 (Random)</SelectItem>
                      <SelectItem value="v1">v1 (Timestamp)</SelectItem>
                      <SelectItem value="v3">v3 (MD5 namespace)</SelectItem>
                      <SelectItem value="v5">v5 (SHA-1 namespace)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Format</Label>
                  <Select
                    value={format}
                    onValueChange={(f) => setFormat(f as UuidFormat)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="uppercase">UPPERCASE</SelectItem>
                      <SelectItem value="no-hyphens">No hyphens</SelectItem>
                      <SelectItem value="braces">{"{Braces}"}</SelectItem>
                      <SelectItem value="urn">URN format</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {needsNamespace && (
                  <>
                    <div>
                      <Label className="text-sm">Namespace</Label>
                      <Select value={namespace} onValueChange={setNamespace}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dns">DNS</SelectItem>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="oid">OID</SelectItem>
                          <SelectItem value="x500">X.500 DN</SelectItem>
                          <SelectItem value="custom">Custom UUID</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm">Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter name..."
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-sm">Bulk mode</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Switch
                        checked={bulkMode}
                        onCheckedChange={setBulkMode}
                      />
                      {bulkMode && (
                        <Input
                          type="number"
                          value={count}
                          onChange={(e) => setCount(e.target.value)}
                          min="1"
                          max="100"
                          className="w-20"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {namespace === "custom" && needsNamespace && (
                <div className="mt-4">
                  <Label className="text-sm">Custom Namespace UUID</Label>
                  <Input
                    value={customNamespace}
                    onChange={(e) => setCustomNamespace(e.target.value)}
                    placeholder="Enter custom namespace UUID..."
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Settings Bar */}
        <div className="sm:hidden px-4 pb-3">
          <div className="bg-card/50 rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Version
              </span>
              <Select
                value={version}
                onValueChange={(v) => setVersion(v as UuidVersion)}
              >
                <SelectTrigger className="w-[120px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v4">v4 (Random)</SelectItem>
                  <SelectItem value="v1">v1 (Time)</SelectItem>
                  <SelectItem value="v3">v3 (MD5)</SelectItem>
                  <SelectItem value="v5">v5 (SHA-1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Format
              </span>
              <Select
                value={format}
                onValueChange={(f) => setFormat(f as UuidFormat)}
              >
                <SelectTrigger className="w-[120px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="uppercase">UPPERCASE</SelectItem>
                  <SelectItem value="no-hyphens">No hyphens</SelectItem>
                  <SelectItem value="braces">Braces</SelectItem>
                  <SelectItem value="urn">URN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="sm:hidden border-b sticky top-0 z-20 bg-background">
          <div className="flex">
            <button
              onClick={() => setActiveTab("generate")}
              className={`flex-1 px-4 py-3 text-sm font-medium touch-manipulation transition-colors ${
                activeTab === "generate"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Dices className="h-4 w-4" />
                Generate
              </div>
            </button>
            <button
              onClick={() => setActiveTab("validate")}
              className={`flex-1 px-4 py-3 text-sm font-medium touch-manipulation transition-colors ${
                activeTab === "validate"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Shield className="h-4 w-4" />
                Validate
              </div>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 px-4 py-3 text-sm font-medium touch-manipulation transition-colors ${
                activeTab === "history"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <History className="h-4 w-4" />
                History
                {uuids.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-full">
                    {uuids.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Desktop Layout */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Generation Panel */}
              <div className="bg-card rounded-lg border p-4">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Dices className="w-4 h-4" />
                  Generated UUIDs
                </h3>
                {uuids.length > 0 ? (
                  <div className="space-y-2">
                    {uuids.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="group p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => handleCopy(item.uuid)}
                      >
                        <p className="font-mono text-sm break-all select-all">
                          {formatUuid(item.uuid)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.version} • Click to copy
                        </p>
                      </div>
                    ))}
                    {uuids.length > 1 && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyAll}
                          className="flex-1"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownload}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Hash className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Click "Generate New" to create UUIDs</p>
                  </div>
                )}
              </div>

              {/* Validation Panel */}
              <div className="bg-card rounded-lg border p-4">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  UUID Validator
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm">UUID to validate</Label>
                    <Input
                      value={validationInput}
                      onChange={(e) => setValidationInput(e.target.value)}
                      placeholder="Paste UUID here..."
                      className="mt-1 font-mono text-sm"
                    />
                  </div>
                  {validationResult && (
                    <div
                      className={cn(
                        "p-3 rounded-lg",
                        validationResult.valid
                          ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
                          : "bg-destructive/10 border border-destructive/20 text-destructive",
                      )}
                    >
                      {validationResult.valid ? (
                        <p className="text-sm">
                          ✓ Valid UUID version {validationResult.version}
                        </p>
                      ) : (
                        <p className="text-sm">✗ Invalid UUID format</p>
                      )}
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    onClick={handleValidate}
                    disabled={!validationInput.trim()}
                    className="w-full"
                  >
                    Validate UUID
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="sm:hidden">
            {activeTab === "generate" && (
              <div className="p-4 space-y-4">
                {needsNamespace && (
                  <div className="space-y-3 p-3 bg-card/50 rounded-lg border">
                    <div>
                      <Label className="text-xs">Namespace</Label>
                      <Select value={namespace} onValueChange={setNamespace}>
                        <SelectTrigger className="mt-1 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dns">DNS</SelectItem>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="oid">OID</SelectItem>
                          <SelectItem value="x500">X.500 DN</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter name..."
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                )}

                <Button onClick={handleGenerate} className="w-full" size="lg">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate UUID
                </Button>

                {uuids.length > 0 && (
                  <div className="space-y-2">
                    {uuids[0] && (
                      <div
                        className="p-4 bg-primary/5 border border-primary/20 rounded-lg cursor-pointer"
                        onClick={() => handleCopy(uuids[0].uuid)}
                      >
                        <p className="font-mono text-sm break-all select-all">
                          {formatUuid(uuids[0].uuid)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Tap to copy
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "validate" && (
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-sm">UUID to validate</Label>
                  <Input
                    value={validationInput}
                    onChange={(e) => setValidationInput(e.target.value)}
                    placeholder="Paste UUID here..."
                    className="mt-2 font-mono text-sm"
                  />
                </div>
                {validationResult && (
                  <div
                    className={cn(
                      "p-3 rounded-lg",
                      validationResult.valid
                        ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
                        : "bg-destructive/10 border border-destructive/20 text-destructive",
                    )}
                  >
                    {validationResult.valid ? (
                      <p className="text-sm">
                        ✓ Valid UUID version {validationResult.version}
                      </p>
                    ) : (
                      <p className="text-sm">✗ Invalid UUID format</p>
                    )}
                  </div>
                )}
                <Button
                  variant="secondary"
                  onClick={handleValidate}
                  disabled={!validationInput.trim()}
                  className="w-full"
                >
                  Validate UUID
                </Button>
              </div>
            )}

            {activeTab === "history" && (
              <div className="p-4">
                {uuids.length > 0 ? (
                  <div className="space-y-2">
                    {uuids.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-muted/20 rounded-lg cursor-pointer"
                        onClick={() => handleCopy(item.uuid)}
                      >
                        <p className="font-mono text-xs break-all">
                          {formatUuid(item.uuid)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.version} • Tap to copy
                        </p>
                      </div>
                    ))}
                    {uuids.length > 1 && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyAll}
                          className="flex-1"
                        >
                          Copy All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownload}
                          className="flex-1"
                        >
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No UUIDs generated yet</p>
                  </div>
                )}
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
