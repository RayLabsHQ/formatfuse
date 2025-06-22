import React, { useState, useCallback, useMemo } from 'react';
import { Copy, RefreshCw, Check, Hash, Settings2, FileDown } from 'lucide-react';
import { v4 as uuidv4, v1 as uuidv1, v5 as uuidv5, v3 as uuidv3, validate, version as getVersion } from 'uuid';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';

type UuidVersion = 'v4' | 'v1' | 'v5' | 'v3';
type UuidFormat = 'standard' | 'uppercase' | 'no-hyphens' | 'braces' | 'urn';

interface GeneratedUuid {
  id: string;
  uuid: string;
  version: UuidVersion;
  timestamp: number;
}

export default function UuidGenerator() {
  const [version, setVersion] = useState<UuidVersion>('v4');
  const [format, setFormat] = useState<UuidFormat>('standard');
  const [count, setCount] = useState(1);
  const [namespace, setNamespace] = useState('');
  const [name, setName] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [uuids, setUuids] = useState<GeneratedUuid[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [validationInput, setValidationInput] = useState('');

  // Predefined namespaces for v3/v5
  const namespaces = {
    dns: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    url: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    oid: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
    x500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
  };

  const generateUuid = useCallback((ver: UuidVersion = version): string => {
    switch (ver) {
      case 'v1':
        return uuidv1();
      case 'v3':
        if (namespace && name) {
          const ns = namespaces[namespace as keyof typeof namespaces] || namespace;
          return uuidv3(name, ns);
        }
        return '';
      case 'v5':
        if (namespace && name) {
          const ns = namespaces[namespace as keyof typeof namespaces] || namespace;
          return uuidv5(name, ns);
        }
        return '';
      case 'v4':
      default:
        return uuidv4();
    }
  }, [version, namespace, name]);

  const formatUuid = useCallback((uuid: string, fmt: UuidFormat = format): string => {
    if (!uuid) return '';
    
    switch (fmt) {
      case 'uppercase':
        return uuid.toUpperCase();
      case 'no-hyphens':
        return uuid.replace(/-/g, '');
      case 'braces':
        return `{${uuid}}`;
      case 'urn':
        return `urn:uuid:${uuid}`;
      case 'standard':
      default:
        return uuid;
    }
  }, [format]);

  const handleGenerate = useCallback(() => {
    const newUuids: GeneratedUuid[] = [];
    const generateCount = bulkMode ? count : 1;
    
    for (let i = 0; i < generateCount; i++) {
      const uuid = generateUuid();
      if (uuid) {
        newUuids.push({
          id: Date.now().toString() + i,
          uuid,
          version,
          timestamp: Date.now()
        });
      }
    }
    
    if (bulkMode) {
      setUuids(prev => [...newUuids, ...prev].slice(0, 1000)); // Keep max 1000
    } else {
      setUuids(newUuids);
    }
  }, [generateUuid, version, bulkMode, count]);

  const handleCopy = useCallback(async (uuid: string, id: string) => {
    try {
      await navigator.clipboard.writeText(formatUuid(uuid));
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [formatUuid]);

  const handleCopyAll = useCallback(async () => {
    const allUuids = uuids.map(u => formatUuid(u.uuid)).join('\n');
    try {
      await navigator.clipboard.writeText(allUuids);
      setCopied('all');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [uuids, formatUuid]);

  const handleDownload = useCallback(() => {
    const content = uuids.map(u => formatUuid(u.uuid)).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uuids-${version}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [uuids, version, formatUuid]);

  const validationResult = useMemo(() => {
    if (!validationInput.trim()) return null;
    
    const isValid = validate(validationInput);
    if (!isValid) return { valid: false };
    
    const ver = getVersion(validationInput);
    return { valid: true, version: ver };
  }, [validationInput]);

  const needsNamespace = version === 'v3' || version === 'v5';

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <div className="p-1.5 sm:p-2 bg-primary/10 text-primary rounded-lg">
            <Hash className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          UUID Generator
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground px-2">
          Generate universally unique identifiers (UUIDs) in various formats
        </p>
      </div>

      {/* Settings - Mobile optimized */}
      <div className="mb-4 p-3 sm:p-4 rounded-lg border bg-card space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm sm:text-base">Generation Settings</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="version" className="text-sm">UUID Version</Label>
            <Select value={version} onValueChange={(v) => setVersion(v as UuidVersion)}>
              <SelectTrigger id="version" className="h-9 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v4">Version 4 (Random)</SelectItem>
                <SelectItem value="v1">Version 1 (Timestamp + MAC)</SelectItem>
                <SelectItem value="v3">Version 3 (MD5 Hash)</SelectItem>
                <SelectItem value="v5">Version 5 (SHA-1 Hash)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format" className="text-sm">Output Format</Label>
            <Select value={format} onValueChange={(f) => setFormat(f as UuidFormat)}>
              <SelectTrigger id="format" className="h-9 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="uppercase">UPPERCASE</SelectItem>
                <SelectItem value="no-hyphens">No Hyphens</SelectItem>
                <SelectItem value="braces">With Braces</SelectItem>
                <SelectItem value="urn">URN Format</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {needsNamespace && (
          <>
            <Separator />
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Version {version} requires a namespace and name to generate deterministic UUIDs
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="namespace" className="text-sm">Namespace</Label>
                  <Select value={namespace} onValueChange={setNamespace}>
                    <SelectTrigger id="namespace" className="h-9 sm:h-10">
                      <SelectValue placeholder="Select namespace" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dns">DNS</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="oid">OID</SelectItem>
                      <SelectItem value="x500">X500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm">Name</Label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name for UUID generation"
                    className="w-full h-9 sm:h-10 px-3 rounded-md border bg-background text-sm"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Switch
              id="bulk"
              checked={bulkMode}
              onCheckedChange={setBulkMode}
            />
            <Label htmlFor="bulk" className="text-sm cursor-pointer">
              Bulk Generation
            </Label>
          </div>
          
          {bulkMode && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label htmlFor="count" className="text-sm whitespace-nowrap">Count:</Label>
              <input
                id="count"
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-20 h-8 sm:h-9 px-2 rounded-md border bg-background text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <div className="mb-6 flex justify-center">
        <Button
          onClick={handleGenerate}
          size="lg"
          disabled={needsNamespace && (!namespace || !name)}
          className="w-full sm:w-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate UUID{bulkMode ? 's' : ''}
        </Button>
      </div>

      {/* Generated UUIDs - Mobile optimized */}
      {uuids.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm sm:text-base">Generated UUIDs</h3>
            {uuids.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAll}
                  className="text-xs sm:text-sm"
                >
                  {copied === 'all' ? (
                    <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 mr-1" />
                  )}
                  Copy All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="text-xs sm:text-sm"
                >
                  <FileDown className="w-3.5 h-3.5 mr-1" />
                  Download
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {uuids.map((item) => (
              <div
                key={item.id}
                className="p-2 sm:p-3 rounded-lg border bg-card flex items-center justify-between gap-2 group hover:bg-accent/5 transition-colors"
              >
                <code className="text-xs sm:text-sm font-mono break-all flex-1">
                  {formatUuid(item.uuid)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(item.uuid, item.id)}
                  className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                >
                  {copied === item.id ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UUID Validator - Mobile optimized */}
      <div className="p-3 sm:p-4 rounded-lg border bg-card space-y-3">
        <h3 className="font-semibold text-sm sm:text-base">UUID Validator</h3>
        <div className="space-y-2">
          <input
            type="text"
            value={validationInput}
            onChange={(e) => setValidationInput(e.target.value)}
            placeholder="Paste a UUID to validate..."
            className="w-full h-9 sm:h-10 px-3 rounded-md border bg-background text-sm font-mono"
          />
          {validationInput && validationResult && (
            <div className={`text-sm ${validationResult.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {validationResult.valid ? (
                <>✓ Valid UUID (Version {validationResult.version})</>
              ) : (
                <>✗ Invalid UUID format</>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Features - Mobile optimized */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-lg border">
          <Hash className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Multiple Versions</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Support for UUID v1, v3, v4, and v5 generation algorithms
          </p>
        </div>
        <div className="p-3 sm:p-4 rounded-lg border">
          <Settings2 className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base mb-1">Format Options</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Generate UUIDs in standard, uppercase, braces, or URN format
          </p>
        </div>
      </div>
    </div>
  );
}