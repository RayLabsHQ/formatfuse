import React, { useState, useCallback, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { 
  Hash, Copy, Check, Upload, FileText, Shield, 
  AlertCircle, Loader2, Key, Binary, Info, Settings, ChevronDown
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';
import {
  MobileToolLayout,
  MobileToolHeader,
  MobileToolContent,
  BottomSheet,
  ActionButton,
  ActionIconButton,
  MobileTabs,
  MobileTabsList,
  MobileTabsTrigger,
  MobileTabsContent,
  MobileFileUpload,
  CollapsibleSection,
  MobileActionBar
} from '../ui/mobile';

interface HashType {
  id: string;
  name: string;
  description: string;
  bits: number;
  color: string;
  webCryptoAlg: string | null; // null for algorithms not directly supported by Web Crypto digest (like MD5)
}

const hashTypes: HashType[] = [
  {
    id: 'md5',
    name: 'MD5',
    description: '128-bit. Legacy, not secure for most uses.',
    bits: 128,
    color: 'text-rose-600 dark:text-rose-500',
    webCryptoAlg: null, // MD5 not in Web Crypto API
  },
  {
    id: 'sha1',
    name: 'SHA-1',
    description: '160-bit. Legacy, deprecated for security.',
    bits: 160,
    color: 'text-amber-600 dark:text-amber-500',
    webCryptoAlg: 'SHA-1',
  },
  {
    id: 'sha256',
    name: 'SHA-256',
    description: '256-bit. Widely used, recommended standard.',
    bits: 256,
    color: 'text-green-600 dark:text-green-500',
    webCryptoAlg: 'SHA-256',
  },
  {
    id: 'sha384',
    name: 'SHA-384',
    description: '384-bit. Higher security variant.',
    bits: 384,
    color: 'text-blue-600 dark:text-blue-500',
    webCryptoAlg: 'SHA-384',
  },
  {
    id: 'sha512',
    name: 'SHA-512',
    description: '512-bit. Very high security, robust.',
    bits: 512,
    color: 'text-purple-600 dark:text-purple-500',
    webCryptoAlg: 'SHA-512',
  }
];

interface HashResult {
  typeId: string;
  hash: string;
  timeMs: number;
}

export default function HashGenerator() {
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
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [hmacKey, setHmacKey] = useState('');
  const [useHmac, setUseHmac] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<HashResult[]>([]);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [error, setError] = useState('');
  const [mobileTab, setMobileTab] = useState<'input' | 'results'>('input');
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [expandedResults, setExpandedResults] = useState<string[]>([]);

  const bufferToHex = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const generateSingleHash = async (algorithm: string, data: ArrayBuffer, hmacSecret?: string): Promise<string> => {
    if (hmacSecret) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(hmacSecret);
      const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: algorithm }, false, ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
      return bufferToHex(signature);
    } else {
      const hashBuffer = await crypto.subtle.digest(algorithm, data);
      return bufferToHex(hashBuffer);
    }
  };

  const processInput = useCallback(async () => {
    if (activeTab === 'text' && !input) {
      setError('Please enter text to hash.');
      return;
    }
    if (activeTab === 'file' && !file) {
      setError('Please select a file to hash.');
      return;
    }
    if (useHmac && !hmacKey) {
      setError('Please enter an HMAC key or disable HMAC.')
      return;
    }

    setIsProcessing(true);
    setError('');
    setResults([]);

    try {
      let dataBuffer: ArrayBuffer;
      if (activeTab === 'text') {
        const encoded = new TextEncoder().encode(input);
        dataBuffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
      } else if (file) {
        dataBuffer = await file.arrayBuffer();
      } else {
        throw new Error('No input data available.');
      }

      const newResults: HashResult[] = [];
      for (const hashType of hashTypes) {
        const startTime = performance.now();
        let hashValue = '';
        try {
          if (hashType.webCryptoAlg) {
            hashValue = await generateSingleHash(hashType.webCryptoAlg, dataBuffer, useHmac ? hmacKey : undefined);
          } else if (hashType.id === 'md5') {
            // MD5 is not natively supported by Web Crypto API for digest.
            // For a real app, you might use a library or inform the user.
            hashValue = 'MD5 not supported via Web Crypto API';
             if (useHmac) hashValue = 'MD5-HMAC not supported via Web Crypto API'
          }
        } catch (err) {
          console.error(`Error generating ${hashType.name} hash:`, err);
          hashValue = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
        const timeMs = performance.now() - startTime;
        newResults.push({ typeId: hashType.id, hash: hashValue, timeMs });
      }
      setResults(newResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process input.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [input, file, activeTab, useHmac, hmacKey]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setFileSize(formatFileSize(selectedFile.size));
      setError('');
      if (activeTab === 'file') setInput(''); // Clear text input if switching to file and selecting one
    } else {
      setFile(null);
      setFileName('');
      setFileSize('');
    }
  };

  const copyToClipboard = async (hash: string, type: string) => {
    if (hash.toLowerCase().includes('error') || hash.toLowerCase().includes('not supported')) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(`${type}-${hash}`);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (err) {
      console.error('Failed to copy hash:', err);
      setError('Failed to copy hash to clipboard.');
    }
  };

  const isLegacyAlgorithm = (algorithmId: string): boolean => {
    return ['md5', 'sha1'].includes(algorithmId);
  };
  
  const toggleResultExpansion = (typeId: string) => {
    setExpandedResults(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  // Mobile layout
  if (isMobile) {
    return (
      <MobileToolLayout>
        <MobileToolHeader
          title="Hash Generator"
          description="Generate cryptographic hashes"
          action={
            <ActionIconButton
              onClick={() => setShowSettingsSheet(true)}
              icon={<Settings />}
              label="Settings"
              variant="ghost"
            />
          }
        />

        <MobileTabs value={mobileTab} onValueChange={(v) => setMobileTab(v as 'input' | 'results')} defaultValue="input">
          <div className="px-4 pt-2">
            <MobileTabsList variant="default">
              <MobileTabsTrigger value="input">Input</MobileTabsTrigger>
              <MobileTabsTrigger value="results" badge={results.length > 0 ? results.length : undefined}>
                Results
              </MobileTabsTrigger>
            </MobileTabsList>
          </div>

          <MobileTabsContent value="input">
            <MobileToolContent>
              {/* Input type tabs */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'text' | 'file')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="text">
                    <FileText className="w-4 h-4 mr-2" /> Text
                  </TabsTrigger>
                  <TabsTrigger value="file">
                    <Upload className="w-4 h-4 mr-2" /> File
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="text" className="space-y-2">
                  <Label htmlFor="mobile-text-input">Text to Hash</Label>
                  <Textarea
                    id="mobile-text-input"
                    value={input}
                    onChange={(e) => {setInput(e.target.value); if(activeTab==='text') setFile(null); setFileName(''); setFileSize('');}}
                    placeholder="Enter or paste text here..."
                    className="min-h-[200px] font-mono text-sm"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">{input.length} characters</p>
                </TabsContent>
                
                <TabsContent value="file" className="space-y-2">
                  <Label>File to Hash</Label>
                  <MobileFileUpload
                    onFileSelect={(files) => {
                      const selectedFile = files[0];
                      if (selectedFile) {
                        setFile(selectedFile);
                        setFileName(selectedFile.name);
                        setFileSize(formatFileSize(selectedFile.size));
                        setError('');
                        if (activeTab === 'file') setInput('');
                      }
                    }}
                    selectedFile={file}
                    onClear={() => {
                      setFile(null);
                      setFileName('');
                      setFileSize('');
                    }}
                    compact={false}
                  />
                </TabsContent>
              </Tabs>

              {/* HMAC option */}
              <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <Label htmlFor="mobile-use-hmac" className="flex items-center gap-2 cursor-pointer">
                    <Key className="w-4 h-4" />
                    Use HMAC
                  </Label>
                  <Switch id="mobile-use-hmac" checked={useHmac} onCheckedChange={setUseHmac} />
                </div>
                {useHmac && (
                  <div>
                    <Input
                      type="text"
                      value={hmacKey}
                      onChange={(e) => setHmacKey(e.target.value)}
                      placeholder="Enter HMAC secret key"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Keep this key confidential</p>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </MobileToolContent>
          </MobileTabsContent>

          <MobileTabsContent value="results">
            <MobileToolContent>
              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((result) => {
                    const hashType = hashTypes.find(h => h.id === result.typeId);
                    if (!hashType) return null;
                    const isLegacy = isLegacyAlgorithm(hashType.id);
                    const canCopy = !(result.hash.toLowerCase().includes('error') || result.hash.toLowerCase().includes('not supported'));
                    const isExpanded = expandedResults.includes(hashType.id);

                    return (
                      <div key={hashType.id} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleResultExpansion(hashType.id)}
                          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-left">
                            <span className={cn("font-medium", hashType.color)}>
                              {hashType.name}
                            </span>
                            {isLegacy && (
                              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
                                Legacy
                              </Badge>
                            )}
                          </div>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        </button>
                        
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {hashType.bits}-bit • {result.timeMs.toFixed(2)}ms
                              </p>
                              {canCopy && (
                                <ActionIconButton
                                  onClick={() => copyToClipboard(result.hash, hashType.name)}
                                  icon={copiedHash === `${hashType.name}-${result.hash}` ? <Check /> : <Copy />}
                                  label="Copy"
                                  size="sm"
                                  variant="ghost"
                                />
                              )}
                            </div>
                            <p className={cn(
                              "font-mono text-xs break-all select-all p-3 rounded-md border",
                              canCopy ? "bg-muted/50" : "bg-destructive/10 text-destructive-foreground/80"
                            )}>
                              {result.hash}
                            </p>
                            <p className="text-xs text-muted-foreground">{hashType.description}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Hash className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-muted-foreground">No hashes generated yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Go to Input tab to generate hashes</p>
                </div>
              )}
            </MobileToolContent>
          </MobileTabsContent>
        </MobileTabs>

        {/* Generate button - sticky at bottom */}
        <MobileActionBar>
          <ActionButton
            onClick={() => {
              processInput();
              if (results.length === 0) {
                setTimeout(() => setMobileTab('results'), 500);
              }
            }}
            disabled={isProcessing || (activeTab === 'text' && !input && !file) || (activeTab === 'file' && !file) || (useHmac && !hmacKey)}
            icon={isProcessing ? <Loader2 className="animate-spin" /> : <Hash />}
            label={isProcessing ? "Processing..." : "Generate Hashes"}
            variant="primary"
            fullWidth
          />
        </MobileActionBar>

        {/* Settings bottom sheet */}
        <BottomSheet
          open={showSettingsSheet}
          onOpenChange={setShowSettingsSheet}
          title="About Hash Functions"
        >
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Security Recommendations</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Use SHA-256 or higher for new applications</li>
                <li>• MD5 and SHA-1 are legacy algorithms with vulnerabilities</li>
                <li>• HMAC adds authentication with a secret key</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Privacy</h3>
              <p className="text-muted-foreground">
                All hashing is performed locally in your browser. No data is sent to any server.
              </p>
            </div>
          </div>
        </BottomSheet>
      </MobileToolLayout>
    );
  }

  // Desktop layout
  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Hash Generator</h1>
        <p className="text-muted-foreground mt-2">
          Generate various cryptographic hashes for text or files.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Hash className="w-5 h-5" /> Input & Configuration
          </CardTitle>
          <CardDescription>
            Choose input type, provide data, and configure hashing options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'text' | 'file')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">
                <FileText className="w-4 h-4 mr-2" /> Text Input
              </TabsTrigger>
              <TabsTrigger value="file">
                <Upload className="w-4 h-4 mr-2" /> File Input
              </TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="text-input">Text to Hash</Label>
                <Textarea
                  id="text-input"
                  value={input}
                  onChange={(e) => {setInput(e.target.value); if(activeTab==='text') setFile(null); setFileName(''); setFileSize('');}}
                  placeholder="Enter or paste text here..."
                  className="min-h-[150px] font-mono text-sm"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">{input.length} characters</p>
              </div>
            </TabsContent>
            <TabsContent value="file" className="mt-4">
              <Label htmlFor="file-input-control">File to Hash</Label>
              <Input
                id="file-input-control"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Select files to hash"
              />
              <label 
                htmlFor="file-input-control"
                className={cn(
                  "mt-1 flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer",
                  "bg-muted/20 hover:bg-muted/50 border-muted-foreground/30 hover:border-primary/50 transition-colors"
                )}
              >
                {file && fileName ? (
                  <div className="text-center p-4">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-primary" />
                    <p className="font-semibold text-sm">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{fileSize}</p>
                    <Button variant="link" size="sm" className="text-xs mt-1" onClick={(e) => { e.preventDefault(); setFile(null); setFileName(''); setFileSize(''); (document.getElementById('file-input-control') as HTMLInputElement).value = ''; }}>
                      Clear file
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to browse or drag & drop</p>
                    <p className="text-xs text-muted-foreground">Max file size: (Browser dependent)</p>
                  </div>
                )}
              </label>
            </TabsContent>
          </Tabs>
          
          <Separator />

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Switch id="use-hmac" checked={useHmac} onCheckedChange={setUseHmac} />
              <Label htmlFor="use-hmac" className="cursor-pointer flex items-center gap-1">
                <Key className="w-4 h-4 text-muted-foreground" /> Use HMAC (Keyed-Hash)
              </Label>
            </div>
            {useHmac && (
              <div className="space-y-1">
                <Input
                  type="text"
                  value={hmacKey}
                  onChange={(e) => setHmacKey(e.target.value)}
                  placeholder="Enter HMAC secret key"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">The secret key for HMAC. Keep this confidential.</p>
              </div>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

        </CardContent>
        <CardFooter>
          <Button
            onClick={processInput}
            disabled={isProcessing || (activeTab === 'text' && !input && !file) || (activeTab === 'file' && !file) || (useHmac && !hmacKey)}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Hash className="w-5 h-5 mr-2" />
                Generate Hashes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {results.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Hash Results</h2>
          {results.map((result) => {
            const hashType = hashTypes.find(h => h.id === result.typeId);
            if (!hashType) return null;
            const isLegacy = isLegacyAlgorithm(hashType.id);
            const canCopy = !(result.hash.toLowerCase().includes('error') || result.hash.toLowerCase().includes('not supported'));

            return (
              <Card key={hashType.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className={cn("text-lg flex items-center", hashType.color)}>
                      {hashType.name}
                      {isLegacy && <Badge variant="outline" className="ml-2 text-xs border-amber-500/50 text-amber-600 dark:border-amber-600/50 dark:text-amber-500">Legacy</Badge>}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(result.hash, hashType.name)}
                      disabled={!canCopy}
                      aria-label={`Copy ${hashType.name} hash`}
                    >
                      {copiedHash === `${hashType.name}-${result.hash}` ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    {hashType.bits}-bit hash. {result.timeMs > 0 && `Generated in ${result.timeMs.toFixed(2)}ms.`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className={cn(
                    "font-mono text-sm break-all select-all p-3 rounded-md border",
                    canCopy ? "bg-muted/50" : "bg-destructive/10 text-destructive-foreground/80"
                  )}>
                    {result.hash}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">{hashType.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Info className="w-5 h-5" /> About Hash Functions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Cryptographic hash functions produce a fixed-size string (hash) from input data.</p>
          <p>• <strong>SHA-256</strong> and above are generally recommended for new applications.</p>
          <p>• <strong>MD5</strong> and <strong>SHA-1</strong> are considered insecure for many purposes due to collision vulnerabilities.</p>
          <p>• <strong>HMAC</strong> combines a hash function with a secret key for message authentication.</p>
          <p>• All hashing is performed locally in your browser. No data is sent to any server.</p>
        </CardContent>
      </Card>

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Client-Side Security</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Your data never leaves your browser. All hashing is done locally.
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Binary className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Multiple Algorithms</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Supports MD5 (info only), SHA-1, SHA-256, SHA-384, and SHA-512.
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Key className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">HMAC Support</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Generate keyed hashes (HMAC) for enhanced message integrity and authentication.
          </p>
        </div>
      </div>
    </div>
  );
}