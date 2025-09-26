import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  File,
  FileArchive,
  FolderOpen,
  Loader2,
  Lock,
  Package,
  Shield,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Button } from "../ui/button";
import { ToolHeader, type Feature } from "../ui/ToolHeader";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { FileDropZone } from "../ui/FileDropZone";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";

import { cn } from "../../lib/utils";
import { captureError, captureEvent } from "../../lib/posthog";
import { useArchiveExtractor } from "../../hooks/useArchiveExtractor";
import type {
  ArchiveEngine,
  ArchiveFormat,
  ExtractRequest,
  ExtractResult,
  WorkerArchiveEntry,
} from "../../lib/archive/types";

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: FileNode[];
  size: number;
  lastModified?: Date | null;
  fileData?: Uint8Array;
}

interface GenericArchiveExtractorProps {
  format: string;
  formatName: string;
  formatDescription: string;
  acceptedExtensions: string;
  icon?: React.ElementType;
  features?: Feature[];
  faqs?: FAQItem[];
  relatedTools?: RelatedTool[];
}

interface ExtractionMetadata {
  engine: ArchiveEngine;
  format: ArchiveFormat;
  warnings: string[];
}

interface PendingPasswordState {
  file: File;
  message: string;
  attempts: number;
}

const defaultFeatures: Feature[] = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Extract instantly" },
  {
    icon: Eye,
    text: "Preview files",
    description: "View before extracting",
  },
];

const defaultRelatedTools: RelatedTool[] = [
  {
    id: "zip-extract",
    name: "ZIP Extract",
    description: "Extract ZIP compressed files",
    icon: FileArchive,
  },
  {
    id: "iso-extract",
    name: "ISO Extract",
    description: "Extract ISO disk images",
    icon: Package,
  },
  {
    id: "7z-extract",
    name: "7-Zip Extract",
    description: "Extract 7Z compressed archives",
    icon: FileArchive,
  },
];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value < 10 && exponent > 0 ? 1 : 0)} ${units[exponent]}`;
}

function buildFileTree(entries: WorkerArchiveEntry[]): FileNode[] {
  const root: FileNode[] = [];
  const nodeMap = new Map<string, FileNode>();

  const sortedEntries = [...entries].sort((a, b) => a.path.localeCompare(b.path));

  for (const entry of sortedEntries) {
    const normalizedPath = entry.isDirectory && entry.path.endsWith("/") ? entry.path.slice(0, -1) : entry.path;
    const segments = normalizedPath.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isLast = index === segments.length - 1;
      const isDirectory = isLast ? entry.isDirectory : true;

      let node = nodeMap.get(currentPath);
      if (!node) {
        node = {
          name: segment,
          path: currentPath,
          isDirectory,
          children: [],
          size: isLast && !isDirectory ? entry.size : 0,
          lastModified: entry.lastModified ? new Date(entry.lastModified) : null,
          fileData:
            isLast && !isDirectory && entry.data ? new Uint8Array(entry.data) : undefined,
        };
        nodeMap.set(currentPath, node);
        currentLevel.push(node);
      }

      if (isLast) {
        node.size = entry.size;
        node.lastModified = entry.lastModified ? new Date(entry.lastModified) : node.lastModified ?? null;
        if (!isDirectory && entry.data) {
          node.fileData = new Uint8Array(entry.data);
        }
        node.isDirectory = isDirectory;
      }

      if (node.isDirectory) {
        currentLevel = node.children;
      }
    });

    if (segments.length === 0 && entry.path) {
      // root-level file with no slash
      const leaf: FileNode = {
        name: entry.path,
        path: entry.path,
        isDirectory: entry.isDirectory,
        children: [],
        size: entry.size,
        lastModified: entry.lastModified ? new Date(entry.lastModified) : null,
        fileData: !entry.isDirectory && entry.data ? new Uint8Array(entry.data) : undefined,
      };
      root.push(leaf);
      nodeMap.set(entry.path, leaf);
    }
  }

  return root;
}

function flattenFiles(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  const walk = (items: FileNode[]) => {
    items.forEach((node) => {
      if (node.isDirectory) {
        walk(node.children);
      } else {
        files.push(node);
      }
    });
  };
  walk(nodes);
  return files;
}

function engineLabel(engine: ArchiveEngine): string {
  switch (engine) {
    case "libarchive":
      return "libarchive";
    case "sevenZip":
      return "7-Zip";
    case "native":
      return "Native decoder";
    default:
      return engine;
  }
}

export default function GenericArchiveExtractor({
  format,
  formatName,
  formatDescription,
  acceptedExtensions,
  icon: Icon = FileArchive,
  features,
  faqs,
  relatedTools,
}: GenericArchiveExtractorProps) {
  const { extract, preload, isReady } = useArchiveExtractor();

  const [files, setFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveName, setArchiveName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [metadata, setMetadata] = useState<ExtractionMetadata | null>(null);
  const [pendingPassword, setPendingPassword] = useState<PendingPasswordState | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setFiles([]);
    setSelectedFiles(new Set());
    setExpandedPaths(new Set());
    setMetadata(null);
  }, []);

  const handleExtractionResult = useCallback(
    (file: File, result: ExtractResult, attempt: { passwordUsed: boolean }) => {
      const extractFormat = (fmt?: ArchiveFormat) => {
        if (!fmt) return format;
        return fmt.format;
      };

      if (!result.ok) {
        if (result.code === "PASSWORD_REQUIRED") {
          setPendingPassword((prev) => {
            const attempts = (prev?.attempts ?? 0) + 1;
            captureEvent("archive_password_prompted", {
              tool: "generic-archive-extract",
              format: extractFormat(result.format),
              fileName: file.name,
              attempts,
            });
            return {
              file,
              message: result.message,
              attempts,
            };
          });
          setPasswordError(null);
        } else {
          const failureProps = {
            tool: "generic-archive-extract",
            format: extractFormat(result.format),
            fileName: file.name,
            stage: "extract",
            code: result.code,
            recoverable: !!result.recoverable,
          };
          captureEvent("archive_extract_failed", failureProps);
          setError(result.message);
          captureError(new Error(result.message), failureProps);
        }
        return;
      }

      captureEvent("archive_extract_succeeded", {
        tool: "generic-archive-extract",
        format: extractFormat(result.format),
        engine: result.engine,
        warnings: result.warnings.length,
        passwordUsed: attempt.passwordUsed,
        fileName: file.name,
        fileSize: file.size,
      });

      const tree = buildFileTree(result.entries);
      setFiles(tree);
      setExpandedPaths(new Set(tree.filter((node) => node.isDirectory).map((node) => node.path)));
      setSelectedFiles(new Set());
      setMetadata({ engine: result.engine, format: result.format, warnings: result.warnings });
      setPendingPassword(null);
      setPasswordError(null);
    },
    [format],
  );

  const readFileBuffer = useCallback(async (file: File) => {
    try {
      return await file.arrayBuffer();
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotReadableError") {
          throw new Error(
            "We couldn't read that file. On Windows this usually happens when the file is in use by another application or located in a protected folder. Please close any apps using it or copy it to a local folder and try again.",
          );
        }
        if (err.name === "SecurityError") {
          throw new Error(
            "The browser blocked access to this file. Try moving it to a different location on your computer and re-upload.",
          );
        }
      }
      throw err;
    }
  }, []);

  const performExtraction = useCallback(
    async (file: File, password?: string | null) => {
      setIsLoading(true);
      setError(null);
      setArchiveName(file.name);
      resetState();

      try {
        await preload();
        const buffer = await readFileBuffer(file);
        const request: ExtractRequest = {
          fileName: file.name,
          buffer,
          password: password ?? undefined,
        };

        const result = await extract(request);
        handleExtractionResult(file, result, { passwordUsed: !!password });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to extract archive";
        setError(message);
        captureError(err, {
          tool: "generic-archive-extract",
          format,
          fileName: file.name,
          stage: "read",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [extract, format, handleExtractionResult, preload, readFileBuffer, resetState],
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void performExtraction(file);
      }
    },
    [performExtraction],
  );

  const handleFilesSelected = useCallback(
    async (selected: File[]) => {
      const file = selected[0];
      if (file) {
        void performExtraction(file);
      }
    },
    [performExtraction],
  );

  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const toggleSelected = useCallback((path: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const nodes = flattenFiles(files);
    setSelectedFiles(new Set(nodes.map((node) => node.path)));
  }, [files]);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  const downloadFile = useCallback(async (node: FileNode) => {
    if (!node.fileData) return;

    try {
      const blob = new Blob([node.fileData]);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = node.name;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download file";
      setError(message);
      captureError(err, {
        tool: "generic-archive-extract",
        format,
        fileName: node.name,
        stage: "download",
      });
    }
  }, [format]);

  const downloadSelected = useCallback(() => {
    const nodes = flattenFiles(files).filter((node) => selectedFiles.has(node.path));
    nodes.forEach((node) => {
      void downloadFile(node);
    });
  }, [downloadFile, files, selectedFiles]);

  const metadataSummary = useMemo(() => {
    if (!metadata) return null;
    const warnings = metadata.warnings.filter((entry) => entry.trim().length > 0);
    return {
      engine: engineLabel(metadata.engine),
      warnings,
    };
  }, [metadata]);

  const handlePasswordSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!pendingPassword) return;
      const password = passwordInputRef.current?.value ?? "";
      if (!password && pendingPassword.attempts > 1) {
        setPasswordError("Password cannot be empty.");
        return;
      }
      setPasswordError(null);
      captureEvent("archive_password_submitted", {
        tool: "generic-archive-extract",
        format,
        fileName: pendingPassword.file.name,
        attempts: pendingPassword.attempts,
      });
      void performExtraction(pendingPassword.file, password);
    },
    [format, pendingPassword, performExtraction],
  );

  const handlePasswordDismiss = useCallback(() => {
    if (pendingPassword) {
      captureEvent("archive_password_dismissed", {
        tool: "generic-archive-extract",
        format,
        fileName: pendingPassword.file.name,
        attempts: pendingPassword.attempts,
      });
    }
    setPendingPassword(null);
    setPasswordError(null);
  }, [format, pendingPassword]);

  const warmupEngines = useCallback(() => {
    void preload();
  }, [preload]);

  useEffect(() => {
    if (pendingPassword) {
      if (passwordInputRef.current) {
        passwordInputRef.current.value = "";
      }
    }
  }, [pendingPassword]);

  const featureList = features ?? defaultFeatures;
  const relatedList = relatedTools ?? defaultRelatedTools;

  return (
    <section className="relative min-h-screen w-full">
      <div className="hidden sm:block fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.02]" />
        <div className="absolute top-16 right-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-24 left-1/4 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <ToolHeader
          title={{ highlight: "Extract", main: `${formatName} Archives` }}
          subtitle={formatDescription}
          badge={{
            text: `${formatName} Extractor • Online • Free`,
            icon: Icon as LucideIcon,
          }}
          features={featureList}
        />

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div onPointerEnter={warmupEngines} onFocusCapture={warmupEngines}>
              <FileDropZone
                acceptedTypes={acceptedExtensions}
                isDragging={isDragging}
                onDragStateChange={setIsDragging}
                onFilesSelected={handleFilesSelected}
                onFileInput={handleFileSelect}
                title={`Drop your ${format.toUpperCase()} archive here`}
                description="We extract everything directly in your browser."
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Extraction failed</p>
                  <p className="text-muted-foreground">{error}</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-3 rounded-md border border-muted bg-card p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isReady ? "Extracting archive…" : "Preparing extraction engines…"}</span>
              </div>
            )}

            {metadataSummary && (
              <div className="rounded-md border border-muted bg-card p-4 text-sm text-muted-foreground">
                <p>
                  Extraction engine: <span className="font-medium text-foreground">{metadataSummary.engine}</span>
                </p>
                {metadataSummary.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="font-medium text-foreground">Messages</p>
                    <ul className="space-y-1">
                      {metadataSummary.warnings.map((warning, idx) => (
                        <li key={`${warning}-${idx}`} className="text-xs leading-relaxed text-muted-foreground">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {files.length > 0 ? (
              <div className="rounded-md border border-muted bg-card">
                <div className="flex items-center justify-between border-b border-muted p-4">
                  <div>
                    <h2 className="text-base font-semibold">{archiveName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedFiles.size > 0
                        ? `${selectedFiles.size} file${selectedFiles.size === 1 ? "" : "s"} selected`
                        : "Select files to download"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select all
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={downloadSelected}
                      disabled={selectedFiles.size === 0}
                    >
                      <Download className="mr-2 h-4 w-4" /> Download selected
                    </Button>
                  </div>
                </div>

                <div className="max-h-[480px] overflow-auto text-sm">
                  <ul className="divide-y divide-muted/60">
                    {files.map((node) => (
                      <FileNodeRow
                        key={node.path}
                        node={node}
                        depth={0}
                        expandedPaths={expandedPaths}
                        selectedFiles={selectedFiles}
                        onToggleExpand={toggleExpanded}
                        onToggleSelect={toggleSelected}
                        onDownload={downloadFile}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-muted bg-card p-8 text-center text-sm text-muted-foreground">
                <FolderOpen className="mx-auto mb-3 h-8 w-8" />
                <p>Drop a {format.toUpperCase()} archive above to see its contents instantly.</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {faqs && faqs.length > 0 && <FAQ items={faqs} />}
            <RelatedTools tools={relatedList} />
          </div>
        </div>

        <Dialog open={pendingPassword !== null} onOpenChange={handlePasswordDismiss}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enter archive password</DialogTitle>
              <DialogDescription>{pendingPassword?.message}</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground" htmlFor="archive-password">
                  <Lock className="h-4 w-4" /> Password
                </label>
                <Input
                  id="archive-password"
                  type="password"
                  autoFocus
                  ref={passwordInputRef}
                  placeholder="Enter archive password"
                />
                {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={handlePasswordDismiss}>
                  Cancel
                </Button>
                <Button type="submit">Unlock</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

interface FileNodeRowProps {
  node: FileNode;
  depth: number;
  expandedPaths: Set<string>;
  selectedFiles: Set<string>;
  onToggleExpand: (path: string) => void;
  onToggleSelect: (path: string) => void;
  onDownload: (node: FileNode) => void;
}

function FileNodeRow({
  node,
  depth,
  expandedPaths,
  selectedFiles,
  onToggleExpand,
  onToggleSelect,
  onDownload,
}: FileNodeRowProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedFiles.has(node.path);

  const handleRowClick = () => {
    if (node.isDirectory) {
      onToggleExpand(node.path);
    } else {
      onToggleSelect(node.path);
    }
  };

  return (
    <li>
      <div
        className={cn(
          "flex items-center justify-between gap-4 px-4 py-3 transition-colors",
          isSelected ? "bg-muted" : "hover:bg-muted/70",
        )}
        style={{ paddingLeft: `${16 + depth * 20}px` }}
        onClick={handleRowClick}
        role="button"
        tabIndex={0}
        onKeyPress={(event) => {
          if (event.key === "Enter" || event.key === " ") handleRowClick();
        }}
      >
        <div className="flex flex-1 items-center gap-3">
          {node.isDirectory ? (
            <ChevronIcon expanded={isExpanded} />
          ) : (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] leading-[10px] text-muted-foreground">
              {isSelected ? "•" : ""}
            </span>
          )}
          {node.isDirectory ? (
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <File className="h-4 w-4 text-primary" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">{node.name}</p>
            <p className="text-xs text-muted-foreground">
              {node.isDirectory ? "Directory" : formatBytes(node.size)}
            </p>
          </div>
        </div>

        {!node.isDirectory && node.fileData && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={(event) => {
              event.stopPropagation();
              onDownload(node);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Save
          </Button>
        )}
      </div>

      {node.isDirectory && isExpanded && node.children.length > 0 && (
        <ul className="divide-y divide-muted/40">
          {node.children.map((child) => (
            <FileNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedFiles={selectedFiles}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
              onDownload={onDownload}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return expanded ? (
    <ChevronDown className="h-4 w-4 text-muted-foreground" />
  ) : (
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
  );
}
