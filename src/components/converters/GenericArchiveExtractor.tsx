import React, { useCallback, useMemo } from "react";
import {
  AlertCircle,
  Download,
  Eye,
  FileArchive,
  FolderOpen,
  Loader2,
  Lock,
  Package,
  Shield,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Button } from "../ui/button";
import { ToolHeader, type Feature } from "../ui/ToolHeader";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { FileDropZone } from "../ui/FileDropZone";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { ArchiveFileTree } from "./ArchiveFileTree";
import { captureError } from "../../lib/posthog";
import {
  useArchiveExtractionController,
  type PendingPasswordState,
} from "../../hooks/useArchiveExtractionController";
import type { ArchiveFileNode } from "../../lib/archive/fileTree";

interface GenericArchiveExtractorProps {
  format: string;
  formatName: string;
  formatDescription: string;
  acceptedExtensions: string;
  icon?: React.ElementType;
  features?: Feature[];
  faqs?: FAQItem[];
  relatedTools?: RelatedTool[];
}

const defaultFeatures: Feature[] = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Extract instantly" },
  {
    icon: Eye,
    text: "Preview files",
    description: "View before extracting",
  },
];

const defaultRelatedTools: RelatedTool[] = [
  {
    id: "zip-extract",
    name: "ZIP Extract",
    description: "Extract ZIP compressed files",
    icon: FileArchive,
  },
  {
    id: "iso-extract",
    name: "ISO Extract",
    description: "Extract ISO disk images",
    icon: Package,
  },
  {
    id: "7z-extract",
    name: "7-Zip Extract",
    description: "Extract 7Z compressed archives",
    icon: FileArchive,
  },
];

const defaultFaqs: FAQItem[] = [
  {
    question: "Which archive formats does this support?",
    answer:
      "Our universal extractor handles ZIP, RAR, 7Z, TAR, ISO, CAB, and many other formats by combining libarchive and 7-Zip WebAssembly engines.",
  },
  {
    question: "Can I open password-protected archives?",
    answer:
      "Yes. When we detect encryption we'll prompt you for the password and decrypt everything locally in your browser.",
  },
  {
    question: "What happens when I drop an archive?",
    answer:
      "We load the necessary engines, inspect the archive entirely on your device, and render a browsable file tree. If the archive is encrypted you'll see a password prompt; otherwise you can preview, select, and download files immediately.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "You're only limited by the memory available in your browser. Most modern devices handle archives up to a few gigabytes without trouble, and nothing ever leaves your device.",
  },
];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value < 10 && exponent > 0 ? 1 : 0)} ${units[exponent]}`;
}

function passwordDialogMessage(pending: PendingPasswordState | null): string {
  if (!pending) return "";
  if (pending.reason === "incorrect") {
    return "The password you entered is incorrect. Please try again.";
  }
  return pending.message || "This archive is encrypted. Enter the password to continue.";
}

export default function GenericArchiveExtractor({
  format,
  formatName,
  formatDescription,
  acceptedExtensions,
  icon: Icon = FileArchive,
  features,
  faqs,
  relatedTools,
}: GenericArchiveExtractorProps) {
  const {
    state: {
      archiveName,
      files,
      isLoading,
      isReady,
      error,
      isDragging,
      expandedPaths,
      selectedPaths,
      metadata,
      pendingPassword,
      passwordError,
      stats,
    },
    passwordInputRef,
    actions: {
      setIsDragging,
      handleFilesSelected,
      toggleExpand,
      toggleSelect,
      selectAll,
      clearSelection,
      submitPassword,
      dismissPassword,
      setPasswordError,
      setError,
      warmupEngines,
    },
    helpers,
  } = useArchiveExtractionController({ format, toolId: "generic-archive-extract" });

  const downloadFile = useCallback(async (node: ArchiveFileNode) => {
    if (!node.fileData) return;

    try {
      const blob = new Blob([node.fileData]);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = node.name;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download file";
      setError(message);
      captureError(err, {
        tool: "generic-archive-extract",
        format,
        fileName: node.name,
        stage: "download",
      });
    }
  }, [format, setError]);

  const downloadSelected = useCallback(() => {
    const flat = helpers.flattenNodes();
    const nodes = flat.filter((node) => selectedPaths.has(node.path));
    nodes.forEach((node) => {
      void downloadFile(node);
    });
  }, [downloadFile, helpers, selectedPaths]);

  const metadataSummary = useMemo(() => {
    if (!metadata) return null;
    const warnings = metadata.warnings.filter((entry) => entry.trim().length > 0);
    return {
      engine: metadata.engine,
      warnings,
      encrypted: metadata.encrypted ?? false,
      format: metadata.format,
    };
  }, [metadata]);

  const featureList = features ?? defaultFeatures;
  const relatedList = relatedTools ?? defaultRelatedTools;
  const faqItems = faqs ?? defaultFaqs;

  return (
    <section className="relative min-h-screen w-full">
      <div className="hidden sm:block fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.02]" />
        <div className="absolute top-16 right-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-24 left-1/4 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <ToolHeader
          title={{ highlight: "Extract", main: `${formatName} Archives` }}
          subtitle={formatDescription}
          badge={{
            text: `${formatName} Extractor • Online • Free`,
            icon: Icon as LucideIcon,
          }}
          features={featureList}
        />

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div onPointerEnter={warmupEngines} onFocusCapture={warmupEngines}>
              <FileDropZone
                accept={acceptedExtensions}
                multiple={false}
                isDragging={isDragging}
                onDragStateChange={setIsDragging}
                onFilesSelected={handleFilesSelected}
                title={`Drop your ${format.toUpperCase()} archive here`}
                description="We extract everything directly in your browser."
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Extraction failed</p>
                  <p className="text-muted-foreground">{error}</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-3 rounded-md border border-muted bg-card p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isReady ? "Extracting archive…" : "Preparing extraction engines…"}</span>
              </div>
            )}

            {metadataSummary && (
              <div className="rounded-md border border-muted bg-card p-4 text-sm text-muted-foreground">
                <p>
                  Extraction engine: <span className="font-medium text-foreground">{metadataSummary.engine}</span>
                </p>
                {metadataSummary.encrypted && (
                  <p className="mt-1 text-xs text-foreground/80">Password protected archive unlocked securely in your browser.</p>
                )}
                {metadataSummary.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="font-medium text-foreground">Messages</p>
                    <ul className="space-y-1">
                      {metadataSummary.warnings.map((warning, idx) => (
                        <li key={`${warning}-${idx}`} className="text-xs leading-relaxed text-muted-foreground">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {files.length > 0 ? (
              <div className="rounded-md border border-muted bg-card">
                <div className="flex flex-col gap-3 border-b border-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold">{archiveName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {stats
                        ? `${stats.totalFiles} files • ${formatBytes(stats.totalSize)} total`
                        : "Select files to download"}
                      {selectedPaths.size > 0 && (
                        <span>{` • ${selectedPaths.size} selected`}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select all
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={downloadSelected}
                      disabled={selectedPaths.size === 0}
                    >
                      <Download className="mr-2 h-4 w-4" /> Download selected
                    </Button>
                  </div>
                </div>

                <ArchiveFileTree
                  nodes={files}
                  expandedPaths={expandedPaths}
                  selectedPaths={selectedPaths}
                  onToggleExpand={toggleExpand}
                  onToggleSelect={toggleSelect}
                  getNodeMeta={(node) => (node.isDirectory ? "Directory" : formatBytes(node.size))}
                  renderActions={(node) =>
                    node.isDirectory || !node.fileData ? null : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          void downloadFile(node);
                        }}
                      >
                        <Download className="h-4 w-4" />
                        Save
                      </Button>
                    )
                  }
                  className="max-h-[480px] text-sm"
                  onDownload={downloadFile}
                />
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-muted bg-card p-8 text-center text-sm text-muted-foreground">
                <FolderOpen className="mx-auto mb-3 h-8 w-8" />
                <p>Drop a {format.toUpperCase()} archive above to see its contents instantly.</p>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <RelatedTools tools={relatedList} />

            <FAQ items={faqItems} />
          </aside>
        </div>
      </div>

      <Dialog open={Boolean(pendingPassword)} onOpenChange={(open) => !open && dismissPassword()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter archive password</DialogTitle>
            <DialogDescription>{passwordDialogMessage(pendingPassword)}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitPassword();
            }}
          >
            <label className="flex items-center gap-2 text-sm font-medium text-foreground" htmlFor="archive-password">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Password
            </label>
            <Input
              id="archive-password"
              type="password"
              ref={passwordInputRef}
              placeholder="Enter archive password"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(passwordError)}
            />
            {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={dismissPassword}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Lock className="h-4 w-4" />
                Unlock
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
