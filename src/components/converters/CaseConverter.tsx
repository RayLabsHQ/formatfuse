import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Type, Copy, Check, Sparkles, Code, Database, 
  FileCode, Hash, ArrowRight, Info, Keyboard 
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';

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
const preserveAcronyms = (word: string, convertFunc: (s: string) => string): string => {
  // Common acronyms to preserve
  const acronyms = ['API', 'URL', 'ID', 'UUID', 'HTTP', 'HTTPS', 'SQL', 'HTML', 'CSS', 'JS', 'JSON', 'XML', 'PDF', 'CEO', 'FBI', 'NASA', 'FAQ', 'iOS', 'macOS'];
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
    id: 'uppercase',
    name: 'UPPERCASE',
    description: 'ALL CAPITAL LETTERS',
    converter: (text) => text.toUpperCase(),
    example: 'THE QUICK BROWN FOX',
    usage: 'Constants, emphasis, headers'
  },
  {
    id: 'lowercase',
    name: 'lowercase',
    description: 'all lowercase letters',
    converter: (text) => text.toLowerCase(),
    example: 'the quick brown fox',
    usage: 'URLs, filenames, email addresses'
  },
  {
    id: 'title',
    name: 'Title Case',
    description: 'First Letter Of Each Word Capitalized',
    converter: (text) => {
      return text.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
    },
    example: 'The Quick Brown Fox',
    usage: 'Titles, headings, names'
  },
  {
    id: 'sentence',
    name: 'Sentence case',
    description: 'First letter capitalized. Rest lowercase',
    converter: (text) => {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },
    example: 'The quick brown fox',
    usage: 'Sentences, paragraphs'
  },
  {
    id: 'camel',
    name: 'camelCase',
    description: 'firstWordLowerCaseRestTitleCase',
    converter: (text) => {
      return text
        .split(/[\s_-]+/)
        .map((word, index) => {
          if (index === 0) return word.toLowerCase();
          return preserveAcronyms(word, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        })
        .join('');
    },
    example: 'theQuickBrownFox',
    icon: Code,
    usage: 'JavaScript variables, function names'
  },
  {
    id: 'pascal',
    name: 'PascalCase',
    description: 'EveryWordStartsWithCapital',
    converter: (text) => {
      return text
        .split(/[\s_-]+/)
        .map(word => preserveAcronyms(word, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join('');
    },
    example: 'TheQuickBrownFox',
    icon: FileCode,
    usage: 'Class names, React components'
  },
  {
    id: 'snake',
    name: 'snake_case',
    description: 'words_separated_by_underscores',
    converter: (text) => {
      return text
        .split(/[\s-]+/)
        .map(word => word.toLowerCase())
        .join('_');
    },
    example: 'the_quick_brown_fox',
    icon: Database,
    usage: 'Python variables, database columns'
  },
  {
    id: 'constant',
    name: 'CONSTANT_CASE',
    description: 'UPPER_CASE_WITH_UNDERSCORES',
    converter: (text) => {
      return text
        .split(/[\s-]+/)
        .map(word => word.toUpperCase())
        .join('_');
    },
    example: 'THE_QUICK_BROWN_FOX',
    icon: Hash,
    usage: 'Constants, environment variables'
  },
  {
    id: 'kebab',
    name: 'kebab-case',
    description: 'words-separated-by-hyphens',
    converter: (text) => {
      return text
        .split(/[\s_]+/)
        .map(word => word.toLowerCase())
        .join('-');
    },
    example: 'the-quick-brown-fox',
    usage: 'URLs, CSS classes, filenames'
  },
  {
    id: 'dot',
    name: 'dot.case',
    description: 'words.separated.by.dots',
    converter: (text) => {
      return text
        .split(/[\s_-]+/)
        .map(word => word.toLowerCase())
        .join('.');
    },
    example: 'the.quick.brown.fox',
    usage: 'Package names, namespaces'
  },
  {
    id: 'path',
    name: 'path/case',
    description: 'words/separated/by/slashes',
    converter: (text) => {
      return text
        .split(/[\s_-]+/)
        .map(word => word.toLowerCase())
        .join('/');
    },
    example: 'the/quick/brown/fox',
    usage: 'URL paths, file paths'
  },
  {
    id: 'header',
    name: 'Header-Case',
    description: 'Words-Separated-By-Hyphens-And-Capitalized',
    converter: (text) => {
      return text
        .split(/[\s_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('-');
    },
    example: 'The-Quick-Brown-Fox',
    usage: 'HTTP headers, markdown headers'
  }
];

export default function CaseConverter() {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUsage, setShowUsage] = useState(false);
  const [preserveNumbers, setPreserveNumbers] = useState(true);

  // Detect current format
  const detectedFormat = useMemo(() => {
    if (!input.trim()) return null;
    
    const trimmed = input.trim();
    
    // Check each format to see if the input matches
    if (trimmed === trimmed.toUpperCase() && !trimmed.includes('_')) return 'uppercase';
    if (trimmed === trimmed.toLowerCase() && !trimmed.includes('_') && !trimmed.includes('-')) return 'lowercase';
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(trimmed)) return 'title';
    if (/^[A-Z][a-z]+/.test(trimmed) && trimmed.slice(1) === trimmed.slice(1).toLowerCase()) return 'sentence';
    if (/^[a-z]+([A-Z][a-z]+)*$/.test(trimmed)) return 'camel';
    if (/^[A-Z][a-z]+([A-Z][a-z]+)*$/.test(trimmed)) return 'pascal';
    if (/^[a-z]+(_[a-z]+)*$/.test(trimmed)) return 'snake';
    if (/^[A-Z]+(_[A-Z]+)*$/.test(trimmed)) return 'constant';
    if (/^[a-z]+(-[a-z]+)*$/.test(trimmed)) return 'kebab';
    
    return null;
  }, [input]);

  // Convert input to all formats
  const conversions = useMemo(() => {
    if (!input.trim()) return [];
    
    return caseFormats.map(format => ({
      ...format,
      result: format.converter(input.trim()),
      isCurrentFormat: format.id === detectedFormat
    }));
  }, [input, detectedFormat]);

  const handleCopy = useCallback(async (text: string, formatId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(formatId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (conversions[index]) {
          handleCopy(conversions[index].result, conversions[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [conversions, handleCopy]);

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
              Detected: {caseFormats.find(f => f.id === detectedFormat)?.name}
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
              {showUsage ? 'Hide' : 'Show'} usage tips
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInput('')}
            >
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
                  : "hover:bg-secondary/50"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {conversion.icon && <conversion.icon className="w-4 h-4 text-muted-foreground" />}
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

      {/* Features */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border">
          <Sparkles className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Smart Detection</h3>
          <p className="text-sm text-muted-foreground">
            Automatically detects the current format of your text
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <Code className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Developer Friendly</h3>
          <p className="text-sm text-muted-foreground">
            Preserves acronyms and handles programming conventions
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <Keyboard className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Keyboard Shortcuts</h3>
          <p className="text-sm text-muted-foreground">
            Use Cmd/Ctrl + 1-9 to quickly copy any format
          </p>
        </div>
      </div>
    </div>
  );
}