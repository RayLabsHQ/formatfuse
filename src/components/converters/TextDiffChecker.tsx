import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  FileText,
  Copy,
  Check,
  GitBranch,
  Eye,
  Columns,
  Rows,
  Download,
  Upload,
  Settings,
  Info,
  Plus,
  Minus,
  RefreshCw,
  FileJson,
  Code,
  Type,
  Shield,
  Zap,
  ClipboardPaste,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { CodeEditor } from "../ui/code-editor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { CollapsibleSection } from "../ui/mobile/CollapsibleSection";

interface DiffResult {
  type: "added" | "removed" | "unchanged" | "modified";
  lineNumber?: number;
  content: string;
  oldLine?: number;
  newLine?: number;
}

interface DiffStats {
  additions: number;
  deletions: number;
  modifications: number;
  total: number;
}

type ViewMode = "side-by-side" | "unified";
type DiffMode = "lines" | "words";

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Compare locally in browser",
  },
  {
    icon: GitBranch,
    text: "Multiple views",
    description: "Side-by-side & unified",
  },
  {
    icon: Zap,
    text: "Instant diff",
    description: "Real-time comparison",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Format and validate JSON",
    icon: FileJson,
  },
  {
    id: "code-minifier",
    name: "Code Minifier",
    description: "Minify JS, CSS, HTML",
    icon: Code,
  },
  {
    id: "case-converter",
    name: "Case Converter",
    description: "Convert text case formats",
    icon: Type,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What types of text can I compare?",
    answer:
      "You can compare any type of text including code files (JavaScript, Python, HTML, CSS), configuration files (JSON, YAML), documentation (Markdown, plain text), or any other text-based content. The tool works with Unicode text in any language.",
  },
  {
    question: "What's the difference between line and word mode?",
    answer:
      "Line mode compares text line by line, which is ideal for code and structured text where line boundaries matter. Word mode compares word by word, which is better for prose, documentation, or when you want to see granular changes within lines.",
  },
  {
    question: "How do the ignore options work?",
    answer:
      "Ignore Case: Treats 'Hello' and 'hello' as identical. Ignore Whitespace: Ignores leading/trailing spaces and treats multiple spaces as one. These options are useful when formatting differences shouldn't be considered as changes.",
  },
  {
    question: "Is there a size limit for text comparison?",
    answer:
      "There's no hard limit since all processing happens in your browser. However, very large texts (>1MB) may cause performance issues. The tool uses an efficient LCS (Longest Common Subsequence) algorithm for optimal performance.",
  },
];

// Sample texts for demo
const SAMPLE_TEXT1 = `function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}`;

const SAMPLE_TEXT2 = `function calculateTotal(items, taxRate = 0.1) {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }
  const tax = subtotal * taxRate;
  return subtotal + tax;
}`;

export function TextDiffChecker() {
  const [text1, setText1] = useState(SAMPLE_TEXT1);
  const [text2, setText2] = useState(SAMPLE_TEXT2);
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
  const [diffMode, setDiffMode] = useState<DiffMode>("lines");
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [theme, setTheme] = useState("github-dark");

  // Theme detection for CodeEditor
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

  // Compute line-by-line diff using LCS algorithm
  const computeLineDiff = useCallback(
    (text1: string, text2: string): DiffResult[] => {
      const lines1 = text1.split("\n");
      const lines2 = text2.split("\n");

      // Apply ignore options
      const processLine = (line: string) => {
        if (ignoreWhitespace) line = line.trim();
        if (ignoreCase) line = line.toLowerCase();
        return line;
      };

      const processed1 = lines1.map(processLine);
      const processed2 = lines2.map(processLine);

      // LCS-based diff algorithm
      const lcs = computeLCS(processed1, processed2);
      const result: DiffResult[] = [];

      let i = 0,
        j = 0;
      let lineNum1 = 1,
        lineNum2 = 1;

      for (const action of lcs) {
        if (action === "match") {
          result.push({
            type: "unchanged",
            content: lines1[i],
            oldLine: lineNum1++,
            newLine: lineNum2++,
          });
          i++;
          j++;
        } else if (action === "delete") {
          result.push({
            type: "removed",
            content: lines1[i],
            oldLine: lineNum1++,
          });
          i++;
        } else if (action === "insert") {
          result.push({
            type: "added",
            content: lines2[j],
            newLine: lineNum2++,
          });
          j++;
        }
      }

      return result;
    },
    [ignoreCase, ignoreWhitespace],
  );

  // Compute word-level diff
  const computeWordDiff = useCallback(
    (text1: string, text2: string): DiffResult[] => {
      const words1 = text1.match(/\S+|\s+/g) || [];
      const words2 = text2.match(/\S+|\s+/g) || [];

      const processWord = (word: string) => {
        if (ignoreCase) word = word.toLowerCase();
        return word;
      };

      const processed1 = words1.map(processWord);
      const processed2 = words2.map(processWord);

      const lcs = computeLCS(processed1, processed2);
      const result: DiffResult[] = [];

      let i = 0,
        j = 0;

      for (const action of lcs) {
        if (action === "match") {
          result.push({
            type: "unchanged",
            content: words1[i],
          });
          i++;
          j++;
        } else if (action === "delete") {
          result.push({
            type: "removed",
            content: words1[i],
          });
          i++;
        } else if (action === "insert") {
          result.push({
            type: "added",
            content: words2[j],
          });
          j++;
        }
      }

      return result;
    },
    [ignoreCase],
  );

  // LCS (Longest Common Subsequence) algorithm
  const computeLCS = (
    arr1: string[],
    arr2: string[],
  ): ("match" | "delete" | "insert")[] => {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Build LCS table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find the actual LCS
    const actions: ("match" | "delete" | "insert")[] = [];
    let i = m,
      j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && arr1[i - 1] === arr2[j - 1]) {
        actions.unshift("match");
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        actions.unshift("insert");
        j--;
      } else {
        actions.unshift("delete");
        i--;
      }
    }

    return actions;
  };

  // Compute diff based on mode
  const diffResults = useMemo(() => {
    if (!text1 && !text2) return [];

    if (diffMode === "lines") {
      return computeLineDiff(text1, text2);
    } else if (diffMode === "words") {
      return computeWordDiff(text1, text2);
    }

    return [];
  }, [text1, text2, diffMode, computeLineDiff, computeWordDiff]);

  // Calculate statistics
  const stats = useMemo((): DiffStats => {
    const additions = diffResults.filter((r) => r.type === "added").length;
    const deletions = diffResults.filter((r) => r.type === "removed").length;
    const modifications = 0; // Could be calculated for more advanced diff
    const total = diffResults.length;

    return { additions, deletions, modifications, total };
  }, [diffResults]);

  // Auto-switch to output tab when both texts are present
  useEffect(() => {
    if (text1 && text2) {
      setActiveTab("output");
    }
  }, [text1, text2]);

  const handlePaste1 = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setText1(text);
        toast.success("Pasted original text");
      }
    } catch (err) {
      console.error("Failed to paste:", err);
      toast.error("Failed to paste from clipboard");
    }
  }, []);

  const handlePaste2 = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setText2(text);
        toast.success("Pasted modified text");
      }
    } catch (err) {
      console.error("Failed to paste:", err);
      toast.error("Failed to paste from clipboard");
    }
  }, []);

  const handleFileUpload = useCallback((file: File, side: "left" | "right") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (side === "left") {
        setText1(content);
        toast.success(`Loaded ${file.name} as original text`);
      } else {
        setText2(content);
        toast.success(`Loaded ${file.name} as modified text`);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleSwap = useCallback(() => {
    const temp = text1;
    setText1(text2);
    setText2(temp);
    toast.success("Swapped texts");
  }, [text1, text2]);

  const handleClear = useCallback(() => {
    setText1("");
    setText2("");
    toast.success("Cleared all texts");
  }, []);

  const handleCopyDiff = useCallback(async () => {
    const diffText = diffResults
      .map((r) => {
        const prefix = r.type === "added" ? "+ " : r.type === "removed" ? "- " : "  ";
        return prefix + r.content;
      })
      .join("\n");
    
    try {
      await navigator.clipboard.writeText(diffText);
      toast.success("Diff copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  }, [diffResults]);

  const renderDiffLine = (result: DiffResult, index: number) => {
    const bgColor = {
      added: "bg-green-100 dark:bg-green-900/30",
      removed: "bg-red-100 dark:bg-red-900/30",
      unchanged: "",
      modified: "bg-yellow-100 dark:bg-yellow-900/30",
    }[result.type];

    const textColor = {
      added: "text-green-900 dark:text-green-100",
      removed: "text-red-900 dark:text-red-100",
      unchanged: "",
      modified: "text-yellow-900 dark:text-yellow-100",
    }[result.type];

    const icon = {
      added: <Plus className="h-3 w-3" />,
      removed: <Minus className="h-3 w-3" />,
      unchanged: null,
      modified: <RefreshCw className="h-3 w-3" />,
    }[result.type];

    return (
      <div
        key={index}
        className={cn(
          "font-mono text-sm",
          bgColor,
          textColor,
          result.type !== "unchanged" && "px-2 py-0.5",
        )}
      >
        <div className="flex items-start gap-2">
          {showLineNumbers && result.oldLine && (
            <span className="text-neutral-400 dark:text-neutral-600 min-w-[3ch] text-right">
              {result.oldLine}
            </span>
          )}
          {showLineNumbers && result.newLine && (
            <span className="text-neutral-400 dark:text-neutral-600 min-w-[3ch] text-right">
              {result.newLine}
            </span>
          )}
          {icon && <span className="mt-0.5">{icon}</span>}
          <span className="flex-1 whitespace-pre-wrap break-words">
            {result.content || "\u00A0"}
          </span>
        </div>
      </div>
    );
  };

  const renderSideBySide = () => {
    const leftLines: DiffResult[] = [];
    const rightLines: DiffResult[] = [];

    diffResults.forEach((result) => {
      if (result.type === "removed") {
        leftLines.push(result);
        rightLines.push({ type: "unchanged", content: "" });
      } else if (result.type === "added") {
        leftLines.push({ type: "unchanged", content: "" });
        rightLines.push(result);
      } else {
        leftLines.push(result);
        rightLines.push(result);
      }
    });

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="overflow-x-auto bg-muted/30 rounded-lg p-2">
          <div className="space-y-0">
            {leftLines.map((result, i) => renderDiffLine(result, i))}
          </div>
        </div>
        <div className="overflow-x-auto bg-muted/30 rounded-lg p-2">
          <div className="space-y-0">
            {rightLines.map((result, i) => renderDiffLine(result, i))}
          </div>
        </div>
      </div>
    );
  };

  const renderUnified = () => {
    return (
      <div className="overflow-x-auto bg-muted/30 rounded-lg p-2">
        <div className="space-y-0">
          {diffResults.map((result, i) => renderDiffLine(result, i))}
        </div>
      </div>
    );
  };

  const renderWordDiff = () => {
    return (
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="font-mono text-sm whitespace-pre-wrap break-words">
          {diffResults.map((result, i) => (
            <span
              key={i}
              className={cn(
                result.type === "added" &&
                  "bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100",
                result.type === "removed" &&
                  "bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100 line-through",
                result.type === "unchanged" && "",
              )}
            >
              {result.content}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <section className="flex-1 w-full max-w-7xl mx-auto p-0 sm:p-4 md:p-6 lg:p-8 flex flex-col h-full">
        {/* Header */}
        <ToolHeader
          title={{ highlight: "Text Diff", main: "Checker" }}
          subtitle="Free online text diff tool - Compare files and find differences instantly"
          badge={{ text: "Code Comparison", icon: GitBranch }}
        />

        {/* Features - Desktop */}
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
                    <p className="font-medium">{feature.text}</p>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features - Mobile */}
        <div className="sm:hidden space-y-3 mb-8 px-4" style={{ animationDelay: "0.2s" }}>
          <div className="flex justify-center gap-4 mb-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <button
                  key={index}
                  onClick={() => setActiveFeature(activeFeature === index ? null : index)}
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                    activeFeature === index
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-primary/10 text-primary hover:scale-105"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </button>
              );
            })}
          </div>
          {activeFeature !== null && (
            <div className="bg-muted/50 rounded-lg p-4 animate-fade-in">
              <p className="font-medium mb-1">{features[activeFeature].text}</p>
              <p className="text-sm text-muted-foreground">
                {features[activeFeature].description}
              </p>
            </div>
          )}
        </div>

        {/* Mobile Tabs */}
        <div className="sm:hidden mb-4 px-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab("input")}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium transition-all duration-300",
                activeTab === "input"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="w-4 h-4 inline mr-1" />
              Input
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 relative",
                activeTab === "output"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GitBranch className="w-4 h-4 inline mr-1" />
              Diff
              {(text1 || text2) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-6 px-4 sm:px-0 min-h-0">
          {/* Input Section */}
          <div className={cn(
            "grid grid-cols-1 lg:grid-cols-2 gap-4",
            activeTab !== "input" && "hidden sm:grid"
          )}>
            {/* Original Text */}
            <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Original Text
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePaste1}
                    >
                      <ClipboardPaste className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => document.getElementById("file-input-1")?.click()}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    <input
                      id="file-input-1"
                      type="file"
                      className="hidden"
                      accept=".txt,.md,.json,.js,.ts,.css,.html"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleFileUpload(e.target.files[0], "left")
                      }
                      aria-label="Select text file for original text"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 sm:p-6 overflow-hidden">
                <CodeEditor
                  value={text1}
                  onChange={(value) => setText1(value || "")}
                  language="text"
                  theme={theme}
                  placeholder="Paste or type your original text here..."
                  className="h-full min-h-[300px]"
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    folding: true,
                    wordWrap: "on",
                    fontSize: 14,
                  }}
                />
              </CardContent>
            </Card>

            {/* Modified Text */}
            <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Modified Text
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePaste2}
                    >
                      <ClipboardPaste className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => document.getElementById("file-input-2")?.click()}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    <input
                      id="file-input-2"
                      type="file"
                      className="hidden"
                      accept=".txt,.md,.json,.js,.ts,.css,.html"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleFileUpload(e.target.files[0], "right")
                      }
                      aria-label="Select text file for modified text"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 sm:p-6 overflow-hidden">
                <CodeEditor
                  value={text2}
                  onChange={(value) => setText2(value || "")}
                  language="text"
                  theme={theme}
                  placeholder="Paste or type your modified text here..."
                  className="h-full min-h-[300px]"
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    folding: true,
                    wordWrap: "on",
                    fontSize: 14,
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card className={cn(
            "shadow-lg",
            activeTab !== "input" && "hidden sm:block"
          )}>
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Diff Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-4">
                <Button onClick={handleSwap} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Swap Texts
                </Button>

                <Button onClick={handleClear} variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>

                <Separator orientation="vertical" className="h-8 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <Label htmlFor="view-mode" className="text-sm">
                    View:
                  </Label>
                  <Select
                    value={viewMode}
                    onValueChange={(v) => setViewMode(v as ViewMode)}
                  >
                    <SelectTrigger id="view-mode" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="side-by-side">
                        <div className="flex items-center gap-2">
                          <Columns className="h-4 w-4" />
                          Side by Side
                        </div>
                      </SelectItem>
                      <SelectItem value="unified">
                        <div className="flex items-center gap-2">
                          <Rows className="h-4 w-4" />
                          Unified
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="diff-mode" className="text-sm">
                    Mode:
                  </Label>
                  <Select
                    value={diffMode}
                    onValueChange={(v) => setDiffMode(v as DiffMode)}
                  >
                    <SelectTrigger id="diff-mode" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lines">Lines</SelectItem>
                      <SelectItem value="words">Words</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Advanced Options - Mobile */}
                <div className="sm:hidden w-full">
                  <CollapsibleSection title="Advanced Options" defaultOpen={false}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="line-numbers" className="text-sm cursor-pointer">
                          Show Line Numbers
                        </Label>
                        <Switch
                          id="line-numbers"
                          checked={showLineNumbers}
                          onCheckedChange={setShowLineNumbers}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ignore-case" className="text-sm cursor-pointer">
                          Ignore Case
                        </Label>
                        <Switch
                          id="ignore-case"
                          checked={ignoreCase}
                          onCheckedChange={setIgnoreCase}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ignore-whitespace" className="text-sm cursor-pointer">
                          Ignore Whitespace
                        </Label>
                        <Switch
                          id="ignore-whitespace"
                          checked={ignoreWhitespace}
                          onCheckedChange={setIgnoreWhitespace}
                        />
                      </div>
                    </div>
                  </CollapsibleSection>
                </div>

                {/* Advanced Options - Desktop */}
                <div className="hidden sm:contents">
                  <Separator orientation="vertical" className="h-8" />

                  <div className="flex items-center gap-2">
                    <Switch
                      id="line-numbers-desktop"
                      checked={showLineNumbers}
                      onCheckedChange={setShowLineNumbers}
                    />
                    <Label htmlFor="line-numbers-desktop" className="text-sm cursor-pointer">
                      Line Numbers
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="ignore-case-desktop"
                      checked={ignoreCase}
                      onCheckedChange={setIgnoreCase}
                    />
                    <Label htmlFor="ignore-case-desktop" className="text-sm cursor-pointer">
                      Ignore Case
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="ignore-whitespace-desktop"
                      checked={ignoreWhitespace}
                      onCheckedChange={setIgnoreWhitespace}
                    />
                    <Label
                      htmlFor="ignore-whitespace-desktop"
                      className="text-sm cursor-pointer"
                    >
                      Ignore Whitespace
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diff Output */}
          <div className={cn(
            "flex-1 flex flex-col min-h-0",
            activeTab !== "output" && "hidden sm:flex"
          )}>
            <Card className="flex-1 flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-primary" />
                    Difference View
                  </span>
                  <div className="flex items-center gap-4">
                    {/* Statistics */}
                    {(text1 || text2) && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="font-medium">{stats.additions}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <span className="font-medium">{stats.deletions}</span>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyDiff}
                      disabled={!diffResults.length}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6">
                {(text1 || text2) ? (
                  <div>
                    {diffMode === "lines" &&
                      viewMode === "side-by-side" &&
                      renderSideBySide()}
                    {diffMode === "lines" && viewMode === "unified" && renderUnified()}
                    {diffMode === "words" && renderWordDiff()}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <GitBranch className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">
                        Enter text in both panels to see the differences
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ and Related Tools */}
        <div className="mt-12 space-y-12 px-4 sm:px-0">
          <FAQ items={faqs} />
          <RelatedTools tools={relatedTools} />
        </div>
      </section>
    </div>
  );
}