import type { HeicConversionMessage, HeicConversionResult } from '../workers/heic-converter';
import type { ImageFormat } from './image-converter';
import { getImageConverter } from './image-converter';

export class HeicImageConverter {
  private heicWorker: Worker | null = null;
  private activeConversions = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    // Create HEIC decoder worker
    this.heicWorker = new Worker(
      new URL('../workers/heic-converter.ts', import.meta.url),
      { type: 'module' }
    );

    this.heicWorker.addEventListener('message', (event: MessageEvent<HeicConversionResult>) => {
      const { type, id, imageData, error } = event.data;
      const pending = this.activeConversions.get(id);

      if (!pending) return;

      switch (type) {
        case 'success':
          if (imageData) {
            pending.resolve(imageData);
          }
          this.activeConversions.delete(id);
          break;

        case 'error':
          pending.reject(new Error(error || 'Unknown error'));
          this.activeConversions.delete(id);
          break;

        case 'progress':
          // Handle progress if needed
          break;
      }
    });

    this.heicWorker.addEventListener('error', (error) => {
      console.error('HEIC Worker error:', error);
      this.activeConversions.forEach((pending) => {
        pending.reject(new Error('HEIC Worker error'));
      });
      this.activeConversions.clear();
    });
  }

  private generateId(): string {
    return `heic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert HEIC to any supported format
   * Uses a two-step process: HEIC -> PNG -> Target Format
   */
  async convert(
    file: File | Blob | ArrayBuffer,
    targetFormat: ImageFormat,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.heicWorker) {
      throw new Error('HEIC Worker not initialized');
    }

    // Step 1: Decode HEIC to raw pixel data
    const id = this.generateId();
    const fileBuffer = file instanceof ArrayBuffer 
      ? file 
      : await (file as Blob).arrayBuffer();
    
    const fileArray = new Uint8Array(fileBuffer);

    onProgress?.(10);

    const imageData = await new Promise<ImageData>((resolve, reject) => {
      this.activeConversions.set(id, { resolve, reject });

      const message: HeicConversionMessage = {
        type: 'decode',
        id,
        file: fileArray
      };

      this.heicWorker!.postMessage(message);
    });

    onProgress?.(50);

    // Step 2: Convert ImageData to PNG blob
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    ctx.putImageData(imageData, 0, 0);
    const pngBlob = await canvas.convertToBlob({ type: 'image/png' });

    onProgress?.(70);

    // Step 3: If target is PNG, we're done. Otherwise, convert PNG to target format
    if (targetFormat.name === 'PNG') {
      onProgress?.(100);
      return pngBlob;
    }

    // Use the regular image converter to convert PNG to target format
    const imageConverter = getImageConverter();
    const finalBlob = await imageConverter.convert(
      pngBlob, 
      targetFormat,
      (progress) => {
        // Map progress from 70% to 100%
        const mappedProgress = 70 + (progress * 0.3);
        onProgress?.(mappedProgress);
      }
    );

    return finalBlob;
  }

  destroy() {
    if (this.heicWorker) {
      this.heicWorker.terminate();
      this.heicWorker = null;
    }
    this.activeConversions.clear();
  }
}

// Singleton instance
let heicConverterInstance: HeicImageConverter | null = null;

export function getHeicImageConverter(): HeicImageConverter {
  if (!heicConverterInstance) {
    heicConverterInstance = new HeicImageConverter();
  }
  return heicConverterInstance;
}