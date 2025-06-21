# PDF Stack Implementation

## Overview
This document tracks the implementation of PDF tools in FormatFuse, leveraging lessons learned from analyzing Stirling-PDF's MIT-licensed implementation.

## Technology Stack

### Core Libraries
- **pdf-lib** (^1.17.1) - PDF manipulation (split, merge, rotate, metadata)
- **pdfjs-dist** (^5.3.31) - PDF rendering and conversion to images
- **Comlink** (^4.4.2) - Clean worker communication pattern
- **JSZip** (^3.10.1) - Creating ZIP archives for multi-file downloads
- **file-saver** (^2.0.5) - Downloading files in the browser

### Architecture
All PDF operations run in Web Workers using Comlink for clean async APIs:
- `pdf-operations.worker.ts` - Central worker for all PDF operations
- `pdf-operations.ts` - Main thread API wrapper
- `usePdfOperations.ts` - React hook for component integration

## Implementation Status

### ✅ Completed (Phase 1)
1. **PDF Split** (`/convert/pdf-split`)
   - Split by custom page ranges (e.g., "1-3, 5, 7-10")
   - Split every N pages
   - Download individual parts or all as ZIP
   - Shows file metadata and page count
   - Progress tracking

### 🚧 In Progress (Phase 1)
2. **PDF Merge** - Next priority
3. **PDF Rotate** - Simple operation

### 📋 Planned (Phase 2)
4. **Enhanced JPG to PDF** - Multi-image support
5. **PDF to JPG** - Using PDF.js rendering
6. **Extract Pages** - Variant of split

### 🔮 Future (Phase 3)
7. **PDF Compress** - Needs WASM solution
8. **Word to PDF** - Needs DOCX parsing
9. **Excel to PDF** - Needs spreadsheet parsing

## Key Learnings from Stirling-PDF

### What Works Client-Side
- Basic PDF manipulation (split, merge, rotate) works well with pdf-lib
- PDF.js handles rendering for preview and conversion to images
- File operations can be batched and downloaded as ZIP

### What Needs Server/WASM
- PDF compression (they use qpdf command-line tool)
- OCR functionality (they use Tesseract)
- Office format conversions (they use LibreOffice)

### UI/UX Patterns
- Visual page preview helps users select pages
- Drag-and-drop for reordering pages in merge
- Clear progress indication for long operations
- Batch download as ZIP for multiple outputs

## Implementation Guide

### Adding a New PDF Tool

1. **Create the Worker Method** in `pdf-operations.worker.ts`:
```typescript
async yourOperation(
  pdfData: Uint8Array,
  options: YourOptions,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  // Implementation
}
```

2. **Add to Main Thread API** in `pdf-operations.ts`:
```typescript
async yourOperation(
  pdfData: Uint8Array,
  options: YourOptions,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  return this.api.yourOperation(
    pdfData,
    options,
    onProgress ? Comlink.proxy(onProgress) : undefined
  );
}
```

3. **Create React Component** following the pattern in `PdfSplit.tsx`

4. **Add Route** in `pages/convert/[tool].astro`

5. **Update Tool Registry** in `data/tools.ts`

6. **Write Tests** in `tests/workers/pdf-operations.test.ts`

## Performance Considerations

### Current Optimizations
- Web Workers prevent UI blocking
- Comlink transfers ArrayBuffers without copying
- Progress callbacks for user feedback
- Lazy loading of PDF.js worker

### Future Optimizations
- WASM modules for compression
- Streaming for large files
- IndexedDB caching for repeated operations
- Service Worker for offline functionality

## Browser-Based PDF Libraries Analysis

### 1. PDF.js (Mozilla)
**License**: Apache 2.0
**Size**: ~2.5MB (can be optimized)
**Capabilities**:
- ✅ PDF rendering to canvas
- ✅ Text extraction
- ✅ Basic metadata reading
- ❌ No editing capabilities
- ❌ No PDF creation

**Use Cases**:
- PDF to JPG conversion
- PDF preview/display
- Text extraction for search

**Performance**: Good for reading, not for manipulation

### 2. pdf-lib
**License**: MIT
**Size**: ~400KB
**Capabilities**:
- ✅ Create PDFs from scratch
- ✅ Modify existing PDFs
- ✅ Merge/split pages
- ✅ Add images, text, forms
- ✅ Compression options
- ❌ Limited text extraction
- ❌ No advanced formatting preservation

**Use Cases**:
- PDF Merge
- PDF Split
- JPG to PDF
- Basic PDF creation

**Performance**: Excellent, pure JavaScript

### 3. jsPDF
**License**: MIT
**Size**: ~300KB
**Capabilities**:
- ✅ Create PDFs from scratch
- ✅ Add text, images, shapes
- ✅ Basic formatting
- ❌ Cannot modify existing PDFs
- ❌ Limited complex layout support

**Use Cases**:
- Creating simple PDFs
- JPG to PDF conversion
- Report generation

**Performance**: Fast for creation, not for manipulation

### 4. PDFtron WebViewer (Commercial)
**License**: Commercial (~$8k/year)
**Capabilities**:
- ✅ Full PDF manipulation
- ✅ DOCX conversion
- ✅ Advanced compression
- ❌ Expensive
- ❌ Not privacy-first (cloud processing)

### 5. PSPDFKit (Commercial)
**License**: Commercial (pricing on request)
**Capabilities**:
- ✅ Complete PDF suite
- ✅ WASM-based performance
- ❌ Very expensive
- ❌ Large size

## WASM-Based Solutions

### 1. MuPDF WASM
**License**: AGPL (commercial available)
**Size**: ~8MB WASM
**Capabilities**:
- ✅ Fast rendering
- ✅ Text extraction
- ✅ Format conversions
- ✅ Compression

**Pros**:
- Native performance
- Complete PDF handling
- Supports many formats

**Cons**:
- Large download size
- AGPL license restrictions
- Complex integration

### 2. Poppler WASM
**Status**: Experimental ports exist
**Capabilities**:
- Full PDF manipulation
- Format conversions
- Used by many Linux PDF tools

**Challenges**:
- No official WASM port
- Would need custom compilation
- Large binary size

### 3. Custom Rust WASM Solution
Using crates like:
- `lopdf` - PDF manipulation
- `printpdf` - PDF creation
- `image` - Image handling

**Pros**:
- Complete control
- Optimal size (only needed features)
- Best performance
- Privacy guaranteed

**Cons**:
- Development time
- Maintenance burden

## Implementation Strategy by Tool

### 1. PDF to Word (Most Challenging)

**Approach A: Client-Side Limited**
```javascript
// Using pdf-lib + custom parser
import { PDFDocument } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';

async function pdfToWord(pdfBytes) {
  // Extract text and basic formatting
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  // Create DOCX with extracted content
  const doc = new Document({
    sections: pages.map(page => ({
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun(extractedText)]
        })
      ]
    }))
  });
  
  return await Packer.toBlob(doc);
}
```

**Limitations**:
- Basic text only
- No complex formatting
- No tables/images preservation

**Approach B: Hybrid WASM**
- Use MuPDF WASM for extraction
- Better formatting preservation
- Larger download (~8MB)

### 2. JPG to PDF (Simplest)

```javascript
import { PDFDocument } from 'pdf-lib';

async function jpgToPdf(imageBytes) {
  const pdfDoc = await PDFDocument.create();
  const jpgImage = await pdfDoc.embedJpg(imageBytes);
  
  const page = pdfDoc.addPage([
    jpgImage.width,
    jpgImage.height
  ]);
  
  page.drawImage(jpgImage, {
    x: 0,
    y: 0,
    width: jpgImage.width,
    height: jpgImage.height,
  });
  
  return await pdfDoc.save();
}
```

**Feasibility**: ✅ Excellent - Ready to implement

### 3. PDF Merge

```javascript
import { PDFDocument } from 'pdf-lib';

async function mergePdfs(pdfBytesArray) {
  const mergedPdf = await PDFDocument.create();
  
  for (const pdfBytes of pdfBytesArray) {
    const pdf = await PDFDocument.load(pdfBytes);
    const pages = await mergedPdf.copyPages(
      pdf, 
      pdf.getPageIndices()
    );
    pages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save();
}
```

**Feasibility**: ✅ Excellent - Straightforward implementation

### 4. PDF Compress

**Approach**: Multi-strategy compression
```javascript
async function compressPdf(pdfBytes, quality = 'medium') {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // Strategy 1: Image compression
  // Reduce image quality/resolution
  
  // Strategy 2: Font subsetting
  // Remove unused font data
  
  // Strategy 3: Object stream compression
  // Use pdf-lib's built-in compression
  
  // Strategy 4: Remove metadata
  // Strip unnecessary metadata
  
  return await pdfDoc.save({
    objectsPerTick: 50,
    useObjectStreams: true
  });
}
```

**Feasibility**: ⚠️ Medium - Basic compression easy, advanced requires more work

### 5. PDF to JPG

```javascript
import * as pdfjsLib from 'pdfjs-dist';

async function pdfToJpg(pdfBytes, pageNum = 1) {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const page = await pdf.getPage(pageNum);
  
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  await page.render({
    canvasContext: canvas.getContext('2d'),
    viewport: viewport
  }).promise;
  
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95);
  });
}
```

**Feasibility**: ✅ Good - PDF.js handles rendering well

## Recommended Tech Stack

### Core Libraries
1. **pdf-lib** (400KB) - Primary PDF manipulation
2. **PDF.js** (2.5MB, lazy loaded) - Rendering and display
3. **docx** (500KB) - DOCX file creation
4. **Custom WASM** - For advanced features

### Implementation Phases

**Phase 1: Quick Wins (Week 1)**
- JPG to PDF ✅
- PDF Merge ✅
- PDF Split ✅
- Basic PDF to JPG ✅

**Phase 2: Medium Complexity (Week 2)**
- PDF Compress (basic) ⚠️
- Multi-page PDF to JPG ✅
- PDF rotate/reorder ✅

**Phase 3: Advanced Features (Week 3-4)**
- PDF to Word (basic text) ⚠️
- Word to PDF (basic) ⚠️
- PDF password protect ✅

**Phase 4: WASM Enhancement (Month 2+)**
- Advanced PDF to Word 🔧
- Smart compression 🔧
- OCR capabilities 🔧

## Performance Optimization Strategies

### 1. Lazy Loading
```javascript
// Load PDF libraries only when needed
const loadPdfLib = () => import('pdf-lib');
const loadPdfJs = () => import('pdfjs-dist');
```

### 2. Web Workers
```javascript
// Process PDFs in background thread
const worker = new Worker('pdf-processor.worker.js');
worker.postMessage({ action: 'merge', files: pdfArray });
```

### 3. Streaming Processing
```javascript
// For large PDFs, process in chunks
async function* processPdfPages(pdfBytes) {
  const pdf = await PDFDocument.load(pdfBytes);
  for (let i = 0; i < pdf.getPageCount(); i++) {
    yield await processPage(pdf, i);
  }
}
```

### 4. WASM Optimization
- Compile with optimization flags
- Use SIMD where available
- Minimize WASM module size

## File Size Limitations

### Recommended Limits
- **JPG to PDF**: 50MB per image, 20 images
- **PDF Merge**: 100MB total, 10 files
- **PDF Compress**: 100MB input
- **PDF to JPG**: 50MB PDF
- **PDF to Word**: 25MB (due to complexity)

### Memory Management
```javascript
// Monitor memory usage
const checkMemory = () => {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;
    return { used, limit, percentage: (used / limit) * 100 };
  }
};
```

## Security Considerations

### Client-Side Benefits
- ✅ No file uploads
- ✅ No server storage
- ✅ No data transmission
- ✅ Complete privacy

### Potential Risks
- ⚠️ Malformed PDF crashes
- ⚠️ Memory exhaustion
- ⚠️ JavaScript injection in PDFs

### Mitigations
```javascript
// Sanitize PDF input
async function sanitizePdf(pdfBytes) {
  try {
    // Validate PDF structure
    const pdf = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: true
    });
    
    // Remove JavaScript
    pdf.catalog.delete(PDFName.of('AA'));
    pdf.catalog.delete(PDFName.of('OpenAction'));
    
    return await pdf.save();
  } catch (error) {
    throw new Error('Invalid or unsafe PDF');
  }
}
```

## Competitor Analysis

### How Others Do It

**SmallPDF**: Server-side processing
- ❌ Privacy concerns
- ❌ Upload required
- ✅ Advanced features

**ILovePDF**: Hybrid approach
- Some client-side tools
- Server-side for complex operations
- Mixed privacy model

**TinyWow**: Unknown (likely server-side)
- Fast processing
- Good compression
- Privacy claims unclear

### Our Advantage
- **100% client-side** for privacy
- **No uploads** = instant start
- **No file size limits** (within browser memory)
- **Open source options** = transparency

## Development Recommendations

### Start With
1. **pdf-lib** for basic operations
2. **PDF.js** for rendering (lazy loaded)
3. **Web Workers** for processing
4. **IndexedDB** for temporary storage

### Progressive Enhancement
1. Basic features with JavaScript
2. Add WASM for performance
3. Implement advanced features
4. Optimize based on usage

### Testing Strategy
- Unit tests for each operation
- Performance benchmarks
- Memory leak detection
- Cross-browser testing
- PDF compatibility testing

## Conclusion

**Feasibility Rating**: ✅ High

Most PDF operations are feasible in the browser with good performance. The main challenges are:

1. **PDF to Word** - Will have limitations without WASM
2. **Advanced compression** - Requires sophisticated algorithms
3. **Large file handling** - Memory constraints

**Recommended Approach**:
1. Start with pdf-lib for quick wins
2. Add PDF.js for rendering needs
3. Develop custom WASM for advanced features
4. Always prioritize user privacy and performance

The PDF tool suite can definitely be built client-side with excellent performance for 90% of use cases.