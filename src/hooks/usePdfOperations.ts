import { useState, useCallback, useRef, useEffect } from 'react';
import { PDFOperations } from '../lib/pdf-operations';
import type { 
  SplitOptions, 
  MergeOptions, 
  RotateOptions, 
  ExtractOptions, 
  PdfToImageOptions,
  PdfMetadata 
} from '../lib/pdf-operations';

interface UsePdfOperationsResult {
  split: (pdfData: Uint8Array, options: SplitOptions) => Promise<Uint8Array[]>;
  merge: (options: MergeOptions) => Promise<Uint8Array>;
  rotate: (pdfData: Uint8Array, options: RotateOptions) => Promise<Uint8Array>;
  extract: (pdfData: Uint8Array, options: ExtractOptions) => Promise<Uint8Array>;
  pdfToImages: (pdfData: Uint8Array, options: PdfToImageOptions) => Promise<{ page: number; data: Uint8Array; mimeType: string }[]>;
  getPageCount: (pdfData: Uint8Array) => Promise<number>;
  getMetadata: (pdfData: Uint8Array) => Promise<PdfMetadata>;
  isProcessing: boolean;
  progress: number;
  error: Error | null;
}

export function usePdfOperations(): UsePdfOperationsResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const pdfOpsRef = useRef<PDFOperations | null>(null);

  useEffect(() => {
    // Initialize PDF operations
    pdfOpsRef.current = new PDFOperations();

    // Cleanup on unmount
    return () => {
      pdfOpsRef.current?.dispose();
    };
  }, []);

  const handleProgress = useCallback((prog: number) => {
    setProgress(prog);
  }, []);

  const split = useCallback(async (pdfData: Uint8Array, options: SplitOptions): Promise<Uint8Array[]> => {
    if (!pdfOpsRef.current) throw new Error('PDF operations not initialized');
    
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const result = await pdfOpsRef.current.split(pdfData, options, handleProgress);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Split operation failed');
      setError(error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [handleProgress]);

  const merge = useCallback(async (options: MergeOptions): Promise<Uint8Array> => {
    if (!pdfOpsRef.current) throw new Error('PDF operations not initialized');
    
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const result = await pdfOpsRef.current.merge(options, handleProgress);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Merge operation failed');
      setError(error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [handleProgress]);

  const rotate = useCallback(async (pdfData: Uint8Array, options: RotateOptions): Promise<Uint8Array> => {
    if (!pdfOpsRef.current) throw new Error('PDF operations not initialized');
    
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const result = await pdfOpsRef.current.rotate(pdfData, options, handleProgress);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Rotate operation failed');
      setError(error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [handleProgress]);

  const extract = useCallback(async (pdfData: Uint8Array, options: ExtractOptions): Promise<Uint8Array> => {
    if (!pdfOpsRef.current) throw new Error('PDF operations not initialized');
    
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const result = await pdfOpsRef.current.extract(pdfData, options, handleProgress);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Extract operation failed');
      setError(error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [handleProgress]);

  const pdfToImages = useCallback(async (
    pdfData: Uint8Array, 
    options: PdfToImageOptions
  ): Promise<{ page: number; data: Uint8Array; mimeType: string }[]> => {
    if (!pdfOpsRef.current) throw new Error('PDF operations not initialized');
    
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const result = await pdfOpsRef.current.pdfToImages(pdfData, options, handleProgress);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('PDF to images conversion failed');
      setError(error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [handleProgress]);

  const getPageCount = useCallback(async (pdfData: Uint8Array): Promise<number> => {
    if (!pdfOpsRef.current) throw new Error('PDF operations not initialized');
    
    try {
      return await pdfOpsRef.current.getPageCount(pdfData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get page count');
      setError(error);
      throw error;
    }
  }, []);

  const getMetadata = useCallback(async (pdfData: Uint8Array): Promise<PdfMetadata> => {
    if (!pdfOpsRef.current) throw new Error('PDF operations not initialized');
    
    try {
      return await pdfOpsRef.current.getMetadata(pdfData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get PDF metadata');
      setError(error);
      throw error;
    }
  }, []);

  return {
    split,
    merge,
    rotate,
    extract,
    pdfToImages,
    getPageCount,
    getMetadata,
    isProcessing,
    progress,
    error,
  };
}