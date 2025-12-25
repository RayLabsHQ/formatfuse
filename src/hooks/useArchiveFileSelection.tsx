import { useCallback, useMemo, useRef, type ChangeEvent } from "react";
import { captureError } from "../lib/posthog";

interface UseArchiveFileSelectionOptions {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  allowFolders?: boolean;
}

export function useArchiveFileSelection({
  onFilesSelected,
  multiple = true,
  allowFolders = true,
}: UseArchiveFileSelectionOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleSelection = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      try {
        const selectedFiles = Array.from(event.target.files || []);
        if (selectedFiles.length > 0) {
          onFilesSelected(selectedFiles);
        }
      } catch (error) {
        captureError(error, {
          hook: "useArchiveFileSelection",
          fileCount: event.target.files?.length ?? 0,
        });
      } finally {
        // Allow selecting the same file or folder twice in a row
        event.target.value = "";
      }
    },
    [onFilesSelected],
  );

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const openFolderDialog = useCallback(() => {
    if (!allowFolders) return;
    folderInputRef.current?.click();
  }, [allowFolders]);

  const inputs = useMemo(
    () => (
      <div className="hidden" aria-hidden="true">
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          onChange={handleSelection}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple={multiple}
          onChange={handleSelection}
          {...({ webkitdirectory: "", directory: "" } as any)}
        />
      </div>
    ),
    [handleSelection, multiple],
  );

  return {
    inputs,
    openFileDialog,
    openFolderDialog,
  } as const;
}
