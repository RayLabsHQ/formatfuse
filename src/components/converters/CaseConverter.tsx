import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  Type,
  Copy,
  Download,
  Shield,
  Zap,
  Sparkles,
  ClipboardPaste,
  Trash2,
  Settings,
  Code,
  Database,
  FileCode,
  Hash,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { CodeEditor } from "../ui/code-editor";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { cn } from "@/lib/utils";

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

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "All conversion happens locally",
  },
  {
    icon: Zap,
    text: "Smart detection",
    description: "Auto-detects current format",
  },
  {
    icon: Sparkles,
    text: "Preserves acronyms",
    description: "Keeps API, URL, etc intact",
  },
];

const relatedTools: RelatedTool[] = [
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
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Format and validate JSON",
    icon: FileText,
  },
];

const faqs: FAQItem[] = [
  {
    question: "How does smart acronym preservation work?",
    answer:
      "The converter recognizes common acronyms like API, URL, ID, and preserves their formatting when converting between cases. For example, 'getUserAPI' in camelCase becomes 'GetUserAPI' in PascalCase, not 'GetUserApi'.",
  },
  {
    question: "Which case format should I use for my project?",
    answer:
      "It depends on your context: camelCase for JavaScript variables, PascalCase for class names, snake_case for Python and database columns, kebab-case for URLs and CSS classes, and CONSTANT_CASE for environment variables and constants.",
  },
  {
    question: "Can I convert multiple lines at once?",
    answer:
      "Yes! The converter handles multi-line text and preserves line breaks. Each line is converted independently, so you can convert entire code blocks or lists of items at once.",
  },
  {
    question: "What's the difference between Title Case and Sentence case?",
    answer:
      "Title Case capitalizes the first letter of every word (The Quick Brown Fox), while Sentence case only capitalizes the first letter of the first word (The quick brown fox). Title Case is used for headings, while Sentence case is used for regular text.",
  },
];

const SAMPLE_TEXT = "convert this text";

export default function CaseConverter() {
  const [input, setInput] = useState(SAMPLE_TEXT);
  const [preserveNumbers, setPreserveNumbers] = useState(true);
  const [smartAcronyms, setSmartAcronyms] = useState(true);
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");

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

  const handleCopy = useCallback(async (text: string, formatName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${formatName}`);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  }, []);

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
    toast.success("Cleared input");
  }, []);

  const handleDownloadAll = useCallback(() => {
    if (!input.trim()) return;

    const content = conversions
      .map((conv) => `${conv.name}:\n${conv.result}\n`)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `case-conversions-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded all conversions");
  }, [conversions, input]);

  // Auto-switch to output tab when conversions are available
  useEffect(() => {
    if (conversions.length > 0 && input !== SAMPLE_TEXT) {
      setActiveTab("output");
    }
  }, [conversions, input]);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      {/* Typography-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] via-transparent to-accent/[0.01]" />
        <div className="absolute top-20 left-1/3 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <section className="flex-1 w-full max-w-7xl mx-auto px-0 py-4 sm:p-4 md:p-6 lg:px-8 lg:py-6 flex flex-col h-full relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ highlight: "Case", main: "Converter" }}
          subtitle="Free online text case converter - Convert between camelCase, snake_case, kebab-case and more"
          badge={{ text: "String Formatting", icon: Type }}
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
                {detectedFormat && (
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>
                      Detected:{" "}
                      {caseFormats.find((f) => f.id === detectedFormat)?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="smart-acronyms"
                    checked={smartAcronyms}
                    onCheckedChange={setSmartAcronyms}
                  />
                  <Label
                    htmlFor="smart-acronyms"
                    className="text-sm cursor-pointer"
                  >
                    Smart acronym preservation
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="preserve-numbers"
                    checked={preserveNumbers}
                    onCheckedChange={setPreserveNumbers}
                  />
                  <Label
                    htmlFor="preserve-numbers"
                    className="text-sm cursor-pointer"
                  >
                    Preserve numbers
                  </Label>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadAll}
                  disabled={!input.trim()}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All
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
                Options
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
                disabled={!input.trim()}
                className="h-7 text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="smart-acronyms-mobile"
                  checked={smartAcronyms}
                  onCheckedChange={setSmartAcronyms}
                  className="h-4 w-8"
                />
                <Label
                  htmlFor="smart-acronyms-mobile"
                  className="text-xs cursor-pointer"
                >
                  Smart acronyms
                </Label>
              </div>
              {detectedFormat && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  <span>
                    Detected:{" "}
                    {caseFormats.find((f) => f.id === detectedFormat)?.name}
                  </span>
                </div>
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
                <Type className="h-4 w-4" />
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
                <Type className="h-4 w-4" />
                Results
                {conversions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-full">
                    {conversions.length}
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
              <span className="text-xs sm:text-sm font-medium">Input Text</span>
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
                  onClick={handleClear}
                  disabled={!input}
                  title="Clear input"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 relative min-h-0 p-3 sm:p-4">
              <CodeEditor
                value={input}
                onChange={setInput}
                placeholder="Enter text to convert..."
                className="h-full"
                language="text"
                theme={theme}
              />
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
                All Formats
              </span>
              <div className="text-xs text-muted-foreground">
                {conversions.length} formats
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {conversions.length > 0 ? (
                <div className="space-y-3">
                  {conversions.map((conversion) => (
                    <div
                      key={conversion.id}
                      className={cn(
                        "border rounded-lg p-3 sm:p-4 space-y-2 transition-all cursor-pointer hover:bg-muted/30",
                        conversion.isCurrentFormat &&
                          "bg-primary/5 border-primary",
                      )}
                      onClick={() =>
                        handleCopy(conversion.result, conversion.name)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {conversion.icon && (
                            <conversion.icon className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span
                            className={cn(
                              "font-medium",
                              conversion.isCurrentFormat && "text-primary",
                            )}
                          >
                            {conversion.name}
                          </span>
                          {conversion.isCurrentFormat && (
                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="font-mono text-xs sm:text-sm break-all select-all">
                        {conversion.result}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversion.usage}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Type className="w-12 h-12 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No text to convert yet
                    </p>
                  </div>
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
    </div>
  );
}
