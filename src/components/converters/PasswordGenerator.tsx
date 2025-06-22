import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Copy, RefreshCw, Check, Lock, Sparkles, Shield, ShieldCheck, 
  Zap, Wifi, CreditCard, Mail, Gamepad2, Building, Eye, EyeOff,
  AlertTriangle, ShieldAlert, Shuffle, Timer, Dices, Brain,
  Settings, Home, Info, User, Flame, ExternalLink
} from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import confetti from 'canvas-confetti';
import { loadEFFWordlist, calculatePassphraseEntropy, getEntropyRating, formatLargeNumber } from '@/lib/eff-wordlist';

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
  preset?: string;
  type: 'random' | 'memorable';
}

interface Preset {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  options: PasswordOptions;
}

interface MemorablePreset {
  id: string;
  name: string;
  icon: React.ElementType;
  wordCount: number;
  description: string;
  entropyBits: number;
}

const CHARACTER_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-={}[]|:";\'<>?,./~`',
  similar: 'ilLoO01',
  ambiguous: '{}[]()\/\'"~,;.<>'
};

const PRESETS: Preset[] = [
  {
    id: 'pin',
    name: 'PIN Code',
    icon: CreditCard,
    color: 'text-blue-500',
    options: { length: 4, uppercase: false, lowercase: false, numbers: true, symbols: false, excludeSimilar: false, excludeAmbiguous: false }
  },
  {
    id: 'wifi',
    name: 'WiFi Password',
    icon: Wifi,
    color: 'text-green-500',
    options: { length: 12, uppercase: true, lowercase: true, numbers: true, symbols: false, excludeSimilar: true, excludeAmbiguous: true }
  },
  {
    id: 'email',
    name: 'Email Account',
    icon: Mail,
    color: 'text-purple-500',
    options: { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true, excludeSimilar: false, excludeAmbiguous: true }
  },
  {
    id: 'banking',
    name: 'Banking',
    icon: Building,
    color: 'text-orange-500',
    options: { length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true, excludeSimilar: true, excludeAmbiguous: true }
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: Gamepad2,
    color: 'text-pink-500',
    options: { length: 14, uppercase: true, lowercase: true, numbers: true, symbols: false, excludeSimilar: false, excludeAmbiguous: false }
  },
  {
    id: 'maximum',
    name: 'Maximum Security',
    icon: ShieldAlert,
    color: 'text-red-500',
    options: { length: 32, uppercase: true, lowercase: true, numbers: true, symbols: true, excludeSimilar: false, excludeAmbiguous: false }
  }
];

// Separators for passphrases
const SEPARATORS = ['-', '_', '.', ':', '~', '+', '=', '#'];

const MEMORABLE_PRESETS: MemorablePreset[] = [
  {
    id: 'basic',
    name: '3 Words (Good)',
    icon: User,
    wordCount: 3,
    description: 'apple-wisdom-crystal',
    entropyBits: 38.8 // log2(7776^3)
  },
  {
    id: 'strong',
    name: '4 Words (Strong)',
    icon: Shield,
    wordCount: 4,
    description: 'valley-bronze-theory-cosmic',
    entropyBits: 51.7 // log2(7776^4)
  },
  {
    id: 'extra',
    name: '5 Words (Extra Strong)',
    icon: ShieldAlert,
    wordCount: 5,
    description: 'phoenix-quantum-marble-saturn-echo',
    entropyBits: 64.6 // log2(7776^5)
  },
  {
    id: 'maximum',
    name: '6 Words (Maximum)',
    icon: Flame,
    wordCount: 6,
    description: 'nebula-crystal-vertex-plasma-orbit-fusion',
    entropyBits: 77.5 // log2(7776^6)
  }
];

// Strength mascot expressions
const getStrengthEmoji = (strength: number) => {
  if (strength < 20) return '😰';
  if (strength < 40) return '😟';
  if (strength < 60) return '😐';
  if (strength < 80) return '😊';
  return '💪';
};

const getStrengthMessage = (strength: number) => {
  if (strength < 20) return 'Very weak - A toddler could crack this!';
  if (strength < 40) return 'Weak - Your cat walking on keyboard is stronger';
  if (strength < 60) return 'Fair - Getting there, but needs more oomph';
  if (strength < 80) return 'Good - Now we\'re talking!';
  return 'Excellent - Hacker\'s nightmare!';
};

export default function PasswordGenerator() {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [passwordType, setPasswordType] = useState<'random' | 'memorable'>('random');
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
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkMode, setBulkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentPreset, setRecentPreset] = useState<string | null>(null);
  const [memorablePreset, setMemorablePreset] = useState<string>('strong');
  const [lengthInput, setLengthInput] = useState(options.length.toString());
  const [sessionPasswords, setSessionPasswords] = useState<GeneratedPassword[]>([]);
  const [effWordlist, setEffWordlist] = useState<string[]>([]);
  const [wordlistLoaded, setWordlistLoaded] = useState(false);
  const [separator, setSeparator] = useState('-');
  const [capitalizeWords, setCapitalizeWords] = useState(true);
  const [addNumbers, setAddNumbers] = useState(false);

  // Calculate password strength with more nuanced scoring
  const calculateStrength = useCallback((password: string, type: 'random' | 'memorable' = 'random'): number => {
    // For memorable passwords, use entropy-based calculation
    if (type === 'memorable') {
      const preset = MEMORABLE_PRESETS.find(p => p.id === memorablePreset);
      if (preset) {
        const baseEntropy = preset.entropyBits;
        // Add entropy for additional options
        let totalEntropy = baseEntropy;
        if (capitalizeWords) totalEntropy += 1; // Minor increase
        if (addNumbers) totalEntropy += 13; // log2(10000) ≈ 13 bits
        
        // Convert entropy to strength percentage
        // 40 bits = 50%, 80 bits = 100%
        const strength = Math.min(100, Math.max(0, (totalEntropy - 20) * 1.25));
        return Math.round(strength);
      }
    }
    
    // For random passwords, use the original calculation
    let strength = 0;
    
    // Base length score (0-30 points)
    strength += Math.min(password.length * 1.5, 30);
    
    // Character variety score (0-20 points each)
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);
    
    if (hasLower) strength += 15;
    if (hasUpper) strength += 15;
    if (hasNumber) strength += 15;
    if (hasSymbol) strength += 20;
    
    // Bonus for mixing (0-15 points)
    const varieties = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
    if (varieties >= 3) strength += 10;
    if (varieties === 4) strength += 5;
    
    // Penalties
    if (/(.)\1{2,}/.test(password)) strength -= 10; // Repeated characters
    if (/^[a-zA-Z]+$/.test(password)) strength -= 10; // Only letters
    if (/^[0-9]+$/.test(password)) strength -= 20; // Only numbers
    if (password.length < 8) strength -= 20; // Too short
    
    return Math.max(0, Math.min(100, strength));
  }, [memorablePreset, capitalizeWords, addNumbers]);

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

  // Load EFF wordlist on mount
  useEffect(() => {
    loadEFFWordlist().then(words => {
      setEffWordlist(words);
      setWordlistLoaded(true);
    });
  }, []);

  // Generate memorable password using EFF wordlist
  const generateMemorablePassword = useCallback((presetId: string): string => {
    const preset = MEMORABLE_PRESETS.find(p => p.id === presetId);
    if (!preset || effWordlist.length === 0) return '';
    
    const words: string[] = [];
    
    // Select random words from EFF wordlist
    for (let i = 0; i < preset.wordCount; i++) {
      const randomIndex = Math.floor(Math.random() * effWordlist.length);
      let word = effWordlist[randomIndex];
      
      // Capitalize if option is enabled
      if (capitalizeWords) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      
      words.push(word);
    }
    
    // Join with separator
    let password = words.join(separator);
    
    // Add numbers if enabled
    if (addNumbers) {
      password += separator + Math.floor(Math.random() * 9000 + 1000);
    }
    
    return password;
  }, [effWordlist, separator, capitalizeWords, addNumbers]);

  // Generate a single password
  const generatePassword = useCallback((): string => {
    if (passwordType === 'memorable') {
      return generateMemorablePassword(memorablePreset);
    }
    
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
  }, [characterSet, options, passwordType, memorablePreset, generateMemorablePassword]);

  // Generate passwords with animation
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    
    // Small delay for animation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const count = bulkMode ? bulkCount : 1;
    const newPasswords: GeneratedPassword[] = [];
    
    for (let i = 0; i < count; i++) {
      const password = generatePassword();
      if (password) {
        const strength = calculateStrength(password, passwordType);
        newPasswords.push({
          id: Date.now().toString() + i,
          password,
          strength,
          timestamp: Date.now(),
          preset: recentPreset || undefined,
          type: passwordType
        });
        
        // Celebrate strong passwords!
        if (!bulkMode && strength >= 80) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#10b981', '#3b82f6', '#8b5cf6']
          });
        }
      }
    }
    
    setPasswords(bulkMode ? newPasswords : newPasswords);
    
    // Add to session history (keep last 10)
    setSessionPasswords(prev => [...newPasswords, ...prev].slice(0, 10));
    
    setIsGenerating(false);
    setRecentPreset(null);
  }, [generatePassword, calculateStrength, bulkMode, bulkCount, recentPreset, passwordType]);

  // Apply preset
  const applyPreset = useCallback((preset: Preset) => {
    setOptions(preset.options);
    setLengthInput(preset.options.length.toString());
    setRecentPreset(preset.id);
    setBulkMode(false);
    setPasswordType('random');
    // Auto-generate with preset
    setTimeout(() => handleGenerate(), 100);
  }, [handleGenerate]);

  // Handle length input change
  const handleLengthInputChange = (value: string) => {
    const num = parseInt(value) || 0;
    if (num >= 4 && num <= 128) {
      setLengthInput(value);
      setOptions({ ...options, length: num });
    }
  };

  // Handle length slider change
  const handleLengthSliderChange = (value: number[]) => {
    setOptions({ ...options, length: value[0] });
    setLengthInput(value[0].toString());
  };

  // Generate initial password on mount
  useEffect(() => {
    handleGenerate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = useCallback(async (password: string, id: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(id);
      
      // Fun copy animation
      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.7 },
        colors: ['#10b981']
      });
      
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const getStrengthColor = (strength: number) => {
    if (strength < 20) return 'text-red-600 dark:text-red-400';
    if (strength < 40) return 'text-orange-600 dark:text-orange-400';
    if (strength < 60) return 'text-yellow-600 dark:text-yellow-400';
    if (strength < 80) return 'text-blue-600 dark:text-blue-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getStrengthGradient = (strength: number) => {
    if (strength < 20) return 'from-red-500 to-red-600';
    if (strength < 40) return 'from-orange-500 to-orange-600';
    if (strength < 60) return 'from-yellow-500 to-yellow-600';
    if (strength < 80) return 'from-blue-500 to-blue-600';
    return 'from-green-500 to-green-600';
  };

  const isValidConfig = passwordType === 'memorable' || options.uppercase || options.lowercase || options.numbers || options.symbols;

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <div className="p-1.5 sm:p-2 bg-primary/10 text-primary rounded-lg">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          Password Generator
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground px-2">
          Create strong, unique passwords with style
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-lg border bg-muted p-1">
          <Button
            variant={activeTab === 'basic' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('basic')}
            className="rounded-md"
          >
            <Home className="w-4 h-4 mr-2" />
            Basic
          </Button>
          <Button
            variant={activeTab === 'advanced' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('advanced')}
            className="rounded-md"
          >
            <Settings className="w-4 h-4 mr-2" />
            Advanced
          </Button>
        </div>
      </div>

      {/* Quick Presets - Mobile optimized */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Quick Presets</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                className={`h-auto py-2 px-3 flex flex-col items-center gap-1 hover:border-primary transition-all ${
                  recentPreset === preset.id ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <Icon className={`w-4 h-4 ${preset.color}`} />
                <span className="text-xs">{preset.name}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Main Password Display - Enhanced */}
      {passwords.length > 0 && !bulkMode && (
        <div className="mb-6 relative">
          <div className={`absolute inset-0 bg-gradient-to-r ${getStrengthGradient(passwords[0].strength)} opacity-5 rounded-lg`} />
          <div className="relative p-4 sm:p-6 rounded-lg border bg-card">
            <div className="space-y-4">
              {/* Password with visibility toggle */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <code className={`text-base sm:text-xl lg:text-2xl font-mono break-all ${!showPassword ? 'blur-sm select-none' : ''}`}>
                    {passwords[0].password}
                  </code>
                  {!showPassword && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm text-muted-foreground">Hidden</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="h-8 w-8 sm:h-10 sm:w-10"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(passwords[0].password, passwords[0].id)}
                  className="h-8 w-8 sm:h-10 sm:w-10"
                >
                  {copied === passwords[0].id ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </Button>
              </div>
              
              {/* Enhanced Strength Indicator */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getStrengthEmoji(passwords[0].strength)}</span>
                    <span className={`text-sm font-medium ${getStrengthColor(passwords[0].strength)}`}>
                      {passwords[0].strength}% Strong
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwords[0].type === 'memorable' && (
                      <>
                        <span className="text-xs bg-purple-500/10 text-purple-500 px-2 py-1 rounded flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          Memorable
                        </span>
                        {(() => {
                          const preset = MEMORABLE_PRESETS.find(p => p.id === memorablePreset);
                          if (preset) {
                            let totalEntropy = preset.entropyBits;
                            if (capitalizeWords) totalEntropy += 1;
                            if (addNumbers) totalEntropy += 13;
                            const rating = getEntropyRating(totalEntropy);
                            return (
                              <span className={`text-xs ${rating.color}`}>
                                {totalEntropy.toFixed(1)} bits entropy
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </>
                    )}
                    {passwords[0].preset && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {PRESETS.find(p => p.id === passwords[0].preset)?.name}
                      </span>
                    )}
                  </div>
                </div>
                <Progress value={passwords[0].strength} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {getStrengthMessage(passwords[0].strength)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'basic' ? (
        /* Basic Tab - Simplified Options */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Type Selection */}
          <div className="space-y-6">
            {/* Password Type Selection */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-purple-500" />
                <Label className="text-sm font-medium">Password Type</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={passwordType === 'random' ? 'default' : 'outline'}
                  onClick={() => setPasswordType('random')}
                  className="h-auto py-3 flex flex-col items-center gap-2"
                >
                  <Dices className="w-5 h-5" />
                  <span className="text-sm">Random</span>
                  <span className="text-xs text-muted-foreground">Maximum security</span>
                </Button>
                <Button
                  variant={passwordType === 'memorable' ? 'default' : 'outline'}
                  onClick={() => setPasswordType('memorable')}
                  className="h-auto py-3 flex flex-col items-center gap-2"
                >
                  <Brain className="w-5 h-5" />
                  <span className="text-sm">Memorable</span>
                  <span className="text-xs text-muted-foreground">Easy to remember</span>
                </Button>
              </div>
            </div>

            {/* Memorable Pattern Selection */}
            {passwordType === 'memorable' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Passphrase Strength</Label>
                    <a 
                      href="https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      EFF Wordlist
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="space-y-2">
                    {MEMORABLE_PRESETS.map((preset) => {
                      const Icon = preset.icon;
                      const entropyRating = getEntropyRating(preset.entropyBits);
                      const possibleCombinations = Math.pow(7776, preset.wordCount);
                      return (
                        <Button
                          key={preset.id}
                          variant={memorablePreset === preset.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMemorablePreset(preset.id)}
                          className="w-full justify-start h-auto py-3"
                        >
                          <Icon className="w-4 h-4 mr-2 shrink-0" />
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{preset.name}</span>
                              <span className={`text-xs ${entropyRating.color}`}>
                                {preset.entropyBits} bits
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">{preset.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatLargeNumber(possibleCombinations)} combinations
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                  {!wordlistLoaded && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Loading EFF wordlist...
                    </p>
                  )}
                </div>
                
                {/* Memorable Options */}
                <div className="p-4 rounded-lg border bg-card">
                  <Label className="text-sm font-medium mb-3 block">Passphrase Options</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="capitalize" className="text-sm cursor-pointer">
                        Capitalize Words
                      </Label>
                      <Switch
                        id="capitalize"
                        checked={capitalizeWords}
                        onCheckedChange={setCapitalizeWords}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="add-numbers" className="text-sm cursor-pointer">
                        Add Numbers
                      </Label>
                      <Switch
                        id="add-numbers"
                        checked={addNumbers}
                        onCheckedChange={setAddNumbers}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="separator" className="text-sm">Word Separator</Label>
                      <Select value={separator} onValueChange={setSeparator}>
                        <SelectTrigger id="separator" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEPARATORS.map(sep => (
                            <SelectItem key={sep} value={sep}>{sep}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Basic Options */}
          <div className="space-y-6">
            {passwordType === 'random' && (
              <>
                {/* Length Control */}
                <div className="p-4 rounded-lg border bg-card">
                  <Label className="text-sm font-medium mb-3 block">Password Length</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[options.length]}
                      onValueChange={handleLengthSliderChange}
                      min={8}
                      max={32}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-mono text-sm font-medium">
                      {options.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Weak</span>
                    <span>Strong</span>
                  </div>
                </div>

                {/* Character Types - Simplified */}
                <div className="p-4 rounded-lg border bg-card">
                  <Label className="text-sm font-medium mb-3 block">Include Characters</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="basic-letters" className="text-sm cursor-pointer">
                        Letters (Aa)
                      </Label>
                      <Switch
                        id="basic-letters"
                        checked={options.uppercase && options.lowercase}
                        onCheckedChange={(checked) => {
                          setOptions({ 
                            ...options, 
                            uppercase: checked, 
                            lowercase: checked 
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="basic-numbers" className="text-sm cursor-pointer">
                        Numbers (123)
                      </Label>
                      <Switch
                        id="basic-numbers"
                        checked={options.numbers}
                        onCheckedChange={(checked) => setOptions({ ...options, numbers: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="basic-symbols" className="text-sm cursor-pointer">
                        Symbols (!@#)
                      </Label>
                      <Switch
                        id="basic-symbols"
                        checked={options.symbols}
                        onCheckedChange={(checked) => setOptions({ ...options, symbols: checked })}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Info Box */}
            <div className="p-4 rounded-lg border bg-primary/5">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {passwordType === 'random' ? 'Random passwords' : 'Memorable passphrases'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {passwordType === 'random' 
                      ? 'Use completely random characters for maximum security. Perfect for password managers.'
                      : 'Uses EFF\'s curated list of 7,776 words. Even 4 words gives 3.7 × 10¹⁵ combinations - practically uncrackable.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Advanced Tab - All Options */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Length & Type */}
          <div className="space-y-6">
            {/* Password Type */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-purple-500" />
                <Label className="text-sm font-medium">Password Type</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={passwordType === 'random' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPasswordType('random')}
                  className="h-auto py-2"
                >
                  <Dices className="w-4 h-4 mr-1" />
                  Random
                </Button>
                <Button
                  variant={passwordType === 'memorable' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPasswordType('memorable')}
                  className="h-auto py-2"
                >
                  <Brain className="w-4 h-4 mr-1" />
                  Memorable
                </Button>
              </div>

              {passwordType === 'memorable' && (
                <div className="mt-4 space-y-2">
                  {MEMORABLE_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      variant={memorablePreset === preset.id ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setMemorablePreset(preset.id)}
                      className="w-full justify-start text-xs"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Length Control */}
            {passwordType === 'random' && (
              <div className="p-4 rounded-lg border bg-card">
                <Label className="text-sm font-medium mb-3 block">Password Length</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Slider
                      value={[options.length]}
                      onValueChange={handleLengthSliderChange}
                      min={4}
                      max={64}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <input
                    type="number"
                    value={lengthInput}
                    onChange={(e) => handleLengthInputChange(e.target.value)}
                    min="4"
                    max="128"
                    className="w-16 h-8 px-2 text-center rounded-md border bg-background text-sm font-mono"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newLength = Math.min(128, options.length * 2);
                      setOptions({ ...options, length: newLength });
                      setLengthInput(newLength.toString());
                    }}
                    className="h-8 w-8"
                    title="Double length"
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Middle Column - Character Options */}
          {passwordType === 'random' && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg border bg-card">
                <Label className="text-sm font-medium mb-3 block">Character Types</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/5 transition-colors">
                    <Label htmlFor="uppercase" className="text-sm cursor-pointer select-none">
                      <span className="font-medium">ABC</span>
                    </Label>
                    <Switch
                      id="uppercase"
                      checked={options.uppercase}
                      onCheckedChange={(checked) => setOptions({ ...options, uppercase: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/5 transition-colors">
                    <Label htmlFor="lowercase" className="text-sm cursor-pointer select-none">
                      <span className="font-medium">abc</span>
                    </Label>
                    <Switch
                      id="lowercase"
                      checked={options.lowercase}
                      onCheckedChange={(checked) => setOptions({ ...options, lowercase: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/5 transition-colors">
                    <Label htmlFor="numbers" className="text-sm cursor-pointer select-none">
                      <span className="font-medium">123</span>
                    </Label>
                    <Switch
                      id="numbers"
                      checked={options.numbers}
                      onCheckedChange={(checked) => setOptions({ ...options, numbers: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/5 transition-colors">
                    <Label htmlFor="symbols" className="text-sm cursor-pointer select-none">
                      <span className="font-medium">!@#</span>
                    </Label>
                    <Switch
                      id="symbols"
                      checked={options.symbols}
                      onCheckedChange={(checked) => setOptions({ ...options, symbols: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Character Pool Visualization */}
              <div className="p-4 rounded-lg border bg-card">
                <Label className="text-sm font-medium mb-3 block">Character Pool</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {options.uppercase && (
                    <div className="p-2 rounded border bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Uppercase</span>
                        <span className="text-xs text-muted-foreground">26 chars</span>
                      </div>
                      <div className="font-mono text-xs break-all opacity-60">
                        {CHARACTER_SETS.uppercase}
                      </div>
                    </div>
                  )}
                  {options.lowercase && (
                    <div className="p-2 rounded border bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">Lowercase</span>
                        <span className="text-xs text-muted-foreground">26 chars</span>
                      </div>
                      <div className="font-mono text-xs break-all opacity-60">
                        {CHARACTER_SETS.lowercase}
                      </div>
                    </div>
                  )}
                  {options.numbers && (
                    <div className="p-2 rounded border bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Numbers</span>
                        <span className="text-xs text-muted-foreground">10 chars</span>
                      </div>
                      <div className="font-mono text-xs break-all opacity-60">
                        {CHARACTER_SETS.numbers}
                      </div>
                    </div>
                  )}
                  {options.symbols && (
                    <div className="p-2 rounded border bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Symbols</span>
                        <span className="text-xs text-muted-foreground">{CHARACTER_SETS.symbols.length} chars</span>
                      </div>
                      <div className="font-mono text-xs break-all opacity-60">
                        {CHARACTER_SETS.symbols}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Right Column - Advanced Options */}
          <div className="space-y-6">
            {passwordType === 'random' && (
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Safety Options</Label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/5 transition-colors">
                    <Label htmlFor="similar" className="text-sm cursor-pointer select-none">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                        Exclude Similar
                      </span>
                      <span className="text-xs text-muted-foreground">i, l, 1, L, o, 0, O</span>
                    </Label>
                    <Switch
                      id="similar"
                      checked={options.excludeSimilar}
                      onCheckedChange={(checked) => setOptions({ ...options, excludeSimilar: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/5 transition-colors">
                    <Label htmlFor="ambiguous" className="text-sm cursor-pointer select-none">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                        Exclude Ambiguous
                      </span>
                      <span className="text-xs text-muted-foreground">{ } [ ] ( ) / \ ' " ~ , ; . &lt; &gt;</span>
                    </Label>
                    <Switch
                      id="ambiguous"
                      checked={options.excludeAmbiguous}
                      onCheckedChange={(checked) => setOptions({ ...options, excludeAmbiguous: checked })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Generation */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <Label htmlFor="bulk" className="text-sm cursor-pointer select-none">
                  <span className="flex items-center gap-2">
                    <Dices className="w-4 h-4 text-primary" />
                    Bulk Generation
                  </span>
                  <span className="text-xs text-muted-foreground">Generate multiple at once</span>
                </Label>
                <div className="flex items-center gap-3">
                  {bulkMode && (
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={bulkCount}
                      onChange={(e) => setBulkCount(Math.min(20, Math.max(2, parseInt(e.target.value) || 2)))}
                      className="w-16 h-8 px-2 text-center rounded-md border bg-background text-sm"
                    />
                  )}
                  <Switch
                    id="bulk"
                    checked={bulkMode}
                    onCheckedChange={setBulkMode}
                  />
                </div>
              </div>
            </div>

            {!isValidConfig && passwordType === 'random' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-sm">Please select at least one character type</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate Button - Enhanced */}
      <div className="mt-6 mb-6 flex justify-center">
        <Button
          onClick={handleGenerate}
          size="lg"
          disabled={!isValidConfig || isGenerating}
          className="relative overflow-hidden group"
        >
          <span className="relative z-10 flex items-center gap-2">
            {isGenerating ? (
              <>
                <Shuffle className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                Generate {bulkMode ? `${bulkCount} Passwords` : 'Password'}
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
        </Button>
      </div>

      {/* Bulk Results */}
      {bulkMode && passwords.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm sm:text-base">Generated Passwords</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const allPasswords = passwords.map(p => p.password).join('\n');
                await navigator.clipboard.writeText(allPasswords);
                setCopied('all');
                setTimeout(() => setCopied(null), 2000);
              }}
            >
              {copied === 'all' ? (
                <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1" />
              )}
              Copy All
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {passwords.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border bg-card flex items-center justify-between gap-2 group hover:bg-accent/5 transition-all"
              >
                <div className="flex-1 space-y-1">
                  <code className="text-sm font-mono break-all">
                    {item.password}
                  </code>
                  <div className="flex items-center gap-3">
                    <Progress value={item.strength} className="h-1.5 w-20" />
                    <span className={`text-xs ${getStrengthColor(item.strength)}`}>
                      {item.strength}%
                    </span>
                    {item.type === 'memorable' && (
                      <Brain className="w-3 h-3 text-purple-500" />
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(item.password, item.id)}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copied === item.id ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session History */}
      {!bulkMode && sessionPasswords.length > 1 && (
        <div className="mb-6 p-4 rounded-lg border bg-card/50">
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Recent Passwords</h3>
            <span className="text-xs text-muted-foreground">(This session only)</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {sessionPasswords.slice(1, 6).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-2 rounded border bg-background/50 group"
              >
                <code className="text-xs font-mono truncate flex-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  {item.password}
                </code>
                <div className="flex items-center gap-2">
                  {item.type === 'memorable' && (
                    <Brain className="w-3 h-3 text-purple-500 opacity-60" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(item.password, item.id)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copied === item.id ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tips - More engaging */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-500/5 to-transparent">
          <Shield className="w-8 h-8 mb-2 text-blue-500" />
          <h3 className="font-semibold text-sm mb-1">Truly Random</h3>
          <p className="text-xs text-muted-foreground">
            Cryptographic randomness
          </p>
        </div>
        <div className="p-4 rounded-lg border bg-gradient-to-br from-green-500/5 to-transparent">
          <ShieldCheck className="w-8 h-8 mb-2 text-green-500" />
          <h3 className="font-semibold text-sm mb-1">100% Private</h3>
          <p className="text-xs text-muted-foreground">
            Never leaves your browser
          </p>
        </div>
        <div className="p-4 rounded-lg border bg-gradient-to-br from-purple-500/5 to-transparent">
          <Brain className="w-8 h-8 mb-2 text-purple-500" />
          <h3 className="font-semibold text-sm mb-1">Memorable Option</h3>
          <p className="text-xs text-muted-foreground">
            Secure & easy to remember
          </p>
        </div>
        <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-500/5 to-transparent">
          <Sparkles className="w-8 h-8 mb-2 text-orange-500" />
          <h3 className="font-semibold text-sm mb-1">Smart Presets</h3>
          <p className="text-xs text-muted-foreground">
            Optimized for every need
          </p>
        </div>
      </div>
    </div>
  );
}