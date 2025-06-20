// @ts-ignore - libheif-js doesn't have proper TypeScript definitions
import libheif from 'libheif-js/wasm-bundle';

export interface HeicConversionMessage {
  type: 'decode';
  id: string;
  file: Uint8Array;
}

export interface HeicConversionResult {
  type: 'success' | 'error' | 'progress';
  id: string;
  imageData?: ImageData;
  width?: number;
  height?: number;
  progress?: number;
  error?: string;
}

// Decode HEIC file and return raw pixel data
async function decodeHeic(file: Uint8Array): Promise<ImageData> {
  try {
    // Create decoder instance
    const decoder = new libheif.HeifDecoder();
    
    // Decode the HEIC file
    const data = decoder.decode(file);
    
    if (!data || data.length === 0) {
      throw new Error('No images found in HEIC file');
    }
    
    // Get the first image (HEIC files can contain multiple images)
    const image = data[0];
    const width = image.get_width();
    const height = image.get_height();
    
    // Create ImageData to hold the decoded pixels
    const imageData = new ImageData(width, height);
    
    // Decode image into RGBA format
    await new Promise<void>((resolve, reject) => {
      image.display(imageData, (displayData: ImageData | null) => {
        if (!displayData) {
          reject(new Error('HEIF processing error'));
        } else {
          resolve();
        }
      });
    });
    
    return imageData;
  } catch (error) {
    throw new Error(`Failed to decode HEIC: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<HeicConversionMessage>) => {
  const { type, id, file } = event.data;
  
  if (type !== 'decode') {
    self.postMessage({
      type: 'error',
      id,
      error: `Unknown message type: ${type}`
    } as HeicConversionResult);
    return;
  }
  
  try {
    // Send initial progress
    self.postMessage({
      type: 'progress',
      id,
      progress: 10
    } as HeicConversionResult);
    
    // Decode HEIC file
    const imageData = await decodeHeic(file);
    
    // Send final result
    self.postMessage({
      type: 'success',
      id,
      imageData,
      width: imageData.width,
      height: imageData.height
    } as HeicConversionResult);
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as HeicConversionResult);
  }
});

export default null;