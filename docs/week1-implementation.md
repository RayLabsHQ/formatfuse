# Week 1 Implementation Guide

## Quick Reference for Building 13 Tools in 7 Days

### 📜 License Requirements
- ✅ **Only use libraries with commercial-friendly licenses**: MIT, Apache-2.0, BSD, ISC, CC0
- ❌ **Never use**: GPL, LGPL, AGPL, or any copyleft licenses  
- Always verify license before adding dependencies

### Day 1: Architecture Setup

#### 1. Install Required Libraries (All Commercial-Friendly)
```bash
# PDF Tools
pnpm add pdf-lib        # MIT license
pnpm add pdfjs-dist     # Apache-2.0 license
# Note: pdfcpu-wasm uses Apache-2.0 license ✓

# Image Tools  
pnpm add photon-wasm    # Apache-2.0 license
pnpm add piexifjs       # MIT license
pnpm add colorthief     # MIT license

# Developer Tools
pnpm add js-yaml        # MIT license
pnpm add papaparse      # MIT license
pnpm add esbuild-wasm   # MIT license

# Worker communication
pnpm add comlink        # Apache-2.0 license
```

#### 2. Service Worker Setup (public/sw.js)
```javascript
// Cache WASM files for instant loading
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('wasm-v1').then((cache) => {
      return cache.addAll([
        '/wasm/pdf-lib.wasm',
        '/wasm/photon.wasm',
        '/wasm/esbuild.wasm'
      ]);
    })
  );
});
```

#### 3. Create Base Converter Hook
```typescript
// src/hooks/useConverter.ts
export function useConverter(config: ConverterConfig) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [processing, setProcessing] = useState(false);
  
  const process = async () => {
    const worker = new Worker(config.workerPath);
    // Handle worker communication
  };
  
  return { files, addFiles, removeFile, process };
}
```

### Day 2-3: PDF Tools

#### PDF Merge (TRIVIAL - 10 lines)
```typescript
// src/workers/pdf-merge.worker.ts
import { PDFDocument } from 'pdf-lib';

const mergedPdf = await PDFDocument.create();
for (const file of files) {
  const pdf = await PDFDocument.load(file);
  const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
  pages.forEach(page => mergedPdf.addPage(page));
}
const result = await mergedPdf.save();
```

#### PDF Split (TRIVIAL)
```typescript
// Same as merge but with page selection
const pages = await pdf.copyPages(sourcePdf, selectedPageIndices);
```

#### JPG to PDF (TRIVIAL)
```typescript
const doc = await PDFDocument.create();
const jpgImage = await doc.embedJpg(jpgBytes);
const page = doc.addPage([jpgImage.width, jpgImage.height]);
page.drawImage(jpgImage, { x: 0, y: 0, width: jpgImage.width, height: jpgImage.height });
```

#### PDF to JPG (EASY)
```typescript
// Using pdf.js
const page = await pdfDoc.getPage(pageNum);
const viewport = page.getViewport({ scale: 1.5 });
const canvas = new OffscreenCanvas(viewport.width, viewport.height);
const context = canvas.getContext('2d');
await page.render({ canvasContext: context, viewport }).promise;
const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
```

#### PDF Compress (EASY)
```typescript
// Using pdfcpu-wasm
await init(); // Initialize WASM
const compressed = await optimize(pdfBytes, { 
  imageQuality: 0.8,
  removeMetadata: true 
});
```

### Day 4: Image Tools

#### Image Resize (TRIVIAL)
```typescript
const canvas = new OffscreenCanvas(newWidth, newHeight);
const ctx = canvas.getContext('2d');
ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);
const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
```

#### EXIF Strip (TRIVIAL)
```typescript
import piexif from 'piexifjs';
const cleanedDataUrl = piexif.remove(originalDataUrl);
```

#### Palette Extract (TRIVIAL)
```typescript
import ColorThief from 'colorthief';
const colorThief = new ColorThief();
const palette = colorThief.getPalette(img, 5);
// Convert to Tailwind config format
const colors = palette.map((rgb, i) => ({
  [`brand-${i * 100}`]: `rgb(${rgb.join(' ')})`
}));
```

### Day 5: Developer Tools

#### JSON/YAML/CSV Converter (TRIVIAL)
```typescript
import yaml from 'js-yaml';
import Papa from 'papaparse';

// Auto-detect format and convert
const input = detectFormat(text);
switch(targetFormat) {
  case 'yaml': return yaml.dump(JSON.parse(text));
  case 'csv': return Papa.unparse(JSON.parse(text));
  case 'json': return JSON.stringify(yaml.load(text), null, 2);
}
```

#### JS/TS Minify (EASY)
```typescript
import * as esbuild from 'esbuild-wasm';

await esbuild.initialize({ wasmURL: '/esbuild.wasm' });
const result = await esbuild.transform(code, {
  minify: true,
  loader: isTypeScript ? 'ts' : 'js'
});
```

#### Base64/URL Encode (TRIVIAL)
```typescript
// Base64
const encoded = btoa(unescape(encodeURIComponent(text)));
const decoded = decodeURIComponent(escape(atob(encoded)));

// URL
const urlEncoded = encodeURIComponent(text);
const urlDecoded = decodeURIComponent(encoded);
```

#### Hash Generator (TRIVIAL)
```typescript
const encoder = new TextEncoder();
const data = encoder.encode(text);
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
```

### Component Pattern for All Tools

```typescript
// src/components/converters/ToolName.tsx
import { useConverter } from '../../hooks/useConverter';

export default function ToolName() {
  const { files, processing, addFiles, process } = useConverter({
    workerPath: '/workers/tool-name.worker.js',
    accept: '.pdf,.jpg,.png',
    multiple: true
  });
  
  return (
    <ToolLayout
      title="Tool Name"
      description="Tool description"
      icon={Icon}
    >
      <FileUploader
        files={files}
        onAdd={addFiles}
        onProcess={process}
        processing={processing}
      />
    </ToolLayout>
  );
}
```

### Testing Each Tool (Quick Validation)

```typescript
// tests/week1/tool-name.test.ts
it('converts successfully', async () => {
  const input = await readFile('./fixtures/sample.ext');
  const result = await convertWithWorker(input);
  expect(result.byteLength).toBeGreaterThan(0);
});

it('completes within 2s', async () => {
  const start = Date.now();
  await convertWithWorker(input);
  expect(Date.now() - start).toBeLessThan(2000);
});
```

### Performance Checklist

- [ ] All WASM loaded lazily on first use
- [ ] Service Worker caching enabled
- [ ] OffscreenCanvas for image operations
- [ ] Web Workers for all processing
- [ ] Progress reporting every 10-20%
- [ ] Batch operations use worker pool
- [ ] Memory cleanup after each operation

### Launch Day Checklist

- [ ] All 13 tools functional
- [ ] Lighthouse score >90
- [ ] Core Web Vitals green
- [ ] Mobile responsive
- [ ] SEO meta tags
- [ ] Analytics connected
- [ ] Error tracking enabled
- [ ] WASM files cached
- [ ] Deploy to production