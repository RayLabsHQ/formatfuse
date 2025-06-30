import { useState, useCallback, useRef, useEffect } from 'react';
import * as Comlink from 'comlink';
// ImageConverterWorker type is defined in the worker file
import type { ImageFormat } from '../lib/image-converter-comlink';

interface UseImageConverterReturn {
  convert: (file: File | Blob, targetFormat: ImageFormat, quality?: number) => Promise<Blob | null>;
  progress: number;
  loading: boolean;
  error: string | null;
}

export function useImageConverter(): UseImageConverterReturn {
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
          new URL('../workers/image-converter-comlink.worker.ts', import.meta.url),
          { type: 'module' }
        );

        const WorkerClass = Comlink.wrap<any>(workerRef.current);
        workerApiRef.current = await new (WorkerClass as any)();
      } catch (err) {
        console.error('Failed to initialize image converter worker:', err);
        setError('Failed to initialize converter');
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

  const convert = useCallback(async (
    file: File | Blob,
    targetFormat: ImageFormat,
    quality?: number
  ): Promise<Blob | null> => {
    if (!workerApiRef.current) {
      setError('Converter not initialized');
      return null;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const fileBuffer = await file.arrayBuffer();
      const fileArray = new Uint8Array(fileBuffer);
      const srcType = file instanceof File ? file.type : 'image/png';

      // Create progress callback
      const progressCallback = Comlink.proxy((percent: number) => {
        setProgress(percent);
      });

      const converted = await workerApiRef.current.convert(
        fileArray,
        srcType,
        targetFormat.mime,
        progressCallback,
        quality
      );

      return new Blob([converted], { type: targetFormat.mime });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Conversion failed';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { convert, progress, loading, error };
}