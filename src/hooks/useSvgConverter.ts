import { useState, useCallback, useRef, useEffect } from 'react';
import { SvgConverter } from '../lib/svg-converter';

type OutputFormat = 'png' | 'jpeg' | 'webp' | 'avif';

interface ConversionResult {
  blob: Blob;
  url: string;
  info: {
    width: number;
    height: number;
    viewBox?: string;
  };
}

export function useSvgConverter() {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const converterRef = useRef<SvgConverter | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  // Initialize converter on mount
  useEffect(() => {
    converterRef.current = new SvgConverter();

    return () => {
      if (converterRef.current) {
        converterRef.current.terminate();
      }
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
      }
    };
  }, []);

  const convert = useCallback(async (
    svgFile: File | Uint8Array | string,
    targetFormat: OutputFormat = 'png',
    options: {
      width?: number;
      height?: number;
      background?: string;
      scale?: number;
      quality?: number;
    } = {}
  ): Promise<ConversionResult | null> => {
    if (!converterRef.current) {
      setError('Converter not initialized');
      return null;
    }

    // Clean up previous result URL
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }

    setIsConverting(true);
    setProgress(0);
    setError(null);

    try {
      // Get SVG info first
      const info = await converterRef.current.getSvgInfo(svgFile);

      // Convert SVG to target format
      const outputBuffer = await converterRef.current.convert(
        svgFile,
        targetFormat,
        options,
        (p) => setProgress(p)
      );

      // Create blob and URL
      const mimeType = targetFormat === 'jpeg' ? 'image/jpeg' :
                      targetFormat === 'webp' ? 'image/webp' :
                      targetFormat === 'avif' ? 'image/avif' : 'image/png';
      
      const blob = new Blob([outputBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;

      return {
        blob,
        url,
        info
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Conversion failed';
      setError(errorMessage);
      console.error('SVG conversion error:', err);
      return null;
    } finally {
      setIsConverting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  return {
    convert,
    isConverting,
    progress,
    error,
    reset
  };
}