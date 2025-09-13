// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import opengraphImages from "astro-opengraph-images";
import { toolOGImage } from "./src/og-image-renderer.tsx";
import partytown from "@astrojs/partytown";
import llmsTxt from "./src/integrations/llms-txt.ts";
import AstroPWA from "@vite-pwa/astro";
import fs from "fs";

// https://astro.build/config
export default defineConfig({
  site: "https://formatfuse.com",
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes("/404"),
    }),
    opengraphImages({
      options: {
        fonts: [
          {
            name: "Inter",
            weight: 400,
            style: "normal",
            data: fs.readFileSync(
              "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
            ),
          },
          {
            name: "Inter",
            weight: 700,
            style: "normal",
            data: fs.readFileSync(
              "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
            ),
          },
          {
            name: "Inter",
            weight: 900,
            style: "normal",
            data: fs.readFileSync(
              "node_modules/@fontsource/inter/files/inter-latin-900-normal.woff",
            ),
          },
        ],
      },
      render: toolOGImage,
    }),
    partytown({
      // GTM-MJKP526Z configuration
      config: {
        debug: false,
        forward: ["dataLayer.push"],
      },
    }),
    llmsTxt(),
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
        display_override: ['window-controls-overlay', 'standalone'],
        // Set minimum window size for PWA
        launch_handler: {
          client_mode: ['navigate-existing', 'auto']
        },
        // Experimental feature for window controls
        window_controls_overlay: {
          theme_color: '#3b82f6',
          background_color: '#09090b'
        },
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
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'PDF Tools',
            short_name: 'PDF',
            description: 'PDF conversion and editing',
            url: '/tools#pdf',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Color Converter',
            short_name: 'Colors',
            description: 'Convert between color formats',
            url: '/tools/color-converter',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          }
        ],
        categories: ['productivity', 'utilities']
      },
      workbox: {
        // Use the actual offline HTML file shipped in /public
        navigateFallback: '/offline.html',
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff,woff2}'],
        // Exclude WASM files from precaching, they'll be cached at runtime
        globIgnores: ['**/*.wasm'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        // Increase the maximum file size limit to 5MB for other files
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Don't show warnings for empty globs in development
        disableDevLogs: true,
        runtimeCaching: [
          {
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 7 * 24 * 60 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true, // Enable in dev for testing
        navigateFallbackAllowlist: [/^\/$/],
        type: 'module',
        suppressWarnings: true
      },
      experimental: {
        directoryAndTrailingSlashHandler: true
      }
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: [
        "@refilelabs/image",
        "@jsquash/avif",
        "@jsquash/jpeg",
        "@jsquash/png",
        "@jsquash/webp",
      ],
    },
    worker: {
      format: "es",
    },
    server: {
      headers: {
        // Keep dev CSP aligned with meta tag in Layout
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://scripts.simpleanalyticscdn.com https://eu.i.posthog.com; connect-src 'self' https://queue.simpleanalyticscdn.com https://eu.i.posthog.com; img-src 'self' data: blob: https://queue.simpleanalyticscdn.com https://simpleanalyticsbadges.com https://eu.i.posthog.com; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; font-src 'self' https://fonts.gstatic.com; frame-src 'self';",
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Only include JSON highlighting
            "shiki-json": ["shiki/langs/json.mjs"],
            // Group UI libraries for JSON formatter
            "ui-libs": ["@radix-ui/react-dialog", "@radix-ui/react-select"],
          },
        },
      },
    },
    assetsInclude: ["**/*.wasm"],
  },
});
