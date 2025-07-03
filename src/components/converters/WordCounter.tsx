import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  FileText,
  Upload,
  Clock,
  Hash,
  Type,
  TrendingUp,
  Settings,
  Download,
  Shield,
  Zap,
  BarChart3,
  ClipboardPaste,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Slider } from "../ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { CodeEditor } from "../ui/code-editor";

interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTime: number; // in minutes
  speakingTime: number; // in minutes
  uniqueWords: number;
  averageWordLength: number;
  longestWord: string;
  keywordDensity: Array<{ word: string; count: number; density: number }>;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "All analysis done locally",
  },
  {
    icon: Zap,
    text: "Real-time stats",
    description: "Instant word & character count",
  },
  {
    icon: BarChart3,
    text: "Keyword density",
    description: "Find most used words",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "case-converter",
    name: "Case Converter",
    description: "Convert text case formats",
    icon: Type,
  },
  {
    id: "text-diff-checker",
    name: "Text Diff Checker",
    description: "Compare two texts",
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
    question: "How accurate is the word count?",
    answer:
      "Very accurate! We count words by splitting on whitespace and filtering empty strings. The character count includes all characters including spaces, while 'characters without spaces' excludes all whitespace. Sentence detection uses punctuation marks (. ! ?) as delimiters.",
  },
  {
    question: "What are reading and speaking speeds?",
    answer:
      "Average reading speed is 200-250 words per minute for adults, while average speaking speed is 130-160 words per minute. These are adjustable in the settings to match your personal pace. The estimates help you gauge content length for presentations or reading materials.",
  },
  {
    question: "How does keyword density work?",
    answer:
      "Keyword density shows the frequency of words in your text as a percentage. We exclude common words (the, a, an, etc.) and focus on meaningful terms. This helps identify the main topics and can be useful for SEO optimization or content analysis.",
  },
  {
    question: "Can I analyze large documents?",
    answer:
      "Yes! Since all processing happens in your browser, there's no hard limit on document size. However, very large texts (>1MB) may cause performance issues. The tool works best with typical documents, articles, and essays.",
  },
];

const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog. This pangram sentence contains every letter of the alphabet at least once.

Pangrams are often used to display typefaces, test equipment, and develop fonts. The quick brown fox jumps over the lazy dog is probably the most famous pangram in the English language.`;

export default function WordCounter() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [readingSpeed, setReadingSpeed] = useState(200); // words per minute
  const [speakingSpeed, setSpeakingSpeed] = useState(150); // words per minute
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

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const stats: TextStats = useMemo(() => {
    if (!text.trim()) {
      return {
        words: 0,
        characters: 0,
        charactersNoSpaces: 0,
        sentences: 0,
        paragraphs: 0,
        readingTime: 0,
        speakingTime: 0,
        uniqueWords: 0,
        averageWordLength: 0,
        longestWord: "",
        keywordDensity: [],
      };
    }

    // Basic counts
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, "").length;

    // Words
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const wordCount = words.length;

    // Sentences (basic detection)
    const sentences = text
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0).length;

    // Paragraphs
    const paragraphs = text
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0).length;

    // Reading and speaking time
    const readingTime = Math.ceil(wordCount / readingSpeed);
    const speakingTime = Math.ceil(wordCount / speakingSpeed);

    // Unique words (case-insensitive)
    const wordMap = new Map<string, number>();
    words.forEach((word) => {
      const cleaned = word.toLowerCase().replace(/[^\w]/g, "");
      if (cleaned) {
        wordMap.set(cleaned, (wordMap.get(cleaned) || 0) + 1);
      }
    });

    const uniqueWords = wordMap.size;

    // Average word length
    const totalWordLength = words.reduce((sum, word) => sum + word.length, 0);
    const averageWordLength = wordCount > 0 ? totalWordLength / wordCount : 0;

    // Longest word
    const longestWord = words.reduce(
      (longest, word) => (word.length > longest.length ? word : longest),
      "",
    );

    // Keyword density (top 10 words, excluding common words)
    const commonWords = new Set([
      "the",
      "be",
      "to",
      "of",
      "and",
      "a",
      "in",
      "that",
      "have",
      "i",
      "it",
      "for",
      "not",
      "on",
      "with",
      "he",
      "as",
      "you",
      "do",
      "at",
      "this",
      "but",
      "his",
      "by",
      "from",
      "they",
      "we",
      "say",
      "her",
      "she",
      "or",
      "an",
      "will",
      "my",
      "one",
      "all",
      "would",
      "there",
      "their",
      "what",
      "so",
      "up",
      "out",
      "if",
      "about",
      "who",
      "get",
      "which",
      "go",
      "me",
      "when",
      "make",
      "can",
      "like",
      "time",
      "no",
      "just",
      "him",
      "know",
      "take",
      "people",
      "into",
      "year",
      "your",
      "good",
      "some",
      "could",
      "them",
      "see",
      "other",
      "than",
      "then",
      "now",
      "look",
      "only",
      "come",
      "its",
      "over",
      "think",
      "also",
      "back",
      "after",
      "use",
      "two",
      "how",
      "our",
      "work",
    ]);

    const keywordDensity = Array.from(wordMap.entries())
      .filter(([word]) => word.length > 2 && !commonWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        density: (count / wordCount) * 100,
      }));

    return {
      words: wordCount,
      characters,
      charactersNoSpaces,
      sentences,
      paragraphs,
      readingTime,
      speakingTime,
      uniqueWords,
      averageWordLength,
      longestWord,
      keywordDensity,
    };
  }, [text, readingSpeed, speakingSpeed]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (e) => {
          setText((e.target?.result as string) || "");
          toast.success(`Loaded ${file.name}`);
        };
        reader.readAsText(file);
      } else if (file) {
        toast.error("Please select a .txt file");
      }
    },
    [],
  );

  const handlePaste = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(clipboardText);
        toast.success("Pasted from clipboard");
      }
    } catch (err) {
      console.error("Failed to paste:", err);
      toast.error("Failed to paste from clipboard");
    }
  }, []);

  const handleClear = useCallback(() => {
    setText("");
    toast.success("Cleared text");
  }, []);

  const handleExport = useCallback(() => {
    const report = `Text Analysis Report
=====================================
Generated: ${new Date().toLocaleString()}

Basic Statistics:
- Words: ${stats.words}
- Characters: ${stats.characters}
- Characters (no spaces): ${stats.charactersNoSpaces}
- Sentences: ${stats.sentences}
- Paragraphs: ${stats.paragraphs}

Reading Metrics:
- Reading time: ${stats.readingTime} minutes (at ${readingSpeed} wpm)
- Speaking time: ${stats.speakingTime} minutes (at ${speakingSpeed} wpm)

Word Analysis:
- Unique words: ${stats.uniqueWords}
- Average word length: ${stats.averageWordLength.toFixed(1)} characters
- Longest word: ${stats.longestWord}

Top Keywords:
${stats.keywordDensity
  .map(
    (kw, i) =>
      `${i + 1}. "${kw.word}" - ${kw.count} times (${kw.density.toFixed(1)}%)`,
  )
  .join("\n")}

=====================================
Original Text:
${text}`;

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "text-analysis-report.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Analysis report exported");
  }, [stats, text, readingSpeed, speakingSpeed]);

  // Auto-switch to output tab when text is entered
  useEffect(() => {
    if (text && stats.words > 0) {
      setActiveTab("output");
    }
  }, [text, stats.words]);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      {/* Writing-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/8 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <section className="flex-1 w-full max-w-7xl mx-auto px-0 py-4 sm:p-4 md:p-6 lg:px-8 lg:py-6 flex flex-col h-full relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ highlight: "Word", main: "Counter" }}
          subtitle="Free online word counter - Count words, characters, sentences with reading time"
          badge={{ text: "Text Analysis", icon: Type }}
          features={features}
        />

        {/* Mobile Tabs */}
        <div className="sm:hidden mb-4 px-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab("input")}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium transition-all duration-300",
                activeTab === "input"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Text
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 relative",
                activeTab === "output"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Analysis
              {stats.words > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-6 px-4 sm:px-0 min-h-0">
          {/* Settings Card */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Analysis Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="reading-speed" className="mb-2 block">
                    Reading Speed: {readingSpeed} wpm
                  </Label>
                  <Slider
                    id="reading-speed"
                    value={[readingSpeed]}
                    onValueChange={([value]) => setReadingSpeed(value)}
                    min={100}
                    max={500}
                    step={10}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Average: 200-250 wpm
                  </p>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="speaking-speed" className="mb-2 block">
                    Speaking Speed: {speakingSpeed} wpm
                  </Label>
                  <Slider
                    id="speaking-speed"
                    value={[speakingSpeed]}
                    onValueChange={([value]) => setSpeakingSpeed(value)}
                    min={100}
                    max={300}
                    step={10}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Average: 130-160 wpm
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    aria-label="Select text file"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={stats.words === 0}
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-h-0">
            {/* Input Panel */}
            <div
              className={cn(
                "flex flex-col",
                activeTab !== "input" && "hidden lg:flex",
              )}
            >
              <Card className="flex-1 flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Text Input
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handlePaste}>
                        <ClipboardPaste className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        disabled={!text}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4 sm:p-6 overflow-hidden">
                  <CodeEditor
                    value={text}
                    onChange={(value) => setText(value || "")}
                    language="text"
                    theme={theme}
                    placeholder="Type or paste your text here..."
                    className="h-full"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Analysis Panel */}
            <div
              className={cn(
                "flex flex-col min-h-0",
                activeTab !== "output" && "hidden lg:flex",
              )}
            >
              <Card className="flex-1 flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Text Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6">
                  {stats.words > 0 ? (
                    <div className="space-y-6">
                      {/* Basic Statistics */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Hash className="w-4 h-4" />
                          Basic Statistics
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                            <span className="text-muted-foreground">Words</span>
                            <span className="font-medium font-mono">
                              {stats.words.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                            <span className="text-muted-foreground">
                              Characters
                            </span>
                            <span className="font-medium font-mono">
                              {stats.characters.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                            <span className="text-muted-foreground">
                              Characters (no spaces)
                            </span>
                            <span className="font-medium font-mono">
                              {stats.charactersNoSpaces.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                            <span className="text-muted-foreground">
                              Sentences
                            </span>
                            <span className="font-medium font-mono">
                              {stats.sentences}
                            </span>
                          </div>
                          <div className="flex justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                            <span className="text-muted-foreground">
                              Paragraphs
                            </span>
                            <span className="font-medium font-mono">
                              {stats.paragraphs}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Time Estimates */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Time Estimates
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                            <span className="text-muted-foreground">
                              Reading time
                            </span>
                            <span className="font-medium">
                              {stats.readingTime === 0
                                ? "0"
                                : stats.readingTime < 1
                                  ? "< 1"
                                  : stats.readingTime}{" "}
                              min
                            </span>
                          </div>
                          <div className="flex justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                            <span className="text-muted-foreground">
                              Speaking time
                            </span>
                            <span className="font-medium">
                              {stats.speakingTime === 0
                                ? "0"
                                : stats.speakingTime < 1
                                  ? "< 1"
                                  : stats.speakingTime}{" "}
                              min
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Word Analysis */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Type className="w-4 h-4" />
                          Word Analysis
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                            <span className="text-muted-foreground">
                              Unique words
                            </span>
                            <span className="font-medium font-mono">
                              {stats.uniqueWords}
                            </span>
                          </div>
                          <div className="flex justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                            <span className="text-muted-foreground">
                              Average word length
                            </span>
                            <span className="font-medium font-mono">
                              {stats.averageWordLength.toFixed(1)} chars
                            </span>
                          </div>
                          {stats.longestWord && (
                            <div className="flex justify-between items-start p-2 rounded hover:bg-muted/50 transition-colors">
                              <span className="text-muted-foreground">
                                Longest word
                              </span>
                              <span className="font-medium text-right break-all">
                                {stats.longestWord}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Top Keywords */}
                      {stats.keywordDensity.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Top Keywords
                            </h3>
                            <div className="space-y-2">
                              {stats.keywordDensity.map((kw, index) => (
                                <div
                                  key={kw.word}
                                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                >
                                  <span className="flex items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className="w-6 h-6 p-0 flex items-center justify-center"
                                    >
                                      {index + 1}
                                    </Badge>
                                    <span className="font-medium">
                                      {kw.word}
                                    </span>
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {kw.count}× ({kw.density.toFixed(1)}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <BarChart3 className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">
                          Enter text to see analysis
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
