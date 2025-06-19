# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FormatFuse is a privacy-first, browser-based file conversion platform built with Astro and React. The goal is to reach 1M+ monthly pageviews within 6-8 months while generating $5k+ monthly revenue through minimal ads.

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

## Architecture Overview

### Tech Stack
- **Framework**: Astro with React integration
- **Styling**: Tailwind CSS v4 (using @tailwindcss/vite)
- **UI Components**: Radix UI primitives
- **Package Manager**: pnpm (v10.8.1)
- **Type Safety**: TypeScript with strict config
- **Testing**: Vitest with real file conversion tests (no mocking)

### Planned Architecture (from docs/plan.md and docs/development.md)

```
/src
├── components/
│   ├── core/           # FileUploader, ProgressBar, ResultDisplay
│   ├── tools/          # ToolLayout, SettingsPanel, BatchProcessor
│   ├── ui/             # Reusable UI components
│   └── ads/            # AdSlot, AdManager
├── workers/            # Web Workers for WASM processing
│   ├── pdf/
│   ├── image/
│   └── document/
├── lib/                # Utilities for WASM loading, validation
├── pages/              # Astro pages
│   ├── convert/        # Dynamic tool pages
│   └── api/
└── styles/             # Global styles and themes
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