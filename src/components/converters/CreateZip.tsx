import React, { useState, useCallback } from "react";
import { FileArchive, Shield, Zap, Package, Lock, Eye, EyeOff } from "lucide-react";
import JSZip from "jszip";
import { cn } from "../../lib/utils";
import {
  ArchiveTool,
  type ArchiveFileItem as FileItem,
} from "./ArchiveTool";
import { type FAQItem } from "../ui/FAQ";
import { type RelatedTool } from "../ui/RelatedTools";
import { captureError, captureEvent } from "../../lib/posthog";
import type { CreateArchiveRequest } from "../../lib/archive/types";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useArchiveCreator } from "../../hooks/useArchiveCreator";

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Create ZIP instantly" },
  {
    icon: Lock,
    text: "AES-256 encryption",
    description: "Protect archives with strong passwords",
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
      "Yes. Enable password protection to encrypt the archive with AES-256 entirely in your browser.",
  },
  {
    question: "What compression levels are available?",
    answer:
      "You can choose between Store (no compression), Fastest, and Best compression. Best compression takes longer but produces smaller files.",
  },
  {
    question: "Can I preserve folder structure?",
    answer:
      "Yes! When you add folders, their structure is preserved in the ZIP archive.",
  },
];

interface CompressionOption {
  level: JSZip.Compression;
  name: string;
  description: string;
  compressionLevel?: number;
}

const compressionOptions: CompressionOption[] = [
  {
    level: "STORE",
    name: "Store",
    description: "No compression",
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
  const [archiveName, setArchiveName] = useState("archive");
  const [compressionLevel, setCompressionLevel] = useState<CompressionOption>(
    compressionOptions[2],
  );
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { create, preload, isReady: isCreatorReady } = useArchiveCreator();

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

  const createZip = useCallback(async () => {
    if (files.length === 0) return;

    setIsCreating(true);
    setError(null);

    const trimmedPassword = password.trim();
    const totalBytes = files.reduce((sum, fileItem) => sum + fileItem.file.size, 0);

    if (enablePassword && trimmedPassword.length === 0) {
      setError("Enter a password to encrypt the archive.");
      setIsCreating(false);
      return;
    }

    if (enablePassword) {
      try {
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
          compressionLevel: compressionLevel.compressionLevel,
        });

        if (!result.ok) {
          captureEvent("zip_create_failed", {
            encrypted: true,
            reason: result.code,
            fileCount: files.length,
            totalBytes,
          });
          setError(result.message);
          return;
        }

        const blob = new Blob([result.data], { type: "application/zip" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${archiveName}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);

        captureEvent("zip_create_succeeded", {
          encrypted: true,
          fileCount: files.length,
          totalBytes,
        });

        setTimeout(() => {
          setFiles([]);
        }, 800);
      } catch (err) {
        captureError(err, {
          tool: "create-zip",
          fileCount: files.length,
          compression: compressionLevel.name,
          encryption: true,
        });
        const message = err instanceof Error ? err.message : "Failed to create ZIP file";
        captureEvent("zip_create_failed", {
          encrypted: true,
          reason: "exception",
          fileCount: files.length,
          totalBytes,
        });
        setError(message);
      } finally {
        setIsCreating(false);
      }
      return;
    }

    try {
      const zip = new JSZip();

      for (let i = 0; i < files.length; i += 1) {
        const fileItem = files[i];

        updateFileStatus(i, "processing", 0);

        const content = await fileItem.file.arrayBuffer();

        const options: JSZip.JSZipFileOptions = {
          compression: compressionLevel.level,
          compressionOptions: compressionLevel.compressionLevel
            ? { level: compressionLevel.compressionLevel }
            : undefined,
        };

        zip.file(fileItem.path, content, options);

        updateFileStatus(i, "completed", 100);
      }

      const blob = await zip.generateAsync({
        type: "blob",
        compression: compressionLevel.level,
        compressionOptions: compressionLevel.compressionLevel
          ? { level: compressionLevel.compressionLevel }
          : undefined,
        streamFiles: true,
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${archiveName}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      captureEvent("zip_create_succeeded", {
        encrypted: false,
        fileCount: files.length,
        totalBytes,
      });

      setTimeout(() => {
        setFiles([]);
      }, 800);
    } catch (err) {
      captureError(err, {
        tool: "create-zip",
        fileCount: files.length,
        compression: compressionLevel.name,
        encryption: false,
      });
      captureEvent("zip_create_failed", {
        encrypted: false,
        reason: "exception",
        fileCount: files.length,
        totalBytes,
      });
      setError(err instanceof Error ? err.message : "Failed to create ZIP file");
    } finally {
      setIsCreating(false);
    }
  }, [archiveName, compressionLevel, create, enablePassword, files, password, preload, updateFileStatus]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setError(null);
    setEnablePassword(false);
    setPassword("");
    setShowPassword(false);
  }, []);

  const archiveNameSuffix = (
    <span className="px-3 py-2 text-sm text-muted-foreground bg-secondary rounded-lg">
      .zip
    </span>
  );

  const additionalSettings = (
    <div className="space-y-6">
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

      <div className="space-y-3 border-t border-border/40 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              Password protect
            </p>
            <p className="text-xs text-muted-foreground">
              Encrypt the archive with AES-256. Everything stays on your device.
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
    </div>
  );

  const howItWorksSteps = [
    {
      title: "Add your files",
      description: "Select multiple files or folders to compress",
    },
    {
      title: "Configure settings",
      description: "Choose compression level and optionally add a password",
    },
    {
      title: "Download ZIP",
      description: "Get your compressed archive instantly",
    },
  ];

  return (
    <ArchiveTool
      toolHeader={{
        title: { highlight: "Create", main: "ZIP Archive" },
        subtitle:
          "Compress multiple files into a ZIP archive right in your browser. Organize, compress, and download - no uploads required.",
        badge: {
          text: "ZIP Compressor • Online • Free",
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
      onCreate={createZip}
      createButtonLabel="Create ZIP"
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
