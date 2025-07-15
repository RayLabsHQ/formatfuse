# PWA Quick Start Guide for FormatFuse

## Prerequisites

Ensure you have the latest version of pnpm and Node.js installed.

## Step 1: Install Dependencies

```bash
# Install Vite PWA plugin and Workbox
pnpm add -D vite-plugin-pwa workbox-window workbox-precaching

# Install PWA assets generator for icons
pnpm add -D @vite-pwa/assets-generator
```

## Step 2: Create Icon Source

Create a high-resolution source icon (at least 512x512px) at `/public/icon-source.svg` or `/public/icon-source.png`.

## Step 3: Generate PWA Assets

Create `pwa-assets.config.js`:

```javascript
import { defineConfig } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: 'minimal',
  images: ['public/icon-source.svg'], // or .png
})
```

Run the generator:

```bash
pnpm pwa-assets-generator
```

## Step 4: Update Vite Configuration

Add to `vite.config.ts`:

```typescript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // ... other plugins
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      manifest: {
        name: 'FormatFuse - Free Online File Converter',
        short_name: 'FormatFuse',
        theme_color: '#3b82f6',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ]
      }
    })
  ]
})
```

## Step 5: Create Update Prompt Component

Create `/src/components/PwaUpdatePrompt.tsx`:

```tsx
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border rounded-lg shadow-lg p-4 max-w-sm">
      <p className="text-sm mb-3">A new version of FormatFuse is available!</p>
      <div className="flex gap-2">
        <button
          onClick={() => updateServiceWorker(true)}
          className="btn btn-primary text-sm"
        >
          Update now
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="btn btn-ghost text-sm"
        >
          Later
        </button>
      </div>
    </div>
  )
}
```

## Step 6: Add Update Prompt to Layout

Add to your main layout:

```tsx
import { PwaUpdatePrompt } from '@/components/PwaUpdatePrompt'

export function Layout() {
  return (
    <>
      {/* Your existing layout */}
      <PwaUpdatePrompt />
    </>
  )
}
```

## Step 7: Create Offline Page

Create `/public/offline.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - FormatFuse</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #09090b;
      color: #fafafa;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 { color: #3b82f6; }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're Offline</h1>
    <p>FormatFuse requires an internet connection for the first visit.</p>
    <p>Once loaded, most tools will work offline!</p>
    <button onclick="location.reload()">Try Again</button>
  </div>
</body>
</html>
```

## Step 8: Test PWA Features

1. Build and preview:
   ```bash
   pnpm build
   pnpm preview
   ```

2. Open Chrome DevTools > Application tab
3. Check Service Worker is registered
4. Test offline mode in Network tab
5. Check Manifest is detected

## Step 9: Lighthouse Audit

Run Lighthouse audit to ensure PWA compliance:
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Check "Progressive Web App"
4. Run audit

## Common Issues & Solutions

### Issue: Service Worker Not Registering
- Ensure HTTPS or localhost
- Check console for errors
- Clear cache and reload

### Issue: Icons Not Showing
- Verify icon paths in manifest
- Check icon file formats
- Ensure proper sizes

### Issue: Update Not Showing
- Make actual changes to trigger update
- Check service worker lifecycle
- Verify update prompt implementation

## Next Steps

1. Implement custom caching strategies for specific tools
2. Add offline indicators to UI
3. Implement background sync for analytics
4. Add push notifications support
5. Create app shortcuts for popular tools