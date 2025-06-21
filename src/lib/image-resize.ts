import * as Comlink from 'comlink';
import type { ResizeOptions, ResizeResult } from '../workers/image-resize.worker';

export class ImageResizer {
  private worker: Worker;
  private workerApi: any = null;

  constructor() {
    this.worker = new Worker(
      new URL('../workers/image-resize.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }

  private async ensureWorkerReady() {
    if (!this.workerApi) {
      const ImageResizeWorker = Comlink.wrap<any>(this.worker);
      this.workerApi = await new (ImageResizeWorker as any)();
    }
  }

  async resize(
    file: File | Blob,
    options: ResizeOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<ResizeResult> {
    await this.ensureWorkerReady();
    
    const progressProxy = onProgress ? Comlink.proxy(onProgress) : undefined;
    
    try {
      const result = await this.workerApi.resizeImage(file, options, progressProxy);
      return result;
    } finally {
      if (progressProxy) {
        progressProxy[Comlink.releaseProxy]();
      }
    }
  }

  async resizeBatch(
    files: (File | Blob)[],
    options: ResizeOptions = {},
    onProgress?: (index: number, progress: number) => void
  ): Promise<ResizeResult[]> {
    await this.ensureWorkerReady();
    
    const progressProxy = onProgress ? Comlink.proxy(onProgress) : undefined;
    
    try {
      const results = await this.workerApi.resizeBatch(files, options, progressProxy);
      return results;
    } finally {
      if (progressProxy) {
        progressProxy[Comlink.releaseProxy]();
      }
    }
  }

  destroy() {
    if (this.workerApi) {
      this.workerApi[Comlink.releaseProxy]();
      this.workerApi = null;
    }
    this.worker.terminate();
  }
}

export type { ResizeOptions, ResizeResult, ResizeMethod, FitMethod, ImageFormat } from '../workers/image-resize.worker';