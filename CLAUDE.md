# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FormatFuse is a privacy-first, browser-based file conversion platform built with Astro and React. The goal is to reach 1M+ monthly pageviews within 6-8 months while generating $5k+ monthly revenue through minimal ads.

## License Policy

**IMPORTANT**: Only use libraries with commercial-friendly licenses (MIT, Apache-2.0, BSD, ISC). Never use GPL, LGPL, AGPL, or any copyleft licenses. See `docs/LICENSE-POLICY.md` for details.

## Development Commands

```bash
# Install dependencies (using pnpm)
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run Astro CLI commands
pnpm astro [command]

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Worker Communication with Comlink

We're migrating from postMessage to Comlink for cleaner worker communication. Here's how to implement new workers:

### Creating a Worker with Comlink

```typescript
// worker.ts
import * as Comlink from 'comlink';

class MyConverterWorker {
  async convert(input: Uint8Array, options: any, onProgress?: (p: number) => void) {
    onProgress?.(10);
    const result = await processData(input, options);
    onProgress?.(100);
    // Transfer ArrayBuffer without copying
    return Comlink.transfer(result, [result.buffer]);
  }
}

Comlink.expose(MyConverterWorker);
```

### Using the Worker

```typescript
// main.ts
import * as Comlink from 'comlink';

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const Converter = Comlink.wrap<typeof MyConverterWorker>(worker);
const converter = await new Converter();

// Use like a normal async function
const result = await converter.convert(
  data,
  options,
  Comlink.proxy((progress) => setProgress(progress))
);

// Clean up when done
converter[Comlink.releaseProxy]();
```

### Benefits of Comlink
- **No postMessage boilerplate** - Just call methods directly
- **Full TypeScript support** - IntelliSense works perfectly
- **Easy progress callbacks** - Use Comlink.proxy()
- **Automatic error handling** - Errors propagate naturally
- **Tiny overhead** - Only 1.1kB gzipped

## Architecture Overview

### Tech Stack
- **Framework**: Astro with React integration
- **Styling**: Tailwind CSS v4 (using @tailwindcss/vite)
- **UI Components**: Radix UI primitives
- **Package Manager**: pnpm (v10.8.1)
- **Type Safety**: TypeScript with strict config
- **Testing**: Vitest with real file conversion tests (no mocking)
- **Worker Communication**: Comlink for clean async worker APIs
- **Image Processing**: @refilelabs/image + extended WASM libraries

### Current Architecture

```
/src
├── components/
│   ├── converters/     # Tool components (ImageConverter, PdfToWord, etc.)
│   ├── ui/             # Radix UI components (button, dialog, etc.)
│   ├── layout/         # Layout components (Footer.astro)
│   ├── Navigation.tsx  # Smart nav with fuzzy search
│   ├── Hero.tsx        # Landing page hero
│   └── AllToolsGrid.tsx # Tools listing
├── workers/            # Web Workers (migrating to Comlink)
│   ├── image-converter.ts              # Legacy postMessage
│   ├── image-converter-comlink.worker.ts # New Comlink pattern
│   ├── pdf-to-word.worker.ts          # PDF conversion
│   └── jpg-to-pdf.worker.ts           # Image to PDF
├── lib/                # Core utilities
│   ├── image-converter.ts              # Legacy converter class
│   ├── image-converter-comlink.ts      # Comlink converter
│   ├── codec-registry.ts               # Format detection & loading
│   └── heic-converter.ts               # HEIC support
├── hooks/              # React hooks
│   └── useImageConverter.ts            # Comlink-based converter hook
├── pages/              # Astro pages
│   ├── index.astro     # Landing page
│   ├── tools.astro     # All tools page
│   └── convert/
│       └── [from]-to-[to].astro        # Dynamic converter pages
├── data/
│   └── tools.ts        # Tool definitions and metadata
└── styles/
    └── global.css      # Tailwind CSS v4 with oklch colors
```

### Key Design Decisions
- **WASM for Processing**: All file conversions happen client-side using WebAssembly
- **Web Workers**: Non-blocking UI during file processing
- **Privacy-First**: No file uploads, everything processes in-browser
- **SEO-Optimized**: Astro for static generation and fast page loads
- **Progressive Enhancement**: Tools work without JavaScript, enhanced when available

## Tool Implementation Priority

Top 15 tools to implement (based on search volume):
1. PDF to Word (450k/mo)
2. JPG to PDF (300k/mo)
3. PNG to JPG (350k/mo)
4. PDF Merge (250k/mo)
5. PDF Compress (200k/mo)
6. Image Resizer (400k/mo)
7. Background Remover (300k/mo)
8. Word to PDF (380k/mo)
9. PDF to JPG (180k/mo)
10. WebP Converter (120k/mo)
11. HEIC to JPG (150k/mo)
12. QR Code Generator (200k/mo)
13. Base64 Encoder (100k/mo)
14. JSON Formatter (150k/mo)
15. PDF Split (180k/mo)

## Performance Targets
- First paint: <1.5s
- Tool ready: <2s
- Processing: <100ms for images, <2s for PDFs
- Lighthouse score: >90
- Core Web Vitals: All green

## Revenue & Ad Strategy
- **Month 1**: No ads - focus on growth and user experience
- **Month 2+**: Strategic ad integration
  - Target: $5 RPM (vs competitor's $2.80)
  - Ad placement: 1-2 ads max per page
  - Design with ad spaces in mind from day 1
  - Never interrupt user workflow
  - Mobile: Maximum 2 ads per page
  - Lazy load all ads for performance

## Performance Philosophy
- **Zero animations** or minimal if absolutely necessary
- **Core Web Vitals are critical** - every decision must consider performance
- **Speed > aesthetics** - tools must load and run super fast
- **Static where possible** - leverage Astro's static generation
- **Instant feedback** - user actions must feel immediate

## SEO URL Structure
```
formatfuse.com/
├── convert/[source]-to-[target]    # Primary converters
├── tools/[tool-name]               # Secondary tools
├── formats/what-is-[format]        # Educational content
└── guides/how-to-[action]          # How-to guides
```

## References from Old Project
The old FormatFuse project at `/Users/arunavoray/Documents/Development/Studio/formatfuse/formatfuse` contains:
- WASM implementation in Rust (`/wasm/src/`)
- Worker architecture (`/workers/`)
- File handling components
- These can be referenced but the new project uses Astro + React instead of Next.js

## Testing Requirements

**IMPORTANT**: Every new tool MUST have comprehensive tests before it's considered complete.

### Test Structure
When implementing a new converter tool, create tests following this structure:

1. **Create test file**: `tests/workers/[tool-name].test.ts`
   - Copy from `tests/workers/converter-test-template.ts`
   - Customize for your specific converter

2. **Test categories to implement**:
   - **Unit Tests**: Core conversion logic with real files
   - **Worker Integration**: Web Worker communication
   - **Performance Tests**: Conversion speed benchmarks
   - **Output Quality**: Format and content validation
   - **Edge Cases**: Empty files, corrupted files, large files

3. **Use real test fixtures**:
   - Add sample files to `tests/fixtures/[type]/`
   - Never mock file conversions - test with actual files
   - Include edge cases: empty, corrupted, large files

4. **Run tests before committing**:
   ```bash
   pnpm test tests/workers/[your-tool].test.ts
   ```

### Test Template Location
Use `tests/workers/converter-test-template.ts` as your starting point for all new converter tests.

### Testing Philosophy
- Test real file conversions, not mocks
- Ensure tools work with actual user files
- Performance matters - set reasonable time limits
- Validate both format and content preservation