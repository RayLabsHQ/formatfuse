import React, { useState, useCallback, useEffect } from 'react';
import { 
  Copy, RefreshCw, Check, Lock, Sparkles, Shield, 
  Key, Zap, Info, AlertCircle, Binary
} from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Updated import
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Updated import
import { loadEFFWordlist } from '@/lib/eff-wordlist';
import { cn } from '@/lib/utils';

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
  format: 'hyphen' | 'camelCase' | 'pascalCase' | 'underscore';
  addNumbers: boolean;
  addSymbols: boolean;
}

const CHARACTER_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  similar: 'ilLoO01'
};

const FORMAT_EXAMPLES = {
  hyphen: 'Word-Word-Word',
  camelCase: 'wordWordWord',
  pascalCase: 'WordWordWord',
  underscore: 'word_word_word'
};

export default function PasswordGenerator() {
  const [mode, setMode] = useState<'random' | 'memorable'>('random');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [strength, setStrength] = useState(0);
  
  const [randomOptions, setRandomOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: false
  });
  
  const [memorableOptions, setMemorableOptions] = useState<MemorableOptions>({
    wordCount: 4,
    format: 'hyphen',
    addNumbers: false,
    addSymbols: false
  });
  
  const [effWordlist, setEffWordlist] = useState<string[]>([]);

  useEffect(() => {
    loadEFFWordlist().then(setEffWordlist);
  }, []);

  const calculateStrength = useCallback((password: string, currentMode: 'random' | 'memorable'): number => {
    if (!password) return 0;
    
    if (currentMode === 'memorable') {
      const wordBits = memorableOptions.wordCount * 12.9; // log2(7776)
      let totalBits = wordBits;
      
      if (memorableOptions.addNumbers) totalBits += Math.log2(1000); // Assume 3 digits, ~10 bits
      if (memorableOptions.addSymbols) totalBits += Math.log2(CHARACTER_SETS.symbols.length); // ~5 bits for one symbol
      
      return Math.min(100, Math.max(0, (totalBits / 70) * 100)); // Normalize based on ~70 bits for very strong
    } else {
      let charSetSize = 0;
      if (randomOptions.lowercase) charSetSize += CHARACTER_SETS.lowercase.length;
      if (randomOptions.uppercase) charSetSize += CHARACTER_SETS.uppercase.length;
      if (randomOptions.numbers) charSetSize += CHARACTER_SETS.numbers.length;
      if (randomOptions.symbols) charSetSize += CHARACTER_SETS.symbols.length;
      
      if (randomOptions.excludeSimilar && charSetSize > 0) {
        // Approximate reduction, precise calculation is complex
        let tempCharset = "";
        if (randomOptions.lowercase) tempCharset += CHARACTER_SETS.lowercase;
        if (randomOptions.uppercase) tempCharset += CHARACTER_SETS.uppercase;
        if (randomOptions.numbers) tempCharset += CHARACTER_SETS.numbers;
        if (randomOptions.symbols) tempCharset += CHARACTER_SETS.symbols;
        charSetSize = tempCharset.split('').filter(char => !CHARACTER_SETS.similar.includes(char)).join('').length;
      }
      
      if (charSetSize === 0) return 0;
      const entropy = Math.log2(charSetSize) * password.length;
      
      return Math.min(100, Math.max(0, (entropy / 70) * 100)); // Normalize based on ~70 bits for very strong
    }
  }, [memorableOptions, randomOptions]);

  const generateRandomPassword = useCallback(() => {
    let charset = '';
    if (randomOptions.lowercase) charset += CHARACTER_SETS.lowercase;
    if (randomOptions.uppercase) charset += CHARACTER_SETS.uppercase;
    if (randomOptions.numbers) charset += CHARACTER_SETS.numbers;
    if (randomOptions.symbols) charset += CHARACTER_SETS.symbols;
    
    if (randomOptions.excludeSimilar) {
      charset = charset.split('').filter(char => !CHARACTER_SETS.similar.includes(char)).join('');
    }
    
    if (!charset) {
        setPassword('');
        setStrength(0);
        return '';
    }
    
    const array = new Uint32Array(randomOptions.length);
    crypto.getRandomValues(array);
    
    let newPassword = '';
    for (let i = 0; i < randomOptions.length; i++) {
      newPassword += charset[array[i] % charset.length];
    }
    return newPassword;
  }, [randomOptions]);

  const formatWords = useCallback((words: string[], format: string): string => {
    switch (format) {
      case 'hyphen':
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('-');
      case 'camelCase':
        return words.map((w, i) => 
          i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join('');
      case 'pascalCase':
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      case 'underscore':
        return words.map(w => w.toLowerCase()).join('_');
      default:
        return words.map(w => w.toLowerCase()).join('-');
    }
  }, []);

  const generateMemorablePassword = useCallback(() => {
    if (effWordlist.length === 0) return 'Loading wordlist...';
    
    const array = new Uint32Array(memorableOptions.wordCount);
    crypto.getRandomValues(array);
    
    const words: string[] = [];
    for (let i = 0; i < memorableOptions.wordCount; i++) {
      words.push(effWordlist[array[i] % effWordlist.length]);
    }
    
    let newPassword = formatWords(words, memorableOptions.format);
    
    if (memorableOptions.addNumbers) {
      const numArray = new Uint32Array(1);
      crypto.getRandomValues(numArray);
      newPassword += (numArray[0] % 1000).toString().padStart(3, '0');
    }
    
    if (memorableOptions.addSymbols) {
      const symbolsCharset = '!@#$%&*'; // Reduced set for memorable passwords
      const symArray = new Uint32Array(1);
      crypto.getRandomValues(symArray);
      newPassword += symbolsCharset[symArray[0] % symbolsCharset.length];
    }
    
    return newPassword;
  }, [effWordlist, memorableOptions, formatWords]);

  const generatePassword = useCallback(() => {
    const newPassword = mode === 'random' ? generateRandomPassword() : generateMemorablePassword();
    setPassword(newPassword);
    setStrength(calculateStrength(newPassword, mode));
  }, [mode, generateRandomPassword, generateMemorablePassword, calculateStrength]);

  useEffect(() => {
    generatePassword();
  }, [generatePassword, randomOptions, memorableOptions, mode]); // Rerun if options or mode change

  const handleCopy = useCallback(async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [password]);

  const getStrengthColor = (s: number) => {
    if (s < 40) return 'bg-red-500';
    if (s < 70) return 'bg-yellow-500';
    if (s < 90) return 'bg-green-500';
    return 'bg-blue-500'; // Or a distinct "very strong" color
  };

  const getStrengthText = (s: number) => {
    if (s < 40) return 'Weak';
    if (s < 70) return 'Good';
    if (s < 90) return 'Strong';
    return 'Very Strong';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Password Generator</h1>
        <p className="text-muted-foreground mt-2">
          Create strong, secure, and memorable passwords effortlessly.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generated Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="font-mono text-xl sm:text-2xl break-all select-all p-4 rounded-md bg-muted/50 border min-h-[60px] flex items-center justify-center text-center">
            {password || 'Generating...'}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Strength:</span>
              <span className={cn(
                "font-medium px-2 py-0.5 rounded text-xs",
                strength < 40 ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400" :
                strength < 70 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400" :
                strength < 90 ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" :
                "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
              )}>
                {getStrengthText(strength)}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  getStrengthColor(strength)
                )}
                style={{ width: `${strength}%` }}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={generatePassword}
            className="w-full sm:flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate New
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            className="w-full sm:min-w-[120px]"
            disabled={!password}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Tabs value={mode} onValueChange={(value) => setMode(value as 'random' | 'memorable')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="random">
            <Lock className="w-4 h-4 mr-2" /> Random
          </TabsTrigger>
          <TabsTrigger value="memorable">
            <Sparkles className="w-4 h-4 mr-2" /> Memorable
          </TabsTrigger>
        </TabsList>

        <TabsContent value="random" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Key className="w-5 h-5" /> Random Password Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  onValueChange={([value]) => setRandomOptions(prev => ({ ...prev, length: value }))}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setRandomOptions(prev => ({ ...prev, uppercase: !prev.uppercase }))}
                  className={cn(
                    "relative p-4 rounded-lg border-2 text-left transition-all",
                    "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    randomOptions.uppercase 
                      ? "border-primary bg-primary/5 dark:bg-primary/10" 
                      : "border-muted-foreground/25 hover:border-muted-foreground/40"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">Uppercase</div>
                      <div className="text-sm text-muted-foreground mt-0.5">A-Z</div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      randomOptions.uppercase
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {randomOptions.uppercase && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setRandomOptions(prev => ({ ...prev, lowercase: !prev.lowercase }))}
                  className={cn(
                    "relative p-4 rounded-lg border-2 text-left transition-all",
                    "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    randomOptions.lowercase 
                      ? "border-primary bg-primary/5 dark:bg-primary/10" 
                      : "border-muted-foreground/25 hover:border-muted-foreground/40"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">Lowercase</div>
                      <div className="text-sm text-muted-foreground mt-0.5">a-z</div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      randomOptions.lowercase
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {randomOptions.lowercase && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setRandomOptions(prev => ({ ...prev, numbers: !prev.numbers }))}
                  className={cn(
                    "relative p-4 rounded-lg border-2 text-left transition-all",
                    "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    randomOptions.numbers 
                      ? "border-primary bg-primary/5 dark:bg-primary/10" 
                      : "border-muted-foreground/25 hover:border-muted-foreground/40"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">Numbers</div>
                      <div className="text-sm text-muted-foreground mt-0.5">0-9</div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      randomOptions.numbers
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {randomOptions.numbers && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setRandomOptions(prev => ({ ...prev, symbols: !prev.symbols }))}
                  className={cn(
                    "relative p-4 rounded-lg border-2 text-left transition-all",
                    "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    randomOptions.symbols 
                      ? "border-primary bg-primary/5 dark:bg-primary/10" 
                      : "border-muted-foreground/25 hover:border-muted-foreground/40"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">Symbols</div>
                      <div className="text-sm text-muted-foreground mt-0.5">!@#$%</div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      randomOptions.symbols
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {randomOptions.symbols && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
              </div>
              <Separator />
              <button
                onClick={() => setRandomOptions(prev => ({ ...prev, excludeSimilar: !prev.excludeSimilar }))}
                className={cn(
                  "relative p-4 rounded-lg border-2 text-left transition-all w-full",
                  "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  randomOptions.excludeSimilar 
                    ? "border-primary bg-primary/5 dark:bg-primary/10" 
                    : "border-muted-foreground/25 hover:border-muted-foreground/40"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">Exclude similar characters</div>
                    <div className="text-sm text-muted-foreground mt-0.5">i, l, 1, L, o, 0, O</div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    randomOptions.excludeSimilar
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40"
                  )}>
                    {randomOptions.excludeSimilar && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memorable" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="w-5 h-5" /> Memorable Password Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  onValueChange={([value]) => setMemorableOptions(prev => ({ ...prev, wordCount: value }))}
                  min={3}
                  max={7}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>3</span>
                  <span>7</span>
                </div>
              </div>
              <div>
                <Label htmlFor="format-select" className="mb-2 block">Word Format</Label>
                <Select
                  value={memorableOptions.format}
                  onValueChange={(value) => setMemorableOptions(prev => ({ ...prev, format: value as any }))}
                >
                  <SelectTrigger id="format-select" className="w-full">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FORMAT_EXAMPLES).map(([key, example]) => (
                      <SelectItem key={key} value={key}>
                        <span className="font-mono">{example}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setMemorableOptions(prev => ({ ...prev, addNumbers: !prev.addNumbers }))}
                  className={cn(
                    "relative p-4 rounded-lg border-2 text-left transition-all",
                    "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    memorableOptions.addNumbers 
                      ? "border-primary bg-primary/5 dark:bg-primary/10" 
                      : "border-muted-foreground/25 hover:border-muted-foreground/40"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">Add numbers</div>
                      <div className="text-sm text-muted-foreground mt-0.5">e.g., 123</div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      memorableOptions.addNumbers
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {memorableOptions.addNumbers && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setMemorableOptions(prev => ({ ...prev, addSymbols: !prev.addSymbols }))}
                  className={cn(
                    "relative p-4 rounded-lg border-2 text-left transition-all",
                    "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    memorableOptions.addSymbols 
                      ? "border-primary bg-primary/5 dark:bg-primary/10" 
                      : "border-muted-foreground/25 hover:border-muted-foreground/40"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">Add a symbol</div>
                      <div className="text-sm text-muted-foreground mt-0.5">e.g., !@#</div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      memorableOptions.addSymbols
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {memorableOptions.addSymbols && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
              </div>
              <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700/50">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Uses EFF's long wordlist (7,776 words) for high security.
                  <a href="https://www.eff.org/dice" target="_blank" rel="noopener noreferrer" className="underline font-medium ml-1 hover:text-blue-500 dark:hover:text-blue-200">
                    Learn more
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Info className="w-5 h-5" /> Password Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Use a unique password for every account.</p>
          <p>• Longer passwords are generally stronger. Aim for 16+ characters for random or 4+ words for memorable.</p>
          <p>• Combine uppercase, lowercase, numbers, and symbols for random passwords.</p>
          <p>• All generation happens securely in your browser. No data is sent to any server.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <Shield className="w-8 h-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Privacy First</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            All passwords generated locally. Nothing stored or transmitted.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Binary className="w-8 h-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Secure Randomness</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Uses Web Crypto API for cryptographically strong random numbers.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Zap className="w-8 h-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Instant & Unlimited</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Generate passwords instantly with real-time strength feedback.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}