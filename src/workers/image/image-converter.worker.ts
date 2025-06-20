import * as Comlink from 'comlink';
import { createConverter } from '@refilelabs/image';

export interface ConvertOptions {
  format: string;
  quality?: number;
  width?: number;
  height?: number;
}

class ImageConverterWorker {
  private converter: any = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    
    try {
      this.converter = await createConverter();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize image converter:', error);
      throw new Error('Failed to initialize image converter');
    }
  }

  async convert(
    imageBuffer: ArrayBuffer,
    options: ConvertOptions,
    onProgress?: (percent: number) => void
  ): Promise<ArrayBuffer> {
    await this.init();
    
    try {
      onProgress?.(10);
      
      // Decode the input image
      const image = await this.converter.decode(new Uint8Array(imageBuffer));
      onProgress?.(40);
      
      // Apply transformations if specified
      if (options.width || options.height) {
        await this.converter.resize(image, {
          width: options.width,
          height: options.height,
          fit: 'contain'
        });
      }
      onProgress?.(70);
      
      // Encode to target format
      const result = await this.converter.encode(image, {
        format: options.format,
        quality: options.quality || 85
      });
      onProgress?.(100);
      
      // Transfer the result without copying
      return Comlink.transfer(result.buffer, [result.buffer]);
    } catch (error) {
      console.error('Conversion failed:', error);
      throw new Error(`Failed to convert image: ${error.message}`);
    }
  }

  async getSupportedFormats(): Promise<string[]> {
    await this.init();
    return this.converter.getSupportedFormats();
  }
}

Comlink.expose(ImageConverterWorker);