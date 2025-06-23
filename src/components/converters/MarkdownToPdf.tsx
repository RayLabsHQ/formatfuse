import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { 
  FileText, Download, Code, AlertCircle, Upload, Copy,
  FileDown, Maximize2, Minimize2, Settings
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import FileSaver from 'file-saver';
import * as Comlink from 'comlink';
import type { MarkdownToPdfWorker } from '../../workers/markdown-to-pdf.worker';

const { saveAs } = FileSaver;

const SAMPLE_MARKDOWN = `# Project Documentation

This is a sample markdown document demonstrating the conversion capabilities.

## Features

- **Bold text** and *italic text*
- Lists and bullet points
- Headers and subheaders
- Code blocks and inline code

### Code Example

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Getting Started

1. Write your markdown
2. Preview the output
3. Download as PDF

Enjoy using the Markdown to PDF converter!`;

export const MarkdownToPdf: React.FC = () => {
  const [markdownContent, setMarkdownContent] = useState<string>(SAMPLE_MARKDOWN);
  const [pdfResult, setPdfResult] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'Times' | 'Courier'>('Helvetica');
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const workerRef = useRef<Comlink.Remote<MarkdownToPdfWorker> | null>(null);

  // Initialize worker
  useEffect(() => {
    const initWorker = async () => {
      const worker = new Worker(
        new URL('../../workers/markdown-to-pdf.worker.ts', import.meta.url),
        { type: 'module' }
      );
      const Converter = Comlink.wrap<typeof MarkdownToPdfWorker>(worker);
      workerRef.current = await new Converter();
    };

    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current[Comlink.releaseProxy]();
      }
    };
  }, []);

  const handleFileSelect = useCallback(async (files: FileList) => {
    const selectedFile = files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.md') && !selectedFile.name.endsWith('.markdown')) {
      setError(new Error('Please select a Markdown file (.md or .markdown)'));
      return;
    }

    setError(null);
    setPdfResult(null);

    try {
      const text = await selectedFile.text();
      setMarkdownContent(text);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to read file'));
    }
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setMarkdownContent(text);
        setPdfResult(null);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (markdownContent) {
      try {
        await navigator.clipboard.writeText(markdownContent);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }, [markdownContent]);

  const getFontSize = () => {
    switch (fontSize) {
      case 'small': return 10;
      case 'large': return 14;
      default: return 12;
    }
  };

  const handleConvert = useCallback(async () => {
    if (!markdownContent.trim() || !workerRef.current) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await workerRef.current.convert(
        markdownContent,
        {
          fontSize: getFontSize(),
          lineHeight: 1.5,
          fontFamily,
          margins: { top: 72, bottom: 72, left: 72, right: 72 }
        }
      );

      setPdfResult(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Conversion failed'));
    } finally {
      setIsProcessing(false);
    }
  }, [markdownContent, fontSize, fontFamily]);

  const downloadPdf = useCallback(() => {
    if (!pdfResult) return;
    
    const blob = new Blob([pdfResult], { type: 'application/pdf' });
    const fileName = 'markdown-document.pdf';
    saveAs(blob, fileName);
  }, [pdfResult]);

  const renderMarkdownPreview = (markdown: string) => {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.+)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)\s*(?=<li>)/g, '$1')
      .replace(/(<li>.*<\/li>)/s, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^([^<].*)$/gim, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h|<ul|<ol|<pre)/g, '$1')
      .replace(/(<\/h\d>|<\/ul>|<\/ol>|<\/pre>)<\/p>/g, '$1');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Tool Header */}
      <div className="border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-center">Markdown to PDF</h1>
          <p className="text-center text-muted-foreground mt-1">
            Convert Markdown to PDF with live preview and syntax highlighting
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="border-b px-6 py-3 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Font:</span>
          <Select
            value={fontFamily}
            onValueChange={(value: 'Helvetica' | 'Times' | 'Courier') => setFontFamily(value)}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Helvetica">Helvetica</SelectItem>
              <SelectItem value="Times">Times</SelectItem>
              <SelectItem value="Courier">Courier</SelectItem>
            </SelectContent>
          </Select>
          
          <span className="text-sm text-muted-foreground ml-4">Size:</span>
          <Select
            value={fontSize}
            onValueChange={(value: 'small' | 'medium' | 'large') => setFontSize(value)}
          >
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          {pdfResult && (
            <Button
              onClick={downloadPdf}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          )}
          <Button
            onClick={handleConvert}
            disabled={isProcessing || !markdownContent.trim()}
            size="sm"
            variant={pdfResult ? "outline" : "default"}
          >
            {isProcessing ? "Converting..." : "Convert to PDF"}
          </Button>
        </div>
      </div>

      {/* Main Content - Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input Panel */}
        <div className="flex-1 flex flex-col border-r">
          <div className="border-b px-4 py-2 flex items-center justify-between bg-card/30">
            <span className="text-sm font-medium">Input</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePaste}
                title="Paste from clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => fileInputRef.current?.click()}
                title="Upload markdown file"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
            aria-label="Select Markdown files"
          />
          
          <div className="flex-1 relative">
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-muted/30 border-r flex flex-col items-center pt-4 text-xs text-muted-foreground select-none">
              {markdownContent.split('\n').map((_, index) => (
                <div key={index} className="h-[1.5rem] flex items-center">
                  {index + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={markdownContent}
              onChange={(e) => {
                setMarkdownContent(e.target.value);
                setPdfResult(null);
              }}
              placeholder="Paste your Markdown here..."
              className={`w-full h-full pl-16 pr-4 py-4 bg-transparent resize-none outline-none font-mono text-sm leading-6 ${
                isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''
              }`}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex-1 flex flex-col">
          <div className="border-b px-4 py-2 flex items-center justify-between bg-card/30">
            <span className="text-sm font-medium">Output</span>
            <div className="flex items-center gap-2">
              {pdfResult && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={downloadPdf}
                  title="Download PDF"
                >
                  <FileDown className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-6 bg-muted/10">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error.message}</span>
                </div>
              </div>
            )}
            
            {!pdfResult && !error && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div 
                  dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(markdownContent) }}
                  style={{ 
                    fontFamily: fontFamily === 'Times' ? 'serif' : fontFamily === 'Courier' ? 'monospace' : 'sans-serif',
                    fontSize: getFontSize() + 'px'
                  }}
                />
              </div>
            )}
            
            {pdfResult && (
              <div className="text-center py-8">
                <div className="inline-flex flex-col items-center gap-4">
                  <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">PDF Ready</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your PDF has been generated successfully
                    </p>
                  </div>
                  <Button onClick={downloadPdf} className="mt-2">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownToPdf;