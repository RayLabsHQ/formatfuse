import * as Comlink from "comlink";

export interface ImageFormat {
  mime: string;
  extension: string;
  name: string;
}

export const IMAGE_FORMATS: Record<string, ImageFormat> = {
  PNG: { mime: "image/png", extension: "png", name: "PNG" },
  JPEG: { mime: "image/jpeg", extension: "jpg", name: "JPEG" },
  WEBP: { mime: "image/webp", extension: "webp", name: "WebP" },
  GIF: { mime: "image/gif", extension: "gif", name: "GIF" },
  BMP: { mime: "image/bmp", extension: "bmp", name: "BMP" },
  ICO: { mime: "image/x-icon", extension: "ico", name: "ICO" },
  TIFF: { mime: "image/tiff", extension: "tiff", name: "TIFF" },
  AVIF: { mime: "image/avif", extension: "avif", name: "AVIF" },
  HEIC: { mime: "image/heic", extension: "heic", name: "HEIC" },
};

export class ImageConverterComlink {
  private worker: Worker | null = null;
  private workerApi: any = null;

  constructor() {
    this.initWorker();
  }

  private async initWorker() {
    // Create worker with proper type module
    this.worker = new Worker(
      new URL("../workers/image-converter-comlink.worker.ts", import.meta.url),
      { type: "module" },
    );

    // Wrap with Comlink
    const WorkerClass = Comlink.wrap<any>(this.worker);
    this.workerApi = await new (WorkerClass as any)();
  }

  async convert(
    file: File | Blob | ArrayBuffer,
    targetFormat: ImageFormat,
    onProgress?: (progress: number) => void,
    quality?: number,
  ): Promise<Blob> {
    if (!this.workerApi) {
      await this.initWorker();
    }

    const fileBuffer =
      file instanceof ArrayBuffer ? file : await (file as Blob).arrayBuffer();

    const fileArray = new Uint8Array(fileBuffer);
    const srcType = file instanceof File ? file.type : "image/png"; // Default to PNG if unknown

    // Use Comlink.proxy for the progress callback
    const progressProxy = onProgress ? Comlink.proxy(onProgress) : undefined;

    const converted = await this.workerApi!.convert(
      fileArray,
      srcType,
      targetFormat.mime,
      progressProxy,
      quality,
    );

    return new Blob([converted], { type: targetFormat.mime });
  }

  async getMetadata(file: File | Blob | ArrayBuffer): Promise<any> {
    if (!this.workerApi) {
      await this.initWorker();
    }

    const fileBuffer =
      file instanceof ArrayBuffer ? file : await (file as Blob).arrayBuffer();

    const fileArray = new Uint8Array(fileBuffer);
    const srcType = file instanceof File ? file.type : "image/png";

    return this.workerApi!.getMetadata(fileArray, srcType);
  }

  async getPixels(file: File | Blob | ArrayBuffer): Promise<any> {
    if (!this.workerApi) {
      await this.initWorker();
    }

    const fileBuffer =
      file instanceof ArrayBuffer ? file : await (file as Blob).arrayBuffer();

    const fileArray = new Uint8Array(fileBuffer);
    const srcType = file instanceof File ? file.type : "image/png";

    return this.workerApi!.getPixels(fileArray, srcType);
  }

  destroy() {
    if (this.workerApi) {
      this.workerApi[Comlink.releaseProxy]();
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.workerApi = null;
  }
}

// Singleton instance
let converterInstance: ImageConverterComlink | null = null;

export function getImageConverterComlink(): ImageConverterComlink {
  if (!converterInstance) {
    converterInstance = new ImageConverterComlink();
  }
  return converterInstance;
}
