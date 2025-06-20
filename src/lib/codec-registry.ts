export interface ImageCodec {
  decode(buffer: Uint8Array): Promise<ImageData>;
  encode(imageData: ImageData, options?: any): Promise<Uint8Array>;
  supportedFormats: string[];
}

export interface CodecLoader {
  (): Promise<ImageCodec>;
}

// Registry of available codecs
const codecRegistry: Record<string, CodecLoader> = {
  // Standard formats using @refilelabs/image
  jpeg: async () => {
    const { createConverter } = await import('@refilelabs/image');
    const converter = await createConverter();
    return {
      decode: (buffer) => converter.decode(buffer),
      encode: (data, opts) => converter.encode(data, { format: 'jpeg', ...opts }),
      supportedFormats: ['jpeg', 'jpg']
    };
  },
  
  png: async () => {
    const { createConverter } = await import('@refilelabs/image');
    const converter = await createConverter();
    return {
      decode: (buffer) => converter.decode(buffer),
      encode: (data, opts) => converter.encode(data, { format: 'png', ...opts }),
      supportedFormats: ['png']
    };
  },
  
  // WebP support
  webp: async () => {
    // For now, use @refilelabs/image, later can switch to webp-wasm for better control
    const { createConverter } = await import('@refilelabs/image');
    const converter = await createConverter();
    return {
      decode: (buffer) => converter.decode(buffer),
      encode: (data, opts) => converter.encode(data, { format: 'webp', ...opts }),
      supportedFormats: ['webp']
    };
  },

  // HEIC/HEIF support (to be implemented)
  heic: async () => {
    // TODO: Integrate libheif-js
    throw new Error('HEIC support coming soon');
  },
  
  // AVIF support (to be implemented)
  avif: async () => {
    // TODO: Integrate @jsquash/avif
    throw new Error('AVIF support coming soon');
  },
  
  // JPEG-XL support (to be implemented)
  jxl: async () => {
    // TODO: Integrate libjxl-js
    throw new Error('JPEG-XL support coming soon');
  }
};

// Format detection based on file signatures
const signatures: Record<string, number[]> = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  gif: [0x47, 0x49, 0x46],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF header
  heic: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp box
  avif: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66],
  jxl: [0xFF, 0x0A]
};

export function detectFormat(buffer: Uint8Array): string | null {
  // Check WebP specifically (needs WEBP after RIFF)
  if (buffer.length > 12 && 
      buffer[0] === 0x52 && buffer[1] === 0x49 && 
      buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && 
      buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'webp';
  }
  
  // Check other signatures
  for (const [format, signature] of Object.entries(signatures)) {
    if (format === 'webp') continue; // Already checked
    
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return format;
  }
  
  return null;
}

export async function getCodec(format: string): Promise<ImageCodec> {
  const normalizedFormat = format.toLowerCase();
  const loader = codecRegistry[normalizedFormat];
  
  if (!loader) {
    throw new Error(`Unsupported format: ${format}`);
  }
  
  return loader();
}

export function getSupportedFormats(): string[] {
  return Object.keys(codecRegistry);
}

// Helper to get format from file extension
export function getFormatFromFilename(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const extensionMap: Record<string, string> = {
    jpg: 'jpeg',
    jpeg: 'jpeg',
    png: 'png',
    webp: 'webp',
    heic: 'heic',
    heif: 'heic',
    avif: 'avif',
    jxl: 'jxl'
  };
  
  return ext ? extensionMap[ext] || null : null;
}