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
  Sparkles,
  ChevronRight,
  ChevronDown,
  Package,
  DownloadIcon,
} from "lucide-react";
import JSZip from "jszip";
import { Button } from "../ui/button";
import { ToolHeader } from "../ui/ToolHeader";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { FileDropZone } from "../ui/FileDropZone";
import { cn } from "../../lib/utils";
import { captureError } from "../../lib/posthog";

interface ExtractedFile {
  name: string;
  path: string;
  size: number;
  compressedSize: number;
  lastModified: Date;
  isDirectory: boolean;
  content?: Blob;
  children?: ExtractedFile[];
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Extract instantly" },
  {
    icon: Sparkles,
    text: "All browsers",
    description: "Works everywhere",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "create-zip",
    name: "Create ZIP",
    description: "Compress files into ZIP archive",
    icon: FileArchive,
  },
  {
    id: "tar-extract",
    name: "Extract TAR",
    description: "Extract TAR archives",
    icon: Package,
  },
  {
    id: "7z-extract",
    name: "7-Zip Viewer",
    description: "View and extract 7z files",
    icon: FileArchive,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What file formats are supported?",
    answer:
      "This tool extracts ZIP files. For other formats like TAR, 7Z, or RAR, please use our dedicated tools for those formats.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "The tool can handle files up to 2GB, limited by browser memory. For larger files, consider using a desktop application.",
  },
  {
    question: "Can I extract password-protected ZIP files?",
    answer:
      "Currently, this tool doesn't support password-protected archives. We're working on adding this feature.",
  },
  {
    question: "Are my files secure?",
    answer:
      "Yes! All processing happens in your browser. No files are uploaded to any server, ensuring complete privacy.",
  },
];

export default function ZipExtract() {
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
      if (selectedFile && selectedFile.name.toLowerCase().endsWith(".zip")) {
        setFile(selectedFile);
        setError(null);
        setExtractedFiles([]);
        setExpandedPaths(new Set());
        setSelectedFiles(new Set());
      } else {
        setError("Please select a valid ZIP file");
      }
    },
    [],
  );

  const handleFilesSelected = useCallback((files: File[]) => {
    const selectedFile = files[0];
    if (selectedFile && selectedFile.name.toLowerCase().endsWith(".zip")) {
      setFile(selectedFile);
      setError(null);
      setExtractedFiles([]);
      setExpandedPaths(new Set());
      setSelectedFiles(new Set());
    } else {
      setError("Please select a valid ZIP file");
    }
  }, []);

  const extractZip = useCallback(async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);

    try {
      const zip = new JSZip();
      const zipData = await file.arrayBuffer();
      await zip.loadAsync(zipData);

      const files: ExtractedFile[] = [];
      const directories: Map<string, ExtractedFile> = new Map();

      // First pass: create all directories
      Object.keys(zip.files).forEach((path) => {
        const parts = path.split("/").filter(Boolean);
        let currentPath = "";

        parts.forEach((part, index) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          if (index < parts.length - 1 || path.endsWith("/")) {
            // This is a directory
            if (!directories.has(currentPath)) {
              directories.set(currentPath, {
                name: part,
                path: currentPath,
                size: 0,
                compressedSize: 0,
                lastModified: new Date(),
                isDirectory: true,
                children: [],
              });
            }
          }
        });
      });

      // Second pass: process files and link to directories
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          const parts = path.split("/").filter(Boolean);
          const fileName = parts[parts.length - 1];
          const content = await zipEntry.async("blob");

          const fileEntry: ExtractedFile = {
            name: fileName,
            path: path,
            size: content.size,
            compressedSize: 0, // JSZip doesn't expose compressed size directly
            lastModified: zipEntry.date,
            isDirectory: false,
            content: content,
          };

          if (parts.length === 1) {
            // Root level file
            files.push(fileEntry);
          } else {
            // File in a directory
            const parentPath = parts.slice(0, -1).join("/");
            const parent = directories.get(parentPath);
            if (parent) {
              parent.children!.push(fileEntry);
            }
          }
        }
      }

      // Third pass: link directories to their parents
      directories.forEach((dir, path) => {
        const parts = path.split("/").filter(Boolean);
        if (parts.length === 1) {
          // Root level directory
          files.push(dir);
        } else {
          // Subdirectory
          const parentPath = parts.slice(0, -1).join("/");
          const parent = directories.get(parentPath);
          if (parent) {
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
      captureError(err, {
        tool: "zip-extract",
        fileName: file.name,
        stage: "extract",
      });
      setError(
        err instanceof Error ? err.message : "Failed to extract ZIP file",
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
    if (isDirectory) return; // Don't select directories

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

    const link = document.createElement("a");
    link.href = URL.createObjectURL(file.content);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  const downloadSelected = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    try {
      if (selectedFiles.size === 1) {
        // Download single file
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

        const path = Array.from(selectedFiles)[0];
        const file = findFile(extractedFiles, path);
        if (file) {
          downloadFile(file);
        }
      } else {
        // Create new ZIP with selected files
        const zip = new JSZip();

        const findAndAddFile = (
          files: ExtractedFile[],
          path: string,
        ): boolean => {
          for (const file of files) {
            if (file.path === path && file.content) {
              zip.file(file.path, file.content);
              return true;
            }
            if (file.children) {
              if (findAndAddFile(file.children, path)) return true;
            }
          }
          return false;
        };

        selectedFiles.forEach((path) => {
          findAndAddFile(extractedFiles, path);
        });

        const blob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "selected-files.zip";
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } catch (err) {
      captureError(err, {
        tool: "zip-extract",
        fileName: file?.name,
        stage: "download-selected",
        selectionCount: selectedFiles.size,
      });
      setError(
        err instanceof Error ? err.message : "Failed to download selection",
      );
    }
  }, [selectedFiles, extractedFiles, downloadFile, file]);

  const downloadAll = useCallback(async () => {
    if (extractedFiles.length === 0) return;

    try {
      const zip = new JSZip();

      const addToZip = (files: ExtractedFile[]) => {
        files.forEach((entry) => {
          if (entry.isDirectory && entry.children) {
            addToZip(entry.children);
          } else if (entry.content) {
            zip.file(entry.path, entry.content);
          }
        });
      };

      addToZip(extractedFiles);

      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `extracted-${file?.name || "files.zip"}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      captureError(err, {
        tool: "zip-extract",
        fileName: file?.name,
        stage: "download-all",
        extractedCount: extractedFiles.length,
      });
      setError(
        err instanceof Error ? err.message : "Failed to download files",
      );
    }
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
                <div className="w-5" /> {/* Spacer for alignment */}
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
    let totalCompressed = 0;

    const countFiles = (files: ExtractedFile[]) => {
      files.forEach((file) => {
        if (!file.isDirectory) {
          totalFiles++;
          totalSize += file.size;
          totalCompressed += file.compressedSize;
        }
        if (file.children) {
          countFiles(file.children);
        }
      });
    };

    countFiles(extractedFiles);
    return { totalFiles, totalSize, totalCompressed };
  };

  const stats = getTotalStats();

  return (
    <div className="min-h-screen w-full">
      {/* Archive-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] via-transparent to-accent/[0.01]" />
        <div className="absolute top-20 right-1/3 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-10 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 lg:py-6 py-8 sm:py-12 relative z-10">
        {/* Hero Section with Features */}
        <ToolHeader
          title={{ highlight: "Extract", main: "ZIP Files" }}
          subtitle="Extract and download files from ZIP archives instantly in your browser. No uploads, no installations - 100% client-side processing."
          badge={{
            text: "ZIP Extractor • Online • Free • Unzip",
            icon: FileArchive,
          }}
          features={features}
        />

        {/* Main Interface */}
        <div className="space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File Upload Area */}
          {!file && (
            <div
              className="relative animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <FileDropZone
                onFilesSelected={handleFilesSelected}
                accept=".zip"
                multiple={false}
                isDragging={isDragging}
                onDragStateChange={setIsDragging}
                title="Drop your ZIP file here or click to browse"
                subtitle="Extract files from ZIP archives instantly"
              />
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
                  <FileArchive className="w-8 h-8 text-primary" />
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
                onClick={extractZip}
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
                      {formatFileSize(stats.totalSize)} uncompressed •{" "}
                      {Math.round(
                        ((stats.totalSize - stats.totalCompressed) /
                          stats.totalSize) *
                          100,
                      )}
                      % compression
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
                <h3 className="font-semibold">Upload ZIP file</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Select or drag and drop your ZIP archive
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
