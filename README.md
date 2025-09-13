# FormatFuse

Fast, privacy-first file conversion platform built with Astro and React. All conversions happen directly in your browser - no uploads, no waiting, complete privacy.

## Features

- 🚀 **Lightning Fast** - WebAssembly-powered conversions in milliseconds
- 🔒 **100% Private** - Files never leave your browser
- 📱 **Mobile-First** - Optimized for all devices with responsive layouts
- 🎨 **Modern UI** - Clean, minimalist design with smooth interactions
- 🔍 **Smart Search** - Fuzzy search to quickly find tools
- 🌓 **Dark Mode** - Easy on the eyes, day or night
- 🎯 **Performance Focused** - Zero animations, instant feedback
- 📦 **Batch Processing** - Convert multiple files at once

## Tech Stack

- **Framework**: [Astro](https://astro.build) with React integration
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) with oklch colors
- **UI Components**: [Radix UI](https://radix-ui.com) primitives
- **Icons**: [Lucide React](https://lucide.dev)
- **Processing**: WebAssembly (Rust) with Web Workers
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (v10.8.1+)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/formatfuse.git
cd formatfuse

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Visit `http://localhost:4321` to see the app running.

### Available Scripts

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run Astro CLI commands
pnpm astro [command]
```

## Project Structure

```
/src
├── components/
│   ├── converters/         # Tool-specific conversion components
│   ├── ui/                 # Reusable UI components
│   │   ├── FAQ.tsx         # Common FAQ component
│   │   ├── RelatedTools.tsx # Related tools section
│   │   ├── mobile/         # Mobile-optimized components
│   │   └── format-select.tsx # Format selector component
│   ├── Navigation.tsx      # Main navigation with fuzzy search
│   ├── Hero.tsx            # Landing page hero section
│   ├── ToolGrid.tsx        # Popular tools showcase
│   └── AllToolsGrid.tsx    # Complete tools listing
├── pages/
│   ├── index.astro         # Landing page
│   ├── tools.astro         # All tools page
│   └── convert/            # Dynamic tool pages
├── workers/                # Web Workers for processing
├── lib/                    # Core utilities and converters
├── hooks/                  # React hooks
├── styles/
│   └── global.css          # Global styles and CSS variables
└── layouts/
    └── Layout.astro        # Base layout template
```

## Features Implemented

### Core Features

- ✅ Modern, performant landing page
- ✅ Soft, organic color palette with dark mode support
- ✅ Fuzzy search across all tools
- ✅ Responsive navigation with mobile-optimized menu
- ✅ Tool cards without search metrics (clean design)
- ✅ Category filtering system
- ✅ Mobile-first responsive design
- ✅ Reusable component architecture

### Tools Ready

- ✅ Image Converter (full format support with WASM)
- ✅ Image Compressor (with quality presets)
- ✅ Image Resizer (with preset dimensions)
- ✅ PDF to Word converter (with WASM processing)
- ✅ Background Remover
- ✅ QR Code Generator
- ✅ Base64 Encoder/Decoder
- ✅ JSON Formatter
- ⏳ JPG to PDF (Basic implementation)
- ⏳ PDF Merge (UI ready, implementation pending)
- ⏳ PDF Split (Not implemented)

## Design Philosophy

- **Performance First**: Every decision prioritizes speed and efficiency
- **Privacy by Design**: No server uploads, everything processes client-side
- **Mobile-First**: Designed for touch interfaces, enhanced for desktop
- **Accessible**: Clean, readable design with proper contrast ratios
- **Zero Animations**: No animations for maximum performance
- **Component Reusability**: Shared components across all tools

### UI/UX Principles

1. **Clean and Minimal**: Uncluttered interfaces focused on functionality
2. **No Search Metrics**: Clean tool cards without search volume indicators
3. **Responsive Features**:
   - Desktop: Full feature display with hover states
   - Mobile: Compact icon view with tap-to-reveal details
4. **Consistent Patterns**:
   - Settings cards with gradient headers
   - Collapsible sections on mobile
   - FAQ grid on desktop, accordion on mobile
   - Related tools with flexible layout options

## Color System

The project uses oklch color space for better color consistency:

```css
/* Light theme */
--background: oklch(0.98 0.01 73); /* Soft cream */
--primary: oklch(0.72 0.12 285); /* Soft lavender */
--accent: oklch(0.78 0.1 152); /* Soft mint */

/* Dark theme */
--background: oklch(0.15 0.02 285); /* Deep purple-gray */
--primary: oklch(0.78 0.15 285); /* Bright lavender */
--accent: oklch(0.72 0.12 152); /* Bright mint */
```

## Performance Targets

- First paint: <1.5s
- Tool ready: <2s
- Lighthouse score: >90
- Core Web Vitals: All green

## Documentation

- [Design Guidelines](docs/DESIGN-GUIDELINES.md) - Comprehensive UI/UX patterns and component guidelines
- [CLAUDE.md](CLAUDE.md) - Development guidelines and project-specific instructions
- [Future Roadmap](docs/FUTURE-ROADMAP.md) - Planned features and improvements

## Cloudflare Pages (PostHog Error Tracking)

To get readable stack traces in PostHog from Cloudflare Pages builds, upload source maps during the Pages build.

- Environment variables (Project → Settings → Environment variables):
  - `POSTHOG_CLI_ENV_ID` – your PostHog project ID
  - `POSTHOG_CLI_TOKEN` – personal API key with error tracking write scope.
  - `POSTHOG_CLI_HOST` – `https://eu.posthog.com` (EU region)

- Build command (Project → Settings → Build):
  - Option A (add CLI to PATH for this build):
    - `curl --proto '=https' --tlsv1.2 -LsSf https://github.com/PostHog/posthog/releases/latest/download/posthog-cli-installer.sh | sh && source $HOME/.posthog/env && pnpm build && pnpm run postbuild:posthog`
  - Option B (call the installed binary directly, no PATH changes):
    - `curl --proto '=https' --tlsv1.2 -LsSf https://github.com/PostHog/posthog/releases/latest/download/posthog-cli-installer.sh | sh && pnpm build && pnpm run postbuild:posthog`
    - The package scripts are configured to call `$HOME/.posthog/posthog-cli` directly and run a prepare step to fix pdf.worker sourcemap references before injection.

- Output directory: `dist`

- What the scripts do:
  - `pnpm run postbuild:posthog:inject` → injects PostHog chunk metadata into `dist/_astro`
  - `pnpm run postbuild:posthog:upload` → uploads the modified assets and deletes `.map` files locally

- CSP reminder:
  - Ensure `connect-src` allows `https://eu.i.posthog.com https://eu-assets.i.posthog.com https://*.posthog.com` and `https://scripts.simpleanalyticscdn.com` if you use Simple Analytics.
  - This repo sets CSP via the main layout; if you also set headers in Cloudflare, keep them consistent.

- Verify:
  - Trigger an error in production (e.g., `throw new Error('PostHog test')` in console) and check Network for requests to `https://eu.i.posthog.com/capture/`.
  - In PostHog’s Error Tracking, confirm events and readable stack traces.

## Contributing

Contributions are welcome! Please read our [Design Guidelines](docs/DESIGN-GUIDELINES.md) before implementing new features to ensure consistency.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Astro](https://astro.build)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Icons from [Lucide](https://lucide.dev)
