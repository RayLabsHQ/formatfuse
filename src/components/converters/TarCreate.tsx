import React, { useState, useRef, useCallback } from "react";
import {
  X,
  Package,
  Plus,
  File,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
  Sparkles,
  Settings,
  FolderPlus,
  Trash2,
  FileArchive,
} from "lucide-react";
import * as pako from "pako";
import Tar from "tar-js";
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
  { icon: Zap, text: "Lightning fast", description: "Create TAR instantly" },
  {
    icon: Package,
    text: "Compression",
    description: "Optional GZIP compression",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "tar-extract",
    name: "Extract TAR",
    description: "Extract TAR archives",
    icon: Package,
  },
  {
    id: "create-zip",
    name: "Create ZIP",
    description: "Create ZIP archives",
    icon: FileArchive,
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
    question: "What's the difference between TAR and TAR.GZ?",
    answer:
      "TAR is an uncompressed archive format that groups files together. TAR.GZ applies GZIP compression to the TAR archive, resulting in smaller file sizes.",
  },
  {
    question: "What's the maximum file size?",
    answer:
      "The tool can handle files up to 2GB total, limited by browser memory. For larger archives, consider splitting into multiple TAR files.",
  },
  {
    question: "Can I preserve file permissions?",
    answer:
      "Basic file permissions are preserved in the TAR archive. However, advanced permissions and ownership information may be limited by browser capabilities.",
  },
  {
    question: "Is TAR better than ZIP?",
    answer:
      "TAR is commonly used in Unix/Linux environments and preserves file permissions better. ZIP is more universal and has built-in compression. Choose based on your needs.",
  },
];

type CompressionType = "none" | "gzip";

interface CompressionOption {
  type: CompressionType;
  name: string;
  description: string;
  extension: string;
}

const compressionOptions: CompressionOption[] = [
  {
    type: "none",
    name: "No Compression",
    description: "Plain TAR archive",
    extension: ".tar",
  },
  {
    type: "gzip",
    name: "GZIP",
    description: "Compressed TAR.GZ",
    extension: ".tar.gz",
  },
];

export default function TarCreate() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [archiveName, setArchiveName] = useState("archive");
  const [compressionType, setCompressionType] = useState<CompressionOption>(
    compressionOptions[0],
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

  const createTar = useCallback(async () => {
    if (files.length === 0) return;

    setIsCreating(true);
    setError(null);

    try {
      const tar = new Tar();

      // Add files to tar
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
        const uint8Array = new Uint8Array(content);

        // Add to tar
        tar.append(fileItem.path, uint8Array);

        // Update progress
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: "completed" as const, progress: 100 }
              : f,
          ),
        );
      }

      // Get tar data
      let tarData = tar.out;

      // Apply compression if needed
      if (compressionType.type === "gzip") {
        tarData = pako.gzip(tarData);
      }

      // Create blob and download
      const blob = new Blob([tarData], { type: "application/x-tar" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${archiveName}${compressionType.extension}`;
      link.click();
      URL.revokeObjectURL(link.href);

      // Reset after successful creation
      setTimeout(() => {
        setFiles([]);
        setIsCreating(false);
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create TAR file",
      );
      setIsCreating(false);
    }
  }, [files, archiveName, compressionType]);

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 lg:py-6 py-8 sm:py-12">
        {/* Hero Section with Features */}
        <ToolHeader
          title={{ highlight: "Create", main: "TAR Archive" }}
          subtitle="Create TAR archives with optional GZIP compression right in your browser. Perfect for Unix/Linux environments - no uploads required."
          badge={{
            text: "TAR Creator • Online • Free • GZIP",
            icon: Package,
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
                  <Package className="w-4 h-4 text-muted-foreground" />
                  Archive Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={archiveName}
                    onChange={(e) => setArchiveName(e.target.value)}
                    placeholder="archive"
                    className="flex-1 px-3 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <span className="px-3 py-2 text-sm text-muted-foreground bg-secondary rounded-lg">
                    {compressionType.extension}
                  </span>
                </div>
              </div>

              {/* Compression Type */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileArchive className="w-4 h-4 text-muted-foreground" />
                  Compression
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {compressionOptions.map((option) => (
                    <button
                      key={option.type}
                      onClick={() => setCompressionType(option)}
                      className={cn(
                        "px-4 py-3 rounded-xl border-2 transition-all duration-200",
                        compressionType.type === option.type
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
                      <Package className="w-5 h-5 text-primary" />
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
                      onClick={createTar}
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
                          Create TAR
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
                  directories
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
                Select multiple files or entire folders
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <h3 className="font-semibold">Choose compression</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Plain TAR or compressed TAR.GZ
              </p>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <h3 className="font-semibold">Download archive</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Get your TAR file instantly
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
