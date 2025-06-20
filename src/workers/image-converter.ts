import init, { convertImage, loadMetadata, getPixels } from '@refilelabs/image';

export interface ConversionMessage {
  type: 'convert' | 'metadata' | 'pixels';
  id: string;
  file: Uint8Array;
  srcType: string;
  targetType?: string;
  settings?: any;
}

export interface ConversionResult {
  type: 'success' | 'error' | 'progress';
  id: string;
  data?: Uint8Array;
  metadata?: any;
  pixels?: any;
  progress?: number;
  error?: string;
}

// Initialize WASM module once
let wasmInitialized = false;

async function ensureWasmInitialized() {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
}

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<ConversionMessage>) => {
  const { type, id, file, srcType, targetType, settings } = event.data;

  try {
    await ensureWasmInitialized();

    const progressCallback = (progress: number) => {
      self.postMessage({
        type: 'progress',
        id,
        progress
      } as ConversionResult);
    };

    switch (type) {
      case 'convert':
        if (!targetType) {
          throw new Error('Target type is required for conversion');
        }
        const converted = convertImage(file, srcType, targetType, progressCallback, settings);
        self.postMessage({
          type: 'success',
          id,
          data: converted
        } as ConversionResult);
        break;

      case 'metadata':
        const metadata = loadMetadata(file, srcType, progressCallback);
        self.postMessage({
          type: 'success',
          id,
          metadata
        } as ConversionResult);
        break;

      case 'pixels':
        const pixels = getPixels(file, srcType);
        self.postMessage({
          type: 'success',
          id,
          pixels
        } as ConversionResult);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as ConversionResult);
  }
});

// Export types for use in main thread
export default null;