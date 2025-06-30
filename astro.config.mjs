// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import opengraphImages from 'astro-opengraph-images';
import { toolOGImage } from './src/og-image-renderer.tsx';
import partytown from '@astrojs/partytown';
import fs from 'fs';

// https://astro.build/config
export default defineConfig({
	site: 'https://formatfuse.com',
	integrations: [
		react(), 
		sitemap({
			filter: (page) => !page.includes('/404')
		}),
		opengraphImages({
			options: {
				fonts: [
					{
						name: 'Inter',
						weight: 400,
						style: 'normal',
						data: fs.readFileSync('node_modules/@fontsource/inter/files/inter-latin-400-normal.woff'),
					},
					{
						name: 'Inter',
						weight: 700,
						style: 'normal',
						data: fs.readFileSync('node_modules/@fontsource/inter/files/inter-latin-700-normal.woff'),
					},
					{
						name: 'Inter',
						weight: 900,
						style: 'normal',
						data: fs.readFileSync('node_modules/@fontsource/inter/files/inter-latin-900-normal.woff'),
					},
				],
			},
			render: toolOGImage,
		}),
		partytown({
			// GTM-MJKP526Z configuration
			config: {
				debug: false,
				forward: ['dataLayer.push']
			}
		})
	],
	vite: {
		plugins: [tailwindcss()],
		optimizeDeps: {
			exclude: ['@refilelabs/image', '@jsquash/avif', '@jsquash/jpeg', '@jsquash/png', '@jsquash/webp']
		},
		worker: {
			format: 'es'
		},
		server: {
			headers: {
				'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline';"
			}
		},
		build: {
			rollupOptions: {
				output: {
					manualChunks: {
						// Only include JSON highlighting
						'shiki-json': ['shiki/langs/json.mjs'],
						// Group UI libraries for JSON formatter
						'ui-libs': ['@radix-ui/react-dialog', '@radix-ui/react-select']
					}
				}
			}
		},
		assetsInclude: ['**/*.wasm']
	}
});
