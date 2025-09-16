import React, { useState, useCallback } from "react";
import {
  Package,
  Shield,
  Zap,
  Sparkles,
  FileArchive,
} from "lucide-react";
import * as pako from "pako";
import Tar from "tar-js";
import {
  ArchiveTool,
  type ArchiveFileItem as FileItem,
} from "./ArchiveTool";
import { type FAQItem } from "../ui/FAQ";
import { type RelatedTool } from "../ui/RelatedTools";
import { cn } from "../../lib/utils";
import { captureError } from "../../lib/posthog";

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Create TAR instantly" },
  {
    icon: Sparkles,
    text: "Compression",
    description: "Add optional GZIP compression",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "tar-extract",
    name: "Extract TAR",
    description: "Extract files from TAR archives",
    icon: Package,
  },
  {
    id: "create-zip",
    name: "Create ZIP",
    description: "Create ZIP archives",
    icon: FileArchive,
  },
];

const faqs: FAQItem[] = [
  {
    question: "When should I use TAR vs TAR.GZ?",
    answer:
      "Use TAR when you need to bundle files without compression. TAR.GZ adds compression for smaller file sizes, ideal for distribution.",
  },
  {
    question: "What's the size limit?",
    answer:
      "The tool can handle archives up to 2GB total, limited by browser memory.",
  },
  {
    question: "Does TAR support password protection?",
    answer:
      "Standard TAR archives do not support encryption. For secure archives, use ZIP with encryption.",
  },
  {
    question: "Can I keep folder structure?",
    answer:
      "Yes, folders are preserved automatically when you add them to the archive.",
  },
];

interface CompressionOption {
  type: "tar" | "gzip";
  name: string;
  description: string;
  extension: string;
}

const compressionOptions: CompressionOption[] = [
  {
    type: "tar",
    name: "TAR",
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

  const createTar = useCallback(async () => {
    if (files.length === 0) return;

    setIsCreating(true);
    setError(null);

    try {
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

      let tarData = tar.out;

      if (compressionType.type === "gzip") {
        tarData = pako.gzip(tarData);
      }

      const blob = new Blob([tarData], { type: "application/x-tar" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${archiveName}${compressionType.extension}`;
      link.click();
      URL.revokeObjectURL(link.href);

      setTimeout(() => {
        setFiles([]);
        setIsCreating(false);
      }, 1000);
    } catch (err) {
      captureError(err, {
        tool: "create-tar",
        compressionType: compressionType.type,
        fileCount: files.length,
      });
      setError(err instanceof Error ? err.message : "Failed to create TAR file");
      setIsCreating(false);
    }
  }, [files, archiveName, compressionType]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  const archiveNameSuffix = (
    <span className="px-3 py-2 text-sm text-muted-foreground bg-secondary rounded-lg">
      {compressionType.extension}
    </span>
  );

  const additionalSettings = (
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
  );

  const howItWorksSteps = [
    {
      title: "Add your files",
      description: "Select files or folders to bundle",
    },
    {
      title: "Choose compression",
      description: "Pick standard TAR or TAR.GZ compression",
    },
    {
      title: "Download archive",
      description: "Get your TAR or TAR.GZ file instantly",
    },
  ];

  return (
    <ArchiveTool
      toolHeader={{
        title: { highlight: "Create", main: "TAR Archive" },
        subtitle:
          "Create TAR archives with optional GZIP compression right in your browser. Perfect for Unix/Linux environments - no uploads required.",
        badge: {
          text: "TAR Creator • Online • Free • GZIP",
          icon: Package,
        },
        features,
      }}
      archiveName={archiveName}
      onArchiveNameChange={setArchiveName}
      archiveNameIcon={Package}
      archiveNameSuffix={archiveNameSuffix}
      additionalSettings={additionalSettings}
      files={files}
      filesIcon={Package}
      isCreating={isCreating}
      isDragging={isDragging}
      setIsDragging={setIsDragging}
      onFilesSelected={handleFiles}
      onCreate={createTar}
      createButtonLabel="Create TAR"
      createButtonIcon={Package}
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
