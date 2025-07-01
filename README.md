# FormatFuse

Fast, privacy-first file conversion platform built with Astro and React. All conversions happen directly in your browser - no uploads, no waiting, complete privacy.

## Features

- 🚀 **Lightning Fast** - WebAssembly-powered conversions in milliseconds
- 🔒 **100% Private** - Files never leave your browser
- 📱 **Responsive** - Works perfectly on desktop and mobile
- 🎨 **Modern UI** - Clean, minimalist design with smooth interactions
- 🔍 **Smart Search** - Fuzzy search to quickly find tools
- 🌓 **Dark Mode** - Easy on the eyes, day or night

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
│   ├── converters/     # Tool-specific conversion components
│   ├── ui/             # Reusable UI components
│   ├── Navigation.tsx  # Main navigation with fuzzy search
│   ├── Hero.tsx        # Landing page hero section
│   ├── ToolGrid.tsx    # Popular tools showcase
│   └── AllToolsGrid.tsx # Complete tools listing
├── pages/
│   ├── index.astro     # Landing page
│   ├── tools.astro     # All tools page
│   └── convert/        # Dynamic tool pages
├── styles/
│   └── global.css      # Global styles and CSS variables
└── layouts/
    └── Layout.astro    # Base layout template
```

## Features Implemented

### Core Features

- ✅ Modern, performant landing page
- ✅ Soft, organic color palette with dark mode support
- ✅ Fuzzy search across all tools
- ✅ Responsive navigation with dropdowns
- ✅ Tool cards with search volume indicators
- ✅ Category filtering system

### Tools Ready

- ✅ PDF to Word converter (with WASM processing)
- ⏳ JPG to PDF (UI ready, WASM pending)
- ⏳ PDF Merge (UI ready, WASM pending)

## Design Philosophy

- **Performance First**: Every decision prioritizes speed and efficiency
- **Privacy by Design**: No server uploads, everything processes client-side
- **Accessible**: Clean, readable design with proper contrast ratios
- **Minimal Animations**: Subtle transitions that don't impact performance

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Astro](https://astro.build)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Icons from [Lucide](https://lucide.dev)
