import React, { useState, useCallback, useEffect } from 'react';
import { 
  Copy, RefreshCw, Check, Lock, Sparkles, Shield, 
  Key, Zap, Info, AlertCircle, Binary
} from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
  
  // Random password options
  const [randomOptions, setRandomOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: false
  });
  
  // Memorable password options
  const [memorableOptions, setMemorableOptions] = useState<MemorableOptions>({
    wordCount: 4,
    format: 'hyphen',
    addNumbers: false,
    addSymbols: false
  });
  
  const [effWordlist, setEffWordlist] = useState<string[]>([]);

  // Load EFF wordlist on mount
  useEffect(() => {
    loadEFFWordlist().then(setEffWordlist);
  }, []);

  // Calculate password strength
  const calculateStrength = useCallback((password: string, mode: 'random' | 'memorable'): number => {
    if (!password) return 0;
    
    if (mode === 'memorable') {
      // Base entropy from word count
      const wordBits = memorableOptions.wordCount * 12.9; // log2(7776)
      let totalBits = wordBits;
      
      if (memorableOptions.addNumbers) totalBits += 10; // 3 digits
      if (memorableOptions.addSymbols) totalBits += 5; // 1-2 symbols
      
      // Convert to percentage (0-100)
      // 50 bits = 80%, 60 bits = 100%
      return Math.min(100, Math.max(0, (totalBits - 20) * 2));
    } else {
      // Character set size
      let charSetSize = 0;
      if (randomOptions.lowercase) charSetSize += 26;
      if (randomOptions.uppercase) charSetSize += 26;
      if (randomOptions.numbers) charSetSize += 10;
      if (randomOptions.symbols) charSetSize += CHARACTER_SETS.symbols.length;
      
      // Calculate entropy
      const entropy = Math.log2(Math.pow(charSetSize, password.length));
      
      // Convert to percentage (0-100)
      // 50 bits = 80%, 60 bits = 100%
      return Math.min(100, Math.max(0, (entropy - 20) * 2));
    }
  }, [memorableOptions, randomOptions]);

  // Generate random password
  const generateRandomPassword = useCallback(() => {
    let charset = '';
    if (randomOptions.lowercase) charset += CHARACTER_SETS.lowercase;
    if (randomOptions.uppercase) charset += CHARACTER_SETS.uppercase;
    if (randomOptions.numbers) charset += CHARACTER_SETS.numbers;
    if (randomOptions.symbols) charset += CHARACTER_SETS.symbols;
    
    // Remove similar characters if requested
    if (randomOptions.excludeSimilar) {
      charset = charset.split('').filter(char => !CHARACTER_SETS.similar.includes(char)).join('');
    }
    
    if (!charset) return '';
    
    const array = new Uint32Array(randomOptions.length);
    crypto.getRandomValues(array);
    
    let password = '';
    for (let i = 0; i < randomOptions.length; i++) {
      password += charset[array[i] % charset.length];
    }
    
    return password;
  }, [randomOptions]);

  // Format words based on selected format
  const formatWords = useCallback((words: string[], format: string): string => {
    switch (format) {
      case 'hyphen':
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
      case 'camelCase':
        return words.map((w, i) => 
          i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join('');
      case 'pascalCase':
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      case 'underscore':
        return words.map(w => w.toLowerCase()).join('_');
      default:
        return words.join('-');
    }
  }, []);

  // Generate memorable password
  const generateMemorablePassword = useCallback(() => {
    if (effWordlist.length === 0) return 'Loading wordlist...';
    
    const array = new Uint32Array(memorableOptions.wordCount);
    crypto.getRandomValues(array);
    
    const words = [];
    for (let i = 0; i < memorableOptions.wordCount; i++) {
      const word = effWordlist[array[i] % effWordlist.length];
      words.push(word);
    }
    
    let password = formatWords(words, memorableOptions.format);
    
    // Add numbers if requested
    if (memorableOptions.addNumbers) {
      const numArray = new Uint32Array(1);
      crypto.getRandomValues(numArray);
      const number = numArray[0] % 10000;
      password += number.toString();
    }
    
    // Add symbols if requested
    if (memorableOptions.addSymbols) {
      const symbols = '!@#$%&*';
      const symArray = new Uint32Array(1);
      crypto.getRandomValues(symArray);
      password += symbols[symArray[0] % symbols.length];
    }
    
    return password;
  }, [effWordlist, memorableOptions, formatWords]);

  // Generate password based on mode
  const generatePassword = useCallback(() => {
    const newPassword = mode === 'random' ? generateRandomPassword() : generateMemorablePassword();
    setPassword(newPassword);
    
    const newStrength = calculateStrength(newPassword, mode);
    setStrength(newStrength);
  }, [mode, generateRandomPassword, generateMemorablePassword, calculateStrength]);

  // Auto-generate on mount and when options change
  useEffect(() => {
    generatePassword();
  }, [generatePassword]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [password]);

  // Get strength color
  const getStrengthColor = (strength: number) => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get strength text
  const getStrengthText = (strength: number) => {
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Good';
    if (strength < 90) return 'Strong';
    return 'Very Strong';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Password Generator</h1>
        <p className="text-muted-foreground">
          Generate secure passwords with customizable options
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="mb-6">
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setMode('random')}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg font-medium transition-colors",
              mode === 'random'
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            <Lock className="w-4 h-4 inline-block mr-2" />
            Random
          </button>
          <button
            onClick={() => setMode('memorable')}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg font-medium transition-colors",
              mode === 'memorable'
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            <Sparkles className="w-4 h-4 inline-block mr-2" />
            Memorable
          </button>
        </div>
      </div>

      {/* Password Display */}
      <div className="p-6 rounded-lg border hover:bg-secondary/50 transition-colors">
        <div className="mb-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Generated Password</Label>
          <div className="font-mono text-2xl break-all mb-4 select-all p-4 rounded-lg bg-secondary/30">
            {password || 'Click generate to create a password'}
          </div>
        </div>
        
        <div className="flex gap-3 mb-4">
          <Button
            onClick={generatePassword}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate New
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            className="min-w-[100px]"
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
        </div>

        {/* Strength Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Password Strength</span>
            <span className={cn(
              "font-medium px-2 py-0.5 rounded text-xs",
              strength < 40 ? "bg-red-500/20 text-red-700 dark:text-red-400" :
              strength < 70 ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" :
              strength < 90 ? "bg-green-500/20 text-green-700 dark:text-green-400" :
              "bg-blue-500/20 text-blue-700 dark:text-blue-400"
            )}>
              {getStrengthText(strength)}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                getStrengthColor(strength)
              )}
              style={{ width: `${strength}%` }}
            />
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="p-6 rounded-lg border bg-secondary/30">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Key className="w-4 h-4" />
          Password Options
        </h3>
        {mode === 'random' ? (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Password Length</Label>
                <span className="text-sm font-medium bg-secondary px-2 py-1 rounded">
                  {randomOptions.length} characters
                </span>
              </div>
              <Slider
                value={[randomOptions.length]}
                onValueChange={([value]) => setRandomOptions({ ...randomOptions, length: value })}
                min={12}
                max={32}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>12</span>
                <span>32</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="uppercase" className="cursor-pointer">
                  Uppercase (A-Z)
                </Label>
                <Switch
                  id="uppercase"
                  checked={randomOptions.uppercase}
                  onCheckedChange={(checked) => setRandomOptions({ ...randomOptions, uppercase: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="lowercase" className="cursor-pointer">
                  Lowercase (a-z)
                </Label>
                <Switch
                  id="lowercase"
                  checked={randomOptions.lowercase}
                  onCheckedChange={(checked) => setRandomOptions({ ...randomOptions, lowercase: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="numbers" className="cursor-pointer">
                  Numbers (0-9)
                </Label>
                <Switch
                  id="numbers"
                  checked={randomOptions.numbers}
                  onCheckedChange={(checked) => setRandomOptions({ ...randomOptions, numbers: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="symbols" className="cursor-pointer">
                  Symbols (!@#$%)
                </Label>
                <Switch
                  id="symbols"
                  checked={randomOptions.symbols}
                  onCheckedChange={(checked) => setRandomOptions({ ...randomOptions, symbols: checked })}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="exclude-similar" className="cursor-pointer">
                Exclude similar characters (il1Lo0O)
              </Label>
              <Switch
                id="exclude-similar"
                checked={randomOptions.excludeSimilar}
                onCheckedChange={(checked) => setRandomOptions({ ...randomOptions, excludeSimilar: checked })}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Number of Words</Label>
                <span className="text-sm font-medium bg-secondary px-2 py-1 rounded">
                  {memorableOptions.wordCount} words
                </span>
              </div>
              <Slider
                value={[memorableOptions.wordCount]}
                onValueChange={([value]) => setMemorableOptions({ ...memorableOptions, wordCount: value })}
                min={3}
                max={6}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>3</span>
                <span>6</span>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Format</Label>
              <Select
                value={memorableOptions.format}
                onValueChange={(value) => setMemorableOptions({ ...memorableOptions, format: value as any })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="add-numbers" className="cursor-pointer">
                  Add numbers
                </Label>
                <Switch
                  id="add-numbers"
                  checked={memorableOptions.addNumbers}
                  onCheckedChange={(checked) => setMemorableOptions({ ...memorableOptions, addNumbers: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="add-symbols" className="cursor-pointer">
                  Add symbols
                </Label>
                <Switch
                  id="add-symbols"
                  checked={memorableOptions.addSymbols}
                  onCheckedChange={(checked) => setMemorableOptions({ ...memorableOptions, addSymbols: checked })}
                />
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm">
                Using the EFF's wordlist with 7,776 words for maximum security. 
                <a href="https://www.eff.org/dice" target="_blank" rel="noopener noreferrer" className="underline ml-1 hover:text-primary">
                  Learn more
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Information Section */}
      <div className="mt-8 p-4 rounded-lg border bg-secondary/30">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">About Password Security</h3>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Random passwords</strong> use cryptographically secure random generation
          </p>
          <p>
            • <strong>Memorable passwords</strong> use EFF's wordlist for high entropy with memorability
          </p>
          <p>
            • <strong>16+ characters</strong> recommended for most accounts
          </p>
          <p>
            • All generation happens locally in your browser - no passwords are sent to any server
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border">
          <Shield className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Privacy First</h3>
          <p className="text-sm text-muted-foreground">
            All passwords are generated locally in your browser. Nothing is stored or transmitted.
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <Binary className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Cryptographically Secure</h3>
          <p className="text-sm text-muted-foreground">
            Uses Web Crypto API for true randomness, not predictable Math.random().
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <Zap className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Instant Generation</h3>
          <p className="text-sm text-muted-foreground">
            Generate unlimited passwords instantly with real-time strength analysis.
          </p>
        </div>
      </div>
    </div>
  );
}