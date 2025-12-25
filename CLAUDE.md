# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm check        # TypeScript type checking
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm format       # Format code with Prettier
pnpm format:check # Check formatting
```

## Architecture Overview

FormatFuse is a privacy-first file conversion tool built with **Astro + React**. All processing happens client-side using WASM libraries - files never leave the browser.

### Tech Stack
- **Astro**: Static generation for 50+ tool pages
- **React**: Interactive components with `client:load` hydration
- **Tailwind CSS v4**: Styling via `@tailwindcss/vite`
- **Web Workers + Comlink**: Offload heavy WASM computation
- **Radix UI**: Headless component primitives

### Key Directories

```
src/
├── components/
│   ├── converters/     # Tool-specific components (ImageConverter, PdfMerge, etc.)
│   ├── ui/             # Reusable UI components (shadcn-style)
│   └── core/           # Low-level components (FileUploader, ProgressBar)
├── pages/
│   ├── tools/          # Individual tool pages
│   ├── convert/        # Dynamic image conversion routes (/convert/png-to-jpg)
│   ├── extract/        # Archive extraction routes
│   └── video-tools/    # Video processing routes
├── workers/            # Web Workers for heavy computation
├── hooks/              # React hooks for tool logic
├── lib/                # Utilities and Comlink wrappers
│   └── archive/        # Archive detection, types, file trees
├── data/               # Tool definitions and static data
└── layouts/            # Astro layout wrappers
```

### Worker Pattern with Comlink

Heavy processing uses Web Workers with Comlink for type-safe RPC:

```typescript
// 1. Worker file (src/workers/my.worker.ts)
class MyWorker {
  async process(data: Uint8Array): Promise<Uint8Array> { ... }
}
Comlink.expose(MyWorker);

// 2. Hook (src/hooks/useMyTool.ts)
const worker = new Worker(new URL("../workers/my.worker.ts", import.meta.url), { type: "module" });
const api = Comlink.wrap<MyWorker>(worker);
const result = await api.process(data);

// 3. Cleanup
api[Comlink.releaseProxy]();
worker.terminate();
```

### Adding a New Tool

1. **Register tool** in `src/data/tools.ts`
2. **Create Astro page** at `src/pages/tools/[tool-name].astro`
3. **Create React component** at `src/components/converters/ToolName.tsx`
4. **Create hook** at `src/hooks/useTool.ts` (if needed)
5. **Create worker** at `src/workers/tool.worker.ts` (for heavy computation)
6. **Add tests** at `tests/workers/tool.test.ts`

### Component Structure Pattern

```tsx
export default function MyConverter() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const { convert, progress, loading, error } = useMyConverter();

  return (
    <>
      <ToolHeader title="..." description="..." />
      <FileDropZone onFilesSelect={handleFiles} />
      <FileList files={files} />
      <FAQ items={faqItems} />
      <RelatedTools tools={relatedTools} />
    </>
  );
}
```

### Path Aliases

Use `@/` for src imports: `import { Button } from "@/components/ui/button"`

### WASM Libraries

These are excluded from Vite optimization and lazy-loaded in workers:
- `@refilelabs/image` - Image conversion
- `@jsquash/*` - Image codecs (PNG, JPEG, WebP, AVIF)
- `7z-wasm` - Archive compression
- `libarchive-wasm` - Archive extraction
- `mediabunny` - Video processing
- `@neslinesli93/qpdf-wasm` - PDF operations

### File Size Validation

Use `filterFilesBySize` from `@/lib/utils` to validate file sizes before processing.

### Testing

Tests use Vitest with happy-dom. Fixtures are in `tests/fixtures/`. Run a single test file with:
```bash
pnpm test tests/workers/image-converter-basic.test.ts
```
