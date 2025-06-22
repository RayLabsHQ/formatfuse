// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://formatfuse.com',
	integrations: [
		react(), 
		sitemap({
			filter: (page) => !page.includes('/404')
		})
	],
	vite: {
		plugins: [tailwindcss()],
		optimizeDeps: {
			exclude: ['@refilelabs/image']
		},
		worker: {
			format: 'es'
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
		}
	}
});
