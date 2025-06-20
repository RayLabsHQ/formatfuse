import type { ConversionMessage, ConversionResult } from '../workers/image-converter';

export interface ImageFormat {
  mime: string;
  extension: string;
  name: string;
}

export const IMAGE_FORMATS: Record<string, ImageFormat> = {
  PNG: { mime: 'image/png', extension: 'png', name: 'PNG' },
  JPEG: { mime: 'image/jpeg', extension: 'jpg', name: 'JPEG' },
  WEBP: { mime: 'image/webp', extension: 'webp', name: 'WebP' },
  GIF: { mime: 'image/gif', extension: 'gif', name: 'GIF' },
  BMP: { mime: 'image/bmp', extension: 'bmp', name: 'BMP' },
  ICO: { mime: 'image/x-icon', extension: 'ico', name: 'ICO' },
  TIFF: { mime: 'image/tiff', extension: 'tiff', name: 'TIFF' },
  SVG: { mime: 'image/svg+xml', extension: 'svg', name: 'SVG' },
  AVIF: { mime: 'image/avif', extension: 'avif', name: 'AVIF' },
  HEIC: { mime: 'image/heic', extension: 'heic', name: 'HEIC' }
};

export class ImageConverter {
  private worker: Worker | null = null;
  private activeConversions = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    // Create worker with proper type module
    this.worker = new Worker(
      new URL('../workers/image-converter.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.addEventListener('message', (event: MessageEvent<ConversionResult>) => {
      const { type, id, data, metadata, pixels, progress, error } = event.data;
      const pending = this.activeConversions.get(id);

      if (!pending) return;

      switch (type) {
        case 'success':
          if (data) {
            pending.resolve(data);
          } else if (metadata) {
            pending.resolve(metadata);
          } else if (pixels) {
            pending.resolve(pixels);
          }
          this.activeConversions.delete(id);
          break;

        case 'error':
          pending.reject(new Error(error || 'Unknown error'));
          this.activeConversions.delete(id);
          break;

        case 'progress':
          // Handle progress updates if needed
          // Could emit an event or call a callback
          break;
      }
    });

    this.worker.addEventListener('error', (error) => {
      console.error('Worker error:', error);
      // Reject all pending conversions
      this.activeConversions.forEach((pending) => {
        pending.reject(new Error('Worker error'));
      });
      this.activeConversions.clear();
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async convert(
    file: File | Blob | ArrayBuffer,
    targetFormat: ImageFormat,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const id = this.generateId();
    const fileBuffer = file instanceof ArrayBuffer 
      ? file 
      : await (file as Blob).arrayBuffer();
    
    const fileArray = new Uint8Array(fileBuffer);
    const srcType = file instanceof File ? file.type : 'image/png'; // Default to PNG if unknown

    return new Promise((resolve, reject) => {
      this.activeConversions.set(id, {
        resolve: (data: Uint8Array) => {
          const blob = new Blob([data], { type: targetFormat.mime });
          resolve(blob);
        },
        reject
      });

      const message: ConversionMessage = {
        type: 'convert',
        id,
        file: fileArray,
        srcType,
        targetType: targetFormat.mime
      };

      this.worker!.postMessage(message);
    });
  }

  async getMetadata(file: File | Blob | ArrayBuffer): Promise<any> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const id = this.generateId();
    const fileBuffer = file instanceof ArrayBuffer 
      ? file 
      : await (file as Blob).arrayBuffer();
    
    const fileArray = new Uint8Array(fileBuffer);
    const srcType = file instanceof File ? file.type : 'image/png';

    return new Promise((resolve, reject) => {
      this.activeConversions.set(id, { resolve, reject });

      const message: ConversionMessage = {
        type: 'metadata',
        id,
        file: fileArray,
        srcType
      };

      this.worker!.postMessage(message);
    });
  }

  async getPixels(file: File | Blob | ArrayBuffer): Promise<any> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const id = this.generateId();
    const fileBuffer = file instanceof ArrayBuffer 
      ? file 
      : await (file as Blob).arrayBuffer();
    
    const fileArray = new Uint8Array(fileBuffer);
    const srcType = file instanceof File ? file.type : 'image/png';

    return new Promise((resolve, reject) => {
      this.activeConversions.set(id, { resolve, reject });

      const message: ConversionMessage = {
        type: 'pixels',
        id,
        file: fileArray,
        srcType
      };

      this.worker!.postMessage(message);
    });
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.activeConversions.clear();
  }
}

// Singleton instance
let converterInstance: ImageConverter | null = null;

export function getImageConverter(): ImageConverter {
  if (!converterInstance) {
    converterInstance = new ImageConverter();
  }
  return converterInstance;
}