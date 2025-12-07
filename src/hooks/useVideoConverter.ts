import { useState, useCallback, useRef, useEffect } from "react";
import * as Comlink from "comlink";
import type { VideoConversionOptions } from "../workers/video-converter.worker";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  rotation: number;
  hasAudio: boolean;
  hasVideo: boolean;
}

interface UseVideoConverterReturn {
  convert: (
    file: File | Blob,
    targetFormat: string,
    options?: VideoConversionOptions,
    onProgress?: (progress: number) => void,
  ) => Promise<Blob | null>;
  getMetadata: (
    file: File | Blob,
    onProgress?: (progress: number) => void,
  ) => Promise<VideoMetadata | null>;
  compress: (
    file: File | Blob,
    quality: "low" | "medium" | "high" | "ultra",
    onProgress?: (progress: number) => void,
  ) => Promise<Blob | null>;
  trim: (
    file: File | Blob,
    startTime: number,
    endTime: number,
    onProgress?: (progress: number) => void,
  ) => Promise<Blob | null>;
  resize: (
    file: File | Blob,
    width: number,
    height: number,
    onProgress?: (progress: number) => void,
  ) => Promise<Blob | null>;
  rotate: (
    file: File | Blob,
    rotation: number,
    onProgress?: (progress: number) => void,
  ) => Promise<Blob | null>;
  progress: number;
  loading: boolean;
  error: string | null;
}

export function useVideoConverter(): UseVideoConverterReturn {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerApiRef = useRef<any>(null);

  useEffect(() => {
    // Initialize worker on mount
    const initWorker = async () => {
      try {
        workerRef.current = new Worker(
          new URL("../workers/video-converter.worker.ts", import.meta.url),
          { type: "module" },
        );

        // Worker exposes an instance directly, not a class
        workerApiRef.current = Comlink.wrap<any>(workerRef.current);
      } catch (err) {
        console.error("Failed to initialize video converter worker:", err);
        setError("Failed to initialize converter");
      }
    };

    initWorker();

    // Cleanup on unmount
    return () => {
      if (workerApiRef.current) {
        workerApiRef.current[Comlink.releaseProxy]();
      }
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const convert = useCallback(
    async (
      file: File | Blob,
      targetFormat: string,
      options: VideoConversionOptions = {},
      onProgress?: (progress: number) => void,
    ): Promise<Blob | null> => {
      if (!workerApiRef.current) {
        setError("Converter not initialized");
        return null;
      }

      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        const fileBuffer = await file.arrayBuffer();
        const fileArray = new Uint8Array(fileBuffer);

        // Create progress callback
        const progressCallback = Comlink.proxy((percent: number) => {
          setProgress(percent);
          onProgress?.(percent);
        });

        const converted = await workerApiRef.current.convert(
          fileArray,
          targetFormat,
          options,
          progressCallback,
        );

        // Determine MIME type from target format
        let mimeType = "video/mp4";
        switch (targetFormat.toLowerCase()) {
          case "webm":
            mimeType = "video/webm";
            break;
          case "mov":
            mimeType = "video/quicktime";
            break;
          case "mkv":
            mimeType = "video/x-matroska";
            break;
        }

        return new Blob([converted], { type: mimeType });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Conversion failed";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getMetadata = useCallback(
    async (
      file: File | Blob,
      onProgress?: (progress: number) => void,
    ): Promise<VideoMetadata | null> => {
      if (!workerApiRef.current) {
        setError("Converter not initialized");
        return null;
      }

      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        const fileBuffer = await file.arrayBuffer();
        const fileArray = new Uint8Array(fileBuffer);

        const progressCallback = Comlink.proxy((percent: number) => {
          setProgress(percent);
          onProgress?.(percent);
        });

        const metadata = await workerApiRef.current.getMetadata(
          fileArray,
          progressCallback,
        );

        return metadata;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to read metadata";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const compress = useCallback(
    async (
      file: File | Blob,
      quality: "low" | "medium" | "high" | "ultra",
      onProgress?: (progress: number) => void,
    ): Promise<Blob | null> => {
      if (!workerApiRef.current) {
        setError("Converter not initialized");
        return null;
      }

      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        const fileBuffer = await file.arrayBuffer();
        const fileArray = new Uint8Array(fileBuffer);

        const progressCallback = Comlink.proxy((percent: number) => {
          setProgress(percent);
          onProgress?.(percent);
        });

        const compressed = await workerApiRef.current.compress(
          fileArray,
          quality,
          progressCallback,
        );

        return new Blob([compressed], { type: "video/mp4" });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Compression failed";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const trim = useCallback(
    async (
      file: File | Blob,
      startTime: number,
      endTime: number,
      onProgress?: (progress: number) => void,
    ): Promise<Blob | null> => {
      if (!workerApiRef.current) {
        setError("Converter not initialized");
        return null;
      }

      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        const fileBuffer = await file.arrayBuffer();
        const fileArray = new Uint8Array(fileBuffer);

        const progressCallback = Comlink.proxy((percent: number) => {
          setProgress(percent);
          onProgress?.(percent);
        });

        const trimmed = await workerApiRef.current.trim(
          fileArray,
          startTime,
          endTime,
          progressCallback,
        );

        return new Blob([trimmed], { type: "video/mp4" });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Trim failed";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const resize = useCallback(
    async (
      file: File | Blob,
      width: number,
      height: number,
      onProgress?: (progress: number) => void,
    ): Promise<Blob | null> => {
      if (!workerApiRef.current) {
        setError("Converter not initialized");
        return null;
      }

      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        const fileBuffer = await file.arrayBuffer();
        const fileArray = new Uint8Array(fileBuffer);

        const progressCallback = Comlink.proxy((percent: number) => {
          setProgress(percent);
          onProgress?.(percent);
        });

        const resized = await workerApiRef.current.resize(
          fileArray,
          width,
          height,
          progressCallback,
        );

        return new Blob([resized], { type: "video/mp4" });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Resize failed";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const rotate = useCallback(
    async (
      file: File | Blob,
      rotation: number,
      onProgress?: (progress: number) => void,
    ): Promise<Blob | null> => {
      if (!workerApiRef.current) {
        setError("Converter not initialized");
        return null;
      }

      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        const fileBuffer = await file.arrayBuffer();
        const fileArray = new Uint8Array(fileBuffer);

        const progressCallback = Comlink.proxy((percent: number) => {
          setProgress(percent);
          onProgress?.(percent);
        });

        const rotated = await workerApiRef.current.rotate(
          fileArray,
          rotation,
          progressCallback,
        );

        return new Blob([rotated], { type: "video/mp4" });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Rotation failed";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    convert,
    getMetadata,
    compress,
    trim,
    resize,
    rotate,
    progress,
    loading,
    error,
  };
}
