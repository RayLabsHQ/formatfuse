import React, { useState, useCallback } from "react";
import {
  FileArchive,
  Shield,
  Zap,
  Sparkles,
  Package,
} from "lucide-react";
import JSZip from "jszip";
import { cn } from "../../lib/utils";
import {
  ArchiveTool,
  type ArchiveFileItem as FileItem,
} from "./ArchiveTool";
import { type FAQItem } from "../ui/FAQ";
import { type RelatedTool } from "../ui/RelatedTools";
import { captureError } from "../../lib/posthog";

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

  const createZip = useCallback(async () => {
    if (files.length === 0) return;

    setIsCreating(true);
    setError(null);

    try {
      const zip = new JSZip();

      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];

        setFiles((prev) =>
          prev.map((current, idx) =>
            idx === i ? { ...current, status: "processing" as const } : current,
          ),
        );

        const content = await fileItem.file.arrayBuffer();

        const options: JSZip.JSZipFileOptions = {
          compression: compressionLevel.level,
          compressionOptions: compressionLevel.compressionLevel
            ? { level: compressionLevel.compressionLevel }
            : undefined,
        };

        zip.file(fileItem.path, content, options);

        setFiles((prev) =>
          prev.map((current, idx) =>
            idx === i
              ? { ...current, status: "completed" as const, progress: 100 }
              : current,
          ),
        );
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

      setTimeout(() => {
        setFiles([]);
        setIsCreating(false);
      }, 1000);
    } catch (err) {
      captureError(err, {
        tool: "create-zip",
        fileCount: files.length,
        compression: compressionLevel.name,
      });
      setError(err instanceof Error ? err.message : "Failed to create ZIP file");
      setIsCreating(false);
    }
  }, [files, archiveName, compressionLevel]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  const archiveNameSuffix = (
    <span className="px-3 py-2 text-sm text-muted-foreground bg-secondary rounded-lg">
      .zip
    </span>
  );

  const additionalSettings = (
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
  );

  const howItWorksSteps = [
    {
      title: "Add your files",
      description: "Select multiple files or folders to compress",
    },
    {
      title: "Configure settings",
      description: "Choose compression level and organize file paths",
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
