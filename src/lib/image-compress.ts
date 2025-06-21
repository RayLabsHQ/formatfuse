import * as Comlink from 'comlink';
import type { CompressOptions, CompressResult } from '../workers/image-compress.worker';

export class ImageCompressor {
  private worker: Worker;
  private workerApi: any = null;

  constructor() {
    this.worker = new Worker(
      new URL('../workers/image-compress.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }

  private async ensureWorkerReady() {
    if (!this.workerApi) {
      const ImageCompressWorker = Comlink.wrap<any>(this.worker);
      this.workerApi = await new (ImageCompressWorker as any)();
    }
  }

  async compress(
    file: File | Blob,
    options: CompressOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<CompressResult> {
    await this.ensureWorkerReady();
    
    const progressProxy = onProgress ? Comlink.proxy(onProgress) : undefined;
    
    try {
      const result = await this.workerApi.compress(file, options, progressProxy);
      return result;
    } finally {
      if (progressProxy) {
        progressProxy[Comlink.releaseProxy]();
      }
    }
  }

  async compressBatch(
    files: (File | Blob)[],
    options: CompressOptions = {},
    onProgress?: (index: number, progress: number) => void
  ): Promise<CompressResult[]> {
    await this.ensureWorkerReady();
    
    const progressProxy = onProgress ? Comlink.proxy(onProgress) : undefined;
    
    try {
      const results = await this.workerApi.compressBatch(files, options, progressProxy);
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

export type { CompressOptions, CompressResult, CompressFormat } from '../workers/image-compress.worker';