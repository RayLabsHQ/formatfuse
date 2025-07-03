import React, { useState, useCallback, useEffect } from "react";
import {
  Copy,
  RefreshCw,
  Check,
  Lock,
  Sparkles,
  Shield,
  Key,
  Zap,
  Info,
  Binary,
  Settings,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Separator } from "../ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadEFFWordlist } from "@/lib/eff-wordlist";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { CollapsibleSection } from "../ui/mobile/CollapsibleSection";

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
}

interface MemorableOptions {
  wordCount: number;
  separator: "none" | "hyphen" | "underscore" | "space";
  caseStyle: "lower" | "title" | "camel" | "pascal";
  addNumbers: boolean;
  addSymbols: boolean;
}

const CHARACTER_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  similar: "ilLoO01",
};

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Generated locally in browser",
  },
  {
    icon: Zap,
    text: "Instant generation",
    description: "Real-time strength feedback",
  },
  {
    icon: Lock,
    text: "Secure randomness",
    description: "Web Crypto API powered",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "hash-generator",
    name: "Hash Generator",
    description: "Generate MD5, SHA hashes",
    icon: Key,
  },
  {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64",
    icon: Binary,
  },
  {
    id: "text-encryptor",
    name: "Text Encryptor",
    description: "Encrypt text with AES",
    icon: Lock,
  },
];

const faqs: FAQItem[] = [
  {
    question: "How secure are the generated passwords?",
    answer:
      "Very secure! We use the Web Crypto API for cryptographically strong random number generation. Random passwords with mixed characters provide high entropy, while memorable passwords use the EFF's curated wordlist with 7,776 words for excellent security.",
  },
  {
    question: "What's the difference between Random and Memorable passwords?",
    answer:
      "Random passwords use a mix of characters (letters, numbers, symbols) for maximum entropy in minimum length. Memorable passwords use dictionary words that are easier to remember and type, while still providing strong security through length and randomness.",
  },
  {
    question: "Are my passwords stored anywhere?",
    answer:
      "No, all password generation happens entirely in your browser. No passwords are stored, logged, or transmitted to any server. Each password is generated fresh when you request it.",
  },
  {
    question: "What makes a password strong?",
    answer:
      "Strong passwords have high entropy (randomness). For random passwords, use 16+ characters with mixed types. For memorable passwords, use 4+ words. The strength meter shows real-time feedback based on the entropy of your password settings.",
  },
];

export default function PasswordGenerator() {
  const [mode, setMode] = useState<"random" | "memorable">("random");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [strength, setStrength] = useState(0);
  const [activeTab, setActiveTab] = useState<"settings" | "output">("settings");
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  const [randomOptions, setRandomOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: false,
  });

  const [memorableOptions, setMemorableOptions] = useState<MemorableOptions>({
    wordCount: 4,
    separator: "hyphen",
    caseStyle: "title",
    addNumbers: false,
    addSymbols: false,
  });

  const [effWordlist, setEffWordlist] = useState<string[]>([]);

  useEffect(() => {
    loadEFFWordlist().then(setEffWordlist);
  }, []);

  const calculateStrength = useCallback(
    (password: string, currentMode: "random" | "memorable"): number => {
      if (!password) return 0;

      if (currentMode === "memorable") {
        const wordBits = memorableOptions.wordCount * 12.9; // log2(7776)
        let totalBits = wordBits;

        if (memorableOptions.addNumbers) totalBits += Math.log2(1000); // Assume 3 digits, ~10 bits
        if (memorableOptions.addSymbols)
          totalBits += Math.log2(CHARACTER_SETS.symbols.length); // ~5 bits for one symbol

        return Math.min(100, Math.max(0, (totalBits / 70) * 100)); // Normalize based on ~70 bits for very strong
      } else {
        let charSetSize = 0;
        if (randomOptions.lowercase)
          charSetSize += CHARACTER_SETS.lowercase.length;
        if (randomOptions.uppercase)
          charSetSize += CHARACTER_SETS.uppercase.length;
        if (randomOptions.numbers) charSetSize += CHARACTER_SETS.numbers.length;
        if (randomOptions.symbols) charSetSize += CHARACTER_SETS.symbols.length;

        if (randomOptions.excludeSimilar && charSetSize > 0) {
          // Approximate reduction, precise calculation is complex
          let tempCharset = "";
          if (randomOptions.lowercase) tempCharset += CHARACTER_SETS.lowercase;
          if (randomOptions.uppercase) tempCharset += CHARACTER_SETS.uppercase;
          if (randomOptions.numbers) tempCharset += CHARACTER_SETS.numbers;
          if (randomOptions.symbols) tempCharset += CHARACTER_SETS.symbols;
          charSetSize = tempCharset
            .split("")
            .filter((char) => !CHARACTER_SETS.similar.includes(char))
            .join("").length;
        }

        if (charSetSize === 0) return 0;
        const entropy = Math.log2(charSetSize) * password.length;

        return Math.min(100, Math.max(0, (entropy / 70) * 100)); // Normalize based on ~70 bits for very strong
      }
    },
    [memorableOptions, randomOptions],
  );

  const generateRandomPassword = useCallback(() => {
    let charset = "";
    if (randomOptions.lowercase) charset += CHARACTER_SETS.lowercase;
    if (randomOptions.uppercase) charset += CHARACTER_SETS.uppercase;
    if (randomOptions.numbers) charset += CHARACTER_SETS.numbers;
    if (randomOptions.symbols) charset += CHARACTER_SETS.symbols;

    if (randomOptions.excludeSimilar) {
      charset = charset
        .split("")
        .filter((char) => !CHARACTER_SETS.similar.includes(char))
        .join("");
    }

    if (!charset) {
      setPassword("");
      setStrength(0);
      return "";
    }

    const array = new Uint32Array(randomOptions.length);
    crypto.getRandomValues(array);

    let newPassword = "";
    for (let i = 0; i < randomOptions.length; i++) {
      newPassword += charset[array[i] % charset.length];
    }
    return newPassword;
  }, [randomOptions]);

  const formatWords = useCallback(
    (words: string[], separator: string, caseStyle: string): string => {
      // Apply case style
      let formattedWords: string[];
      switch (caseStyle) {
        case "lower":
          formattedWords = words.map((w) => w.toLowerCase());
          break;
        case "title":
          formattedWords = words.map(
            (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
          );
          break;
        case "camel":
          formattedWords = words.map((w, i) =>
            i === 0
              ? w.toLowerCase()
              : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
          );
          break;
        case "pascal":
          formattedWords = words.map(
            (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
          );
          break;
        default:
          formattedWords = words.map((w) => w.toLowerCase());
      }

      // Apply separator
      switch (separator) {
        case "none":
          return formattedWords.join("");
        case "hyphen":
          return formattedWords.join("-");
        case "underscore":
          return formattedWords.join("_");
        case "space":
          return formattedWords.join(" ");
        default:
          return formattedWords.join("-");
      }
    },
    [],
  );

  const generateMemorablePassword = useCallback(() => {
    if (effWordlist.length === 0) return "Loading wordlist...";

    const array = new Uint32Array(memorableOptions.wordCount);
    crypto.getRandomValues(array);

    const words: string[] = [];
    for (let i = 0; i < memorableOptions.wordCount; i++) {
      words.push(effWordlist[array[i] % effWordlist.length]);
    }

    let newPassword = formatWords(
      words,
      memorableOptions.separator,
      memorableOptions.caseStyle,
    );

    if (memorableOptions.addNumbers) {
      const numArray = new Uint32Array(1);
      crypto.getRandomValues(numArray);
      newPassword += (numArray[0] % 1000).toString().padStart(3, "0");
    }

    if (memorableOptions.addSymbols) {
      const symbolsCharset = "!@#$%&*"; // Reduced set for memorable passwords
      const symArray = new Uint32Array(1);
      crypto.getRandomValues(symArray);
      newPassword += symbolsCharset[symArray[0] % symbolsCharset.length];
    }

    return newPassword;
  }, [effWordlist, memorableOptions, formatWords]);

  const generatePassword = useCallback(() => {
    const newPassword =
      mode === "random"
        ? generateRandomPassword()
        : generateMemorablePassword();
    setPassword(newPassword);
    setStrength(calculateStrength(newPassword, mode));
    setActiveTab("output");
    toast.success("Password generated");
  }, [
    mode,
    generateRandomPassword,
    generateMemorablePassword,
    calculateStrength,
  ]);

  useEffect(() => {
    generatePassword();
  }, [generatePassword, randomOptions, memorableOptions, mode]); // Rerun if options or mode change

  const handleCopy = useCallback(async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Password copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy password");
    }
  }, [password]);

  const getStrengthColor = (s: number) => {
    if (s < 40) return "bg-red-500";
    if (s < 70) return "bg-yellow-500";
    if (s < 90) return "bg-green-500";
    return "bg-blue-500";
  };

  const getStrengthText = (s: number) => {
    if (s < 40) return "Weak";
    if (s < 70) return "Good";
    if (s < 90) return "Strong";
    return "Very Strong";
  };

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <section className="flex-1 w-full max-w-7xl mx-auto p-0 sm:p-4 md:p-6 lg:p-8 flex flex-col h-full">
        {/* Header */}
        <ToolHeader
          title={{ highlight: "Password", main: "Generator" }}
          subtitle="Free online secure password generator with entropy calculation and strength meter"
          badge={{ text: "Security Tool", icon: Shield }}
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
              onClick={() => setActiveTab("settings")}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium transition-all duration-300",
                activeTab === "settings"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="w-4 h-4 inline mr-1" />
              Settings
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
              <Key className="w-4 h-4 inline mr-1" />
              Password
              {password && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col sm:grid sm:grid-cols-[1fr,1fr] gap-4 sm:gap-6 px-4 sm:px-0 min-h-0">
          {/* Settings Panel */}
          <div className={cn(
            "flex flex-col min-h-0",
            activeTab !== "settings" && "hidden sm:flex"
          )}>
            <Card className="flex-1 flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Password Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* Mode Selection */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                    <button
                      onClick={() => setMode("random")}
                      className={cn(
                        "py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2",
                        mode === "random"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Lock className="w-4 h-4" />
                      Random
                    </button>
                    <button
                      onClick={() => setMode("memorable")}
                      className={cn(
                        "py-2 px-3 rounded-md text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2",
                        mode === "memorable"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Sparkles className="w-4 h-4" />
                      Memorable
                    </button>
                  </div>

                  <Separator />

                  {mode === "random" ? (
                    <div className="space-y-6">
                      {/* Password Length */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="length-slider">Password Length</Label>
                          <span className="text-sm font-medium bg-muted px-2 py-1 rounded">
                            {randomOptions.length} characters
                          </span>
                        </div>
                        <Slider
                          id="length-slider"
                          value={[randomOptions.length]}
                          onValueChange={([value]) =>
                            setRandomOptions((prev) => ({ ...prev, length: value }))
                          }
                          min={12}
                          max={32}
                          step={1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>12</span>
                          <span>32</span>
                        </div>
                      </div>

                      <Separator />

                      {/* Character Types */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() =>
                            setRandomOptions((prev) => ({
                              ...prev,
                              uppercase: !prev.uppercase,
                            }))
                          }
                          className={cn(
                            "relative p-4 rounded-lg border-2 text-left transition-all",
                            "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            randomOptions.uppercase
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-muted-foreground/25 hover:border-muted-foreground/40",
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">Uppercase</div>
                              <div className="text-sm text-muted-foreground mt-0.5">
                                A-Z
                              </div>
                            </div>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                randomOptions.uppercase
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {randomOptions.uppercase && (
                                <Check className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() =>
                            setRandomOptions((prev) => ({
                              ...prev,
                              lowercase: !prev.lowercase,
                            }))
                          }
                          className={cn(
                            "relative p-4 rounded-lg border-2 text-left transition-all",
                            "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            randomOptions.lowercase
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-muted-foreground/25 hover:border-muted-foreground/40",
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">Lowercase</div>
                              <div className="text-sm text-muted-foreground mt-0.5">
                                a-z
                              </div>
                            </div>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                randomOptions.lowercase
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {randomOptions.lowercase && (
                                <Check className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() =>
                            setRandomOptions((prev) => ({
                              ...prev,
                              numbers: !prev.numbers,
                            }))
                          }
                          className={cn(
                            "relative p-4 rounded-lg border-2 text-left transition-all",
                            "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            randomOptions.numbers
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-muted-foreground/25 hover:border-muted-foreground/40",
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">Numbers</div>
                              <div className="text-sm text-muted-foreground mt-0.5">
                                0-9
                              </div>
                            </div>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                randomOptions.numbers
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {randomOptions.numbers && (
                                <Check className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() =>
                            setRandomOptions((prev) => ({
                              ...prev,
                              symbols: !prev.symbols,
                            }))
                          }
                          className={cn(
                            "relative p-4 rounded-lg border-2 text-left transition-all",
                            "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            randomOptions.symbols
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-muted-foreground/25 hover:border-muted-foreground/40",
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">Symbols</div>
                              <div className="text-sm text-muted-foreground mt-0.5">
                                !@#$%
                              </div>
                            </div>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                randomOptions.symbols
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {randomOptions.symbols && (
                                <Check className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Advanced Options - Mobile */}
                      <div className="sm:hidden">
                        <CollapsibleSection title="Advanced Options" defaultOpen={false}>
                          <button
                            onClick={() =>
                              setRandomOptions((prev) => ({
                                ...prev,
                                excludeSimilar: !prev.excludeSimilar,
                              }))
                            }
                            className={cn(
                              "relative p-4 rounded-lg border-2 text-left transition-all w-full",
                              "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                              randomOptions.excludeSimilar
                                ? "border-primary bg-primary/5 dark:bg-primary/10"
                                : "border-muted-foreground/25 hover:border-muted-foreground/40",
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium">
                                  Exclude similar characters
                                </div>
                                <div className="text-sm text-muted-foreground mt-0.5">
                                  i, l, 1, L, o, 0, O
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                  randomOptions.excludeSimilar
                                    ? "border-primary bg-primary"
                                    : "border-muted-foreground/40",
                                )}
                              >
                                {randomOptions.excludeSimilar && (
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                )}
                              </div>
                            </div>
                          </button>
                        </CollapsibleSection>
                      </div>

                      {/* Advanced Options - Desktop */}
                      <div className="hidden sm:block">
                        <Separator />
                        <button
                          onClick={() =>
                            setRandomOptions((prev) => ({
                              ...prev,
                              excludeSimilar: !prev.excludeSimilar,
                            }))
                          }
                          className={cn(
                            "relative p-4 rounded-lg border-2 text-left transition-all w-full",
                            "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            randomOptions.excludeSimilar
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-muted-foreground/25 hover:border-muted-foreground/40",
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">
                                Exclude similar characters
                              </div>
                              <div className="text-sm text-muted-foreground mt-0.5">
                                i, l, 1, L, o, 0, O
                              </div>
                            </div>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                randomOptions.excludeSimilar
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {randomOptions.excludeSimilar && (
                                <Check className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Word Count */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="word-count-slider">Number of Words</Label>
                          <span className="text-sm font-medium bg-muted px-2 py-1 rounded">
                            {memorableOptions.wordCount} words
                          </span>
                        </div>
                        <Slider
                          id="word-count-slider"
                          value={[memorableOptions.wordCount]}
                          onValueChange={([value]) =>
                            setMemorableOptions((prev) => ({
                              ...prev,
                              wordCount: value,
                            }))
                          }
                          min={3}
                          max={7}
                          step={1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>3</span>
                          <span>7</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Separator */}
                        <div>
                          <Label className="mb-3 block">Separator</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button
                              onClick={() =>
                                setMemorableOptions((prev) => ({
                                  ...prev,
                                  separator: "none",
                                }))
                              }
                              className={cn(
                                "relative p-3 rounded-md border-2 text-center transition-all",
                                "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                memorableOptions.separator === "none"
                                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                                  : "border-muted-foreground/25 hover:border-muted-foreground/40",
                              )}
                            >
                              <div className="font-mono text-sm">wordword</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                None
                              </div>
                            </button>
                            <button
                              onClick={() =>
                                setMemorableOptions((prev) => ({
                                  ...prev,
                                  separator: "hyphen",
                                }))
                              }
                              className={cn(
                                "relative p-3 rounded-md border-2 text-center transition-all",
                                "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                memorableOptions.separator === "hyphen"
                                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                                  : "border-muted-foreground/25 hover:border-muted-foreground/40",
                              )}
                            >
                              <div className="font-mono text-sm">word-word</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Hyphen
                              </div>
                            </button>
                            <button
                              onClick={() =>
                                setMemorableOptions((prev) => ({
                                  ...prev,
                                  separator: "underscore",
                                }))
                              }
                              className={cn(
                                "relative p-3 rounded-md border-2 text-center transition-all",
                                "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                memorableOptions.separator === "underscore"
                                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                                  : "border-muted-foreground/25 hover:border-muted-foreground/40",
                              )}
                            >
                              <div className="font-mono text-sm">word_word</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Underscore
                              </div>
                            </button>
                            <button
                              onClick={() =>
                                setMemorableOptions((prev) => ({
                                  ...prev,
                                  separator: "space",
                                }))
                              }
                              className={cn(
                                "relative p-3 rounded-md border-2 text-center transition-all",
                                "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                memorableOptions.separator === "space"
                                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                                  : "border-muted-foreground/25 hover:border-muted-foreground/40",
                              )}
                            >
                              <div className="font-mono text-sm">word word</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Space
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Case Style */}
                        <div>
                          <Label className="mb-3 block">Case Style</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button
                              onClick={() =>
                                setMemorableOptions((prev) => ({
                                  ...prev,
                                  caseStyle: "lower",
                                }))
                              }
                              className={cn(
                                "relative p-3 rounded-md border-2 text-center transition-all",
                                "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                memorableOptions.caseStyle === "lower"
                                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                                  : "border-muted-foreground/25 hover:border-muted-foreground/40",
                              )}
                            >
                              <div className="font-mono text-sm">lowercase</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Lower
                              </div>
                            </button>
                            <button
                              onClick={() =>
                                setMemorableOptions((prev) => ({
                                  ...prev,
                                  caseStyle: "title",
                                }))
                              }
                              className={cn(
                                "relative p-3 rounded-md border-2 text-center transition-all",
                                "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                memorableOptions.caseStyle === "title"
                                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                                  : "border-muted-foreground/25 hover:border-muted-foreground/40",
                              )}
                            >
                              <div className="font-mono text-sm">Title Case</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Title
                              </div>
                            </button>
                            <button
                              onClick={() =>
                                setMemorableOptions((prev) => ({
                                  ...prev,
                                  caseStyle: "camel",
                                }))
                              }
                              className={cn(
                                "relative p-3 rounded-md border-2 text-center transition-all",
                                "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                memorableOptions.caseStyle === "camel"
                                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                                  : "border-muted-foreground/25 hover:border-muted-foreground/40",
                              )}
                            >
                              <div className="font-mono text-sm">camelCase</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Camel
                              </div>
                            </button>
                            <button
                              onClick={() =>
                                setMemorableOptions((prev) => ({
                                  ...prev,
                                  caseStyle: "pascal",
                                }))
                              }
                              className={cn(
                                "relative p-3 rounded-md border-2 text-center transition-all",
                                "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                memorableOptions.caseStyle === "pascal"
                                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                                  : "border-muted-foreground/25 hover:border-muted-foreground/40",
                              )}
                            >
                              <div className="font-mono text-sm">PascalCase</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Pascal
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Additional Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() =>
                            setMemorableOptions((prev) => ({
                              ...prev,
                              addNumbers: !prev.addNumbers,
                            }))
                          }
                          className={cn(
                            "relative p-4 rounded-lg border-2 text-left transition-all",
                            "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            memorableOptions.addNumbers
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-muted-foreground/25 hover:border-muted-foreground/40",
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">Add numbers</div>
                              <div className="text-sm text-muted-foreground mt-0.5">
                                e.g., 123
                              </div>
                            </div>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                memorableOptions.addNumbers
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {memorableOptions.addNumbers && (
                                <Check className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() =>
                            setMemorableOptions((prev) => ({
                              ...prev,
                              addSymbols: !prev.addSymbols,
                            }))
                          }
                          className={cn(
                            "relative p-4 rounded-lg border-2 text-left transition-all",
                            "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            memorableOptions.addSymbols
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-muted-foreground/25 hover:border-muted-foreground/40",
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">Add a symbol</div>
                              <div className="text-sm text-muted-foreground mt-0.5">
                                e.g., !@#
                              </div>
                            </div>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                memorableOptions.addSymbols
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {memorableOptions.addSymbols && (
                                <Check className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="p-3 rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700/50">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Uses EFF's long wordlist (7,776 words) for high security.
                          <a
                            href="https://www.eff.org/dice"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium ml-1 hover:text-blue-500 dark:hover:text-blue-200"
                          >
                            Learn more
                          </a>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Output Panel */}
          <div className={cn(
            "flex flex-col min-h-0",
            activeTab !== "output" && "hidden sm:flex"
          )}>
            <Card className="flex-1 flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Generated Password
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">
                <div className="flex-1 flex flex-col justify-center">
                  {/* Password Display */}
                  <div className="space-y-4">
                    <div className="font-mono text-xl sm:text-2xl break-all select-all p-6 rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/20 min-h-[80px] flex items-center justify-center text-center">
                      {password || "Generating..."}
                    </div>

                    {/* Strength Meter */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Strength:</span>
                        <span
                          className={cn(
                            "font-medium px-2 py-0.5 rounded text-xs",
                            strength < 40
                              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                              : strength < 70
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
                                : strength < 90
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
                          )}
                        >
                          {getStrengthText(strength)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            getStrengthColor(strength),
                          )}
                          style={{ width: `${strength}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleCopy}
                        className="flex-1"
                        variant="default"
                        disabled={!password}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Password
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={generatePassword}
                        variant="outline"
                        size="icon"
                        title="Generate New Password"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Security Tips */}
                <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-muted-foreground/10">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    Security Tips
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Use a unique password for every account</li>
                    <li>• Store passwords in a password manager</li>
                    <li>• Enable two-factor authentication when available</li>
                    <li>• Never share passwords via email or messages</li>
                  </ul>
                </div>
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