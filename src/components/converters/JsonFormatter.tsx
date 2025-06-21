import React, { useState, useCallback, useMemo } from 'react';
import { Copy, Download, AlertCircle, Check, Minimize2, Maximize2, FileJson } from 'lucide-react';
import { CodeEditor } from '../ui/code-editor';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface JsonError {
  line?: number;
  column?: number;
  message: string;
}

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [indentSize, setIndentSize] = useState('2');
  const [error, setError] = useState<JsonError | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'minified'>('formatted');

  // Parse and validate JSON
  const { formatted, minified, isValid } = useMemo(() => {
    if (!input.trim()) {
      setError(null);
      return { formatted: '', minified: '', isValid: false };
    }

    try {
      const parsed = JSON.parse(input);
      setError(null);
      return {
        formatted: JSON.stringify(parsed, null, parseInt(indentSize)),
        minified: JSON.stringify(parsed),
        isValid: true
      };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Invalid JSON';
      
      // Try to extract line/column from error message
      const match = errorMessage.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        const lines = input.substring(0, position).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        setError({ line, column, message: errorMessage });
      } else {
        setError({ message: errorMessage });
      }
      
      return { formatted: '', minified: '', isValid: false };
    }
  }, [input, indentSize]);

  const displayValue = viewMode === 'formatted' ? formatted : minified;

  const handleCopy = useCallback(async () => {
    if (!displayValue) return;
    
    try {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [displayValue]);

  const handleDownload = useCallback(() => {
    if (!displayValue) return;
    
    const blob = new Blob([displayValue], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formatted.${viewMode === 'minified' ? 'min.' : ''}json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayValue, viewMode]);

  const handleFormat = useCallback(() => {
    if (!input.trim()) return;
    
    // Try to fix common JSON errors
    let fixedInput = input.trim();
    
    // Fix trailing commas
    fixedInput = fixedInput.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix single quotes (convert to double quotes)
    fixedInput = fixedInput.replace(/'/g, '"');
    
    // Try to parse the fixed input
    try {
      const parsed = JSON.parse(fixedInput);
      setInput(JSON.stringify(parsed, null, parseInt(indentSize)));
      setError(null);
    } catch (e) {
      // If still invalid, just format what we can
      setInput(fixedInput);
    }
  }, [input, indentSize]);

  const stats = useMemo(() => {
    if (!isValid) return null;
    
    try {
      const parsed = JSON.parse(input);
      const countKeys = (obj: any): number => {
        if (typeof obj !== 'object' || obj === null) return 0;
        if (Array.isArray(obj)) {
          return obj.reduce((sum, item) => sum + countKeys(item), 0);
        }
        return Object.keys(obj).length + 
          Object.values(obj).reduce((sum, val) => sum + countKeys(val), 0);
      };
      
      return {
        keys: countKeys(parsed),
        size: new Blob([minified]).size,
        formattedSize: new Blob([formatted]).size,
        compression: Math.round((1 - new Blob([minified]).size / new Blob([formatted]).size) * 100)
      };
    } catch {
      return null;
    }
  }, [input, formatted, minified, isValid]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">JSON Formatter</h1>
        <p className="text-muted-foreground">
          Validate, format, and minify JSON data with syntax highlighting
        </p>
      </div>

      {/* Options Bar */}
      <div className="mb-4 p-4 rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="indent-size">Indent:</Label>
            <Select value={indentSize} onValueChange={setIndentSize}>
              <SelectTrigger id="indent-size" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 spaces</SelectItem>
                <SelectItem value="4">4 spaces</SelectItem>
                <SelectItem value="8">Tab (8)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'formatted' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('formatted')}
            >
              <Maximize2 className="w-4 h-4 mr-1" />
              Formatted
            </Button>
            <Button
              variant={viewMode === 'minified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('minified')}
            >
              <Minimize2 className="w-4 h-4 mr-1" />
              Minified
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleFormat}
          >
            Auto-fix & Format
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between h-10">
            <Label>Input</Label>
            {error && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error.line && error.column 
                  ? `Line ${error.line}, Column ${error.column}` 
                  : 'Invalid JSON'}
              </span>
            )}
          </div>
          <CodeEditor
            value={input}
            onChange={setInput}
            placeholder="Paste your JSON here..."
            className="h-[500px]"
            error={!!error}
            language="json"
          />
          {error && (
            <p className="text-sm text-destructive mt-1">{error.message}</p>
          )}
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between h-10">
            <Label>Output</Label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                disabled={!isValid}
                title="Copy to clipboard"
                className="h-8 w-8"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                disabled={!isValid}
                title="Download JSON"
                className="h-8 w-8"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <CodeEditor
            value={displayValue}
            readOnly
            placeholder={error ? 'Invalid JSON' : 'Output will appear here...'}
            className="h-[500px]"
            language="json"
          />
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="mt-4 p-4 rounded-lg border bg-card">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Keys:</span>
              <span className="ml-2 font-medium">{stats.keys}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Formatted:</span>
              <span className="ml-2 font-medium">{formatFileSize(stats.formattedSize)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Minified:</span>
              <span className="ml-2 font-medium">{formatFileSize(stats.size)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Compression:</span>
              <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                {stats.compression}% smaller
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border">
          <FileJson className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Smart Validation</h3>
          <p className="text-sm text-muted-foreground">
            Identifies and highlights JSON syntax errors with line numbers
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <Maximize2 className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Format & Minify</h3>
          <p className="text-sm text-muted-foreground">
            Switch between beautified and minified views instantly
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <Check className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Auto-fix Errors</h3>
          <p className="text-sm text-muted-foreground">
            Automatically fixes common issues like trailing commas
          </p>
        </div>
      </div>
    </div>
  );
}