import { useCallback } from "react";
import { useImageResize } from "./useImageResize";
import type { ResizeOptions as BaseResizeOptions } from "../lib/image-resize";

export interface ResizeOptions {
  width: number;
  height: number;
  method?: "triangle" | "catrom" | "mitchell" | "lanczos3" | "hqx" | "magicKernel";
  fitMethod?: "stretch" | "contain";
  onProgress?: (progress: number) => void;
}

export interface ResizeResult {
  blob: Blob;
  originalDimensions: { width: number; height: number };
  resizedDimensions: { width: number; height: number };
}

export function useImageResizer() {
  const { resize: baseResize, isResizing, error, clearError } = useImageResize();

  const resize = useCallback(
    async (file: File, options: ResizeOptions): Promise<ResizeResult> => {
      // Get original dimensions first
      const img = new Image();
      const originalDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      URL.revokeObjectURL(img.src);

      const baseOptions: BaseResizeOptions = {
        width: options.width,
        height: options.height,
        method: options.method,
        fitMethod: options.fitMethod,
        maintainAspectRatio: options.fitMethod === "contain",
      };

      const result = await baseResize(file, baseOptions);
      if (!result) {
        throw new Error("Resize failed");
      }

      return {
        blob: result.blob,
        originalDimensions,
        resizedDimensions: { width: result.width, height: result.height },
      };
    },
    [baseResize]
  );

  return {
    resize,
    isResizing,
    error,
    clearError,
  };
}