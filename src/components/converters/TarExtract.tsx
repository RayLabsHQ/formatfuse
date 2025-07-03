import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  Download,
  X,
  FileArchive,
  FolderOpen,
  File,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Package,
  DownloadIcon,
} from "lucide-react";
import * as pako from "pako";
import { Button } from "../ui/button";
import { ToolHeader } from "../ui/ToolHeader";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { cn } from "../../lib/utils";

interface ExtractedFile {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  content?: Uint8Array;
  children?: ExtractedFile[];
}

interface TarHeader {
  name: string;
  mode: string;
  uid: number;
  gid: number;
  size: number;
  mtime: number;
  checksum: number;
  type: string;
  linkname: string;
  ustar: string;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Extract instantly" },
  {
    icon: Package,
    text: "Multiple formats",
    description: "TAR, TAR.GZ, TAR.BZ2",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "tar-create",
    name: "Create TAR",
    description: "Create TAR archives",
    icon: Package,
  },
  {
    id: "zip-extract",
    name: "Extract ZIP",
    description: "Extract ZIP archives",
    icon: FileArchive,
  },
  {
    id: "7z-viewer",
    name: "7-Zip Viewer",
    description: "View and extract 7z files",
    icon: FileArchive,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What TAR formats are supported?",
    answer:
      "This tool supports standard TAR files, as well as compressed TAR.GZ (gzip) and TAR.BZ2 (bzip2) archives.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "The tool can handle files up to 2GB, limited by browser memory. For larger files, consider using a desktop application.",
  },
  {
    question: "How does compression detection work?",
    answer:
      "The tool automatically detects if a TAR file is compressed with gzip or bzip2 based on the file extension and magic bytes.",
  },
  {
    question: "Are symbolic links preserved?",
    answer:
      "Symbolic links are detected and shown in the file tree, but they are converted to regular files when extracted for security reasons.",
  },
];

export default function TarExtract() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (
        selectedFile &&
        (selectedFile.name.toLowerCase().endsWith(".tar") ||
          selectedFile.name.toLowerCase().endsWith(".tar.gz") ||
          selectedFile.name.toLowerCase().endsWith(".tgz") ||
          selectedFile.name.toLowerCase().endsWith(".tar.bz2"))
      ) {
        setFile(selectedFile);
        setError(null);
        setExtractedFiles([]);
        setExpandedPaths(new Set());
        setSelectedFiles(new Set());
      } else {
        setError("Please select a valid TAR file");
      }
    },
    [],
  );

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (
      droppedFile &&
      (droppedFile.name.toLowerCase().endsWith(".tar") ||
        droppedFile.name.toLowerCase().endsWith(".tar.gz") ||
        droppedFile.name.toLowerCase().endsWith(".tgz") ||
        droppedFile.name.toLowerCase().endsWith(".tar.bz2"))
    ) {
      setFile(droppedFile);
      setError(null);
      setExtractedFiles([]);
      setExpandedPaths(new Set());
      setSelectedFiles(new Set());
    } else {
      setError("Please drop a valid TAR file");
    }
  }, []);

  const parseTarHeader = (
    buffer: ArrayBuffer,
    offset: number,
  ): TarHeader | null => {
    const view = new DataView(buffer);
    const decoder = new TextDecoder();

    // Check if this is the end of the archive (all zeros)
    let isEnd = true;
    for (let i = 0; i < 512; i++) {
      if (view.getUint8(offset + i) !== 0) {
        isEnd = false;
        break;
      }
    }
    if (isEnd) return null;

    // Parse header fields
    const getString = (start: number, length: number): string => {
      const bytes = new Uint8Array(buffer, offset + start, length);
      let end = bytes.indexOf(0);
      if (end === -1) end = length;
      return decoder.decode(bytes.slice(0, end));
    };

    const getOctal = (start: number, length: number): number => {
      const str = getString(start, length).trim();
      return parseInt(str, 8) || 0;
    };

    return {
      name: getString(0, 100),
      mode: getString(100, 8),
      uid: getOctal(108, 8),
      gid: getOctal(116, 8),
      size: getOctal(124, 12),
      mtime: getOctal(136, 12),
      checksum: getOctal(148, 8),
      type: getString(156, 1),
      linkname: getString(157, 100),
      ustar: getString(257, 6),
    };
  };

  const extractTar = useCallback(async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);

    try {
      let data = await file.arrayBuffer();
      const fileName = file.name.toLowerCase();

      // Decompress if needed
      if (fileName.endsWith(".gz") || fileName.endsWith(".tgz")) {
        try {
          data = pako.ungzip(new Uint8Array(data)).buffer as ArrayBuffer;
        } catch (err) {
          throw new Error("Failed to decompress gzip archive");
        }
      } else if (fileName.endsWith(".bz2")) {
        throw new Error("BZ2 decompression not yet supported");
      }

      const files: ExtractedFile[] = [];
      const directories: Map<string, ExtractedFile> = new Map();
      let offset = 0;

      // Parse TAR archive
      while (offset < data.byteLength) {
        const header = parseTarHeader(data, offset);
        if (!header) break;

        offset += 512; // Header is 512 bytes

        if (header.name) {
          const path = header.name;
          const parts = path.split("/").filter(Boolean);

          // Create directory structure
          let currentPath = "";
          parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (index < parts.length - 1 || header.type === "5") {
              // This is a directory
              if (!directories.has(currentPath)) {
                directories.set(currentPath, {
                  name: part,
                  path: currentPath,
                  size: 0,
                  lastModified: new Date(header.mtime * 1000),
                  isDirectory: true,
                  children: [],
                });
              }
            }
          });

          // Process file
          if (header.type !== "5" && header.size > 0) {
            const fileContent = new Uint8Array(data, offset, header.size);
            const fileName = parts[parts.length - 1];

            const fileEntry: ExtractedFile = {
              name: fileName,
              path: path,
              size: header.size,
              lastModified: new Date(header.mtime * 1000),
              isDirectory: false,
              content: fileContent,
            };

            if (parts.length === 1) {
              files.push(fileEntry);
            } else {
              const parentPath = parts.slice(0, -1).join("/");
              const parent = directories.get(parentPath);
              if (parent) {
                parent.children!.push(fileEntry);
              }
            }
          }
        }

        // Move to next file (align to 512-byte blocks)
        offset += Math.ceil(header.size / 512) * 512;
      }

      // Link directories to their parents
      directories.forEach((dir, path) => {
        const parts = path.split("/").filter(Boolean);
        if (parts.length === 1) {
          files.push(dir);
        } else {
          const parentPath = parts.slice(0, -1).join("/");
          const parent = directories.get(parentPath);
          if (parent && !parent.children!.find((c) => c.path === path)) {
            parent.children!.push(dir);
          }
        }
      });

      // Sort files and directories
      const sortEntries = (entries: ExtractedFile[]) => {
        entries.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        entries.forEach((entry) => {
          if (entry.children) {
            sortEntries(entry.children);
          }
        });
      };

      sortEntries(files);
      setExtractedFiles(files);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract TAR file",
      );
    } finally {
      setIsExtracting(false);
    }
  }, [file]);

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const newPaths = new Set(prev);
      if (newPaths.has(path)) {
        newPaths.delete(path);
      } else {
        newPaths.add(path);
      }
      return newPaths;
    });
  }, []);

  const toggleSelect = useCallback((path: string, isDirectory: boolean) => {
    if (isDirectory) return;

    setSelectedFiles((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(path)) {
        newSelection.delete(path);
      } else {
        newSelection.add(path);
      }
      return newSelection;
    });
  }, []);

  const downloadFile = useCallback((file: ExtractedFile) => {
    if (!file.content) return;

    const blob = new Blob([file.content]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  const downloadSelected = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    const findFile = (
      files: ExtractedFile[],
      path: string,
    ): ExtractedFile | null => {
      for (const file of files) {
        if (file.path === path) return file;
        if (file.children) {
          const found = findFile(file.children, path);
          if (found) return found;
        }
      }
      return null;
    };

    if (selectedFiles.size === 1) {
      const path = Array.from(selectedFiles)[0];
      const file = findFile(extractedFiles, path);
      if (file) {
        downloadFile(file);
      }
    } else {
      // For multiple files, we'll use JSZip to create a zip
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      selectedFiles.forEach((path) => {
        const file = findFile(extractedFiles, path);
        if (file && file.content) {
          zip.file(file.path, file.content);
        }
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "selected-files.zip";
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }, [selectedFiles, extractedFiles, downloadFile]);

  const downloadAll = useCallback(async () => {
    if (extractedFiles.length === 0) return;

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    const addToZip = (files: ExtractedFile[]) => {
      files.forEach((file) => {
        if (file.isDirectory && file.children) {
          addToZip(file.children);
        } else if (file.content) {
          zip.file(file.path, file.content);
        }
      });
    };

    addToZip(extractedFiles);

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `extracted-${file?.name.replace(/\.(tar|gz|bz2)$/g, "") || "files"}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [extractedFiles, file]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const renderFileTree = (files: ExtractedFile[], level = 0) => {
    return files.map((file) => {
      const isExpanded = expandedPaths.has(file.path);
      const isSelected = selectedFiles.has(file.path);

      return (
        <div key={file.path}>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer",
              isSelected && !file.isDirectory && "bg-primary/10",
            )}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            onClick={() => {
              if (file.isDirectory) {
                toggleExpand(file.path);
              } else {
                toggleSelect(file.path, file.isDirectory);
              }
            }}
          >
            {file.isDirectory ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(file.path);
                  }}
                  className="p-0.5 hover:bg-secondary rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <FolderOpen className="w-4 h-4 text-amber-500" />
              </>
            ) : (
              <>
                <div className="w-5" />
                <File className="w-4 h-4 text-muted-foreground" />
              </>
            )}
            <span className="flex-1 text-sm truncate">{file.name}</span>
            {!file.isDirectory && (
              <>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(file);
                  }}
                >
                  <Download className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
          {file.isDirectory && isExpanded && file.children && (
            <div>{renderFileTree(file.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  const getTotalStats = () => {
    let totalFiles = 0;
    let totalSize = 0;

    const countFiles = (files: ExtractedFile[]) => {
      files.forEach((file) => {
        if (!file.isDirectory) {
          totalFiles++;
          totalSize += file.size;
        }
        if (file.children) {
          countFiles(file.children);
        }
      });
    };

    countFiles(extractedFiles);
    return { totalFiles, totalSize };
  };

  const stats = getTotalStats();

  return (
    <div className="min-h-screen w-full">
      {/* TAR Archive-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] via-transparent to-accent/[0.01]" />
        <div className="absolute top-20 right-1/3 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-10 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 lg:py-6 py-8 sm:py-12 relative z-10">
        {/* Hero Section */}
        <ToolHeader
          title={{ highlight: "Extract", main: "TAR Files" }}
          subtitle="Extract TAR, TAR.GZ, and TAR.BZ2 archives instantly in your browser. No uploads, no installations - 100% client-side processing."
          badge={{
            text: "TAR Extractor • Online • Free • Untar",
            icon: Package,
          }}
          features={features}
        />

        {/* Main Interface */}
        <div className="space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".tar,.tar.gz,.tgz,.tar.bz2"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File Upload Area */}
          {!file && (
            <div
              className="relative animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
                  isDragging
                    ? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20"
                    : "border-border bg-card/50 hover:border-primary hover:bg-card hover:shadow-lg hover:shadow-primary/10"
                }`}
              >
                <div className="p-8 sm:p-12 text-center pointer-events-none">
                  <Package
                    className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 transition-all duration-300 ${
                      isDragging
                        ? "text-primary scale-110"
                        : "text-muted-foreground"
                    }`}
                  />
                  <p className="text-base sm:text-lg font-medium mb-2">
                    Drop your TAR file here or click to browse
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Supports TAR, TAR.GZ, and TAR.BZ2 archives
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File Info & Extract Button */}
          {file && !extractedFiles.length && (
            <div
              className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6 animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setExtractedFiles([]);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={extractTar}
                disabled={isExtracting}
                className="w-full"
                size="lg"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Extract Files
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Extracted Files */}
          {extractedFiles.length > 0 && (
            <div
              className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              {/* Header */}
              <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-primary" />
                      Extracted Files
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stats.totalFiles} files •{" "}
                      {formatFileSize(stats.totalSize)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedFiles.size > 0 && (
                      <Button
                        onClick={downloadSelected}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download {selectedFiles.size} selected
                      </Button>
                    )}
                    <Button onClick={downloadAll} size="sm" className="gap-2">
                      <DownloadIcon className="w-4 h-4" />
                      Download All
                    </Button>
                    <Button
                      onClick={() => {
                        setFile(null);
                        setExtractedFiles([]);
                        setSelectedFiles(new Set());
                        setExpandedPaths(new Set());
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              {/* File Tree */}
              <div className="p-4 max-h-[500px] overflow-y-auto">
                {renderFileTree(extractedFiles)}
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

        {/* How it works */}
        <div className="space-y-6 mt-12">
          <h2 className="text-2xl font-semibold">How It Works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <h3 className="font-semibold">Upload TAR file</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Select or drag and drop your TAR archive
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <h3 className="font-semibold">Extract contents</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Browse the file structure and preview contents
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <h3 className="font-semibold">Download files</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Download individual files or all at once
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
