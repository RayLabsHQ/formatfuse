import React, { useMemo, useState } from "react";
import {
  X,
  Plus,
  File,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FolderPlus,
  Trash2,
} from "lucide-react";
import { ToolHeader } from "../ui/ToolHeader";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { Button } from "../ui/button";
import { FileDropZone } from "../ui/FileDropZone";
import { useArchiveFileSelection } from "../../hooks/useArchiveFileSelection";
import { captureError } from "../../lib/posthog";

export interface ArchiveFileItem {
  file: File;
  path: string;
  status: "pending" | "processing" | "completed";
  progress: number;
}

interface ToolHeaderProps {
  title: {
    highlight: string;
    main: string;
  };
  subtitle: string;
  badge: {
    text: string;
    icon: React.ElementType;
  };
  features: Array<{
    icon: React.ElementType;
    text: string;
    description: string;
  }>;
}

interface HowItWorksStep {
  title: string;
  description: string;
}

interface ArchiveToolProps {
  toolHeader: ToolHeaderProps;
  archiveName: string;
  onArchiveNameChange: (value: string) => void;
  archiveNamePlaceholder?: string;
  archiveNameIcon: React.ElementType;
  archiveNameSuffix: React.ReactNode;
  additionalSettings?: React.ReactNode;
  files: ArchiveFileItem[];
  filesIcon: React.ElementType;
  isCreating: boolean;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  onFilesSelected: (files: File[]) => void;
  allowFolderSelection?: boolean;
  allowMultipleSelection?: boolean;
  dropzoneTitle?: string;
  dropzoneSubtitle?: string;
  dropzoneInfoMessage?: string;
  dropzoneShowButtons?: boolean;
  onCreate: () => void;
  createButtonLabel: string;
  createButtonIcon: React.ElementType;
  clearAll: () => void;
  removeFile: (index: number) => void;
  updatePath: (index: number, newPath: string) => void;
  error: string | null;
  onDismissError: () => void;
  howItWorksSteps: HowItWorksStep[];
  relatedTools: RelatedTool[];
  faqs: FAQItem[];
}

export function ArchiveTool({
  toolHeader,
  archiveName,
  onArchiveNameChange,
  archiveNamePlaceholder = "archive",
  archiveNameIcon: ArchiveNameIcon,
  archiveNameSuffix,
  additionalSettings,
  files,
  filesIcon: FilesIcon,
  isCreating,
  isDragging,
  setIsDragging,
  onFilesSelected,
  allowFolderSelection = true,
  allowMultipleSelection = true,
  dropzoneTitle = "Drop files here or click to browse",
  dropzoneSubtitle = "",
  dropzoneInfoMessage = "Select multiple files or folders to archive",
  dropzoneShowButtons = true,
  onCreate,
  createButtonLabel,
  createButtonIcon: CreateButtonIcon,
  clearAll,
  removeFile,
  updatePath,
  error,
  onDismissError,
  howItWorksSteps,
  relatedTools,
  faqs,
}: ArchiveToolProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const {
    inputs: filePickerInputs,
    openFileDialog,
    openFolderDialog,
  } = useArchiveFileSelection({
    onFilesSelected,
    multiple: allowMultipleSelection,
    allowFolders: allowFolderSelection,
  });

  const totalSize = useMemo(
    () => files.reduce((sum, fileItem) => sum + fileItem.file.size, 0),
    [files],
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 lg:py-6 py-8 sm:py-12">
        <ToolHeader
          title={toolHeader.title}
          subtitle={toolHeader.subtitle}
          badge={toolHeader.badge}
          features={toolHeader.features}
        />

        <div className="space-y-6">
          {filePickerInputs}

          <div
            className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ArchiveNameIcon className="w-5 h-5 text-primary" />
                Archive Settings
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ArchiveNameIcon className="w-4 h-4 text-muted-foreground" />
                  Archive Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={archiveName}
                    onChange={(event) => onArchiveNameChange(event.target.value)}
                    placeholder={archiveNamePlaceholder}
                    className="flex-1 px-3 py-2 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  {archiveNameSuffix}
                </div>
              </div>

              {additionalSettings}
            </div>
          </div>

          {files.length === 0 ? (
            <div
              className="relative animate-fade-in-up"
              style={{ animationDelay: "0.4s" }}
            >
              <FileDropZone
                onFilesSelected={onFilesSelected}
                multiple={allowMultipleSelection}
                allowFolders={allowFolderSelection}
                isDragging={isDragging}
                onDragStateChange={setIsDragging}
                title={dropzoneTitle}
                subtitle={dropzoneSubtitle}
                infoMessage={dropzoneInfoMessage}
                showButtons={dropzoneShowButtons}
                onAddFilesClick={openFileDialog}
                onAddFolderClick={allowFolderSelection ? openFolderDialog : undefined}
              />
            </div>
          ) : (
            <div
              className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: "0.5s" }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                try {
                  const droppedFiles = Array.from(event.dataTransfer.files);
                  onFilesSelected(droppedFiles);
                } catch (error) {
                  captureError(error, {
                    component: "ArchiveTool",
                    stage: "drop",
                    fileCount: event.dataTransfer.files?.length ?? 0,
                  });
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
            >
              <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FilesIcon className="w-5 h-5 text-primary" />
                      Files ({files.length})
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total size: {formatFileSize(totalSize)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={openFileDialog}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Files
                    </Button>
                    {allowFolderSelection && (
                      <Button
                        onClick={openFolderDialog}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <FolderPlus className="w-4 h-4" />
                        Add Folder
                      </Button>
                    )}
                    <Button
                      onClick={onCreate}
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
                          <CreateButtonIcon className="w-4 h-4" />
                          {createButtonLabel}
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

              <div className="divide-y divide-border/50">
                {files.map((fileItem, index) => (
                  <div key={`${fileItem.file.name}-${index}`} className="px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          <File className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          {editingIndex === index ? (
                            <input
                              value={fileItem.path}
                              onChange={(event) => updatePath(index, event.target.value)}
                              onBlur={() => setEditingIndex(null)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  setEditingIndex(null);
                                }
                                if (event.key === "Escape") {
                                  setEditingIndex(null);
                                }
                              }}
                              className="w-full px-2 py-1 bg-background border border-primary rounded text-sm focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <p
                              className="font-medium text-sm truncate cursor-pointer hover:text-primary"
                              onClick={() => setEditingIndex(index)}
                              title="Click to edit path"
                            >
                              {fileItem.path}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatFileSize(fileItem.file.size)}
                          </p>
                        </div>
                      </div>

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

              <div className="mt-4 text-xs text-muted-foreground px-6 pb-4">
                Tip: Click on file paths to edit and organize them into directories
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-start gap-3 animate-fade-in-up">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button onClick={onDismissError}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6 mt-12">
          <h2 className="text-2xl font-semibold">How It Works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {howItWorksSteps.map((step, index) => (
              <div
                key={step.title}
                className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 space-y-6">
          <RelatedTools tools={relatedTools} direction="responsive" />
        </div>

        <div className="mt-12 space-y-6">
          <FAQ items={faqs} />
        </div>
      </div>
    </div>
  );
}
