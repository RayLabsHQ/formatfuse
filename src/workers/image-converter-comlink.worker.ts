import * as Comlink from 'comlink';
import init, { convertImage, loadMetadata, getPixels } from '@refilelabs/image';

class ImageConverterWorker {
  private wasmInitialized = false;

  private async ensureWasmInitialized() {
    if (!this.wasmInitialized) {
      await init();
      this.wasmInitialized = true;
    }
  }

  async convert(
    file: Uint8Array,
    srcType: string,
    targetType: string,
    onProgress?: (progress: number) => void,
    settings?: any
  ): Promise<Uint8Array> {
    await this.ensureWasmInitialized();
    
    const progressCallback = onProgress || (() => {});
    const converted = convertImage(file, srcType, targetType, progressCallback, settings);
    
    // Transfer the result without copying
    return Comlink.transfer(converted, [converted.buffer]);
  }

  async getMetadata(
    file: Uint8Array,
    srcType: string,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    await this.ensureWasmInitialized();
    
    const progressCallback = onProgress || (() => {});
    return loadMetadata(file, srcType, progressCallback);
  }

  async getPixels(
    file: Uint8Array,
    srcType: string
  ): Promise<any> {
    await this.ensureWasmInitialized();
    return getPixels(file, srcType);
  }
}

Comlink.expose(ImageConverterWorker);