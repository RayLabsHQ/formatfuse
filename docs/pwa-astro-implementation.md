# FormatFuse PWA Implementation for Astro

## Overview

This document provides Astro-specific PWA implementation using `@vite-pwa/astro` integration with Workbox. Since Astro uses Vite under the hood, we can leverage Vite PWA plugin through the official Astro integration.

## Why PWA for FormatFuse Astro Site?

1. **Perfect for Static Sites**: Astro's static generation pairs perfectly with PWA caching
2. **Island Architecture**: PWA caches work great with Astro's partial hydration
3. **Performance Boost**: Combine Astro's fast builds with offline capability
4. **SEO + PWA**: Maintain Astro's excellent SEO while adding app features

## Installation

```bash
# Install the Astro PWA integration
pnpm add -D @vite-pwa/astro

# Install PWA assets generator
pnpm add -D @vite-pwa/assets-generator

# Install Workbox for advanced features (optional)
pnpm add -D workbox-window workbox-precaching
```

## Step 1: Update Astro Config

Update `astro.config.mjs`:

```javascript
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import AstroPWA from "@vite-pwa/astro";

export default defineConfig({
  site: "https://formatfuse.com",
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes("/404"),
    }),
    // Add PWA integration
    AstroPWA({
      mode: 'production',
      base: '/',
      scope: '/',
      includeAssets: ['favicon.ico', 'robots.txt', 'logo.svg'],
      registerType: 'prompt',
      manifest: {
        name: 'FormatFuse - Free Online File Converter',
        short_name: 'FormatFuse',
        description: 'Convert images, PDFs, and files instantly in your browser. Privacy-first, no uploads required.',
        theme_color: '#3b82f6',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Image Converter',
            short_name: 'Images',
            description: 'Convert between image formats',
            url: '/tools/image-converter',
            icons: [{ src: '/shortcuts/image-icon.png', sizes: '96x96' }]
          },
          {
            name: 'PDF Tools',
            short_name: 'PDF',
            description: 'PDF conversion and editing',
            url: '/tools#pdf',
            icons: [{ src: '/shortcuts/pdf-icon.png', sizes: '96x96' }]
          },
          {
            name: 'Color Converter',
            short_name: 'Colors',
            description: 'Convert between color formats',
            url: '/tools/color-converter',
            icons: [{ src: '/shortcuts/color-icon.png', sizes: '96x96' }]
          }
        ],
        categories: ['productivity', 'utilities']
      },
      workbox: {
        navigateFallback: '/offline',
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff,woff2,wasm}'],
        // Clean old caches
        cleanupOutdatedCaches: true,
        // Claim clients immediately
        clientsClaim: true,
        // Skip waiting on update
        skipWaiting: false, // We want user prompt
        runtimeCaching: [
          {
            // Cache WASM files with CacheFirst
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache fonts
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
              }
            }
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          },
          {
            // Network first for API/dynamic content
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60 // 5 minutes
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false, // Enable in dev for testing
        navigateFallbackAllowlist: [/^\/$/],
        type: 'module'
      },
      experimental: {
        directoryAndTrailingSlashHandler: true
      }
    }),
    // ... other integrations
  ],
  vite: {
    plugins: [tailwindcss()],
    // ... rest of vite config
  },
});
```

## Step 2: Create PWA Assets

Create `pwa-assets.config.js`:

```javascript
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023'
  },
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [512],
      padding: 0.05,
      resizeOptions: {
        background: '#09090b'
      }
    },
    apple: {
      sizes: [180],
      padding: 0.05,
      resizeOptions: {
        background: '#09090b'
      }
    }
  },
  images: ['public/logo.svg']
})
```

Run asset generation:

```bash
pnpm pwa-assets-generator
```

## Step 3: Create Offline Page

Create `public/offline.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - FormatFuse</title>
  <link rel="icon" type="image/svg+xml" href="/logo.svg">
  <style>
    :root {
      --bg: #09090b;
      --fg: #fafafa;
      --primary: #3b82f6;
      --muted: #71717a;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--fg);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    
    .container {
      text-align: center;
      max-width: 400px;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 2rem;
    }
    
    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
      color: var(--primary);
    }
    
    p {
      color: var(--muted);
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    
    .button {
      background: var(--primary);
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    
    .button:hover {
      opacity: 0.9;
    }
    
    .cached-tools {
      margin-top: 3rem;
      padding-top: 3rem;
      border-top: 1px solid #27272a;
    }
    
    .cached-tools h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    
    .tools-grid {
      display: grid;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    
    .tool-link {
      padding: 0.75rem;
      background: #18181b;
      border-radius: 0.5rem;
      text-decoration: none;
      color: var(--fg);
      transition: background 0.2s;
    }
    
    .tool-link:hover {
      background: #27272a;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="/logo.svg" alt="FormatFuse" class="logo">
    <h1>You're Offline</h1>
    <p>No internet connection detected. Some features may be limited, but many tools still work offline!</p>
    <button class="button" onclick="location.reload()">Try Again</button>
    
    <div class="cached-tools">
      <h2>Available Offline</h2>
      <p>These tools should work without internet:</p>
      <div class="tools-grid">
        <a href="/tools/image-converter" class="tool-link">Image Converter</a>
        <a href="/tools/color-converter" class="tool-link">Color Converter</a>
        <a href="/tools/json-formatter" class="tool-link">JSON Formatter</a>
        <a href="/tools/base64-encoder" class="tool-link">Base64 Encoder</a>
      </div>
    </div>
  </div>
</body>
</html>
```

## Step 4: Create Update Prompt Component

Create `src/components/PwaUpdatePrompt.tsx`:

```tsx
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState, useEffect } from 'react';

export function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('SW registered:', swUrl);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const [showOfflineReady, setShowOfflineReady] = useState(false);

  useEffect(() => {
    if (offlineReady) {
      setShowOfflineReady(true);
      setTimeout(() => {
        setShowOfflineReady(false);
        setOfflineReady(false);
      }, 4000);
    }
  }, [offlineReady, setOfflineReady]);

  const close = () => {
    setNeedRefresh(false);
  };

  return (
    <>
      {/* Update available prompt */}
      {needRefresh && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4">
          <div className="bg-card border rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Update Available!</h3>
                <p className="text-sm text-muted-foreground">
                  A new version of FormatFuse is available with improvements and new features.
                </p>
              </div>
              <button
                onClick={close}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => updateServiceWorker(true)}
                className="btn btn-primary btn-sm flex-1"
              >
                Update now
              </button>
              <button
                onClick={close}
                className="btn btn-ghost btn-sm flex-1"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline ready notification */}
      {showOfflineReady && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4">
          <div className="bg-card border rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm">FormatFuse is ready to work offline!</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

## Step 5: Add PWA Prompt to Layout

Since this is an Astro site, add the component to your layout. Create or update `src/layouts/Layout.astro`:

```astro
---
import { PwaUpdatePrompt } from '../components/PwaUpdatePrompt';
// ... other imports
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- ... existing head content ... -->
    <!-- PWA meta tags will be auto-injected by @vite-pwa/astro -->
  </head>
  <body>
    <!-- ... existing body content ... -->
    
    <!-- Add PWA Update Prompt (only on client) -->
    <PwaUpdatePrompt client:only="react" />
  </body>
</html>
```

## Step 6: Install Prompt Component

Create `src/components/PwaInstallPrompt.tsx`:

```tsx
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 30 seconds or 3 page views
      const visits = parseInt(localStorage.getItem('ff_visits') || '0') + 1;
      localStorage.setItem('ff_visits', visits.toString());
      
      if (visits >= 3) {
        setTimeout(() => setShowInstallPrompt(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      localStorage.setItem('ff_visits', '0');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Ask again after 7 days
    localStorage.setItem('ff_install_dismissed', Date.now().toString());
  };

  if (!showInstallPrompt || !deferredPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="bg-card border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3 mb-3">
          <img src="/pwa-64x64.png" alt="FormatFuse" className="w-12 h-12 rounded-lg" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Install FormatFuse</h3>
            <p className="text-sm text-muted-foreground">
              Install our app for faster access and offline use
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="btn btn-primary btn-sm flex-1"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="btn btn-ghost btn-sm flex-1"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Step 7: Types for Virtual Module

Create `src/types/pwa.d.ts`:

```typescript
/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:pwa-register/react' {
  import type { Dispatch, SetStateAction } from 'react'

  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: any) => void
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>]
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}
```

## Testing Your PWA

1. **Build and Preview**:
   ```bash
   pnpm build
   pnpm preview
   ```

2. **Chrome DevTools Testing**:
   - Open DevTools > Application tab
   - Check "Service Workers" section
   - Test "Offline" mode
   - Check "Manifest" section
   - Run Lighthouse PWA audit

3. **Test Installation**:
   - Look for install icon in address bar
   - Test custom install prompt
   - Verify app opens standalone

## Astro-Specific Considerations

1. **Static Routes**: All Astro static routes are automatically precached
2. **Dynamic Routes**: Use `workbox.navigateFallback` for client-side routing
3. **Island Hydration**: PWA works seamlessly with Astro islands
4. **Build Output**: PWA files are generated in `dist/` after build

## Performance Tips

1. **Selective Caching**: Don't cache everything - be strategic
2. **WASM Loading**: Use runtime caching for WASM files
3. **Update Strategy**: Use prompt to let users control updates
4. **Cache Limits**: Set reasonable limits to avoid quota issues

## Next Steps

1. Customize caching strategies per tool
2. Add offline indicators to UI
3. Implement background sync for analytics
4. Add web share target for file sharing
5. Consider push notifications for new features