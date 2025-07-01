import * as Comlink from "comlink";
import resize from "@jsquash/resize";
import { decode as decodeJpeg } from "@jsquash/jpeg";
import { decode as decodePng } from "@jsquash/png";
import { decode as decodeWebp } from "@jsquash/webp";

export type ResizeMethod =
  | "triangle"
  | "catrom"
  | "mitchell"
  | "lanczos3"
  | "hqx"
  | "magicKernel"
  | "magicKernelSharp2013"
  | "magicKernelSharp2021";
export type FitMethod = "stretch" | "contain" | "cover" | "fill";
export type ImageFormat = "jpeg" | "jpg" | "png" | "webp";

export interface ResizeOptions {
  width?: number;
  height?: number;
  method?: ResizeMethod;
  fitMethod?: FitMethod;
  maintainAspectRatio?: boolean;
  quality?: number;
  format?: ImageFormat;
}

export interface ResizeResult {
  blob: Blob;
  width: number;
  height: number;
  format: string;
}

class ImageResizeWorker {
  private async decodeImage(blob: Blob): Promise<ImageData> {
    const arrayBuffer = await blob.arrayBuffer();
    const type = blob.type.toLowerCase();

    if (type.includes("jpeg") || type.includes("jpg")) {
      return await decodeJpeg(new Uint8Array(arrayBuffer));
    } else if (type.includes("png")) {
      return await decodePng(new Uint8Array(arrayBuffer));
    } else if (type.includes("webp")) {
      return await decodeWebp(new Uint8Array(arrayBuffer));
    }

    // For other formats, try using OffscreenCanvas
    if (typeof OffscreenCanvas !== "undefined") {
      const img = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, img.width, img.height);
    }

    throw new Error("Unsupported image format");
  }

  private async encodeImage(
    imageData: ImageData,
    format: ImageFormat,
    quality: number = 0.85,
  ): Promise<Blob> {
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(imageData.width, imageData.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.putImageData(imageData, 0, 0);

      const mimeType = format === "jpg" ? "image/jpeg" : `image/${format}`;
      const blob = await canvas.convertToBlob({
        type: mimeType,
        quality: format === "png" ? undefined : quality,
      });

      return blob;
    }

    throw new Error("OffscreenCanvas not available");
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth?: number,
    targetHeight?: number,
    fitMethod: FitMethod = "stretch",
    maintainAspectRatio: boolean = true,
  ): { width: number; height: number } {
    if (!targetWidth && !targetHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;

    if (!maintainAspectRatio || fitMethod === "stretch") {
      return {
        width: targetWidth || originalWidth,
        height: targetHeight || originalHeight,
      };
    }

    if (!targetWidth) {
      return {
        width: Math.round(targetHeight! * aspectRatio),
        height: targetHeight!,
      };
    }

    if (!targetHeight) {
      return {
        width: targetWidth,
        height: Math.round(targetWidth / aspectRatio),
      };
    }

    // Both dimensions specified, maintain aspect ratio
    if (fitMethod === "contain") {
      const scale = Math.min(
        targetWidth / originalWidth,
        targetHeight / originalHeight,
      );
      return {
        width: Math.round(originalWidth * scale),
        height: Math.round(originalHeight * scale),
      };
    } else if (fitMethod === "cover") {
      const scale = Math.max(
        targetWidth / originalWidth,
        targetHeight / originalHeight,
      );
      return {
        width: Math.round(originalWidth * scale),
        height: Math.round(originalHeight * scale),
      };
    } else {
      // fill
      return { width: targetWidth, height: targetHeight };
    }
  }

  async resizeImage(
    blob: Blob,
    options: ResizeOptions = {},
    onProgress?: (progress: number) => void,
  ): Promise<ResizeResult> {
    try {
      onProgress?.(10);

      // Decode the image
      const imageData = await this.decodeImage(blob);
      onProgress?.(30);

      // Calculate dimensions
      const dimensions = this.calculateDimensions(
        imageData.width,
        imageData.height,
        options.width,
        options.height,
        options.fitMethod || "stretch",
        options.maintainAspectRatio !== false,
      );

      onProgress?.(40);

      // Resize the image
      const resizedImageData = await resize(imageData, {
        width: dimensions.width,
        height: dimensions.height,
        method: options.method || "lanczos3",
        fitMethod:
          options.fitMethod === "fill"
            ? "stretch"
            : options.fitMethod || "stretch",
        premultiply: true,
        linearRGB: true,
      });

      onProgress?.(70);

      // Encode the resized image
      const format =
        options.format || (blob.type.split("/")[1] as ImageFormat) || "jpeg";
      const outputBlob = await this.encodeImage(
        resizedImageData,
        format,
        options.quality,
      );

      onProgress?.(100);

      return {
        blob: outputBlob,
        width: resizedImageData.width,
        height: resizedImageData.height,
        format,
      };
    } catch (error) {
      console.error("Resize error:", error);
      throw error;
    }
  }

  async resizeBatch(
    blobs: Blob[],
    options: ResizeOptions = {},
    onProgress?: (index: number, progress: number) => void,
  ): Promise<ResizeResult[]> {
    const results: ResizeResult[] = [];

    for (let i = 0; i < blobs.length; i++) {
      const result = await this.resizeImage(blobs[i], options, (progress) =>
        onProgress?.(i, progress),
      );
      results.push(result);
    }

    return results;
  }
}

Comlink.expose(ImageResizeWorker);
