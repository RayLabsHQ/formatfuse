import React, { useCallback, useMemo } from "react";
import {
  AlertCircle,
  Download,
  DownloadIcon,
  FileArchive,
  Loader2,
  Lock,
  Package,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import JSZip from "jszip";

import { Button } from "../ui/button";
import { ToolHeader } from "../ui/ToolHeader";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { FileDropZone } from "../ui/FileDropZone";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { captureError } from "../../lib/posthog";
import {
  useArchiveExtractionController,
  type PendingPasswordState,
} from "../../hooks/useArchiveExtractionController";
import { ArchiveFileTree } from "./ArchiveFileTree";
import type { ArchiveFileNode } from "../../lib/archive/fileTree";
import { isArchiveSupported } from "../../lib/archive/support";

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
      "This tool extracts ZIP and ZIPX archives. For TAR, 7Z, or RAR files, explore our dedicated tools.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "We can comfortably handle archives up to a few gigabytes, limited only by your browser's memory.",
  },
  {
    question: "How secure is the extraction process?",
    answer:
      "Everything happens locally. Drop a ZIP file, and we decrypt and preview it in your browser—no uploads, no tracking, and you can even repackage selected files into a fresh archive instantly.",
  },
  {
    question: "Can I extract password-protected ZIP files?",
    answer:
      "Yes! Enter your password when prompted to unlock encrypted ZIP or ZIPX files securely.",
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
  return pending.message || "This ZIP archive is encrypted. Enter the password to continue.";
}

export default function ZipExtract() {
  const {
    state: {
      archiveName,
      sourceFileSize,
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
      setError,
      warmupEngines,
    },
    helpers,
  } = useArchiveExtractionController({ format: "zip", toolId: "zip-extract" });
  const { fetchFileData } = helpers;
  const support = useMemo(() => isArchiveSupported(), []);
  const unsupported = !support.supported;

  const downloadFile = useCallback(async (node: ArchiveFileNode) => {
    const fileData = await fetchFileData(node);
    if (!fileData) return;
    try {
      const blob = new Blob([fileData]);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = node.name;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download file";
      setError(message);
      captureError(err, {
        tool: "zip-extract",
        fileName: node.name,
        stage: "download",
      });
    }
  }, [setError]);

  const bundleFiles = useCallback(async (nodes: ArchiveFileNode[], archiveLabel: string) => {
    const zip = new JSZip();
    for (const node of nodes) {
      if (node.isDirectory) continue;
      const data = await fetchFileData(node);
      if (data) {
        zip.file(node.path, data);
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = archiveLabel;
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  const downloadSelected = useCallback(async () => {
    if (selectedPaths.size === 0) return;
    const flat = helpers.flattenNodes();
    const nodes = flat.filter((node) => selectedPaths.has(node.path));

    if (nodes.length === 1 && nodes[0].fileData) {
      await downloadFile(nodes[0]);
      return;
    }

    try {
      const label = nodes.length === 1 ? `${nodes[0].name}.zip` : "selected-files.zip";
      await bundleFiles(nodes, label);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download selection";
      setError(message);
      captureError(err, {
        tool: "zip-extract",
        stage: "download-selected",
        selectionCount: nodes.length,
      });
    }
  }, [bundleFiles, downloadFile, helpers, selectedPaths, setError]);

  const downloadAll = useCallback(async () => {
    if (files.length === 0) return;
    const flat = helpers.flattenNodes();

    try {
      const label = archiveName ? `extracted-${archiveName}` : "files.zip";
      await bundleFiles(flat, label.endsWith(".zip") ? label : `${label}.zip`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download archive";
      setError(message);
      captureError(err, {
        tool: "zip-extract",
        stage: "download-all",
        extractedCount: flat.length,
      });
    }
  }, [archiveName, bundleFiles, files.length, helpers, setError]);

  const compressionSummary = useMemo(() => {
    if (!stats) return null;
    if (!sourceFileSize || sourceFileSize <= 0) {
      return null;
    }
    const ratio = stats.totalSize > 0 ? Math.max(0, Math.round((1 - sourceFileSize / stats.totalSize) * 100)) : null;
    return {
      ratio,
      source: sourceFileSize,
      extracted: stats.totalSize,
    };
  }, [sourceFileSize, stats]);

  const passwordMessage = passwordDialogMessage(pendingPassword);

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
          subtitle="Open, browse, and decrypt ZIP archives instantly — including password-protected ZIP and ZIPX files."
          badge={{
            text: "ZIP Extractor • Online • Free",
            icon: FileArchive,
          }}
          features={features}
        />

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            {unsupported && (
              <div className="flex items-start gap-3 rounded-md border border-amber-300/60 bg-amber-50/80 p-4 text-sm text-amber-800 shadow-sm">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
                <div className="space-y-1">
                  <p className="font-semibold">Browser not supported</p>
                  <p className="text-amber-700/90">
                    {support.reason ?? "These archive tools require a modern browser with WebAssembly and module worker support. Please try the latest Chrome, Firefox, Safari, or Edge (Chromium)."}
                  </p>
                </div>
              </div>
            )}
            <div onPointerEnter={warmupEngines} onFocusCapture={warmupEngines}>
              <FileDropZone
                accept=".zip,.zipx"
                multiple={false}
                isDragging={isDragging}
                onDragStateChange={setIsDragging}
                onFilesSelected={unsupported ? () => undefined : handleFilesSelected}
                title="Drop your ZIP archive"
                subtitle="We extract everything locally in your browser."
                primaryButtonLabel="Browse ZIP file"
                disabled={unsupported}
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Extraction failed</p>
                  <p className="text-muted-foreground">{error}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-3 rounded-md border border-muted bg-card p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isReady ? "Extracting archive…" : "Preparing extraction engines…"}</span>
              </div>
            )}

            {files.length > 0 && (
              <div className="rounded-2xl border border-border/40 bg-card/80 p-6 backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Extracted files</h2>
                    <p className="text-sm text-muted-foreground">
                      {stats && `${stats.totalFiles} files • ${formatBytes(stats.totalSize)} total`}
                      {compressionSummary && compressionSummary.ratio !== null && compressionSummary.ratio > 0 && (
                        <span>
                          {` • Archive reduced size by ${compressionSummary.ratio}%`}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={selectAll} variant="outline" className="gap-2">
                      Select all
                    </Button>
                    {selectedPaths.size > 0 && (
                      <Button onClick={() => void downloadSelected()} variant="outline" className="gap-2">
                        <DownloadIcon className="h-4 w-4" />
                        Download selected ({selectedPaths.size})
                      </Button>
                    )}
                    <Button onClick={() => void downloadAll()} variant="secondary" className="gap-2">
                      <DownloadIcon className="h-4 w-4" />
                      Download all
                    </Button>
                    <Button
                      onClick={() => {
                        clearSelection();
                      }}
                      variant="ghost"
                    >
                      Clear selection
                    </Button>
                  </div>
                </div>

                {metadata && (metadata.encrypted || metadata.warnings.length > 0) && (
                  <div className="mt-3 rounded-md border border-border/40 bg-background/60 p-3 text-xs text-muted-foreground">
                    {metadata.encrypted && (
                      <p className="text-foreground/80">
                        Password protected archive unlocked securely in your browser.
                      </p>
                    )}
                    {metadata.warnings.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {metadata.warnings.map((warning, idx) => (
                          <li key={`${warning}-${idx}`}>{warning}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <ArchiveFileTree
                  nodes={files}
                  expandedPaths={expandedPaths}
                  selectedPaths={selectedPaths}
                  onToggleExpand={toggleExpand}
                  onToggleSelect={toggleSelect}
                  getNodeMeta={(node) => (node.isDirectory ? "Directory" : formatBytes(node.size))}
                  renderActions={(node) =>
                    node.isDirectory ? null : (
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
                  className="mt-4 max-h-[520px] text-sm"
                  onDownload={downloadFile}
                />
              </div>
            )}

            {files.length === 0 && !isLoading && !error && (
              <div className="rounded-2xl border border-dashed border-border/40 bg-card/60 p-8 text-center text-sm text-muted-foreground">
                Drop a ZIP archive above to examine and extract its contents instantly.
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <RelatedTools tools={relatedTools} />

            <FAQ items={faqs} />
          </aside>
        </div>
      </div>

      <Dialog open={Boolean(pendingPassword)} onOpenChange={(open) => !open && dismissPassword()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter ZIP password</DialogTitle>
            <DialogDescription>{passwordMessage}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitPassword();
            }}
          >
            <label className="flex items-center gap-2 text-sm font-medium text-foreground" htmlFor="zip-password">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Password
            </label>
            <Input
              id="zip-password"
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
