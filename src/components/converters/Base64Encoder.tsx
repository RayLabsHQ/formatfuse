import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Copy, Download, Upload, ArrowUpDown, Check, FileText, Image as ImageIcon, AlertCircle, ArrowRightLeft, Settings } from 'lucide-react';
import {
  MobileToolLayout,
  MobileToolHeader,
  MobileToolContent,
  BottomSheet,
  MobileActionBar,
  ActionButton,
  ActionIconButton,
  MobileTabs,
  MobileTabsList,
  MobileTabsTrigger,
  MobileTabsContent,
  MobileFileUpload,
  SegmentedControl
} from '../ui/mobile';
import { cn } from '@/lib/utils';

type Mode = 'encode' | 'decode';
type InputType = 'text' | 'file';

interface FileData {
  name: string;
  type: string;
  size: number;
  data: string;
}

export default function Base64Encoder() {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [mode, setMode] = useState<Mode>('encode');
  const [inputType, setInputType] = useState<InputType>('text');
  const [textInput, setTextInput] = useState('');
  const [base64Input, setBase64Input] = useState('');
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [urlSafe, setUrlSafe] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);

  // Auto-detect mode based on input
  const autoDetectMode = useCallback((input: string) => {
    if (!input.trim()) return;
    
    // Check if input looks like base64
    const base64Regex = /^[A-Za-z0-9+/\-_]+=*$/;
    const trimmed = input.trim();
    
    // If it's valid base64 and we're in encode mode, switch to decode
    if (base64Regex.test(trimmed) && trimmed.length % 4 === 0) {
      try {
        // Try to decode it
        atob(trimmed.replace(/-/g, '+').replace(/_/g, '/'));
        setMode('decode');
        setBase64Input(input);
        setTextInput('');
        // Auto-switch to output tab on mobile when result is ready
        if (isMobile) {
          setActiveTab('output');
        }
      } catch {
        // Not valid base64, keep in encode mode
      }
    }
  }, [isMobile]);

  const handleTextChange = (value: string) => {
    setError(null);
    if (mode === 'encode') {
      setTextInput(value);
      autoDetectMode(value);
    } else {
      setBase64Input(value);
    }
  };

  const encodeText = useCallback((text: string): string => {
    const encoded = btoa(unescape(encodeURIComponent(text)));
    return urlSafe ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '') : encoded;
  }, [urlSafe]);

  const decodeBase64 = useCallback((base64: string): string => {
    try {
      // Handle URL-safe base64
      let normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if necessary
      const padding = normalized.length % 4;
      if (padding) {
        normalized += '='.repeat(4 - padding);
      }
      
      return decodeURIComponent(escape(atob(normalized)));
    } catch (e) {
      throw new Error('Invalid Base64 string');
    }
  }, []);

  const result = useMemo(() => {
    setError(null);
    
    try {
      if (mode === 'encode') {
        if (inputType === 'text' && textInput) {
          return encodeText(textInput);
        } else if (inputType === 'file' && fileData) {
          return fileData.data;
        }
      } else {
        if (base64Input) {
          return decodeBase64(base64Input);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    }
    
    return '';
  }, [mode, inputType, textInput, base64Input, fileData, encodeText, decodeBase64]);
  
  // Auto-switch to output tab on mobile when we have a result
  useEffect(() => {
    if (isMobile && result && activeTab === 'input') {
      setActiveTab('output');
    }
  }, [result, isMobile, activeTab]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      
      setFileData({
        name: file.name,
        type: file.type,
        size: file.size,
        data: urlSafe ? base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '') : base64
      });
    };
    
    reader.onerror = () => {
      setError('Failed to read file');
    };
    
    reader.readAsDataURL(file);
  }, [urlSafe]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    
    if (mode === 'encode') {
      // Download as .txt file with base64 content
      const blob = new Blob([result], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData ? `${fileData.name}.base64.txt` : 'encoded.base64.txt';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Download decoded content
      if (fileData?.type.startsWith('image/') || fileData?.type === 'application/pdf') {
        // For binary files, convert back to blob
        const binaryString = atob(base64Input.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: fileData.type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileData.name || 'decoded-file';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For text, download as text file
        const blob = new Blob([result], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'decoded.txt';
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  }, [result, mode, fileData, base64Input]);

  const getDataUri = useCallback(() => {
    if (!fileData || mode !== 'encode') return '';
    return `data:${fileData.type};base64,${fileData.data}`;
  }, [fileData, mode]);

  const showPreview = useMemo(() => {
    if (mode === 'decode' && base64Input) {
      try {
        const decoded = atob(base64Input.replace(/-/g, '+').replace(/_/g, '/'));
        // Check if it might be an image by looking for image signatures
        const firstBytes = decoded.substring(0, 10);
        return firstBytes.includes('PNG') || firstBytes.includes('JFIF') || firstBytes.includes('GIF');
      } catch {
        return false;
      }
    }
    return false;
  }, [mode, base64Input]);

  // Mobile layout
  if (isMobile) {
    return (
      <MobileToolLayout>
        <MobileToolHeader
          title="Base64 Encoder"
          description={mode === 'encode' ? 'Encode text or files' : 'Decode Base64'}
          action={
            <ActionIconButton
              onClick={() => setShowOptionsSheet(true)}
              icon={<Settings />}
              label="Options"
              variant="ghost"
            />
          }
        />

        {/* Mode toggle */}
        <div className="px-4 pb-2">
          <SegmentedControl
            options={[
              { value: 'encode', label: 'Encode', icon: <ArrowRightLeft className="h-4 w-4" /> },
              { value: 'decode', label: 'Decode', icon: <ArrowRightLeft className="h-4 w-4 rotate-180" /> }
            ]}
            value={mode}
            onChange={(v) => {
              setMode(v as Mode);
              setError(null);
              if (v === 'decode') setInputType('text');
            }}
          />
        </div>

        <MobileTabs defaultValue="input" value={activeTab} onValueChange={(v) => setActiveTab(v as 'input' | 'output')}>
          <div className="px-4">
            <MobileTabsList variant="default">
              <MobileTabsTrigger value="input">
                {mode === 'encode' ? 'Input' : 'Base64'}
              </MobileTabsTrigger>
              <MobileTabsTrigger value="output" badge={result ? 'Ready' : undefined}>
                {mode === 'encode' ? 'Base64' : 'Decoded'}
              </MobileTabsTrigger>
            </MobileTabsList>
          </div>

          <MobileTabsContent value="input">
            <MobileToolContent>
              {mode === 'encode' && (
                <div className="mb-4">
                  <SegmentedControl
                    options={[
                      { value: 'text', label: 'Text', icon: <FileText className="h-4 w-4" /> },
                      { value: 'file', label: 'File', icon: <Upload className="h-4 w-4" /> }
                    ]}
                    value={inputType}
                    onChange={(v) => setInputType(v as InputType)}
                  />
                </div>
              )}

              {mode === 'encode' && inputType === 'file' ? (
                <MobileFileUpload
                  onFileSelect={(files) => {
                    const e = { target: { files } } as React.ChangeEvent<HTMLInputElement>;
                    handleFileUpload(e);
                  }}
                  selectedFile={fileData ? new File([fileData.data], fileData.name, { type: fileData.type }) : null}
                  onClear={() => setFileData(null)}
                  compact={false}
                />
              ) : (
                <textarea
                  value={mode === 'encode' ? textInput : base64Input}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={
                    mode === 'encode' 
                      ? 'Enter text to encode...' 
                      : 'Paste Base64 string to decode...'
                  }
                  className="w-full h-[300px] p-4 font-mono text-sm border rounded-lg bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  spellCheck={false}
                />
              )}

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </MobileToolContent>
          </MobileTabsContent>

          <MobileTabsContent value="output">
            <MobileToolContent className="min-h-[400px]">
              {result ? (
                <>
                  {showPreview ? (
                    <div className="h-[300px] border rounded-lg overflow-hidden bg-secondary/10 flex items-center justify-center mb-4">
                      <img 
                        src={`data:image/png;base64,${base64Input}`} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <textarea
                      value={result}
                      readOnly
                      className="w-full h-[300px] p-4 font-mono text-sm border rounded-lg bg-secondary/20 resize-none mb-4"
                    />
                  )}

                  <div className="flex gap-3 justify-center">
                    <ActionButton
                      onClick={handleCopy}
                      icon={copied ? <Check /> : <Copy />}
                      label={copied ? "Copied!" : "Copy"}
                      variant="secondary"
                    />
                    <ActionButton
                      onClick={handleDownload}
                      icon={<Download />}
                      label="Download"
                      variant="secondary"
                    />
                    {result && inputType === 'file' && mode === 'encode' && (
                      <ActionButton
                        onClick={() => {
                          const dataUri = getDataUri();
                          navigator.clipboard.writeText(dataUri);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        icon={<Copy />}
                        label="Data URI"
                        variant="secondary"
                        size="sm"
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FileText className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">
                    {mode === 'encode' ? 'Enter text or select a file to encode' : 'Enter Base64 to decode'}
                  </p>
                </div>
              )}
            </MobileToolContent>
          </MobileTabsContent>
        </MobileTabs>

        {/* Options bottom sheet */}
        <BottomSheet
          open={showOptionsSheet}
          onOpenChange={setShowOptionsSheet}
          title="Encoding Options"
        >
          <div className="space-y-4">
            <label className="flex items-center justify-between py-3">
              <span className="font-medium">URL-safe encoding</span>
              <input
                type="checkbox"
                checked={urlSafe}
                onChange={(e) => setUrlSafe(e.target.checked)}
                className="rounded h-5 w-5"
              />
            </label>
            <p className="text-sm text-muted-foreground">
              URL-safe encoding replaces + with -, / with _, and removes = padding.
            </p>
          </div>
        </BottomSheet>
      </MobileToolLayout>
    );
  }

  // Desktop layout
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <div className="p-1.5 sm:p-2 bg-primary/10 text-primary rounded-lg">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          Base64 Encoder/Decoder
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground px-2">
          Encode and decode Base64 strings with support for text and files
        </p>
      </div>

      {/* Controls - Mobile optimized */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border bg-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMode('encode');
                  setError(null);
                }}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md transition-colors ${
                  mode === 'encode' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-secondary'
                }`}
              >
                Encode
              </button>
              <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <button
                onClick={() => {
                  setMode('decode');
                  setError(null);
                  setInputType('text');
                }}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-md transition-colors ${
                  mode === 'decode' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-secondary'
                }`}
              >
                Decode
              </button>
            </div>

            {/* Input Type (only for encode) */}
            {mode === 'encode' && (
              <div className="flex items-center gap-2 sm:border-l sm:pl-4">
                <button
                  onClick={() => setInputType('text')}
                  className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                    inputType === 'text' 
                      ? 'bg-secondary text-foreground' 
                      : 'hover:bg-secondary/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                  Text
                </button>
                <button
                  onClick={() => setInputType('file')}
                  className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                    inputType === 'file' 
                      ? 'bg-secondary text-foreground' 
                      : 'hover:bg-secondary/50'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                  File
                </button>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <label className="flex items-center gap-1.5 sm:gap-2">
              <input
                type="checkbox"
                checked={urlSafe}
                onChange={(e) => setUrlSafe(e.target.checked)}
                className="rounded h-3.5 w-3.5 sm:h-4 sm:w-4"
              />
              <span>URL-safe</span>
            </label>
            
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {mode === 'encode' ? '🔒 Local' : '🔓 Local'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between h-10">
            <label className="text-sm font-medium">
              {mode === 'encode' ? 'Input' : 'Base64 String'}
            </label>
          </div>
          
          {mode === 'encode' && inputType === 'file' ? (
            <div className="h-[400px] border-2 border-dashed rounded-lg flex items-center justify-center bg-secondary/10">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-input"
                aria-label="Select files to encode"
              />
              <label htmlFor="file-input" className="cursor-pointer text-center">
                {fileData ? (
                  <div className="space-y-2">
                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="font-medium">{fileData.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(fileData.size / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click to change file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="font-medium">Click to upload file</p>
                    <p className="text-sm text-muted-foreground">
                      Any file type supported
                    </p>
                  </div>
                )}
              </label>
            </div>
          ) : (
            <textarea
              value={mode === 'encode' ? textInput : base64Input}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={
                mode === 'encode' 
                  ? 'Enter text to encode...' 
                  : 'Paste Base64 string to decode...'
              }
              className="w-full h-[300px] sm:h-[400px] p-3 sm:p-4 font-mono text-xs sm:text-sm border rounded-lg bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              spellCheck={false}
            />
          )}
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between h-10">
            <label className="text-sm font-medium">
              {mode === 'encode' ? 'Base64 Output' : 'Decoded Output'}
            </label>
            <div className="flex items-center gap-1">
              {result && inputType === 'file' && mode === 'encode' && (
                <button
                  onClick={() => {
                    const dataUri = getDataUri();
                    navigator.clipboard.writeText(dataUri);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2 py-1 text-[10px] sm:text-xs border rounded hover:bg-secondary"
                  title="Copy as Data URI"
                >
                  <span className="hidden sm:inline">Copy Data URI</span>
                  <span className="sm:hidden">Data URI</span>
                </button>
              )}
              <button
                onClick={handleCopy}
                disabled={!result}
                className="h-7 w-7 sm:h-8 sm:w-8 inline-flex items-center justify-center text-sm hover:bg-secondary rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
              <button
                onClick={handleDownload}
                disabled={!result}
                className="h-7 w-7 sm:h-8 sm:w-8 inline-flex items-center justify-center text-sm hover:bg-secondary rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
          
          {showPreview ? (
            <div className="h-[300px] sm:h-[400px] border rounded-lg overflow-hidden bg-secondary/10 flex items-center justify-center">
              <img 
                src={`data:image/png;base64,${base64Input}`} 
                alt="Preview" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <textarea
              value={result}
              readOnly
              placeholder={error || 'Output will appear here...'}
              className={`w-full h-[300px] sm:h-[400px] p-3 sm:p-4 font-mono text-xs sm:text-sm border rounded-lg bg-secondary/20 resize-none ${
                error ? 'text-destructive placeholder:text-destructive' : ''
              }`}
            />
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border">
          <ArrowUpDown className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Auto-detect Format</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Automatically detects if input is encoded or needs encoding
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">File Support</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Encode any file type including images, PDFs, and documents
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border sm:col-span-2 md:col-span-1">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Data URI Generator</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Generate data URIs for embedding in HTML/CSS
          </p>
        </div>
      </div>
    </div>
  );
}