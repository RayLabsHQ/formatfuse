import React, { useState, useCallback, useMemo } from "react";
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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
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

  const startExtraction = useCallback(async (zipFile: File) => {
    setFile(zipFile);
    setError(null);
    setExtractedFiles([]);
    setExpandedPaths(new Set());
    setSelectedFiles(new Set());
    setIsExtracting(true);

    try {
      const zip = new JSZip();
      const zipData = await zipFile.arrayBuffer();
      await zip.loadAsync(zipData);

      const files: ExtractedFile[] = [];
      const directories: Map<string, ExtractedFile> = new Map();

      Object.keys(zip.files).forEach((path) => {
        const parts = path.split("/").filter(Boolean);
        let currentPath = "";

        parts.forEach((part, index) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          if (index < parts.length - 1 || path.endsWith("/")) {
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

      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          const parts = path.split("/").filter(Boolean);
          const fileName = parts[parts.length - 1];
          const content = await zipEntry.async("blob");

          const fileEntry: ExtractedFile = {
            name: fileName,
            path,
            size: content.size,
            compressedSize: 0,
            lastModified: zipEntry.date,
            isDirectory: false,
            content,
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

      directories.forEach((dir, path) => {
        const parts = path.split("/").filter(Boolean);
        if (parts.length === 1) {
          files.push(dir);
        } else {
          const parentPath = parts.slice(0, -1).join("/");
          const parent = directories.get(parentPath);
          if (parent) {
            parent.children!.push(dir);
          }
        }
      });

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
        fileName: zipFile.name,
        stage: "extract",
      });
      setError(err instanceof Error ? err.message : "Failed to extract ZIP file");
    } finally {
      setIsExtracting(false);
    }
  }, [captureError]);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const selectedFile = files[0];
      if (selectedFile && selectedFile.name.toLowerCase().endsWith(".zip")) {
        void startExtraction(selectedFile);
      } else {
        setError("Please select a valid ZIP file");
      }
    },
    [startExtraction],
  );

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
    return files.map((entry) => {
      const isExpanded = expandedPaths.has(entry.path);
      const isSelected = selectedFiles.has(entry.path);
      const indent = level * 20;

      return (
        <div key={entry.path} className="border-b border-border/20 last:border-b-0">
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 transition-colors",
              entry.isDirectory ? "cursor-pointer hover:bg-muted/40" : "cursor-pointer hover:bg-muted/40",
              isSelected && !entry.isDirectory && "bg-primary/10",
            )}
            onClick={() => {
              if (entry.isDirectory) {
                toggleExpand(entry.path);
              } else {
                toggleSelect(entry.path, entry.isDirectory);
              }
            }}
          >
            {entry.isDirectory ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpand(entry.path);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <FolderOpen className="h-4 w-4 text-primary" />
              </>
            ) : (
              <>
                <RadioGroup
                  aria-label={`Selection toggle for ${entry.name}`}
                  value={isSelected ? "selected" : "unselected"}
                  onValueChange={(value) => {
                    if (value === "selected" && !isSelected) {
                      toggleSelect(entry.path, entry.isDirectory);
                    }
                  }}
                  className="grid place-items-center"
                >
                  <RadioGroupItem
                    value="selected"
                    className="size-4 border-muted-foreground/50 bg-background/70 text-primary data-[state=unchecked]:border-muted-foreground/60 data-[state=unchecked]:bg-background/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary/15"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isSelected) {
                        toggleSelect(entry.path, entry.isDirectory);
                      }
                    }}
                  />
                </RadioGroup>
                <File className="h-4 w-4 text-muted-foreground" />
              </>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
              {entry.isDirectory ? (
                <p className="text-xs text-muted-foreground">Directory</p>
              ) : (
                <p className="text-xs text-muted-foreground">{formatFileSize(entry.size)}</p>
              )}
            </div>
            {!entry.isDirectory && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-2"
                onClick={(event) => {
                  event.stopPropagation();
                  downloadFile(entry);
                }}
              >
                <Download className="h-4 w-4" />
                Save
              </Button>
            )}
          </div>
          {entry.isDirectory && isExpanded && entry.children && entry.children.length > 0 && (
            <div>{renderFileTree(entry.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  const stats = useMemo(() => {
    let totalFiles = 0;
    let totalSize = 0;
    let totalCompressed = 0;

    const countFiles = (files: ExtractedFile[]) => {
      files.forEach((entry) => {
        if (!entry.isDirectory) {
          totalFiles += 1;
          totalSize += entry.size;
          totalCompressed += entry.compressedSize;
        }
        if (entry.children) {
          countFiles(entry.children);
        }
      });
    };

    countFiles(extractedFiles);

    const compressionRatio = totalSize > 0
      ? Math.max(0, Math.round(((totalSize - totalCompressed) / totalSize) * 100))
      : null;

    return { totalFiles, totalSize, totalCompressed, compressionRatio };
  }, [extractedFiles]);

  return (
    <section className="relative min-h-screen w-full">
      <div className="hidden sm:block fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div className="absolute top-20 right-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-24 left-10 h-80 w-80 rounded-full bg-accent/8 blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <ToolHeader
          title={{ highlight: "Extract", main: "ZIP Files" }}
          subtitle="Extract and download files from ZIP archives instantly in your browser. No uploads, no installs — everything runs locally."
          badge={{
            text: "ZIP Extractor • Online • Free",
            icon: FileArchive,
          }}
          features={features}
        />

        <div className="space-y-8">
          {!file && (
            <div className="relative animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <FileDropZone
                accept=".zip"
                multiple={false}
                isDragging={isDragging}
                onDragStateChange={setIsDragging}
                onFilesSelected={handleFilesSelected}
                title="Drop your ZIP archive"
                subtitle="Or tap the button to browse a ZIP file from your device."
                primaryButtonLabel="Browse ZIP file"
              />
            </div>
          )}

          {file && extractedFiles.length === 0 && (
            <div
              className="space-y-4 rounded-2xl border border-border/40 bg-card/80 p-6 backdrop-blur animate-fade-in-up"
              style={{ animationDelay: "0.25s" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileArchive className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setExtractedFiles([]);
                    setSelectedFiles(new Set());
                    setExpandedPaths(new Set());
                    setError(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isExtracting ? (
                <div className="flex items-center gap-3 rounded-md border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Extracting archive…</span>
                </div>
              ) : (
                error && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        if (file) {
                          void startExtraction(file);
                        }
                      }}
                      className="gap-2"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      Retry extraction
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setExtractedFiles([]);
                        setSelectedFiles(new Set());
                        setExpandedPaths(new Set());
                        setError(null);
                      }}
                    >
                      Choose another file
                    </Button>
                  </div>
                )
              )}
            </div>
          )}

          {extractedFiles.length > 0 && (
            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/80 p-6 backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Extracted files</h2>
                    <p className="text-sm text-muted-foreground">
                      {stats.totalFiles} files • {formatFileSize(stats.totalSize)} total
                      {typeof stats.compressionRatio === "number" && (
                        <span> • {stats.compressionRatio}% compression</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.size > 0 && (
                      <Button onClick={downloadSelected} variant="outline" className="gap-2">
                        <DownloadIcon className="h-4 w-4" />
                        Download selected ({selectedFiles.size})
                      </Button>
                    )}
                    <Button onClick={downloadAll} variant="secondary" className="gap-2">
                      <DownloadIcon className="h-4 w-4" />
                      Download all
                    </Button>
                    <Button
                      onClick={() => {
                        setFile(null);
                        setExtractedFiles([]);
                        setSelectedFiles(new Set());
                        setExpandedPaths(new Set());
                      }}
                      variant="ghost"
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="max-h-[520px] overflow-auto rounded-md border border-border/30">
                  {renderFileTree(extractedFiles)}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Extraction failed</p>
                <p className="text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {isExtracting && !extractedFiles.length && (
            <div className="flex items-center gap-3 rounded-md border border-border/30 bg-card/70 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing ZIP archive…</span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <FAQ items={faqs} />
            <RelatedTools tools={relatedTools} />
          </div>
        </div>
      </div>
    </section>
  );
}
