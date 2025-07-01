import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Type,
  Copy,
  Check,
  Sparkles,
  Code,
  Database,
  FileCode,
  Hash,
  ArrowRight,
  Info,
  Keyboard,
  Settings,
  Search,
} from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";
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
  CollapsibleSection,
} from "../ui/mobile";
import { Input } from "../ui/input";

interface CaseFormat {
  id: string;
  name: string;
  description: string;
  converter: (text: string) => string;
  example: string;
  icon?: React.ElementType;
  usage?: string;
}

// Smart case conversion functions
const preserveAcronyms = (
  word: string,
  convertFunc: (s: string) => string,
): string => {
  // Common acronyms to preserve
  const acronyms = [
    "API",
    "URL",
    "ID",
    "UUID",
    "HTTP",
    "HTTPS",
    "SQL",
    "HTML",
    "CSS",
    "JS",
    "JSON",
    "XML",
    "PDF",
    "CEO",
    "FBI",
    "NASA",
    "FAQ",
    "iOS",
    "macOS",
  ];
  const upperWord = word.toUpperCase();

  if (acronyms.includes(upperWord)) {
    return upperWord;
  }

  // Check if word is all caps (likely acronym)
  if (word.length > 1 && word === upperWord && /^[A-Z]+$/.test(word)) {
    return word;
  }

  return convertFunc(word);
};

const caseFormats: CaseFormat[] = [
  {
    id: "uppercase",
    name: "UPPERCASE",
    description: "ALL CAPITAL LETTERS",
    converter: (text) => text.toUpperCase(),
    example: "THE QUICK BROWN FOX",
    usage: "Constants, emphasis, headers",
  },
  {
    id: "lowercase",
    name: "lowercase",
    description: "all lowercase letters",
    converter: (text) => text.toLowerCase(),
    example: "the quick brown fox",
    usage: "URLs, filenames, email addresses",
  },
  {
    id: "title",
    name: "Title Case",
    description: "First Letter Of Each Word Capitalized",
    converter: (text) => {
      return text.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
    },
    example: "The Quick Brown Fox",
    usage: "Titles, headings, names",
  },
  {
    id: "sentence",
    name: "Sentence case",
    description: "First letter capitalized. Rest lowercase",
    converter: (text) => {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },
    example: "The quick brown fox",
    usage: "Sentences, paragraphs",
  },
  {
    id: "camel",
    name: "camelCase",
    description: "firstWordLowerCaseRestTitleCase",
    converter: (text) => {
      return text
        .split(/[\s_-]+/)
        .map((word, index) => {
          if (index === 0) return word.toLowerCase();
          return preserveAcronyms(
            word,
            (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
          );
        })
        .join("");
    },
    example: "theQuickBrownFox",
    icon: Code,
    usage: "JavaScript variables, function names",
  },
  {
    id: "pascal",
    name: "PascalCase",
    description: "EveryWordStartsWithCapital",
    converter: (text) => {
      return text
        .split(/[\s_-]+/)
        .map((word) =>
          preserveAcronyms(
            word,
            (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
          ),
        )
        .join("");
    },
    example: "TheQuickBrownFox",
    icon: FileCode,
    usage: "Class names, React components",
  },
  {
    id: "snake",
    name: "snake_case",
    description: "words_separated_by_underscores",
    converter: (text) => {
      return text
        .split(/[\s-]+/)
        .map((word) => word.toLowerCase())
        .join("_");
    },
    example: "the_quick_brown_fox",
    icon: Database,
    usage: "Python variables, database columns",
  },
  {
    id: "constant",
    name: "CONSTANT_CASE",
    description: "UPPER_CASE_WITH_UNDERSCORES",
    converter: (text) => {
      return text
        .split(/[\s-]+/)
        .map((word) => word.toUpperCase())
        .join("_");
    },
    example: "THE_QUICK_BROWN_FOX",
    icon: Hash,
    usage: "Constants, environment variables",
  },
  {
    id: "kebab",
    name: "kebab-case",
    description: "words-separated-by-hyphens",
    converter: (text) => {
      return text
        .split(/[\s_]+/)
        .map((word) => word.toLowerCase())
        .join("-");
    },
    example: "the-quick-brown-fox",
    usage: "URLs, CSS classes, filenames",
  },
  {
    id: "dot",
    name: "dot.case",
    description: "words.separated.by.dots",
    converter: (text) => {
      return text
        .split(/[\s_-]+/)
        .map((word) => word.toLowerCase())
        .join(".");
    },
    example: "the.quick.brown.fox",
    usage: "Package names, namespaces",
  },
  {
    id: "path",
    name: "path/case",
    description: "words/separated/by/slashes",
    converter: (text) => {
      return text
        .split(/[\s_-]+/)
        .map((word) => word.toLowerCase())
        .join("/");
    },
    example: "the/quick/brown/fox",
    usage: "URL paths, file paths",
  },
  {
    id: "header",
    name: "Header-Case",
    description: "Words-Separated-By-Hyphens-And-Capitalized",
    converter: (text) => {
      return text
        .split(/[\s_]+/)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join("-");
    },
    example: "The-Quick-Brown-Fox",
    usage: "HTTP headers, markdown headers",
  },
];

export default function CaseConverter() {
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUsage, setShowUsage] = useState(false);
  const [activeTab, setActiveTab] = useState<"input" | "results">("input");
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [preserveNumbers, setPreserveNumbers] = useState(true);

  // Detect current format
  const detectedFormat = useMemo(() => {
    if (!input.trim()) return null;

    const trimmed = input.trim();

    // Check each format to see if the input matches
    if (trimmed === trimmed.toUpperCase() && !trimmed.includes("_"))
      return "uppercase";
    if (
      trimmed === trimmed.toLowerCase() &&
      !trimmed.includes("_") &&
      !trimmed.includes("-")
    )
      return "lowercase";
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(trimmed)) return "title";
    if (
      /^[A-Z][a-z]+/.test(trimmed) &&
      trimmed.slice(1) === trimmed.slice(1).toLowerCase()
    )
      return "sentence";
    if (/^[a-z]+([A-Z][a-z]+)*$/.test(trimmed)) return "camel";
    if (/^[A-Z][a-z]+([A-Z][a-z]+)*$/.test(trimmed)) return "pascal";
    if (/^[a-z]+(_[a-z]+)*$/.test(trimmed)) return "snake";
    if (/^[A-Z]+(_[A-Z]+)*$/.test(trimmed)) return "constant";
    if (/^[a-z]+(-[a-z]+)*$/.test(trimmed)) return "kebab";

    return null;
  }, [input]);

  // Convert input to all formats
  const conversions = useMemo(() => {
    if (!input.trim()) return [];

    return caseFormats.map((format) => ({
      ...format,
      result: format.converter(input.trim()),
      isCurrentFormat: format.id === detectedFormat,
    }));
  }, [input, detectedFormat]);

  const handleCopy = useCallback(async (text: string, formatId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(formatId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (conversions[index]) {
          handleCopy(conversions[index].result, conversions[index].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [conversions, handleCopy]);

  // Filter conversions based on search
  const filteredConversions = useMemo(() => {
    if (!searchQuery) return conversions;
    return conversions.filter(
      (conv) =>
        conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.result.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [conversions, searchQuery]);

  // Auto-switch to results on mobile when input is provided
  useEffect(() => {
    if (isMobile && input && activeTab === "input") {
      setActiveTab("results");
    }
  }, [input, isMobile, activeTab]);

  // Mobile layout
  if (isMobile) {
    return (
      <MobileToolLayout>
        <MobileToolHeader
          title="Case Converter"
          description="Convert text between formats"
          action={
            <ActionIconButton
              onClick={() => setShowInfoSheet(true)}
              icon={<Info />}
              label="Info"
              variant="ghost"
            />
          }
        />

        <MobileTabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "input" | "results")}
          defaultValue="input"
        >
          <div className="px-4 pt-2">
            <MobileTabsList variant="default">
              <MobileTabsTrigger value="input">Input</MobileTabsTrigger>
              <MobileTabsTrigger
                value="results"
                badge={
                  conversions.length > 0
                    ? conversions.length.toString()
                    : undefined
                }
              >
                Results
              </MobileTabsTrigger>
            </MobileTabsList>
          </div>

          <MobileTabsContent value="input">
            <MobileToolContent>
              <div className="space-y-4">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type or paste text here..."
                  className="min-h-[300px] resize-none"
                  spellCheck={false}
                />

                {input && (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        Detected format:
                      </p>
                      <p className="font-medium">
                        {detectedFormat || "Unknown"}
                      </p>
                    </div>

                    <ActionButton
                      onClick={() => setInput("")}
                      label="Clear Text"
                      variant="secondary"
                      fullWidth
                    />
                  </div>
                )}
              </div>
            </MobileToolContent>
          </MobileTabsContent>

          <MobileTabsContent value="results">
            <MobileToolContent>
              {conversions.length > 0 ? (
                <div className="space-y-4">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search formats..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Results list */}
                  <div className="space-y-2">
                    {filteredConversions.map((conversion) => (
                      <div
                        key={conversion.id}
                        className={cn(
                          "p-4 rounded-lg border transition-all",
                          conversion.isCurrentFormat
                            ? "bg-primary/5 border-primary"
                            : "hover:bg-secondary/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {conversion.icon && (
                                <conversion.icon className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="font-medium text-sm">
                                {conversion.name}
                                {conversion.isCurrentFormat && (
                                  <span className="ml-2 text-xs text-primary">
                                    (current)
                                  </span>
                                )}
                              </span>
                            </div>
                            <p className="font-mono text-sm break-all select-all mb-1">
                              {conversion.result}
                            </p>
                            {showUsage && conversion.usage && (
                              <p className="text-xs text-muted-foreground">
                                {conversion.usage}
                              </p>
                            )}
                          </div>
                          <ActionIconButton
                            onClick={() =>
                              handleCopy(conversion.result, conversion.id)
                            }
                            icon={
                              copiedId === conversion.id ? <Check /> : <Copy />
                            }
                            label="Copy"
                            variant="ghost"
                            className={
                              copiedId === conversion.id ? "text-green-500" : ""
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredConversions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No formats match your search</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Type className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-muted-foreground">No text to convert</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Go to Input tab to enter text
                  </p>
                </div>
              )}
            </MobileToolContent>
          </MobileTabsContent>
        </MobileTabs>

        {/* Info bottom sheet */}
        <BottomSheet
          open={showInfoSheet}
          onOpenChange={setShowInfoSheet}
          title="Case Formats"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Show usage info</span>
              <input
                type="checkbox"
                checked={showUsage}
                onChange={(e) => setShowUsage(e.target.checked)}
                className="rounded h-5 w-5"
              />
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">Available Formats</h3>
              {caseFormats.map((format) => (
                <div key={format.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    {format.icon && (
                      <format.icon className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{format.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Example: {format.example}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-medium mb-2">Features</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Smart acronym preservation (API, URL, etc.)</li>
                <li>• Automatic format detection</li>
                <li>• One-tap copy for any format</li>
              </ul>
            </div>
          </div>
        </BottomSheet>
      </MobileToolLayout>
    );
  }

  // Desktop layout
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Case Converter</h1>
        <p className="text-muted-foreground">
          Convert text between different case formats instantly
        </p>
      </div>

      {/* Input Area */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Input Text</label>
          {detectedFormat && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Detected: {caseFormats.find((f) => f.id === detectedFormat)?.name}
            </span>
          )}
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your text here..."
          className="min-h-[100px] resize-none font-mono"
          spellCheck={false}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowUsage(!showUsage)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              {showUsage ? "Hide" : "Show"} usage tips
            </button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              title="Use Cmd/Ctrl + 1-9 to copy formats"
            >
              <Keyboard className="w-3 h-3" />
              Keyboard shortcuts
            </button>
          </div>
          {input && (
            <Button variant="ghost" size="sm" onClick={() => setInput("")}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results Grid */}
      {conversions.length > 0 && (
        <div className="space-y-2">
          {conversions.map((conversion, index) => (
            <div
              key={conversion.id}
              className={cn(
                "group p-4 rounded-lg border transition-all",
                conversion.isCurrentFormat
                  ? "bg-primary/5 border-primary"
                  : "hover:bg-secondary/50",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {conversion.icon && (
                      <conversion.icon className="w-4 h-4 text-muted-foreground" />
                    )}
                    <h3 className="font-semibold text-sm">
                      {conversion.name}
                      {conversion.isCurrentFormat && (
                        <span className="ml-2 text-xs font-normal text-primary">
                          (current format)
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {index < 9 && `⌘${index + 1}`}
                    </span>
                  </div>
                  <p className="font-mono text-sm break-all select-all">
                    {conversion.result}
                  </p>
                  {showUsage && conversion.usage && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {conversion.usage}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(conversion.result, conversion.id)}
                  className="h-8 w-8 flex-shrink-0"
                >
                  {copiedId === conversion.id ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!input && (
        <div className="text-center py-12 text-muted-foreground">
          <Type className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Start typing to see all case formats instantly</p>
        </div>
      )}

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border">
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">
            Smart Detection
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Automatically detects the current format of your text
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Code className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">
            Developer Friendly
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Preserves acronyms and handles programming conventions
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Keyboard className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">
            Keyboard Shortcuts
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Use Cmd/Ctrl + 1-9 to quickly copy any format
          </p>
        </div>
      </div>
    </div>
  );
}
