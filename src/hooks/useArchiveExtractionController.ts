import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { captureError, captureEvent } from "../lib/posthog";
import type { ArchiveEngine, ArchiveFormat, ExtractRequest, ExtractResult } from "../lib/archive/types";
import {
  buildArchiveTree,
  computeArchiveStats,
  flattenArchiveNodes,
  type ArchiveFileNode,
  type ArchiveStats,
} from "../lib/archive/fileTree";
import { useArchiveExtractor } from "./useArchiveExtractor";

export interface ExtractionMetadata {
  engine: ArchiveEngine;
  format: ArchiveFormat;
  warnings: string[];
  encrypted?: boolean;
}

export interface PendingPasswordState {
  file: File;
  message: string;
  attempts: number;
  reason?: "missing" | "incorrect";
}

export interface ArchiveExtractionControllerConfig {
  /** Archive format identifier (zip, rar, sevenZip, etc) */
  format: string;
  /** Analytics tool identifier */
  toolId: string;
}

export interface ArchiveExtractionControllerState {
  archiveName: string;
  sourceFileSize: number | null;
  files: ArchiveFileNode[];
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  isDragging: boolean;
  expandedPaths: Set<string>;
  selectedPaths: Set<string>;
  metadata: ExtractionMetadata | null;
  pendingPassword: PendingPasswordState | null;
  passwordError: string | null;
  stats: ArchiveStats | null;
}

export interface ArchiveExtractionControllerReturn {
  state: ArchiveExtractionControllerState;
  passwordInputRef: RefObject<HTMLInputElement>;
  actions: {
    setIsDragging: (isDragging: boolean) => void;
    reset: () => void;
    handleFilesSelected: (files: File[]) => void;
    performExtraction: (file: File, password?: string | null) => Promise<void>;
    toggleExpand: (path: string) => void;
    toggleSelect: (node: ArchiveFileNode) => void;
    selectAll: () => void;
    clearSelection: () => void;
    submitPassword: () => void;
    dismissPassword: () => void;
    setPasswordError: (message: string | null) => void;
    setError: (message: string | null) => void;
    warmupEngines: () => void;
  };
  helpers: {
    flattenNodes: () => ArchiveFileNode[];
  };
}

function mapPasswordReason(message: string): "missing" | "incorrect" | undefined {
  const normalized = message.toLowerCase();
  if (normalized.includes("wrong") || normalized.includes("incorrect")) {
    return "incorrect";
  }
  if (normalized.includes("provide a password") || normalized.includes("password is required")) {
    return "missing";
  }
  return undefined;
}

export function useArchiveExtractionController(
  config: ArchiveExtractionControllerConfig,
): ArchiveExtractionControllerReturn {
  const { format, toolId } = config;
  const { extract, preload, isReady } = useArchiveExtractor();

  const [files, setFiles] = useState<ArchiveFileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveName, setArchiveName] = useState<string>("");
  const [sourceFileSize, setSourceFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [metadata, setMetadata] = useState<ExtractionMetadata | null>(null);
  const [pendingPassword, setPendingPassword] = useState<PendingPasswordState | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const lastSuccessfulPasswordRef = useRef<string | null>(null);
  const lastFileNameRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setFiles([]);
    setSelectedPaths(new Set());
    setExpandedPaths(new Set());
    setMetadata(null);
    setPendingPassword(null);
    setPasswordError(null);
    setSourceFileSize(null);
    lastSuccessfulPasswordRef.current = null;
    lastFileNameRef.current = null;
  }, []);

  const handleExtractionSuccess = useCallback(
    (file: File, result: ExtractResult, passwordUsed: boolean) => {
      if (!result.ok) {
        const reason = mapPasswordReason(result.message);
        if (result.code === "PASSWORD_REQUIRED") {
          setPendingPassword((prev) => {
            const attempts = (prev?.attempts ?? 0) + 1;
            captureEvent("archive_password_prompted", {
              tool: toolId,
              format,
              fileName: file.name,
              attempts,
              engine: result.engine ?? undefined,
              reason,
            });
            return {
              file,
              message: result.message,
              attempts,
              reason,
            };
          });
          setPasswordError(null);
        } else {
          const failureProps = {
            tool: toolId,
            format,
            fileName: file.name,
            stage: "extract",
            code: result.code,
            recoverable: !!result.recoverable,
            engine: result.engine ?? undefined,
          };
          captureEvent("archive_extract_failed", failureProps);
          captureError(new Error(result.message), failureProps);
          setError(result.message);
        }
        return;
      }

      captureEvent("archive_extract_succeeded", {
        tool: toolId,
        format: result.format.format,
        engine: result.engine,
        warnings: result.warnings.length,
        passwordUsed,
        fileName: file.name,
        fileSize: file.size,
        encrypted: result.encrypted ?? false,
      });

      const tree = buildArchiveTree(result.entries);
      setFiles(tree);
      setExpandedPaths(
        new Set(tree.filter((node) => node.isDirectory).map((node) => node.path)),
      );
      setSelectedPaths(new Set());
      setMetadata({
        engine: result.engine,
        warnings: result.warnings,
        format: result.format,
        encrypted: result.encrypted,
      });
      setPendingPassword(null);
      setPasswordError(null);
      lastFileNameRef.current = file.name;
    },
    [format, toolId],
  );

  const readFileBuffer = useCallback(async (file: File) => {
    try {
      return await file.arrayBuffer();
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotReadableError") {
          throw new Error(
            "We couldn't read that file. On Windows this usually happens when the file is in use by another application or located in a protected folder. Please close any apps using it or copy it to a local folder and try again.",
          );
        }
        if (err.name === "SecurityError") {
          throw new Error(
            "The browser blocked access to this file. Try moving it to a different location on your computer and try again.",
          );
        }
      }
      throw err;
    }
  }, []);

  const performExtraction = useCallback(
    async (file: File, password?: string | null) => {
      setIsLoading(true);
      setError(null);
      setArchiveName(file.name);
      setSourceFileSize(file.size);
      setMetadata(null);
      setFiles([]);
      setSelectedPaths(new Set());
      setExpandedPaths(new Set());

      try {
        await preload();
        const buffer = await readFileBuffer(file);
        const request: ExtractRequest = {
          fileName: file.name,
          buffer,
          password: password ?? undefined,
        };

        const result = await extract(request);
        const passwordUsed = typeof password === "string" && password.length > 0;
        handleExtractionSuccess(file, result, passwordUsed);
        if (result.ok && passwordUsed) {
          lastSuccessfulPasswordRef.current = password ?? null;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to extract archive";
        setError(message);
        captureError(err, {
          tool: toolId,
          format,
          fileName: file.name,
          stage: "read",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [extract, format, handleExtractionSuccess, preload, readFileBuffer, toolId],
  );

  const handleFilesSelected = useCallback(
    (selected: File[]) => {
      if (selected.length === 0) return;
      if (selected.length > 1) {
        setError("Please choose a single archive to extract at a time.");
        captureEvent("archive_multiple_files_selected", {
          tool: toolId,
          format,
          fileCount: selected.length,
        });
        return;
      }

      const [file] = selected;
      if (!file) return;

      if (lastFileNameRef.current === file.name && lastSuccessfulPasswordRef.current) {
        void performExtraction(file, lastSuccessfulPasswordRef.current);
        return;
      }

      void performExtraction(file);
    },
    [format, performExtraction, toolId],
  );

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const toggleSelect = useCallback((node: ArchiveFileNode) => {
    if (node.isDirectory) return;
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(node.path)) {
        next.delete(node.path);
      } else {
        next.add(node.path);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const nodes = flattenArchiveNodes(files);
    setSelectedPaths(new Set(nodes.map((node) => node.path)));
  }, [files]);

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
  }, []);

  const submitPassword = useCallback(() => {
    if (!pendingPassword) return;
    const password = passwordInputRef.current?.value ?? "";
    if (!password && pendingPassword.attempts > 1) {
      setPasswordError("Password cannot be empty.");
      return;
    }
    setPasswordError(null);
    captureEvent("archive_password_submitted", {
      tool: toolId,
      format,
      fileName: pendingPassword.file.name,
      attempts: pendingPassword.attempts,
    });
    void performExtraction(pendingPassword.file, password);
  }, [format, pendingPassword, performExtraction, toolId]);

  const dismissPassword = useCallback(() => {
    if (pendingPassword) {
      captureEvent("archive_password_dismissed", {
        tool: toolId,
        format,
        fileName: pendingPassword.file.name,
        attempts: pendingPassword.attempts,
      });
    }
    setPendingPassword(null);
    setPasswordError(null);
  }, [format, pendingPassword, toolId]);

  const warmupEngines = useCallback(() => {
    void preload();
  }, [preload]);

  useEffect(() => {
    if (pendingPassword && passwordInputRef.current) {
      passwordInputRef.current.value = "";
      passwordInputRef.current.focus({ preventScroll: true });
    }
  }, [pendingPassword]);

  const stats = useMemo(() => {
    if (files.length === 0) return null;
    return computeArchiveStats(files);
  }, [files]);

  return {
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
      reset,
      handleFilesSelected,
      performExtraction,
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
    helpers: {
      flattenNodes: () => flattenArchiveNodes(files),
    },
  };
}
