import { useState, useCallback, useRef, useEffect } from "react";
import { ImageCompressor } from "../lib/image-compress";
import type { CompressOptions, CompressResult } from "../lib/image-compress";

export interface UseImageCompressResult {
  compress: (
    file: File | Blob,
    options?: CompressOptions,
  ) => Promise<CompressResult | null>;
  compressBatch: (
    files: (File | Blob)[],
    options?: CompressOptions,
  ) => Promise<CompressResult[]>;
  isCompressing: boolean;
  progress: number;
  batchProgress: { index: number; progress: number }[];
  error: string | null;
  clearError: () => void;
}

export function useImageCompress(): UseImageCompressResult {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchProgress, setBatchProgress] = useState<
    { index: number; progress: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const compressorRef = useRef<ImageCompressor | null>(null);

  useEffect(() => {
    // Initialize compressor
    compressorRef.current = new ImageCompressor();

    return () => {
      // Cleanup
      if (compressorRef.current) {
        compressorRef.current.destroy();
        compressorRef.current = null;
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const compress = useCallback(
    async (
      file: File | Blob,
      options: CompressOptions = {},
    ): Promise<CompressResult | null> => {
      if (!compressorRef.current) {
        setError("Compressor not initialized");
        return null;
      }

      setIsCompressing(true);
      setProgress(0);
      setError(null);

      try {
        const result = await compressorRef.current.compress(
          file,
          options,
          (progress) => setProgress(progress),
        );

        setProgress(100);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to compress image";
        setError(message);
        console.error("Compress error:", err);
        return null;
      } finally {
        setIsCompressing(false);
      }
    },
    [],
  );

  const compressBatch = useCallback(
    async (
      files: (File | Blob)[],
      options: CompressOptions = {},
    ): Promise<CompressResult[]> => {
      if (!compressorRef.current) {
        setError("Compressor not initialized");
        return [];
      }

      setIsCompressing(true);
      setBatchProgress([]);
      setError(null);

      try {
        const progressMap = new Map<number, number>();

        const results = await compressorRef.current.compressBatch(
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
          err instanceof Error ? err.message : "Failed to compress images";
        setError(message);
        console.error("Batch compress error:", err);
        return [];
      } finally {
        setIsCompressing(false);
      }
    },
    [],
  );

  return {
    compress,
    compressBatch,
    isCompressing,
    progress,
    batchProgress,
    error,
    clearError,
  };
}
