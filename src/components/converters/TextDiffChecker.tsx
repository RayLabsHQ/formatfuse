import React, { useState, useCallback, useMemo } from 'react';
import { 
  FileText, Copy, Check, GitBranch, Eye,
  Columns, Rows, Download, Upload, Palette,
  Settings, Info, ChevronDown, ChevronUp, X, Plus,
  Minus, RefreshCw, FileJson, Code, Type
} from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '@/lib/utils';

interface DiffResult {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
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

type ViewMode = 'side-by-side' | 'unified' | 'split';
type DiffMode = 'lines' | 'words' | 'characters';

export function TextDiffChecker() {
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [diffMode, setDiffMode] = useState<DiffMode>('lines');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [highlightSyntax, setHighlightSyntax] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Compute line-by-line diff using LCS algorithm
  const computeLineDiff = useCallback((text1: string, text2: string): DiffResult[] => {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    
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
    
    let i = 0, j = 0;
    let lineNum1 = 1, lineNum2 = 1;

    for (const action of lcs) {
      if (action === 'match') {
        result.push({
          type: 'unchanged',
          content: lines1[i],
          oldLine: lineNum1++,
          newLine: lineNum2++
        });
        i++;
        j++;
      } else if (action === 'delete') {
        result.push({
          type: 'removed',
          content: lines1[i],
          oldLine: lineNum1++
        });
        i++;
      } else if (action === 'insert') {
        result.push({
          type: 'added',
          content: lines2[j],
          newLine: lineNum2++
        });
        j++;
      }
    }

    return result;
  }, [ignoreCase, ignoreWhitespace]);

  // Compute word-level diff
  const computeWordDiff = useCallback((text1: string, text2: string): DiffResult[] => {
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
    
    let i = 0, j = 0;

    for (const action of lcs) {
      if (action === 'match') {
        result.push({
          type: 'unchanged',
          content: words1[i]
        });
        i++;
        j++;
      } else if (action === 'delete') {
        result.push({
          type: 'removed',
          content: words1[i]
        });
        i++;
      } else if (action === 'insert') {
        result.push({
          type: 'added',
          content: words2[j]
        });
        j++;
      }
    }

    return result;
  }, [ignoreCase]);

  // LCS (Longest Common Subsequence) algorithm
  const computeLCS = (arr1: string[], arr2: string[]): ('match' | 'delete' | 'insert')[] => {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

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
    const actions: ('match' | 'delete' | 'insert')[] = [];
    let i = m, j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && arr1[i - 1] === arr2[j - 1]) {
        actions.unshift('match');
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        actions.unshift('insert');
        j--;
      } else {
        actions.unshift('delete');
        i--;
      }
    }

    return actions;
  };

  // Compute diff based on mode
  const diffResults = useMemo(() => {
    if (!text1 && !text2) return [];
    
    if (diffMode === 'lines') {
      return computeLineDiff(text1, text2);
    } else if (diffMode === 'words') {
      return computeWordDiff(text1, text2);
    }
    
    return [];
  }, [text1, text2, diffMode, computeLineDiff, computeWordDiff]);

  // Calculate statistics
  const stats = useMemo((): DiffStats => {
    const additions = diffResults.filter(r => r.type === 'added').length;
    const deletions = diffResults.filter(r => r.type === 'removed').length;
    const modifications = 0; // Could be calculated for more advanced diff
    const total = diffResults.length;

    return { additions, deletions, modifications, total };
  }, [diffResults]);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleFileUpload = useCallback((file: File, side: 'left' | 'right') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (side === 'left') {
        setText1(content);
      } else {
        setText2(content);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleSwap = useCallback(() => {
    const temp = text1;
    setText1(text2);
    setText2(temp);
  }, [text1, text2]);

  const renderDiffLine = (result: DiffResult, index: number) => {
    const bgColor = {
      added: 'bg-green-100 dark:bg-green-900/30',
      removed: 'bg-red-100 dark:bg-red-900/30',
      unchanged: '',
      modified: 'bg-yellow-100 dark:bg-yellow-900/30'
    }[result.type];

    const textColor = {
      added: 'text-green-900 dark:text-green-100',
      removed: 'text-red-900 dark:text-red-100',
      unchanged: '',
      modified: 'text-yellow-900 dark:text-yellow-100'
    }[result.type];

    const icon = {
      added: <Plus className="h-3 w-3" />,
      removed: <Minus className="h-3 w-3" />,
      unchanged: null,
      modified: <RefreshCw className="h-3 w-3" />
    }[result.type];

    return (
      <div
        key={index}
        className={cn(
          "font-mono text-sm",
          bgColor,
          textColor,
          result.type !== 'unchanged' && "px-2 py-0.5"
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
            {result.content || '\u00A0'}
          </span>
        </div>
      </div>
    );
  };

  const renderSideBySide = () => {
    const leftLines: DiffResult[] = [];
    const rightLines: DiffResult[] = [];

    diffResults.forEach((result) => {
      if (result.type === 'removed') {
        leftLines.push(result);
        rightLines.push({ type: 'unchanged', content: '' });
      } else if (result.type === 'added') {
        leftLines.push({ type: 'unchanged', content: '' });
        rightLines.push(result);
      } else {
        leftLines.push(result);
        rightLines.push(result);
      }
    });

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 overflow-x-auto">
          <div className="space-y-0">
            {leftLines.map((result, i) => renderDiffLine(result, i))}
          </div>
        </Card>
        <Card className="p-4 overflow-x-auto">
          <div className="space-y-0">
            {rightLines.map((result, i) => renderDiffLine(result, i))}
          </div>
        </Card>
      </div>
    );
  };

  const renderUnified = () => {
    return (
      <Card className="p-4 overflow-x-auto">
        <div className="space-y-0">
          {diffResults.map((result, i) => renderDiffLine(result, i))}
        </div>
      </Card>
    );
  };

  const renderWordDiff = () => {
    return (
      <Card className="p-4">
        <div className="font-mono text-sm whitespace-pre-wrap break-words">
          {diffResults.map((result, i) => (
            <span
              key={i}
              className={cn(
                result.type === 'added' && "bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100",
                result.type === 'removed' && "bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100 line-through",
                result.type === 'unchanged' && ""
              )}
            >
              {result.content}
            </span>
          ))}
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Text Diff Checker</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Compare two texts and visualize the differences with multiple view modes
        </p>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-medium">Original Text</Label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById('file-input-1')?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input
                id="file-input-1"
                type="file"
                className="hidden"
                accept=".txt,.md,.json,.js,.ts,.css,.html"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'left')}
                aria-label="Select text file for original text"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(text1, 'text1')}
              >
                {copiedField === 'text1' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <Textarea
            value={text1}
            onChange={(e) => setText1(e.target.value)}
            placeholder="Paste or type your original text here..."
            className="font-mono text-sm min-h-[300px]"
          />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-medium">Modified Text</Label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById('file-input-2')?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input
                id="file-input-2"
                type="file"
                className="hidden"
                accept=".txt,.md,.json,.js,.ts,.css,.html"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'right')}
                aria-label="Select text file for modified text"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(text2, 'text2')}
              >
                {copiedField === 'text2' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <Textarea
            value={text2}
            onChange={(e) => setText2(e.target.value)}
            placeholder="Paste or type your modified text here..."
            className="font-mono text-sm min-h-[300px]"
          />
        </Card>
      </div>

      {/* Controls */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={handleSwap} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Swap Texts
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <div className="flex items-center gap-2">
            <Label htmlFor="view-mode" className="text-sm">View:</Label>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
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
            <Label htmlFor="diff-mode" className="text-sm">Mode:</Label>
            <Select value={diffMode} onValueChange={(v) => setDiffMode(v as DiffMode)}>
              <SelectTrigger id="diff-mode" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lines">Lines</SelectItem>
                <SelectItem value="words">Words</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <div className="flex items-center gap-2">
            <Switch
              id="line-numbers"
              checked={showLineNumbers}
              onCheckedChange={setShowLineNumbers}
            />
            <Label htmlFor="line-numbers" className="text-sm cursor-pointer">
              Line Numbers
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="ignore-case"
              checked={ignoreCase}
              onCheckedChange={setIgnoreCase}
            />
            <Label htmlFor="ignore-case" className="text-sm cursor-pointer">
              Ignore Case
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="ignore-whitespace"
              checked={ignoreWhitespace}
              onCheckedChange={setIgnoreWhitespace}
            />
            <Label htmlFor="ignore-whitespace" className="text-sm cursor-pointer">
              Ignore Whitespace
            </Label>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      {(text1 || text2) && (
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm">
                <span className="font-medium">{stats.additions}</span> additions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm">
                <span className="font-medium">{stats.deletions}</span> deletions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
              <span className="text-sm">
                <span className="font-medium">{stats.total}</span> total lines
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Diff Output */}
      {(text1 || text2) && (
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Difference View
          </h3>
          
          {diffMode === 'lines' && viewMode === 'side-by-side' && renderSideBySide()}
          {diffMode === 'lines' && viewMode === 'unified' && renderUnified()}
          {diffMode === 'words' && renderWordDiff()}
        </div>
      )}

      {/* Info Section */}
      <Card className="mt-6 p-6">
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 font-semibold hover:text-primary transition-colors">
            <Info className="h-4 w-4" />
            How to Use Text Diff Checker
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">View Modes</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Side by Side:</strong> Shows original and modified text in separate columns</li>
                <li><strong>Unified:</strong> Shows all changes in a single view with inline highlighting</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Diff Modes</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Lines:</strong> Compares text line by line (best for code and structured text)</li>
                <li><strong>Words:</strong> Compares word by word (best for prose and documents)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Color Legend</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="text-green-600 dark:text-green-400">Green:</span> Added content</li>
                <li><span className="text-red-600 dark:text-red-400">Red:</span> Removed content</li>
                <li>No highlight: Unchanged content</li>
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}