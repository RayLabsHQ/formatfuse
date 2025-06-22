import React, { useState, useCallback, useMemo } from 'react';
import yaml from 'js-yaml';
import { Copy, Download, ArrowLeftRight, Check, AlertCircle, FileJson, FileCode } from 'lucide-react';
import { CodeEditor } from '../ui/code-editor';
import { Button } from '../ui/button';
import { Label } from '../ui/label';

type ConversionMode = 'json-to-yaml' | 'yaml-to-json';

interface ConversionError {
  message: string;
  line?: number;
  column?: number;
}

export default function JsonYamlConverter() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ConversionMode>('json-to-yaml');
  const [error, setError] = useState<ConversionError | null>(null);
  const [copied, setCopied] = useState(false);
  const [indentSize] = useState(2);

  // Convert between formats
  const output = useMemo(() => {
    if (!input.trim()) {
      setError(null);
      return '';
    }

    try {
      if (mode === 'json-to-yaml') {
        // Parse JSON and convert to YAML
        const parsed = JSON.parse(input);
        setError(null);
        return yaml.dump(parsed, {
          indent: indentSize,
          lineWidth: -1, // Don't wrap lines
          quotingType: '"',
          forceQuotes: false,
          noRefs: true
        });
      } else {
        // Parse YAML and convert to JSON
        const parsed = yaml.load(input);
        setError(null);
        return JSON.stringify(parsed, null, indentSize);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Invalid input';
      
      // Try to extract line/column from error message
      if (mode === 'json-to-yaml') {
        const match = errorMessage.match(/position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          const lines = input.substring(0, position).split('\n');
          const line = lines.length;
          const column = lines[lines.length - 1].length + 1;
          setError({ message: errorMessage, line, column });
        } else {
          setError({ message: errorMessage });
        }
      } else {
        // YAML errors often include line/column info
        const lineMatch = errorMessage.match(/line (\d+)/);
        const colMatch = errorMessage.match(/column (\d+)/);
        setError({
          message: errorMessage,
          line: lineMatch ? parseInt(lineMatch[1]) : undefined,
          column: colMatch ? parseInt(colMatch[1]) : undefined
        });
      }
      
      return '';
    }
  }, [input, mode, indentSize]);

  const handleSwapMode = useCallback(() => {
    // If we have valid output, use it as the new input
    if (output && !error) {
      setInput(output);
      setMode(mode === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml');
    } else {
      // Just swap the mode
      setMode(mode === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml');
    }
    setError(null);
  }, [output, error, mode]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [output]);

  const handleDownload = useCallback(() => {
    if (!output) return;
    
    const extension = mode === 'json-to-yaml' ? 'yaml' : 'json';
    const mimeType = mode === 'json-to-yaml' ? 'text/yaml' : 'application/json';
    const blob = new Blob([output], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [output, mode]);

  const handlePrettify = useCallback(() => {
    if (!input.trim()) return;
    
    try {
      if (mode === 'json-to-yaml') {
        // Pretty format JSON
        const parsed = JSON.parse(input);
        setInput(JSON.stringify(parsed, null, indentSize));
      } else {
        // Re-format YAML
        const parsed = yaml.load(input);
        setInput(yaml.dump(parsed, {
          indent: indentSize,
          lineWidth: -1,
          quotingType: '"',
          forceQuotes: false,
          noRefs: true
        }));
      }
      setError(null);
    } catch (e) {
      // Keep the input as is if prettifying fails
    }
  }, [input, mode, indentSize]);

  const stats = useMemo(() => {
    if (!output || error) return null;
    
    const inputSize = new Blob([input]).size;
    const outputSize = new Blob([output]).size;
    const ratio = ((outputSize / inputSize - 1) * 100).toFixed(0);
    
    return {
      inputSize,
      outputSize,
      ratio: parseInt(ratio),
      inputLines: input.split('\n').length,
      outputLines: output.split('\n').length
    };
  }, [input, output, error]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <div className="p-1.5 sm:p-2 bg-primary/10 text-primary rounded-lg">
            <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          JSON ↔ YAML Converter
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground px-2">
          Convert between JSON and YAML formats with syntax highlighting
        </p>
      </div>

      {/* Controls Bar - Mobile optimized */}
      <div className="mb-4 p-3 sm:p-4 rounded-lg border bg-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwapMode}
              className="text-xs sm:text-sm"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Swap
            </Button>
            <span className="text-sm font-medium">
              {mode === 'json-to-yaml' ? 'JSON → YAML' : 'YAML → JSON'}
            </span>
          </div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrettify}
            className="text-xs sm:text-sm"
          >
            Prettify Input
          </Button>
        </div>
      </div>

      {/* Main Editor Area - Mobile optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between h-8 sm:h-10">
            <Label className="text-sm flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              {mode === 'json-to-yaml' ? 'JSON Input' : 'YAML Input'}
            </Label>
            {error && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error.line && error.column 
                  ? `Line ${error.line}, Column ${error.column}` 
                  : 'Invalid format'}
              </span>
            )}
          </div>
          <CodeEditor
            value={input}
            onChange={setInput}
            placeholder={mode === 'json-to-yaml' 
              ? 'Paste your JSON here...' 
              : 'Paste your YAML here...'}
            className="h-[300px] sm:h-[400px] lg:h-[500px]"
            error={!!error}
            language={mode === 'json-to-yaml' ? 'json' : 'yaml'}
          />
          {error && (
            <p className="text-sm text-destructive mt-1">{error.message}</p>
          )}
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between h-8 sm:h-10">
            <Label className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              {mode === 'json-to-yaml' ? 'YAML Output' : 'JSON Output'}
            </Label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                disabled={!output}
                title="Copy to clipboard"
                className="h-7 w-7 sm:h-8 sm:w-8"
              >
                {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                disabled={!output}
                title="Download file"
                className="h-7 w-7 sm:h-8 sm:w-8"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
          <CodeEditor
            value={output}
            readOnly
            placeholder={error ? 'Invalid input' : 'Output will appear here...'}
            className="h-[300px] sm:h-[400px] lg:h-[500px]"
            language={mode === 'json-to-yaml' ? 'yaml' : 'json'}
          />
        </div>
      </div>

      {/* Statistics - Mobile optimized */}
      {stats && (
        <div className="mt-4 p-3 sm:p-4 rounded-lg border bg-card">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
            <div>
              <span className="text-muted-foreground">Input:</span>
              <span className="ml-1 sm:ml-2 font-medium">{formatFileSize(stats.inputSize)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Output:</span>
              <span className="ml-1 sm:ml-2 font-medium">{formatFileSize(stats.outputSize)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Size change:</span>
              <span className={`ml-1 sm:ml-2 font-medium ${
                stats.ratio > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {stats.ratio > 0 ? '+' : ''}{stats.ratio}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Lines:</span>
              <span className="ml-1 sm:ml-2 font-medium">{stats.inputLines} → {stats.outputLines}</span>
            </div>
          </div>
        </div>
      )}

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border">
          <ArrowLeftRight className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Bidirectional Conversion</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Convert JSON to YAML and YAML to JSON with a single click
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Error Detection</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Identifies syntax errors with line and column numbers
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border sm:col-span-2 md:col-span-1">
          <FileCode className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Syntax Highlighting</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Color-coded syntax for both JSON and YAML formats
          </p>
        </div>
      </div>
    </div>
  );
}