import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { captureError, captureEvent } from "../lib/posthog";
import type {
  ArchiveEngine,
  ArchiveFormat,
  ExtractRequest,
  ExtractResult,
  FetchEntryResult,
} from "../lib/archive/types";
import {
  buildArchiveTree,
  computeArchiveStats,
  flattenArchiveNodes,
  type ArchiveFileNode,
  type ArchiveStats,
} from "../lib/archive/fileTree";
import { useArchiveExtractor } from "./useArchiveExtractor";

const LARGE_FILE_WARNING_THRESHOLD_BYTES = 1.5 * 1024 * 1024 * 1024; // ~1.5 GB
const MAX_BROWSER_FILE_SIZE_BYTES = 2_000_000_000; // ~1.86 GB browser array buffer limit
const MOBILE_FILE_SIZE_LIMIT_BYTES = 800 * 1024 * 1024; // ~800 MB
const IOS_FILE_SIZE_LIMIT_BYTES = 500 * 1024 * 1024; // ~500 MB

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
  processingWarning: string | null;
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
    fetchFileData: (node: ArchiveFileNode) => Promise<Uint8Array | null>;
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

function formatBytesShort(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value < 10 && exponent > 0 ? 1 : 0)} ${units[exponent]}`;
}

function detectSizeLimit(): number {
  if (typeof navigator === "undefined") return MAX_BROWSER_FILE_SIZE_BYTES;
  const ua = navigator.userAgent.toLowerCase();
  const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;

  if (/iphone|ipad|ipod/.test(ua)) {
    return IOS_FILE_SIZE_LIMIT_BYTES;
  }

  if (/android|mobile/.test(ua)) {
    return MOBILE_FILE_SIZE_LIMIT_BYTES;
  }

  if (typeof deviceMemory === "number" && deviceMemory > 0 && deviceMemory <= 4) {
    return 1_000_000_000; // ~1 GB on low-memory desktops
  }

  return MAX_BROWSER_FILE_SIZE_BYTES;
}

export function useArchiveExtractionController(
  config: ArchiveExtractionControllerConfig,
): ArchiveExtractionControllerReturn {
  const { format, toolId } = config;
  const { extract, preload, isReady, fetchEntry, release } = useArchiveExtractor();

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
  const [processingWarning, setProcessingWarning] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const lastSuccessfulPasswordRef = useRef<string | null>(null);
  const lastFileNameRef = useRef<string | null>(null);
  const lastFileSignatureRef = useRef<string | null>(null);
  const sizeLimitBytes = useMemo(() => detectSizeLimit(), []);

  const computeFileSignature = useCallback((file: File) => {
    const modified = typeof file.lastModified === "number" ? file.lastModified : 0;
    return `${file.name}::${file.size}::${modified}`;
  }, []);

  const reset = useCallback(() => {
    if (sessionId) {
      void release(sessionId);
    }
    setFiles([]);
    setSelectedPaths(new Set());
    setExpandedPaths(new Set());
    setMetadata(null);
    setPendingPassword(null);
    setPasswordError(null);
    setSourceFileSize(null);
    setProcessingWarning(null);
    setSessionId(null);
    lastSuccessfulPasswordRef.current = null;
    lastFileNameRef.current = null;
    lastFileSignatureRef.current = null;
  }, [release, sessionId]);

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
            fileSize: file.size,
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
      setSessionId(result.sessionId);
      setPendingPassword(null);
      setPasswordError(null);
      setProcessingWarning(null);
      lastFileNameRef.current = file.name;
      lastFileSignatureRef.current = computeFileSignature(file);
    },
    [computeFileSignature, format, toolId, setProcessingWarning],
  );

  const readFileBuffer = useCallback(async (file: File) => {
    if (file.size >= sizeLimitBytes) {
      throw new Error(
        `This archive is too large for this browser/device (approx ${formatBytesShort(sizeLimitBytes)} limit). Try splitting the file or using a desktop archive tool.`,
      );
    }

    try {
      return await file.arrayBuffer();
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotReadableError") {
          throw new Error(
            "We couldn't read that file. This usually happens when another app is using it or it's stored in a protected location. Close any apps using it or copy the archive to a local folder and try again.",
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
  }, [sizeLimitBytes]);

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
      if (sessionId) {
        void release(sessionId);
        setSessionId(null);
      }

      try {
        await preload();
        const warningThreshold = Math.min(LARGE_FILE_WARNING_THRESHOLD_BYTES, sizeLimitBytes * 0.75);
        if (file.size >= sizeLimitBytes) {
          const limitText = formatBytesShort(sizeLimitBytes);
          setError(
            `This archive is too large for your current browser/device (roughly ${limitText} limit). Try splitting the file or using a desktop archive tool.`,
          );
          captureEvent("archive_extract_failed", {
            tool: toolId,
            format,
            fileName: file.name,
            fileSize: file.size,
            stage: "preflight",
            code: "FILE_TOO_LARGE",
            recoverable: false,
          });
          setIsLoading(false);
          return;
        } else if (file.size >= warningThreshold) {
          setProcessingWarning(
            `This archive is quite large for your device. Browsers often fail above about ${formatBytesShort(sizeLimitBytes)}; if extraction fails, try closing other tabs or splitting the archive.`,
          );
        } else {
          setProcessingWarning(null);
        }
        const request: ExtractRequest = {
          fileName: file.name,
          size: file.size,
          stream: file.stream() as unknown as ReadableStream<Uint8Array>,
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
          fileSize: file.size,
          stage: "read",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      extract,
      format,
      handleExtractionSuccess,
      preload,
      readFileBuffer,
      toolId,
      setProcessingWarning,
      sizeLimitBytes,
    ],
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
        const signature = computeFileSignature(file);
        if (signature === lastFileSignatureRef.current) {
          void performExtraction(file, lastSuccessfulPasswordRef.current);
          return;
        }
      }

      void performExtraction(file);
    },
    [computeFileSignature, format, performExtraction, toolId],
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

  useEffect(() => {
    return () => {
      if (sessionId) {
        void release(sessionId);
      }
    };
  }, [release, sessionId]);

  const fetchFileData = useCallback(
    async (node: ArchiveFileNode): Promise<Uint8Array | null> => {
      if (node.isDirectory) return null;
      if (node.fileData) return node.fileData;
      if (!sessionId) {
        setError("We lost the extraction session. Please re-open the archive.");
        return null;
      }
      try {
        const result = await fetchEntry(sessionId, node.path);
        if (!result.ok || !result.data) {
          setError(result.ok ? "File data not available." : result.message);
          return null;
        }
        return new Uint8Array(result.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load file data";
        setError(message);
        captureError(err, {
          tool: toolId,
          format,
          fileName: node.name,
          stage: "fetch-entry",
        });
        return null;
      }
    },
    [fetchEntry, format, sessionId, setError, toolId],
  );

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
      processingWarning,
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
      fetchFileData,
    },
  };
}
