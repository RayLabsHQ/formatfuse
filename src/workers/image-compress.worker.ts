import * as Comlink from 'comlink';
import { encode as encodeJpeg } from '@jsquash/jpeg';
import { encode as encodeWebp } from '@jsquash/webp';
import { encode as encodePng } from '@jsquash/png';
import { encode as encodeAvif } from '@jsquash/avif';
import { decode as decodeJpeg } from '@jsquash/jpeg';
import { decode as decodePng } from '@jsquash/png';
import { decode as decodeWebp } from '@jsquash/webp';
import { decode as decodeAvif } from '@jsquash/avif';

export type CompressFormat = 'jpeg' | 'jpg' | 'webp' | 'png' | 'avif';

export interface CompressOptions {
  quality?: number; // 0-100 for JPEG/WebP
  format?: CompressFormat;
  maintainFormat?: boolean; // Keep original format
  maxWidth?: number;
  maxHeight?: number;
}

export interface CompressResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
}

class ImageCompressWorker {
  private async decodeImage(blob: Blob): Promise<ImageData> {
    const arrayBuffer = await blob.arrayBuffer();
    const type = blob.type.toLowerCase();
    
    if (type.includes('jpeg') || type.includes('jpg')) {
      return await decodeJpeg(new Uint8Array(arrayBuffer));
    } else if (type.includes('png')) {
      return await decodePng(new Uint8Array(arrayBuffer));
    } else if (type.includes('webp')) {
      return await decodeWebp(new Uint8Array(arrayBuffer));
    } else if (type.includes('avif')) {
      return await decodeAvif(new Uint8Array(arrayBuffer));
    }
    
    // For other formats, try using OffscreenCanvas
    if (typeof OffscreenCanvas !== 'undefined') {
      const img = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, img.width, img.height);
    }
    
    throw new Error('Unsupported image format');
  }
  
  private async resizeIfNeeded(imageData: ImageData, maxWidth?: number, maxHeight?: number): Promise<ImageData> {
    if (!maxWidth && !maxHeight) return imageData;
    
    const { width, height } = imageData;
    let newWidth = width;
    let newHeight = height;
    
    if (maxWidth && width > maxWidth) {
      newWidth = maxWidth;
      newHeight = Math.round((maxWidth / width) * height);
    }
    
    if (maxHeight && newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = Math.round((maxHeight / height) * width);
    }
    
    if (newWidth === width && newHeight === height) return imageData;
    
    // Use OffscreenCanvas for resizing
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(newWidth, newHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Create temporary canvas with original image
      const tempCanvas = new OffscreenCanvas(width, height);
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Could not get temp canvas context');
      
      tempCtx.putImageData(imageData, 0, 0);
      
      // Draw resized
      ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
      return ctx.getImageData(0, 0, newWidth, newHeight);
    }
    
    return imageData;
  }
  
  private normalizeQuality(quality: number | undefined, format: CompressFormat): number {
    if (format === 'png') return 100; // PNG is lossless
    
    // Convert 0-100 to format-specific range
    const q = quality ?? 85;
    return Math.max(0, Math.min(100, q)) / 100;
  }
  
  async compress(
    blob: Blob,
    options: CompressOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<CompressResult> {
    try {
      onProgress?.(10);
      
      // Decode the image
      const imageData = await this.decodeImage(blob);
      onProgress?.(30);
      
      // Resize if needed
      const resizedData = await this.resizeIfNeeded(
        imageData,
        options.maxWidth,
        options.maxHeight
      );
      onProgress?.(50);
      
      // Determine output format
      let outputFormat: CompressFormat;
      if (options.maintainFormat !== false && !options.format) {
        const type = blob.type.toLowerCase();
        if (type.includes('jpeg') || type.includes('jpg')) {
          outputFormat = 'jpeg';
        } else if (type.includes('webp')) {
          outputFormat = 'webp';
        } else if (type.includes('avif')) {
          outputFormat = 'avif';
        } else if (type.includes('png')) {
          outputFormat = 'png';
        } else {
          outputFormat = 'jpeg'; // Default to JPEG for unknown formats
        }
      } else {
        outputFormat = options.format || 'jpeg';
      }
      
      // Encode based on format
      let encoded: Uint8Array;
      const quality = this.normalizeQuality(options.quality, outputFormat);
      
      if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
        encoded = await encodeJpeg(resizedData, { quality });
      } else if (outputFormat === 'webp') {
        encoded = await encodeWebp(resizedData, { quality });
      } else if (outputFormat === 'avif') {
        encoded = await encodeAvif(resizedData, { quality });
      } else if (outputFormat === 'png') {
        // PNG is lossless, so we just encode it
        encoded = await encodePng(resizedData);
      } else {
        throw new Error(`Unsupported output format: ${outputFormat}`);
      }
      
      onProgress?.(90);
      
      // Create blob
      const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : `image/${outputFormat}`;
      const compressedBlob = new Blob([encoded], { type: mimeType });
      
      onProgress?.(100);
      
      return {
        blob: compressedBlob,
        originalSize: blob.size,
        compressedSize: compressedBlob.size,
        compressionRatio: ((blob.size - compressedBlob.size) / blob.size) * 100,
        format: outputFormat
      };
    } catch (error) {
      console.error('Compression error:', error);
      throw error;
    }
  }
  
  async compressBatch(
    blobs: Blob[],
    options: CompressOptions = {},
    onProgress?: (index: number, progress: number) => void
  ): Promise<CompressResult[]> {
    const results: CompressResult[] = [];
    
    for (let i = 0; i < blobs.length; i++) {
      const result = await this.compress(
        blobs[i],
        options,
        (progress) => onProgress?.(i, progress)
      );
      results.push(result);
    }
    
    return results;
  }
}

Comlink.expose(ImageCompressWorker);