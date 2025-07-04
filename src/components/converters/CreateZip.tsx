import React, { useState, useRef, useCallback } from "react";
import {
  X,
  FileArchive,
  Plus,
  File,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
  Sparkles,
  Settings,
  Package,
  FolderPlus,
  Trash2,
} from "lucide-react";
import JSZip from "jszip";
import { Button } from "../ui/button";
import { ToolHeader } from "../ui/ToolHeader";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { FileDropZone } from "../ui/FileDropZone";
import { cn } from "../../lib/utils";

interface FileItem {
  file: File;
  path: string;
  status: "pending" | "processing" | "completed";
  progress: number;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Create ZIP instantly" },
  {
    icon: Sparkles,
    text: "Compression",
    description: "Reduce file sizes",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "zip-extract",
    name: "Extract ZIP",
    description: "Extract files from ZIP archives",
    icon: FileArchive,
  },
  {
    id: "tar-create",
    name: "Create TAR",
    description: "Create TAR archives",
    icon: Package,
  },
  {
    id: "7z-create",
    name: "Create 7Z",
    description: "Create 7-Zip archives",
    icon: FileArchive,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What's the maximum file size?",
    answer:
      "The tool can handle files up to 2GB total, limited by browser memory. For larger archives, consider splitting into multiple ZIP files.",
  },
  {
    question: "Can I create password-protected ZIP files?",
    answer:
      "Currently, this tool doesn't support password protection. We're working on adding encryption features in a future update.",
  },
  {
    question: "What compression levels are available?",
    answer:
      "You can choose between Store (no compression), Fastest, and Best compression. Best compression takes longer but produces smaller files.",
  },
  {
    question: "Can I preserve folder structure?",
    answer:
      "Yes! You can organize files into folders by editing their paths before creating the ZIP.",
  },
];

type CompressionLevel = "STORE" | "DEFLATE";

interface CompressionOption {
  level: CompressionLevel;
  name: string;
  description: string;
  compressionLevel?: number;
}

const compressionOptions: CompressionOption[] = [
  {
    level: "STORE",
    name: "Store",
    description: "No compression (fastest)",
  },
  {
    level: "DEFLATE",
    name: "Fastest",
    description: "Quick compression",
    compressionLevel: 1,
  },
  {
    level: "DEFLATE",
    name: "Best",
    description: "Maximum compression",
    compressionLevel: 9,
  },
];

export default function CreateZip() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zipName, setZipName] = useState("archive");
  const [compressionLevel, setCompressionLevel] = useState<CompressionOption>(
    compressionOptions[2], // Default to "Best"
  );
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((selectedFiles: File[]) => {
    const newFiles: FileItem[] = selectedFiles.map((file) => ({
      file,
      path: file.webkitRelativePath || file.name,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      handleFiles(selectedFiles);
    },
    [handleFiles],
  );

  const handleAddFolder = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("webkitdirectory", "");
      fileInputRef.current.click();
      setTimeout(() => {
        fileInputRef.current?.removeAttribute("webkitdirectory");
      }, 100);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updatePath = useCallback((index: number, newPath: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, path: newPath } : f)),
    );
  }, []);

  const createZip = useCallback(async () => {
    if (files.length === 0) return;

    setIsCreating(true);
    setError(null);

    try {
      const zip = new JSZip();

      // Add files to zip with progress tracking
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];

        // Update status to processing
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "processing" as const } : f,
          ),
        );

        // Read file content
        const content = await fileItem.file.arrayBuffer();

        // Add to zip with selected compression
        const options: JSZip.JSZipFileOptions = {
          compression: compressionLevel.level,
          compressionOptions: compressionLevel.compressionLevel
            ? { level: compressionLevel.compressionLevel }
            : undefined,
        };

        zip.file(fileItem.path, content, options);

        // Update progress
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: "completed" as const, progress: 100 }
              : f,
          ),
        );
      }

      // Generate ZIP file
      const blob = await zip.generateAsync({
        type: "blob",
        compression: compressionLevel.level,
        compressionOptions: compressionLevel.compressionLevel
          ? { level: compressionLevel.compressionLevel }
          : undefined,
        streamFiles: true,
      });

      // Download the ZIP
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${zipName}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      // Reset after successful creation
      setTimeout(() => {
        setFiles([]);
        setIsCreating(false);
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create ZIP file",
      );
      setIsCreating(false);
    }
  }, [files, zipName, compressionLevel]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setError(null);
    setEditingPath(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

  return (
    <div className="min-h-screen w-full">
      {/* Archive Creation-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] via-transparent to-accent/[0.01]" />
        <div className="absolute top-1/3 left-20 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-20 right-1/3 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 lg:py-6 py-8 sm:py-12 relative z-10">
        {/* Hero Section with Features */}
        <ToolHeader
          title={{ highlight: "Create", main: "ZIP Archive" }}
          subtitle="Compress multiple files into a ZIP archive right in your browser. Organize, compress, and download - no uploads required."
          badge={{
            text: "ZIP Compressor • Online • Free",
            icon: FileArchive,
          }}
          features={features}
        />

        {/* Main Interface */}
        <div className="space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as any)}
          />

          {/* Settings Card */}
          <div
            className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Archive Settings
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Archive Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileArchive className="w-4 h-4 text-muted-foreground" />
                  Archive Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={zipName}
                    onChange={(e) => setZipName(e.target.value)}
                    placeholder="archive"
                    className="flex-1 px-3 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <span className="px-3 py-2 text-sm text-muted-foreground bg-secondary rounded-lg">
                    .zip
                  </span>
                </div>
              </div>

              {/* Compression Level */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  Compression Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {compressionOptions.map((option) => (
                    <button
                      key={option.name}
                      onClick={() => setCompressionLevel(option)}
                      className={cn(
                        "px-4 py-3 rounded-xl border-2 transition-all duration-200",
                        compressionLevel.name === option.name
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/50 bg-card/50",
                      )}
                    >
                      <div className="text-sm font-medium">{option.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* File Upload Area - Only show when no files */}
          {files.length === 0 && (
            <div
              className="relative animate-fade-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <FileDropZone
                onFilesSelected={handleFiles}
                multiple={true}
                isDragging={isDragging}
                onDragStateChange={setIsDragging}
                title="Drop files here or click to browse"
                subtitle=""
                infoMessage="Select multiple files or folders to archive"
                showButtons={true}
                allowFolders={true}
                onAddFilesClick={() => fileInputRef.current?.click()}
                onAddFolderClick={handleAddFolder}
              />
            </div>
          )}

          {/* Files List */}
          {files.length > 0 && (
            <div
              className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: "0.5s" }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const droppedFiles = Array.from(e.dataTransfer.files);
                handleFiles(droppedFiles);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
            >
              {/* Header */}
              <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileArchive className="w-5 h-5 text-primary" />
                      Files ({files.length})
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total size: {formatFileSize(totalSize)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Files
                    </Button>
                    <Button
                      onClick={handleAddFolder}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Add Folder
                    </Button>
                    <Button
                      onClick={createZip}
                      disabled={isCreating || files.length === 0}
                      size="sm"
                      className="gap-2"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Package className="w-4 h-4" />
                          Create ZIP
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={clearAll}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              {/* Files Content */}
              <div className="p-6">
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {files.map((fileItem, index) => (
                    <div
                      key={index}
                      className="bg-background/50 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          {editingPath === `${index}` ? (
                            <input
                              type="text"
                              value={fileItem.path}
                              onChange={(e) =>
                                updatePath(index, e.target.value)
                              }
                              onBlur={() => setEditingPath(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") setEditingPath(null);
                              }}
                              className="w-full px-2 py-1 bg-background border border-primary rounded text-sm focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <p
                              className="font-medium text-sm truncate cursor-pointer hover:text-primary"
                              onClick={() => setEditingPath(`${index}`)}
                              title="Click to edit path"
                            >
                              {fileItem.path}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatFileSize(fileItem.file.size)}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                          {fileItem.status === "processing" && (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          )}
                          {fileItem.status === "completed" && (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                          <Button
                            onClick={() => removeFile(index)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  Tip: Click on file paths to edit and organize them into
                  folders
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

        {/* How it works */}
        <div className="space-y-6 mt-12">
          <h2 className="text-2xl font-semibold">How It Works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <h3 className="font-semibold">Add your files</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Select multiple files or entire folders to compress
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <h3 className="font-semibold">Configure settings</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose compression level and organize file paths
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <h3 className="font-semibold">Download ZIP</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Get your compressed archive instantly
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
