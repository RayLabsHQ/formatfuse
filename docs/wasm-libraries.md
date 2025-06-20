# FormatFuse WASM Libraries Guide

## 🎯 Overview

This document outlines additional WASM libraries that can extend FormatFuse's capabilities while maintaining our core principles:
- **100% client-side processing** - No uploads, no server processing
- **MIT/Apache-2.0 licenses only** - Commercial-friendly, no GPL
- **Performance-first** - Lazy load in Web Workers
- **Privacy-focused** - All processing happens in the browser

## 📦 Recommended WASM Libraries

### Modern Image Codecs

| Library | Purpose | Formats | License | Bundle Size | Implementation Time |
|---------|---------|---------|---------|-------------|---------------------|
| **@jsquash/avif** | AVIF encode/decode | AVIF ↔ RGBA | MIT | ~1 MB | 1 day |
| **libheif-js** | HEIC/HEIF support | HEIC/HEIF/AVIF → RGBA | MIT | ~4 MB | 1 day |
| **libjxl-js** | JPEG-XL support | JPEG-XL lossless/lossy | MIT | ~2 MB | 1 day |
| **webp-wasm** | WebP conversion | WebP encode/decode | Apache-2.0 | ~700 KB | 1 day |

### Legacy Format Optimization

| Library | Purpose | Formats | License | Bundle Size | Implementation Time |
|---------|---------|---------|---------|-------------|---------------------|
| **mozjpeg-wasm** | JPEG optimization | JPEG progressive/baseline | MIT | ~600 KB | 0.5 day |
| **@jsquash/oxipng** | PNG optimization | PNG lossless | MIT | ~350 KB | 0.5 day |
| **pngquant-wasm** | PNG compression | PNG lossy (8-bit) | GPL-3 ⚠️ | ~400 KB | Optional add-on |

### Vector & Animation

| Library | Purpose | Formats | License | Bundle Size | Implementation Time |
|---------|---------|---------|---------|-------------|---------------------|
| **@resvg/resvg-wasm** | SVG rendering | SVG → PNG | MPL-2.0 ⚠️ | ~7 MB | 1 day |
| **gifsicle-wasm-browser** | GIF optimization | GIF edit/optimize | MIT | ~150 KB | 1 day |
| **gifski-lite** | Video to GIF | Frames → GIF | Apache-2.0 | ~1 MB | 2 days |

### Swiss Army Knives

| Library | Purpose | Formats | License | Bundle Size | Implementation Time |
|---------|---------|---------|---------|-------------|---------------------|
| **magick-wasm** | Universal converter | 100+ formats | Apache-2.0 | ~6 MB | 3 days |
| **wasm-vips** | Image processing | Advanced operations | LGPL-2.1 ⚠️ | ~8 MB | 3 days |

⚠️ **License Warning**: Libraries marked with ⚠️ require special handling:
- GPL/LGPL/MPL libraries should be optional add-ons with clear license notices
- Load only when user explicitly enables the feature
- Consider alternatives or custom implementations for core features

## 🏗️ Implementation Architecture

### 1. Codec Registry Pattern

```typescript
// src/lib/codec-registry.ts
type ImageCodec = {
  decode(buffer: Uint8Array): Promise<ImageData>;
  encode(imageData: ImageData, options?: unknown): Promise<Uint8Array>;
  supportedFormats: string[];
};

const codecRegistry: Record<string, () => Promise<ImageCodec>> = {
  avif: () => import('@jsquash/avif'),
  heif: () => import('./codecs/heif-wrapper'),
  jxl: () => import('./codecs/jxl-wrapper'),
  webp: () => import('./codecs/webp-wrapper'),
  // Existing
  jpg: () => import('./codecs/jpg-wrapper'),
  png: () => import('./codecs/png-wrapper'),
};

export async function getCodec(format: string): Promise<ImageCodec> {
  const loader = codecRegistry[format];
  if (!loader) throw new Error(`Unsupported format: ${format}`);
  return loader();
}
```

### 2. Worker Pool Architecture

```typescript
// src/workers/image-pool.worker.ts
import * as Comlink from 'comlink';
import { getCodec } from '../lib/codec-registry';

class ImageWorker {
  async convert(
    inputBuffer: Uint8Array,
    fromFormat: string,
    toFormat: string,
    options?: unknown
  ): Promise<Uint8Array> {
    const decoder = await getCodec(fromFormat);
    const encoder = await getCodec(toFormat);
    
    const imageData = await decoder.decode(inputBuffer);
    return encoder.encode(imageData, options);
  }
}

Comlink.expose(new ImageWorker());
```

### 3. Service Worker Caching

```javascript
// src/sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Cache WASM files for 30 days
registerRoute(
  ({ url }) => url.pathname.endsWith('.wasm'),
  new CacheFirst({
    cacheName: 'wasm-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        maxEntries: 50,
      }),
    ],
  })
);
```

## 🚀 New Tool Opportunities

### Quick Wins (1 Day Each)

1. **"Open ANY Photo" Universal Viewer**
   - Drag & drop HEIC/HEIF/AVIF/JXL/WebP files
   - Auto-detect format using file signatures
   - Export to PNG/JPEG with quality slider
   - Libraries: libheif-js, @jsquash/avif, libjxl-js

2. **Lossless Image Optimizer**
   - Side-by-side before/after comparison
   - Show file size reduction percentage
   - Batch processing support
   - Libraries: mozjpeg-wasm, @jsquash/oxipng

3. **SVG to PNG Converter**
   - Multiple size outputs (favicon set)
   - Custom dimensions
   - Transparent background option
   - Library: @resvg/resvg-wasm (optional add-on)

4. **Animated GIF Editor**
   - Trim frames
   - Resize dimensions
   - Optimize file size
   - Library: gifsicle-wasm-browser

### Medium Complexity (2-3 Days)

1. **Smart Image Resizer**
   - E-commerce presets (Shopify, Amazon, etc.)
   - Smart crop with focal point detection
   - Batch resize with ZIP download
   - Library: wasm-vips (optional add-on)

2. **Video to GIF Converter**
   - Support up to 10-second clips
   - Frame rate adjustment
   - Color palette optimization
   - Library: gifski-lite

3. **Advanced Format Converter**
   - Support 100+ formats
   - Format auto-detection
   - Batch conversion
   - Library: magick-wasm (fallback for unsupported formats)

## 📋 Implementation Roadmap

### Phase 1: Core Modern Formats (Week 1)
1. Integrate @jsquash/avif for AVIF support
2. Add libheif-js for HEIC/HEIF (iPhone photos)
3. Implement libjxl-js for JPEG-XL
4. Add webp-wasm for better WebP support

### Phase 2: Optimization Tools (Week 2)
1. Add mozjpeg-wasm for JPEG optimization
2. Integrate @jsquash/oxipng for PNG optimization
3. Create "Optimize Image" tool with format detection
4. Build comparison UI for before/after

### Phase 3: Advanced Features (Week 3)
1. Add gifsicle-wasm for GIF editing
2. Create optional add-ons system for GPL/MPL libraries
3. Implement smart caching for WASM modules
4. Build worker pool for parallel processing

## 🔧 Integration Guidelines

### 1. Format Detection

```typescript
// src/lib/format-detector.ts
export function detectFormat(buffer: Uint8Array): string {
  const signatures = {
    avif: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66],
    heic: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63],
    jxl: [0xFF, 0x0A], // or [0x00, 0x00, 0x00, 0x0C, 0x4A, 0x58, 0x4C, 0x20]
    webp: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
    // ... existing formats
  };
  
  // Check signatures...
}
```

### 2. Lazy Loading Pattern

```typescript
// src/components/converters/UniversalImageConverter.tsx
const loadCodec = async (format: string) => {
  // Show loading state
  setLoading(true);
  
  try {
    // Dynamic import only when needed
    const codec = await getCodec(format);
    setCodecReady(true);
  } catch (error) {
    // Fallback to server-side API or show error
    console.error(`Failed to load ${format} codec:`, error);
  } finally {
    setLoading(false);
  }
};
```

### 3. License Compliance

```typescript
// src/components/OptionalFeatures.tsx
const GPL_FEATURES = {
  pngquant: {
    name: 'Advanced PNG Compression',
    license: 'GPL-3.0',
    description: 'Lossy PNG compression for smaller file sizes',
    size: '400 KB',
  },
};

// Show clear opt-in with license notice
function OptionalFeatureToggle({ feature }) {
  return (
    <div className="p-4 border rounded">
      <h3>{feature.name}</h3>
      <p className="text-sm text-muted">{feature.description}</p>
      <p className="text-xs">License: {feature.license} | Size: {feature.size}</p>
      <Switch 
        checked={enabled}
        onCheckedChange={handleToggle}
        aria-label={`Enable ${feature.name}`}
      />
    </div>
  );
}
```

## 📊 Performance Considerations

1. **Bundle Splitting**
   - Each codec in its own chunk
   - Load only what's needed
   - Preload common formats

2. **Worker Strategy**
   - One worker per codec type
   - Reuse workers across conversions
   - Terminate idle workers after 30s

3. **Memory Management**
   - Clean up ImageData after use
   - Limit concurrent conversions
   - Show memory warnings for large files

## 🎯 Success Metrics

- **Format Coverage**: Support 95% of user-uploaded images
- **Performance**: <500ms for average image conversion
- **Bundle Impact**: <100KB initial, lazy load the rest
- **User Satisfaction**: Handle "any image" seamlessly

---

*This document should be updated as new WASM libraries become available or licensing changes occur.*