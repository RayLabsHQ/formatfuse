import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Copy, RefreshCw, Check, Lock, Settings2, AlertCircle, Shield, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
}

interface GeneratedPassword {
  id: string;
  password: string;
  strength: number;
  timestamp: number;
}

const CHARACTER_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-={}[]|:";\'<>?,./~`',
  similar: 'ilLoO01',
  ambiguous: '{}[]()\/\'"~,;.<>'
};

export default function PasswordGenerator() {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false,
    excludeSimilar: false,
    excludeAmbiguous: false
  });
  
  const [passwords, setPasswords] = useState<GeneratedPassword[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [bulkCount, setBulkCount] = useState(1);
  const [showBulk, setShowBulk] = useState(false);

  // Calculate password strength
  const calculateStrength = useCallback((password: string): number => {
    let strength = 0;
    
    // Length score (0-25 points)
    strength += Math.min(password.length * 1.5, 25);
    
    // Character variety score (0-25 points each)
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 25;
    
    // Deduct for patterns
    if (/(.)\1{2,}/.test(password)) strength -= 10; // Repeated characters
    if (/^[a-zA-Z]+$/.test(password)) strength -= 10; // Only letters
    if (/^[0-9]+$/.test(password)) strength -= 10; // Only numbers
    
    return Math.max(0, Math.min(100, strength));
  }, []);

  // Build character set based on options
  const characterSet = useMemo(() => {
    let chars = '';
    
    if (options.uppercase) chars += CHARACTER_SETS.uppercase;
    if (options.lowercase) chars += CHARACTER_SETS.lowercase;
    if (options.numbers) chars += CHARACTER_SETS.numbers;
    if (options.symbols) chars += CHARACTER_SETS.symbols;
    
    if (options.excludeSimilar) {
      chars = chars.split('').filter(c => !CHARACTER_SETS.similar.includes(c)).join('');
    }
    
    if (options.excludeAmbiguous) {
      chars = chars.split('').filter(c => !CHARACTER_SETS.ambiguous.includes(c)).join('');
    }
    
    return chars;
  }, [options]);

  // Generate a single password
  const generatePassword = useCallback((): string => {
    if (characterSet.length === 0) return '';
    
    const array = new Uint32Array(options.length);
    crypto.getRandomValues(array);
    
    let password = '';
    for (let i = 0; i < options.length; i++) {
      password += characterSet[array[i] % characterSet.length];
    }
    
    // Ensure at least one character from each selected type
    const requiredChars: string[] = [];
    if (options.uppercase && !/[A-Z]/.test(password)) {
      requiredChars.push(CHARACTER_SETS.uppercase[Math.floor(Math.random() * CHARACTER_SETS.uppercase.length)]);
    }
    if (options.lowercase && !/[a-z]/.test(password)) {
      requiredChars.push(CHARACTER_SETS.lowercase[Math.floor(Math.random() * CHARACTER_SETS.lowercase.length)]);
    }
    if (options.numbers && !/[0-9]/.test(password)) {
      requiredChars.push(CHARACTER_SETS.numbers[Math.floor(Math.random() * CHARACTER_SETS.numbers.length)]);
    }
    if (options.symbols && !/[^a-zA-Z0-9]/.test(password)) {
      requiredChars.push(CHARACTER_SETS.symbols[Math.floor(Math.random() * CHARACTER_SETS.symbols.length)]);
    }
    
    // Replace random positions with required characters
    if (requiredChars.length > 0) {
      const positions = new Set<number>();
      while (positions.size < requiredChars.length) {
        positions.add(Math.floor(Math.random() * password.length));
      }
      
      let passwordArray = password.split('');
      let i = 0;
      positions.forEach(pos => {
        passwordArray[pos] = requiredChars[i++];
      });
      password = passwordArray.join('');
    }
    
    return password;
  }, [characterSet, options]);

  // Generate passwords
  const handleGenerate = useCallback(() => {
    const count = showBulk ? bulkCount : 1;
    const newPasswords: GeneratedPassword[] = [];
    
    for (let i = 0; i < count; i++) {
      const password = generatePassword();
      if (password) {
        newPasswords.push({
          id: Date.now().toString() + i,
          password,
          strength: calculateStrength(password),
          timestamp: Date.now()
        });
      }
    }
    
    setPasswords(showBulk ? [...newPasswords, ...passwords].slice(0, 100) : newPasswords);
  }, [generatePassword, calculateStrength, showBulk, bulkCount, passwords]);

  // Generate initial password on mount
  useEffect(() => {
    handleGenerate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = useCallback(async (password: string, id: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleCopyAll = useCallback(async () => {
    const allPasswords = passwords.map(p => p.password).join('\n');
    try {
      await navigator.clipboard.writeText(allPasswords);
      setCopied('all');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [passwords]);

  const handleDownload = useCallback(() => {
    const content = passwords.map(p => p.password).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passwords-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [passwords]);

  const getStrengthColor = (strength: number) => {
    if (strength < 30) return 'text-red-600 dark:text-red-400';
    if (strength < 60) return 'text-orange-600 dark:text-orange-400';
    if (strength < 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getStrengthText = (strength: number) => {
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };

  const isValidConfig = options.uppercase || options.lowercase || options.numbers || options.symbols;

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <div className="p-1.5 sm:p-2 bg-primary/10 text-primary rounded-lg">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          Password Generator
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground px-2">
          Generate secure, random passwords with customizable options
        </p>
      </div>

      {/* Main Password Display - Mobile optimized */}
      {passwords.length > 0 && !showBulk && (
        <div className="mb-6 p-4 sm:p-6 rounded-lg border bg-card">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <code className="text-base sm:text-xl font-mono break-all flex-1">
                {passwords[0].password}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCopy(passwords[0].password, passwords[0].id)}
                className="h-8 w-8 sm:h-10 sm:w-10 shrink-0"
              >
                {copied === passwords[0].id ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </Button>
            </div>
            
            {/* Password Strength Indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Strength:</span>
                <span className={`font-medium ${getStrengthColor(passwords[0].strength)}`}>
                  {getStrengthText(passwords[0].strength)} ({passwords[0].strength}%)
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    passwords[0].strength < 30 ? 'bg-red-600' :
                    passwords[0].strength < 60 ? 'bg-orange-600' :
                    passwords[0].strength < 80 ? 'bg-yellow-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${passwords[0].strength}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings - Mobile optimized */}
      <div className="mb-6 p-3 sm:p-4 rounded-lg border bg-card space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm sm:text-base">Password Options</h2>
        </div>

        {/* Length Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="length" className="text-sm">Password Length</Label>
            <span className="text-sm font-medium px-2 py-1 bg-secondary rounded">
              {options.length}
            </span>
          </div>
          <Slider
            id="length"
            value={[options.length]}
            onValueChange={(value) => setOptions({ ...options, length: value[0] })}
            min={4}
            max={64}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>4</span>
            <span>64</span>
          </div>
        </div>

        <Separator />

        {/* Character Types */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Character Types</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="uppercase" className="text-sm cursor-pointer">
                Uppercase (A-Z)
              </Label>
              <Switch
                id="uppercase"
                checked={options.uppercase}
                onCheckedChange={(checked) => setOptions({ ...options, uppercase: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="lowercase" className="text-sm cursor-pointer">
                Lowercase (a-z)
              </Label>
              <Switch
                id="lowercase"
                checked={options.lowercase}
                onCheckedChange={(checked) => setOptions({ ...options, lowercase: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="numbers" className="text-sm cursor-pointer">
                Numbers (0-9)
              </Label>
              <Switch
                id="numbers"
                checked={options.numbers}
                onCheckedChange={(checked) => setOptions({ ...options, numbers: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="symbols" className="text-sm cursor-pointer">
                Symbols (!@#$...)
              </Label>
              <Switch
                id="symbols"
                checked={options.symbols}
                onCheckedChange={(checked) => setOptions({ ...options, symbols: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Advanced Options */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Advanced Options</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="similar" className="text-sm cursor-pointer">
                Exclude Similar (il1Lo0O)
              </Label>
              <Switch
                id="similar"
                checked={options.excludeSimilar}
                onCheckedChange={(checked) => setOptions({ ...options, excludeSimilar: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ambiguous" className="text-sm cursor-pointer">
                Exclude Ambiguous ({}[]()\/'"~,;.&lt;&gt;)
              </Label>
              <Switch
                id="ambiguous"
                checked={options.excludeAmbiguous}
                onCheckedChange={(checked) => setOptions({ ...options, excludeAmbiguous: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Bulk Generation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Switch
              id="bulk"
              checked={showBulk}
              onCheckedChange={setShowBulk}
            />
            <Label htmlFor="bulk" className="text-sm cursor-pointer">
              Bulk Generation
            </Label>
          </div>
          
          {showBulk && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label htmlFor="count" className="text-sm whitespace-nowrap">Count:</Label>
              <input
                id="count"
                type="number"
                min="1"
                max="50"
                value={bulkCount}
                onChange={(e) => setBulkCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-20 h-8 sm:h-9 px-2 rounded-md border bg-background text-sm"
              />
            </div>
          )}
        </div>

        {!isValidConfig && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-sm">Please select at least one character type</p>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="mb-6 flex justify-center">
        <Button
          onClick={handleGenerate}
          size="lg"
          disabled={!isValidConfig}
          className="w-full sm:w-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Password{showBulk ? 's' : ''}
        </Button>
      </div>

      {/* Bulk Passwords List - Mobile optimized */}
      {showBulk && passwords.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm sm:text-base">Generated Passwords</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAll}
                className="text-xs sm:text-sm"
              >
                {copied === 'all' ? (
                  <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-1" />
                )}
                Copy All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="text-xs sm:text-sm"
              >
                Download
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {passwords.map((item) => (
              <div
                key={item.id}
                className="p-2 sm:p-3 rounded-lg border bg-card flex items-center justify-between gap-2 group hover:bg-accent/5 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <code className="text-xs sm:text-sm font-mono break-all">
                    {item.password}
                  </code>
                  <div className="flex items-center gap-2">
                    <div className={`text-xs ${getStrengthColor(item.strength)}`}>
                      {getStrengthText(item.strength)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(item.password, item.id)}
                  className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                >
                  {copied === item.id ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tips - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Cryptographically Secure</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Uses Web Crypto API for true randomness
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Privacy First</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Generated entirely in your browser, never sent anywhere
          </p>
        </div>
      </div>
    </div>
  );
}