import React, { useState, useCallback, useMemo } from 'react';
import { Copy, Download, Upload, ArrowUpDown, Check, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';

type Mode = 'encode' | 'decode';
type InputType = 'text' | 'file';

interface FileData {
  name: string;
  type: string;
  size: number;
  data: string;
}

export default function Base64Encoder() {
  const [mode, setMode] = useState<Mode>('encode');
  const [inputType, setInputType] = useState<InputType>('text');
  const [textInput, setTextInput] = useState('');
  const [base64Input, setBase64Input] = useState('');
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [urlSafe, setUrlSafe] = useState(false);

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
      } catch {
        // Not valid base64, keep in encode mode
      }
    }
  }, []);

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

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Base64 Encoder/Decoder</h1>
        <p className="text-muted-foreground">
          Encode and decode Base64 strings with support for text and files
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 p-4 rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMode('encode');
                  setError(null);
                }}
                className={`px-4 py-2 rounded-md transition-colors ${
                  mode === 'encode' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-secondary'
                }`}
              >
                Encode
              </button>
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={() => {
                  setMode('decode');
                  setError(null);
                  setInputType('text');
                }}
                className={`px-4 py-2 rounded-md transition-colors ${
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
              <div className="flex items-center gap-2 border-l pl-4">
                <button
                  onClick={() => setInputType('text')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    inputType === 'text' 
                      ? 'bg-secondary text-foreground' 
                      : 'hover:bg-secondary/50'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-1" />
                  Text
                </button>
                <button
                  onClick={() => setInputType('file')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    inputType === 'file' 
                      ? 'bg-secondary text-foreground' 
                      : 'hover:bg-secondary/50'
                  }`}
                >
                  <Upload className="w-4 h-4 inline mr-1" />
                  File
                </button>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={urlSafe}
                onChange={(e) => setUrlSafe(e.target.checked)}
                className="rounded"
              />
              URL-safe
            </label>
            
            <span className="text-xs text-muted-foreground">
              {mode === 'encode' ? '🔒 Encoding locally' : '🔓 Decoding locally'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {mode === 'encode' ? 'Input' : 'Base64 String'}
          </label>
          
          {mode === 'encode' && inputType === 'file' ? (
            <div className="h-[400px] border-2 border-dashed rounded-lg flex items-center justify-center bg-secondary/10">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-input"
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
              className="w-full h-[400px] p-4 font-mono text-sm border rounded-lg bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              spellCheck={false}
            />
          )}
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              {mode === 'encode' ? 'Base64 Output' : 'Decoded Output'}
            </label>
            <div className="flex items-center gap-2">
              {result && inputType === 'file' && mode === 'encode' && (
                <button
                  onClick={() => {
                    const dataUri = getDataUri();
                    navigator.clipboard.writeText(dataUri);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2 py-1 text-xs border rounded hover:bg-secondary"
                  title="Copy as Data URI"
                >
                  Copy Data URI
                </button>
              )}
              <button
                onClick={handleCopy}
                disabled={!result}
                className="p-2 text-sm hover:bg-secondary rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDownload}
                disabled={!result}
                className="p-2 text-sm hover:bg-secondary rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {showPreview ? (
            <div className="h-[400px] border rounded-lg overflow-hidden bg-secondary/10 flex items-center justify-center">
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
              className={`w-full h-[400px] p-4 font-mono text-sm border rounded-lg bg-secondary/20 resize-none ${
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

      {/* Features */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border">
          <ArrowUpDown className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Auto-detect Format</h3>
          <p className="text-sm text-muted-foreground">
            Automatically detects if input is encoded or needs encoding
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <ImageIcon className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">File Support</h3>
          <p className="text-sm text-muted-foreground">
            Encode any file type including images, PDFs, and documents
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <FileText className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Data URI Generator</h3>
          <p className="text-sm text-muted-foreground">
            Generate data URIs for embedding in HTML/CSS
          </p>
        </div>
      </div>
    </div>
  );
}