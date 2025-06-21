import React, { useState, useCallback, useMemo } from 'react';
import { 
  Hash, Copy, Check, Upload, FileText, Shield, 
  AlertCircle, Loader2, Key, Binary, Info
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';

interface HashType {
  id: string;
  name: string;
  description: string;
  bits: number;
  color: string;
}

const hashTypes: HashType[] = [
  {
    id: 'md5',
    name: 'MD5',
    description: 'Message Digest 5 (128-bit, legacy)',
    bits: 128,
    color: 'text-amber-600 dark:text-amber-500'
  },
  {
    id: 'sha1',
    name: 'SHA-1',
    description: 'Secure Hash Algorithm 1 (160-bit, legacy)',
    bits: 160,
    color: 'text-orange-600 dark:text-orange-500'
  },
  {
    id: 'sha256',
    name: 'SHA-256',
    description: 'Secure Hash Algorithm 256-bit (recommended)',
    bits: 256,
    color: 'text-green-600 dark:text-green-500'
  },
  {
    id: 'sha384',
    name: 'SHA-384',
    description: 'Secure Hash Algorithm 384-bit',
    bits: 384,
    color: 'text-blue-600 dark:text-blue-500'
  },
  {
    id: 'sha512',
    name: 'SHA-512',
    description: 'Secure Hash Algorithm 512-bit (most secure)',
    bits: 512,
    color: 'text-purple-600 dark:text-purple-500'
  }
];

interface HashResult {
  type: string;
  hash: string;
  timeMs: number;
}

export default function HashGenerator() {
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [hmacKey, setHmacKey] = useState('');
  const [useHmac, setUseHmac] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<HashResult[]>([]);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [error, setError] = useState('');

  // Convert ArrayBuffer to hex string
  const bufferToHex = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Generate hash using Web Crypto API
  const generateHash = async (algorithm: string, data: ArrayBuffer): Promise<string> => {
    const startTime = performance.now();
    let hash: ArrayBuffer;

    if (useHmac && hmacKey) {
      // HMAC generation
      const encoder = new TextEncoder();
      const keyData = encoder.encode(hmacKey);
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: algorithm.toUpperCase() },
        false,
        ['sign']
      );
      
      hash = await crypto.subtle.sign('HMAC', key, data);
    } else {
      // Regular hash
      hash = await crypto.subtle.digest(algorithm.toUpperCase(), data);
    }

    const timeMs = performance.now() - startTime;
    return bufferToHex(hash);
  };

  // Process input and generate all hashes
  const processInput = useCallback(async () => {
    if (!input && !file) {
      setError('Please enter text or select a file');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResults([]);

    try {
      let data: ArrayBuffer;

      if (activeTab === 'text') {
        const encoder = new TextEncoder();
        data = encoder.encode(input);
      } else if (file) {
        data = await file.arrayBuffer();
      } else {
        throw new Error('No input provided');
      }

      const newResults: HashResult[] = [];

      // Generate hashes for all supported algorithms
      for (const hashType of hashTypes) {
        try {
          const algorithm = hashType.id === 'md5' ? 'SHA-256' : hashType.id.replace('sha', 'SHA-');
          
          // Note: Web Crypto API doesn't support MD5, so we'll skip it
          if (hashType.id === 'md5') {
            newResults.push({
              type: hashType.id,
              hash: 'MD5 not supported in browser (use SHA-256 instead)',
              timeMs: 0
            });
            continue;
          }

          const startTime = performance.now();
          const hash = await generateHash(algorithm, data);
          const timeMs = performance.now() - startTime;

          newResults.push({
            type: hashType.id,
            hash,
            timeMs
          });
        } catch (err) {
          console.error(`Error generating ${hashType.id} hash:`, err);
          newResults.push({
            type: hashType.id,
            hash: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            timeMs: 0
          });
        }
      }

      setResults(newResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate hashes');
    } finally {
      setIsProcessing(false);
    }
  }, [input, file, activeTab, useHmac, hmacKey]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  // Copy hash to clipboard
  const copyToClipboard = async (hash: string, type: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(`${type}-${hash}`);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // File size formatter
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check if algorithm is legacy/weak
  const isLegacyAlgorithm = (algorithm: string): boolean => {
    return ['md5', 'sha1'].includes(algorithm);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Hash Generator</h1>
        <p className="text-muted-foreground">
          Generate MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes
        </p>
      </div>

      {/* Input Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setActiveTab('text')}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg font-medium transition-colors",
              activeTab === 'text'
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            <FileText className="w-4 h-4 inline-block mr-2" />
            Text
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg font-medium transition-colors",
              activeTab === 'file'
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            <Upload className="w-4 h-4 inline-block mr-2" />
            File
          </button>
        </div>

        {/* Text Input */}
        {activeTab === 'text' && (
          <div className="space-y-2">
            <Label>Text to Hash</Label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text to generate hash..."
              className="min-h-[120px] font-mono"
              spellCheck={false}
            />
            <div className="text-xs text-muted-foreground">
              {input.length} characters
            </div>
          </div>
        )}

        {/* File Input */}
        {activeTab === 'file' && (
          <div className="space-y-2">
            <Label>File to Hash</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer"
              >
                {file ? (
                  <div>
                    <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to select file or drag and drop
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>
        )}

        {/* HMAC Options */}
        <div className="mt-4 p-4 rounded-lg border bg-secondary/50">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="use-hmac"
              checked={useHmac}
              onChange={(e) => setUseHmac(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="use-hmac" className="font-medium cursor-pointer">
              Use HMAC
            </label>
            <Key className="w-4 h-4 text-muted-foreground" />
          </div>
          {useHmac && (
            <div>
              <Input
                type="text"
                value={hmacKey}
                onChange={(e) => setHmacKey(e.target.value)}
                placeholder="Enter HMAC secret key..."
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                HMAC provides authentication and integrity
              </p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={processInput}
          disabled={isProcessing || (!input && !file)}
          className="w-full mt-4"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Hashes...
            </>
          ) : (
            <>
              <Hash className="w-4 h-4 mr-2" />
              Generate Hashes
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => {
            const hashType = hashTypes.find(h => h.id === result.type);
            const isLegacy = isLegacyAlgorithm(result.type);
            
            return (
              <div
                key={result.type}
                className="p-4 rounded-lg border hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn("font-semibold", hashType?.color)}>
                        {hashType?.name}
                      </h3>
                      {isLegacy && (
                        <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">
                          Legacy
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {hashType?.bits} bits
                      </span>
                      {result.timeMs > 0 && (
                        <span className="text-xs text-muted-foreground">
                          • {result.timeMs.toFixed(2)}ms
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-sm break-all select-all">
                      {result.hash}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hashType?.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(result.hash, result.type)}
                    className="h-8 w-8 flex-shrink-0"
                    disabled={result.hash.includes('Error')}
                  >
                    {copiedHash === `${result.type}-${result.hash}` ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Information Section */}
      <div className="mt-8 p-4 rounded-lg border bg-secondary/30">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">About Hash Functions</h3>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>SHA-256</strong> and above are recommended for security-critical applications
          </p>
          <p>
            • <strong>MD5</strong> and <strong>SHA-1</strong> are legacy algorithms, vulnerable to collision attacks
          </p>
          <p>
            • <strong>HMAC</strong> adds authentication by combining the hash with a secret key
          </p>
          <p>
            • All hashing is performed locally in your browser - no data is sent to any server
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border">
          <Shield className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Privacy First</h3>
          <p className="text-sm text-muted-foreground">
            All hashing happens in your browser. No data leaves your device.
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <Binary className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">Multiple Algorithms</h3>
          <p className="text-sm text-muted-foreground">
            Generate hashes using 5 different algorithms simultaneously.
          </p>
        </div>
        <div className="p-4 rounded-lg border">
          <Key className="w-8 h-8 mb-2 text-primary" />
          <h3 className="font-semibold mb-1">HMAC Support</h3>
          <p className="text-sm text-muted-foreground">
            Add authentication with HMAC using a secret key.
          </p>
        </div>
      </div>
    </div>
  );
}