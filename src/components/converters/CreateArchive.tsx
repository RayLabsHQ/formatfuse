import React, { useState, useCallback } from "react";
import { FileArchive, Shield, Zap, Sparkles, Package } from "lucide-react";
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
import { captureError } from "../../lib/posthog";

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
    text: "Multiple formats",
    description: "ZIP, TAR, TAR.GZ support",
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
      "Currently, password protection is only available for ZIP files. TAR archives don't support native encryption.",
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

  const createArchive = useCallback(async () => {
    if (files.length === 0) return;

    setIsCreating(true);
    setError(null);

    try {
      let archiveData: Uint8Array;
      const fileName = `${archiveName}${selectedFormat.extension}`;

      switch (selectedFormat.format) {
        case "zip": {
          const zip = new JSZip();

          for (let i = 0; i < files.length; i++) {
            const fileItem = files[i];

            setFiles((prev) =>
              prev.map((current, idx) =>
                idx === i ? { ...current, status: "processing" as const } : current,
              ),
            );

            zip.file(fileItem.path, fileItem.file);

            setFiles((prev) =>
              prev.map((current, idx) =>
                idx === i
                  ? { ...current, status: "completed" as const, progress: 100 }
                  : current,
              ),
            );
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

      setTimeout(() => {
        setFiles([]);
        setIsCreating(false);
      }, 1000);
    } catch (err) {
      captureError(err, {
        tool: "create-archive",
        selectedFormat: selectedFormat.format,
        fileCount: files.length,
      });
      setError(err instanceof Error ? err.message : "Failed to create archive");
      setIsCreating(false);
    }
  }, [files, archiveName, selectedFormat, compressionLevel]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  const archiveNameSuffix = (
    <span className="px-3 py-2 text-sm text-muted-foreground bg-secondary rounded-lg">
      {selectedFormat.extension}
    </span>
  );

  const additionalSettings = (
    <>
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

      {(selectedFormat.format === "zip" ||
        selectedFormat.format === "tar.gz") && (
        <div className="space-y-3">
          <label className="text-sm font-medium">
            Compression Level: {compressionLevel}
          </label>
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
    </>
  );

  const howItWorksSteps = [
    {
      title: "Add your files",
      description: "Select multiple files or entire folders",
    },
    {
      title: "Choose format",
      description: "Select ZIP, TAR, or TAR.GZ format",
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
