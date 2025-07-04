import React, { useState, useRef, useCallback } from "react";
import {
  Download,
  X,
  FileArchive,
  FolderOpen,
  File,
  AlertCircle,
  Loader2,
  Shield,
  Zap,
  Eye,
  ChevronRight,
  ChevronDown,
  Package,
} from "lucide-react";
import type { ArchiveReader as ArchiveReaderType } from "libarchive-wasm";
import { Button } from "../ui/button";
import { ToolHeader } from "../ui/ToolHeader";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { FileDropZone } from "../ui/FileDropZone";
import { cn } from "../../lib/utils";

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: FileNode[];
  size: number;
  compressedSize: number;
  lastModified: Date;
  fileData?: Uint8Array;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Extract instantly" },
  {
    icon: Eye,
    text: "RAR v4 & v5",
    description: "Supports both versions",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "multi-extract",
    name: "Universal Extractor",
    description: "Extract any archive format",
    icon: FileArchive,
  },
  {
    id: "7z-extract",
    name: "Extract 7-Zip",
    description: "Extract 7Z archives",
    icon: FileArchive,
  },
  {
    id: "zip-extract",
    name: "Extract ZIP",
    description: "Extract ZIP archives",
    icon: FileArchive,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What is a RAR file?",
    answer:
      "RAR is a proprietary archive format that offers excellent compression ratios. RAR v5 is the latest version with improved compression, larger archive sizes, and better recovery records.",
  },
  {
    question: "Is it safe to extract RAR files online?",
    answer:
      "Yes, all extraction happens in your browser. Files are never uploaded to any server, ensuring complete privacy and security.",
  },
  {
    question: "What's the difference between RAR v4 and v5?",
    answer:
      "RAR v5 offers better compression, supports larger files (up to 8 exabytes), has improved recovery records, and uses AES-256 encryption. RAR v4 is limited to 4GB files.",
  },
  {
    question: "Can I extract password-protected RAR archives?",
    answer:
      "Currently, this tool does not support password-protected archives. This feature may be added in the future.",
  },
];

export default function RarExtractor() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [archiveName, setArchiveName] = useState<string>("");
  const [libarchiveMod, setLibarchiveMod] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      await loadArchive(file);
    },
    [],
  );

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const file = files[0];
    if (file) {
      await loadArchive(file);
    }
  }, []);

  const loadArchive = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setFiles([]);
    setArchiveName(file.name);
    setExpandedPaths(new Set());
    setSelectedFiles(new Set());

    try {
      // Read file data
      const data = await file.arrayBuffer();

      // Initialize libarchive if not already done
      let mod = libarchiveMod;
      if (!mod) {
        const { libarchiveWasm } = await import("libarchive-wasm");
        mod = await libarchiveWasm();
        setLibarchiveMod(mod);
      }

      // Create archive reader
      const { ArchiveReader } = await import("libarchive-wasm");
      const reader = new ArchiveReader(mod, new Int8Array(data));

      // Extract all entries and build file tree
      const entries: any[] = [];
      for (const entry of reader.entries()) {
        const pathname = entry.getPathname();
        const size = entry.getSize();
        const data = entry.readData();

        entries.push({
          path: pathname,
          size,
          compressed_size: size, // libarchive-wasm doesn't expose compressed size
          last_modified: new Date(), // libarchive-wasm doesn't expose modified time
          data,
        });
      }

      // Free the reader
      reader.free();

      // Build file tree
      const fileTree = buildFileTree(entries);
      setFiles(fileTree);
    } catch (err) {
      console.error("Archive error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to read archive. Make sure it's a valid archive file.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const buildFileTree = (entries: any[]): FileNode[] => {
    const root: FileNode[] = [];
    const nodeMap: Record<string, FileNode> = {};

    // Sort entries by path to ensure parents are created before children
    entries.sort((a, b) => a.path.localeCompare(b.path));

    entries.forEach((entry) => {
      const parts = entry.path.split("/").filter(Boolean);
      let currentLevel = root;
      let currentPath = "";

      parts.forEach((part: string, index: number) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLastPart = index === parts.length - 1;
        const isDirectory = entry.path.endsWith("/") || !isLastPart;

        if (!nodeMap[currentPath]) {
          const node: FileNode = {
            name: part,
            path: currentPath,
            isDirectory,
            children: [],
            size: isLastPart && !isDirectory ? entry.size : 0,
            compressedSize:
              isLastPart && !isDirectory ? entry.compressed_size || 0 : 0,
            lastModified: new Date(entry.last_modified || Date.now()),
            fileData: isLastPart && !isDirectory ? entry.data : undefined,
          };

          nodeMap[currentPath] = node;
          currentLevel.push(node);
        }

        if (nodeMap[currentPath].isDirectory) {
          currentLevel = nodeMap[currentPath].children;
        }
      });
    });

    return root;
  };

  const toggleExpanded = (path: string) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const toggleSelected = (path: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const allFiles = new Set<string>();
    const addFiles = (nodes: FileNode[]) => {
      nodes.forEach((node) => {
        if (!node.isDirectory) {
          allFiles.add(node.path);
        }
        if (node.children) {
          addFiles(node.children);
        }
      });
    };
    addFiles(files);
    setSelectedFiles(allFiles);
  };

  const downloadFile = async (node: FileNode) => {
    if (!node.fileData) return;

    try {
      const blob = new Blob([node.fileData]);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = node.name;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download file");
    }
  };

  const downloadSelected = async () => {
    const filesToDownload: FileNode[] = [];

    const collectFiles = (nodes: FileNode[]) => {
      nodes.forEach((node) => {
        if (selectedFiles.has(node.path) && !node.isDirectory) {
          filesToDownload.push(node);
        }
        if (node.children) {
          collectFiles(node.children);
        }
      });
    };

    collectFiles(files);

    for (const file of filesToDownload) {
      await downloadFile(file);
      // Small delay between downloads to avoid browser blocking
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const clearArchive = () => {
    setFiles([]);
    setError(null);
    setSelectedFiles(new Set());
    setExpandedPaths(new Set());
    setArchiveName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedPaths.has(node.path);
      const isSelected = selectedFiles.has(node.path);

      return (
        <div key={node.path}>
          <div
            className={cn(
              "flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors",
              isSelected && !node.isDirectory && "bg-primary/10",
            )}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
          >
            {node.isDirectory ? (
              <button
                onClick={() => toggleExpanded(node.path)}
                className="p-0.5 hover:bg-secondary rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelected(node.path)}
                className="rounded border-border"
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {node.isDirectory ? (
              <FolderOpen className="w-4 h-4 text-amber-500" />
            ) : (
              <File className="w-4 h-4 text-muted-foreground" />
            )}

            <span
              className="flex-1 text-sm truncate"
              onClick={() => {
                if (node.isDirectory) {
                  toggleExpanded(node.path);
                } else {
                  toggleSelected(node.path);
                }
              }}
            >
              {node.name}
            </span>

            {!node.isDirectory && (
              <>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(node.size)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(node);
                  }}
                  className="h-7 px-2"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>

          {node.isDirectory && isExpanded && node.children.length > 0 && (
            <div>{renderFileTree(node.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  const totalFiles = (() => {
    let count = 0;
    const countFiles = (nodes: FileNode[]) => {
      nodes.forEach((node) => {
        if (!node.isDirectory) count++;
        if (node.children) countFiles(node.children);
      });
    };
    countFiles(files);
    return count;
  })();

  const totalSize = (() => {
    let size = 0;
    const calculateSize = (nodes: FileNode[]) => {
      nodes.forEach((node) => {
        if (!node.isDirectory) size += node.size;
        if (node.children) calculateSize(node.children);
      });
    };
    calculateSize(files);
    return size;
  })();

  return (
    <div className="min-h-screen w-full">
      {/* RAR Archive-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] via-transparent to-accent/[0.01]" />
        <div className="absolute top-20 left-1/3 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {/* Hero Section with Features */}
        <ToolHeader
          title={{ highlight: "Extract", main: "RAR Archives" }}
          subtitle="Extract RAR v4 and v5 archives instantly in your browser. No uploads, 100% privacy guaranteed."
          badge={{
            text: "RAR Extractor • Online • Free • Unrar",
            icon: FileArchive,
          }}
          features={features}
        />

        {/* Main Interface */}
        <div className="space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".rar"
            className="hidden"
          />

          {/* Upload Area */}
          {files.length === 0 && !isLoading && (
            <div
              className="relative animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <FileDropZone
                onFilesSelected={handleFilesSelected}
                accept=".rar"
                multiple={false}
                isDragging={isDragging}
                onDragStateChange={setIsDragging}
                title="Drop your archive here or click to browse"
                subtitle="Supports RAR v4 and v5 archive formats"
              />
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium">Loading archive...</p>
              <p className="text-sm text-muted-foreground mt-2">
                This may take a moment for large files
              </p>
            </div>
          )}

          {/* Archive Content */}
          {files.length > 0 && !isLoading && (
            <div
              className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              {/* Header */}
              <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileArchive className="w-5 h-5 text-primary" />
                      {archiveName}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {totalFiles} files • {formatFileSize(totalSize)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={selectAll}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      Select All
                    </Button>
                    <Button
                      onClick={downloadSelected}
                      disabled={selectedFiles.size === 0}
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Selected ({selectedFiles.size})
                    </Button>
                    <Button
                      onClick={clearArchive}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              {/* File Tree */}
              <div className="p-6">
                <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border/50 bg-background/50">
                  {renderFileTree(files)}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-start gap-3 animate-fade-in-up">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* RAR Format Details */}
        <div className="space-y-6 mt-12">
          <h2 className="text-2xl font-semibold">About RAR Format</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <h3 className="font-semibold mb-2">RAR Versions</h3>
              <p className="text-sm text-muted-foreground">
                RAR v4 (legacy), RAR v5 (current) with improved compression
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <h3 className="font-semibold mb-2">Key Features</h3>
              <p className="text-sm text-muted-foreground">
                Solid compression, recovery records, AES-256 encryption
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <h3 className="font-semibold mb-2">File Support</h3>
              <p className="text-sm text-muted-foreground">
                Multi-volume archives, Unicode names, large file support
              </p>
            </div>
          </div>
        </div>

        {/* Related Tools */}
        <div className="mt-12 space-y-6">
          <RelatedTools tools={relatedTools} direction="responsive" />
        </div>

        {/* FAQ Section */}
        <div className="mt-12 space-y-6">
          <FAQ items={faqs} />
        </div>
      </div>
    </div>
  );
}
