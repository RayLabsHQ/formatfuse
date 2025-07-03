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
import * as Comlink from "comlink";

class MyConverterWorker {
  async convert(
    input: Uint8Array,
    options: any,
    onProgress?: (p: number) => void,
  ) {
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
import * as Comlink from "comlink";

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});
const Converter = Comlink.wrap<typeof MyConverterWorker>(worker);
const converter = await new Converter();

// Use like a normal async function
const result = await converter.convert(
  data,
  options,
  Comlink.proxy((progress) => setProgress(progress)),
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
│   ├── converters/     # Tool components (ImageConverter, PdfSplit, etc.)
│   ├── ui/             # Radix UI components (button, dialog, etc.)
│   ├── layout/         # Layout components (Footer.astro)
│   ├── Navigation.tsx  # Smart nav with fuzzy search
│   ├── Hero.tsx        # Landing page hero
│   └── AllToolsGrid.tsx # Tools listing
├── workers/            # Web Workers (migrating to Comlink)
│   ├── image-converter.ts              # Legacy postMessage
│   ├── image-converter-comlink.worker.ts # New Comlink pattern
│   ├── pdf-operations.worker.ts        # PDF operations (split, merge, rotate)
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

## Tool Implementation Status

### 🚧 Priority Tools Implementation Progress

1. ⚠️ JPG to PDF (300k/mo) - **Basic implementation** - Uses pdf-lib, no advanced features
2. ✅ PNG to JPG (350k/mo) - via universal image converter
3. ❌ PDF Merge (250k/mo) - **Not implemented**
4. ❌ PDF Compress (200k/mo) - **Not implemented**
5. ✅ Image Resizer (400k/mo)
6. ✅ Background Remover (300k/mo)
7. ❌ Word to PDF (380k/mo) - **Not implemented**
8. ❌ PDF to JPG (180k/mo) - **Not implemented**
9. ✅ WebP Converter (120k/mo) - via universal image converter
10. ✅ HEIC to JPG (150k/mo) - via universal image converter
11. ✅ QR Code Generator (200k/mo)
12. ✅ Base64 Encoder (100k/mo)
13. ✅ JSON Formatter (150k/mo)
14. ❌ PDF Split (180k/mo) - **Not implemented**

### ✅ Fully Implemented Tools

- **Image Formats**: Full conversion matrix between PNG, JPG, WebP, GIF, BMP, ICO, TIFF, AVIF, HEIC, SVG
- **Developer Tools**: QR Generator, Base64 Encoder, JSON Formatter, URL Shortener, Word Counter, Hash Generator, Case Converter
- **Archive Tools**: ZIP Extract, Create ZIP
- **Other Tools**: Image Resizer, Background Remover, Text to PDF, RTF Converter, Markdown to HTML

### 🔴 Major Missing Implementations

**PDF Tools** (High Priority - These drive significant traffic):

- PDF Compress (200k/mo)
- Word to PDF (380k/mo)
- Excel to PDF (claimed but not implemented)

**Note**: JPG to PDF tool has basic implementation but could be enhanced with:

- Better image optimization
- Page size options
- Multi-page layout options

## Performance Targets

- First paint: <1.5s
- Tool ready: <2s
- Processing: <100ms for images, <2s for PDFs
- Lighthouse score: >90
- Core Web Vitals: All green

## WASM Preloading Strategy (Two-Phase Loading)

- **Phase 1 - Prefetch**: Use `<link rel="prefetch">` hints in document head to download WASM files at idle priority
- **Phase 2 - Instantiation**: Defer WebAssembly instantiation using `requestIdleCallback` after LCP
- **Smart Loading**: Different strategies based on intent:
  - Generic pages: Use `rel="prefetch"` (won't block critical resources)
  - Tool pages (`/convert/*`): Use `rel="preload"` for faster availability
- **Implementation**:
  - `WasmPrefetch.astro` component adds prefetch hints based on route
  - Instantiation happens via `requestIdleCallback` in the same component
- **Benefits**:
  - Doesn't impact Core Web Vitals (LCP, FID, CLS)
  - WASM downloads in background while user reads interface
  - WebAssembly compilation happens when browser is idle

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

## UI/UX Guidelines

### Design Principles

- **Clean and Minimal**: Keep interfaces uncluttered and focused on functionality
- **No Search Metrics**: DO NOT display search counts (like "450k searches", "1M+ searches") in tool cards or anywhere in the UI
- **Performance First**: Every UI decision must consider performance impact
- **Mobile-First Design**: Design for mobile first, enhance for desktop

### Component Design Patterns

#### Hero Sections

- Center-aligned text with proper spacing
- Responsive typography scaling (text-3xl sm:text-4xl lg:text-5xl)
- Subtle badge elements for feature highlights
- Mobile-optimized spacing with flex layouts

#### Feature Display Pattern

```tsx
// Desktop: Inline cards
<div className="hidden sm:flex flex-wrap justify-center gap-6 mb-12">
  {features.map((feature) => <FeatureCard />)}
</div>

// Mobile: Compact icons with tap-to-reveal
<div className="sm:hidden space-y-3 mb-8">
  <div className="flex justify-center gap-4">
    {features.map((feature) => <FeatureIcon onClick={() => setActiveFeature(index)} />)}
  </div>
  {activeFeature !== null && <FeatureDetail />}
</div>
```

#### Settings/Configuration Cards

- Card header with gradient: `bg-gradient-to-r from-primary/5 to-transparent`
- Icon + title in header
- Organized sections within card body
- Mobile: Use CollapsibleSection for advanced options
- Desktop: Click-to-expand with chevron rotation

#### File Upload Areas

- Large drop zones with dashed borders
- State-based styling: `isDragging ? 'border-primary bg-primary/10' : 'border-border'`
- Responsive padding: `p-8 sm:p-12`
- Clear action text and supported formats

#### Common Component Patterns

1. **FAQ Component**:

   ```tsx
   // Desktop: 2-column grid
   <div className="hidden md:grid md:grid-cols-2 gap-6">

   // Mobile: Collapsible sections
   <div className="md:hidden space-y-4">
     <CollapsibleSection title={faq.question} defaultOpen={false}>
   ```

2. **Related Tools**:

   - Direction prop for layout control per page
   - Consistent styling with hover states
   - Icon + title + description + chevron

3. **Format Selection**:

   - Visual buttons with format colors
   - Swap functionality between source/target
   - Mobile: Vertical with labels
   - Desktop: Horizontal with centered swap

4. **Quality/Settings Controls**:
   - Preset buttons for common values
   - Slider for fine control
   - Visual feedback (selected state highlighting)
   - Mobile: Grid layout for presets

#### Responsive Patterns

- Mobile-first approach
- Progressive enhancement for larger screens
- Touch-friendly tap targets (min 44px)
- Collapsible sections to save space on mobile

#### Spacing & Layout

- Section separation: `mt-12 pt-12 border-t`
- Card padding: `p-4 sm:p-6`
- Consistent gaps: `gap-2` for tight, `gap-3` for normal, `gap-4` for loose
- Mobile margins: Often smaller than desktop

#### Animation & Performance

- NO decorative animations
- Only functional transitions (hover, active states)
- Use `transition-all duration-300` for smooth interactions
- Prefer transform and opacity for animations

## Common Components Library

### Reusable UI Components

1. **FAQ Component** (`/src/components/ui/FAQ.tsx`)

   - Props: `items: FAQItem[]`, `title?: string`, `className?: string`
   - Responsive: Grid on desktop, collapsible on mobile
   - Usage: Import and pass FAQ items array

2. **RelatedTools Component** (`/src/components/ui/RelatedTools.tsx`)

   - Props: `tools: RelatedTool[]`, `title?: string`, `direction?: 'vertical' | 'horizontal' | 'responsive'`
   - Flexible layout based on direction prop
   - Usage: Import and configure per-page layout needs

3. **CollapsibleSection** (`/src/components/ui/mobile/CollapsibleSection.tsx`)

   - Mobile-optimized collapsible container
   - Props: `title: string`, `defaultOpen?: boolean`, `children`
   - Usage: Wrap content that should be collapsible on mobile

4. **FormatSelect** (`/src/components/ui/format-select.tsx`)
   - Visual format selector with color coding
   - Props: `formats`, `value`, `onChange`, `label?`
   - Usage: For image format selection in converters

### Design Patterns to Follow

When creating new tools:

1. Copy the structure from Image Converter/Compressor/Resizer
2. Use the common FAQ and RelatedTools components
3. Follow the responsive feature display pattern
4. Implement settings cards with gradient headers
5. Use consistent spacing and typography scales
6. Test thoroughly on mobile devices
7. Only use emojis if the user explicitly requests it

## Git Commit Guidelines

### Commit Message Strategy

- Use simple, concise commit messages
- Focus on describing the purpose or impact of the change
- Avoid mentioning AI or Claude Code in commit messages
- Keep commit messages straightforward and clear

## Terminal Commands

- **Always run date command from terminal**
