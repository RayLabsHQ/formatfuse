# Archive Extraction Pipeline

_Last updated: 2025-09-24_

## Overview

The archive tools now run entirely in-browser via a dedicated worker that orchestrates multiple extraction engines. This document explains the end-to-end flow, the supporting utilities, and the maintenance routines required to keep the experience reliable across formats and devices.

```
File input (UI) ──▶ useArchiveExtractor hook ──▶ archive-extractor.worker ──▶
  ├─ format detection (lib/archive/detect)
  ├─ single-file decoders (gzip)
  ├─ libarchive-wasm (general containers)
  └─ 7z-wasm (encrypted / exotic containers)
```

## Components

### Format detection helpers (`src/lib/archive/`)

- `types.ts` defines the shared domain types (`ArchiveFormat`, `ArchiveEngine`, `ExtractResult`, etc.).
- `detect.ts` inspects both filename and magic bytes to categorize an upload, including special handling for TAR.* combinations and ISO signatures.
- `inferOutputName()` normalises output filenames when the archive is effectively a compressed single file.

### Worker (`src/workers/archive-extractor.worker.ts`)

- Runs inside a `Comlink` worker context; exported class is also directly instantiable for Node-based Vitest specs.
- Worker itself spins up on first user interaction (hover/focus on the drop-zone or during the initial extract attempt) so the main bundle stays lightweight; each engine (libarchive / 7-Zip) is then initialised on demand and cached per worker instance.
- Pipeline:
  1. Detect format and choose strategy.
  2. For gzip streams, decode directly via `pako`. All other single-compression formats are routed through 7-Zip so we can rely on its mature filters.
  3. For multi-file archives, decide start engine via `shouldTryLibarchiveFirst()`. Retry sequence: primary engine → alternate engine, turning password errors into recoverable prompts.
  4. Wrap extracted entries with transferable `ArrayBuffer`s before posting the result back to the main thread.
- Error handling intentionally surfaces user-facing strings and analytics metadata (`PASSWORD_REQUIRED`, `UNSUPPORTED_FORMAT`, etc.) instead of generic WASM traps.
- Cleanup routines remove temporary files from the Emscripten FS to keep memory footprint predictable between requests.

### Hook (`src/hooks/useArchiveExtractor.ts`)

- A thin wrapper for instantiating the worker in React components.
- Ensures Comlink proxies are released and workers terminated on unmount to avoid zombie threads (important on mobile Safari).

### Generic UI (`src/components/converters/GenericArchiveExtractor.tsx`)

- The single React implementation for all archive tools. Specialised extractors merely pass format-specific copy and accepted file extensions.
- Responsibilities:
  - Manage user inputs (drop zone, file picker) and push requests to the hook.
  - Show engine metadata, warnings, and selection controls for downloads.
  - Handle password prompts with retries using the worker’s `PASSWORD_REQUIRED` signal.
  - Provide mobile-ready layout with collapsible sections and list virtualization-friendly markup.

### Specialised wrappers

- `SevenZipExtractor.tsx`, `RarExtractor.tsx`, `UniversalExtractor.tsx` all delegate to the generic extractor, supplying customised FAQs, features, and related tool lists.

## Analytics & Telemetry

- All error branches call `captureError` with payload `{ tool, format, fileName, stage, engine? }` so PostHog dashboards can distinguish client errors from unsupported formats.
- Consider adding explicit `track()` events around password prompts if we need funnel visibility.

## Testing

- **Worker spec**: `tests/workers/archive-extractor.worker.test.ts` runs in the Node environment and covers
  - single-file compression (`single.txt.bz2`),
  - multi-file ZIP via libarchive,
  - native 7Z extraction,
  - password prompts using the prebuilt `protected.7z` fixture.
- **Meta test**: `tests/workers/archive-tools.test.ts` ensures the worker spec stays registered.
- **Fixtures** located in `tests/fixtures/archives/` — regenerate via scripts or manual commands if formats change.
- When adding new formats, update both the detection tables and extend the worker spec with corresponding fixtures.

## Maintenance Guidelines

1. **Adding formats**
   - Update signature/ext tables in `detect.ts`.
   - Decide which engine is authoritative; add fallbacks and error messaging accordingly.
   - Supply fixtures + tests and document any new dependencies.

2. **Upgrading libarchive or 7z WASM**
   - Replace the `.wasm` files under `public/` (for libarchive) or rely on the npm package (7z-wasm ships its binary).
   - Re-run worker tests on Node and browsers (Chrome + Safari) to verify memory behaviour.
   - Watch bundle size; 7z-wasm is ~1.7 MB compressed.

3. **Password UX tweaks**
   - Maintain the worker contract: returning `{ ok: false, code: "PASSWORD_REQUIRED" }` is the trigger; the UI handles modals.
   - If you add multi-factor prompts (e.g., repeated failure messaging), implement them in the React layer without changing worker semantics.

4. **Memory management**
   - The worker clears Emscripten directories after each extraction, but large archives still consume browser memory while unzipped. If you stream results in future, gate the download UI accordingly.

5. **Accessibility & Mobile**
   - Button and dialog components inherit the shared design system; confirm focus management whenever new interactions are introduced.
   - Run manual tests on Safari iOS where worker shutdown delays can occur.

## Known Limitations

- Streaming extraction isn’t implemented; large archives require full buffering. Consider chunked iteration if required.
- 7-Zip handles BZ2/XZ fallbacks; if those formats ever need native decoding again, revisit the previous WASM codec options.
- ISO support via 7z isn’t exhaustive; special UDF features may still fail and are reported as `UNSUPPORTED_FORMAT`.

## Useful Commands

```bash
# Run only the archive worker tests
pnpm test tests/workers/archive-extractor.worker.test.ts

# Run the entire archive suite (meta + worker + operations)
pnpm test "tests/workers/archive-*.test.ts"

# Quickly inspect format detection in the REPL
node --experimental-repl-await <<'NODE'
const { detectArchiveFormat } = await import('./src/lib/archive/detect.ts');
const fs = await import('node:fs');
const buf = fs.readFileSync('tests/fixtures/archives/sample.7z');
console.log(detectArchiveFormat(new Uint8Array(buf), 'sample.7z'));
NODE
```
