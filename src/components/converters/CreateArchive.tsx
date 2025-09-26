import React, { useState, useCallback, useEffect } from "react";
import { FileArchive, Shield, Zap, Sparkles, Package, Lock, Eye, EyeOff } from "lucide-react";
import JSZip from "jszip";
import * as pako from "pako";
import Tar from "tar-js";
import { cn } from "../../lib/utils";
import {
  ArchiveTool,
  type ArchiveFileItem as FileItem,
} from "./ArchiveTool";
import { type FAQItem } from "../ui/FAQ";
import { type RelatedTool } from "../ui/RelatedTools";
import { captureError, captureEvent } from "../../lib/posthog";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useArchiveCreator } from "../../hooks/useArchiveCreator";
import type { CreateArchiveRequest } from "../../lib/archive/types";

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  {
    icon: Zap,
    text: "Lightning fast",
    description: "Create archives instantly",
  },
  {
    icon: Sparkles,
    text: "Flexible output",
    description: "ZIP (with optional password), TAR, TAR.GZ",
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
    id: "create-zip",
    name: "Create ZIP",
    description: "Create ZIP archives",
    icon: FileArchive,
  },
  {
    id: "tar-create",
    name: "Create TAR",
    description: "Create TAR archives",
    icon: Package,
  },
];

const faqs: FAQItem[] = [
  {
    question: "Which archive format should I use?",
    answer:
      "ZIP is the most universal and works everywhere. TAR.GZ is preferred in Unix/Linux environments and offers better compression. TAR without compression is good for bundling files without size reduction.",
  },
  {
    question: "What's the maximum file size?",
    answer:
      "The tool can handle files up to 2GB total, limited by browser memory. For larger archives, consider splitting into multiple archives.",
  },
  {
    question: "Can I password protect archives?",
    answer:
      "ZIP archives can be encrypted with AES-256 directly in your browser. Other formats like TAR do not support native password protection.",
  },
  {
    question: "How do I organize files in folders?",
    answer:
      "Click on any file path to edit it. You can create folders by adding slashes (/) in the path, like 'folder/subfolder/file.txt'.",
  },
];

type ArchiveFormat = "zip" | "tar" | "tar.gz";

interface FormatOption {
  format: ArchiveFormat;
  name: string;
  description: string;
  extension: string;
  icon: React.ElementType;
}

const formatOptions: FormatOption[] = [
  {
    format: "zip",
    name: "ZIP",
    description: "Universal format",
    extension: ".zip",
    icon: FileArchive,
  },
  {
    format: "tar",
    name: "TAR",
    description: "Unix archive",
    extension: ".tar",
    icon: Package,
  },
  {
    format: "tar.gz",
    name: "TAR.GZ",
    description: "Compressed TAR",
    extension: ".tar.gz",
    icon: Package,
  },
];

export default function CreateArchive() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [archiveName, setArchiveName] = useState("archive");
  const [selectedFormat, setSelectedFormat] = useState<FormatOption>(
    formatOptions[0],
  );
  const [compressionLevel, setCompressionLevel] = useState(6);
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { create, preload, isReady: isCreatorReady } = useArchiveCreator();

  useEffect(() => {
    if (selectedFormat.format !== "zip" && enablePassword) {
      setEnablePassword(false);
      setPassword("");
      setShowPassword(false);
    }
  }, [enablePassword, selectedFormat.format]);

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

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updatePath = useCallback((index: number, newPath: string) => {
    setFiles((prev) =>
      prev.map((fileItem, fileIndex) =>
        fileIndex === index ? { ...fileItem, path: newPath } : fileItem,
      ),
    );
  }, []);

  const updateFileStatus = useCallback(
    (index: number, status: FileItem["status"], progress: number) => {
      setFiles((prev) =>
        prev.map((current, idx) =>
          idx === index ? { ...current, status, progress } : current,
        ),
      );
    },
    [],
  );

  const createArchive = useCallback(async () => {
    if (files.length === 0) return;

    setIsCreating(true);
    setError(null);

    try {
      const fileName = `${archiveName}${selectedFormat.extension}`;
      const trimmedPassword = password.trim();
      const totalBytes = files.reduce((sum, item) => sum + item.file.size, 0);

      if (selectedFormat.format === "zip" && enablePassword) {
        if (trimmedPassword.length === 0) {
          setError("Enter a password to encrypt the archive.");
          setIsCreating(false);
          return;
        }

        await preload();

        const payload: CreateArchiveRequest["files"] = [];
        for (let i = 0; i < files.length; i += 1) {
          updateFileStatus(i, "processing", 0);
          const fileItem = files[i];
          const buffer = await fileItem.file.arrayBuffer();
          payload.push({
            path: fileItem.path,
            data: buffer,
            lastModified: fileItem.file.lastModified ?? undefined,
          });
          updateFileStatus(i, "completed", 100);
        }

        const result = await create({
          format: "zip",
          files: payload,
          password: trimmedPassword,
        });

        if (!result.ok) {
          captureEvent("archive_create_failed", {
            format: selectedFormat.format,
            encrypted: true,
            reason: result.code,
            fileCount: files.length,
            totalBytes,
          });
          setError(result.message);
          return;
        }

        const blob = new Blob([result.data], {
          type: "application/zip",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);

        captureEvent("archive_create_succeeded", {
          format: selectedFormat.format,
          encrypted: true,
          fileCount: files.length,
          totalBytes,
        });

        setTimeout(() => {
          setFiles([]);
        }, 800);
        return;
      }

      let archiveData: Uint8Array;

      switch (selectedFormat.format) {
        case "zip": {
          const zip = new JSZip();

          for (let i = 0; i < files.length; i += 1) {
            const fileItem = files[i];

            updateFileStatus(i, "processing", 0);

            zip.file(fileItem.path, fileItem.file);

            updateFileStatus(i, "completed", 100);
          }

          const blob = await zip.generateAsync({
            type: "uint8array",
            compression: "DEFLATE",
            compressionOptions: { level: compressionLevel },
          });
          archiveData = blob;
          break;
        }

        case "tar":
        case "tar.gz": {
          const tar = new Tar();

          for (let i = 0; i < files.length; i++) {
            const fileItem = files[i];

            setFiles((prev) =>
              prev.map((current, idx) =>
                idx === i ? { ...current, status: "processing" as const } : current,
              ),
            );

            const content = await fileItem.file.arrayBuffer();
            const uint8Array = new Uint8Array(content);

            tar.append(fileItem.path, uint8Array);

            setFiles((prev) =>
              prev.map((current, idx) =>
                idx === i
                  ? { ...current, status: "completed" as const, progress: 100 }
                  : current,
              ),
            );
          }

          archiveData = tar.out;

          if (selectedFormat.format === "tar.gz") {
            archiveData = pako.gzip(archiveData, {
              level: compressionLevel as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
            });
          }
          break;
        }

        default:
          throw new Error("Unsupported format");
      }

      const blob = new Blob([archiveData], {
        type: "application/octet-stream",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);

      captureEvent("archive_create_succeeded", {
        format: selectedFormat.format,
        encrypted: false,
        fileCount: files.length,
        totalBytes,
      });

      setTimeout(() => {
        setFiles([]);
      }, 800);
    } catch (err) {
      captureError(err, {
        tool: "create-archive",
        selectedFormat: selectedFormat.format,
        fileCount: files.length,
      });
      captureEvent("archive_create_failed", {
        format: selectedFormat.format,
        encrypted: enablePassword && selectedFormat.format === "zip",
        reason: "exception",
        fileCount: files.length,
        totalBytes,
      });
      setError(err instanceof Error ? err.message : "Failed to create archive");
    } finally {
      setIsCreating(false);
    }
  }, [
    archiveName,
    compressionLevel,
    create,
    enablePassword,
    files,
    password,
    preload,
    selectedFormat,
    updateFileStatus,
  ]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setError(null);
    setEnablePassword(false);
    setPassword("");
    setShowPassword(false);
  }, []);

  const archiveNameSuffix = (
    <span className="px-3 py-2 text-sm text-muted-foreground bg-secondary rounded-lg">
      {selectedFormat.extension}
    </span>
  );

  const showCompressionSlider = selectedFormat.format === "zip" || selectedFormat.format === "tar.gz";

  const additionalSettings = (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          Archive Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {formatOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.format}
                onClick={() => setSelectedFormat(option)}
                className={cn(
                  "px-4 py-3 rounded-xl border-2 transition-all duration-200",
                  selectedFormat.format === option.format
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/50 bg-card/50",
                )}
              >
                <Icon className="w-4 h-4 mx-auto mb-1 text-primary" />
                <div className="text-sm font-medium">{option.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {showCompressionSlider && (
        <div className="space-y-3 border-t border-border/40 pt-4">
          <label className="text-sm font-medium">Compression Level: {compressionLevel}</label>
          <input
            type="range"
            min="0"
            max="9"
            value={compressionLevel}
            onChange={(event) => setCompressionLevel(Number(event.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Faster</span>
            <span>Smaller</span>
          </div>
        </div>
      )}

      {selectedFormat.format === "zip" && (
        <div className="space-y-3 border-t border-border/40 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Password protect
              </p>
              <p className="text-xs text-muted-foreground">
                Encrypt the ZIP archive with AES-256. Everything stays on your device.
              </p>
              {enablePassword && !isCreatorReady && (
                <p className="mt-2 text-xs text-muted-foreground">Preparing encryption engine…</p>
              )}
            </div>
            <Switch
              checked={enablePassword}
              onCheckedChange={(checked) => {
                setEnablePassword(checked);
                if (checked) {
                  if (!isCreatorReady) {
                    void preload();
                  }
                } else {
                  setPassword("");
                  setShowPassword(false);
                }
              }}
            />
          </div>

          {enablePassword && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter archive password"
                className="sm:flex-1"
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="outline"
                className="sm:w-auto"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <span className="flex items-center gap-2 text-sm">
                    <EyeOff className="h-4 w-4" /> Hide
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm">
                    <Eye className="h-4 w-4" /> Show
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const howItWorksSteps = [
    {
      title: "Add your files",
      description: "Select multiple files or entire folders",
    },
    {
      title: "Choose format",
      description: "Select ZIP, TAR, or TAR.GZ, adjust compression, and add a password if needed",
    },
    {
      title: "Download archive",
      description: "Get your archive file instantly",
    },
  ];

  return (
    <ArchiveTool
      toolHeader={{
        title: { highlight: "Create", main: "Archive Files" },
        subtitle:
          "Create ZIP, TAR, or TAR.GZ archives from multiple files right in your browser. No uploads required, 100% private.",
        badge: {
          text: "Online Archive Creator • Free • No Upload",
          icon: FileArchive,
        },
        features,
      }}
      archiveName={archiveName}
      onArchiveNameChange={setArchiveName}
      archiveNameIcon={FileArchive}
      archiveNameSuffix={archiveNameSuffix}
      additionalSettings={additionalSettings}
      files={files}
      filesIcon={FileArchive}
      isCreating={isCreating}
      isDragging={isDragging}
      setIsDragging={setIsDragging}
      onFilesSelected={handleFiles}
      onCreate={createArchive}
      createButtonLabel="Create Archive"
      createButtonIcon={FileArchive}
      clearAll={clearAll}
      removeFile={removeFile}
      updatePath={updatePath}
      error={error}
      onDismissError={() => setError(null)}
      howItWorksSteps={howItWorksSteps}
      relatedTools={relatedTools}
      faqs={faqs}
    />
  );
}
