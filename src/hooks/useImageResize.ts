import { useState, useCallback, useRef, useEffect } from "react";
import { ImageResizer } from "../lib/image-resize";
import type { ResizeOptions, ResizeResult } from "../lib/image-resize";

export interface UseImageResizeResult {
  resize: (
    file: File | Blob,
    options?: ResizeOptions,
  ) => Promise<ResizeResult | null>;
  resizeBatch: (
    files: (File | Blob)[],
    options?: ResizeOptions,
  ) => Promise<ResizeResult[]>;
  isResizing: boolean;
  progress: number;
  batchProgress: { index: number; progress: number }[];
  error: string | null;
  clearError: () => void;
}

export function useImageResize(): UseImageResizeResult {
  const [isResizing, setIsResizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchProgress, setBatchProgress] = useState<
    { index: number; progress: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const resizerRef = useRef<ImageResizer | null>(null);

  useEffect(() => {
    // Initialize resizer
    resizerRef.current = new ImageResizer();

    return () => {
      // Cleanup
      if (resizerRef.current) {
        resizerRef.current.destroy();
        resizerRef.current = null;
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resize = useCallback(
    async (
      file: File | Blob,
      options: ResizeOptions = {},
    ): Promise<ResizeResult | null> => {
      if (!resizerRef.current) {
        setError("Resizer not initialized");
        return null;
      }

      setIsResizing(true);
      setProgress(0);
      setError(null);

      try {
        const result = await resizerRef.current.resize(
          file,
          options,
          (progress) => setProgress(progress),
        );

        setProgress(100);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to resize image";
        setError(message);
        console.error("Resize error:", err);
        return null;
      } finally {
        setIsResizing(false);
      }
    },
    [],
  );

  const resizeBatch = useCallback(
    async (
      files: (File | Blob)[],
      options: ResizeOptions = {},
    ): Promise<ResizeResult[]> => {
      if (!resizerRef.current) {
        setError("Resizer not initialized");
        return [];
      }

      setIsResizing(true);
      setBatchProgress([]);
      setError(null);

      try {
        const progressMap = new Map<number, number>();

        const results = await resizerRef.current.resizeBatch(
          files,
          options,
          (index, progress) => {
            progressMap.set(index, progress);
            const progressArray = Array.from(progressMap.entries())
              .map(([idx, prog]) => ({ index: idx, progress: prog }))
              .sort((a, b) => a.index - b.index);
            setBatchProgress(progressArray);

            // Calculate overall progress
            const totalProgress =
              progressArray.reduce((sum, item) => sum + item.progress, 0) /
              files.length;
            setProgress(Math.round(totalProgress));
          },
        );

        setProgress(100);
        return results;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to resize images";
        setError(message);
        console.error("Batch resize error:", err);
        return [];
      } finally {
        setIsResizing(false);
      }
    },
    [],
  );

  return {
    resize,
    resizeBatch,
    isResizing,
    progress,
    batchProgress,
    error,
    clearError,
  };
}
