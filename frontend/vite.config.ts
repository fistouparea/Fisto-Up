import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'AgriAI - फसल जाँच',
        short_name: 'AgriAI',
        description: 'फसल की फोटो से बीमारी और इलाज जानें',
        lang: 'hi',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f0fdf4',
        theme_color: '#15803d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache the app shell only; diagnosis results must always come from the server.
        navigateFallbackDenylist: [/^\/api\//],
        // Push + notification-click handlers (public/push-sw.js).
        importScripts: ['push-sw.js'],
        // Fonts are cached on first use (not precached, which would download them twice on slow networks).
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  server: {
    // Lets a phone on the same Wi-Fi use one address for both the app and the API.
    proxy: { '/api': 'http://localhost:4000' },
  },
  preview: {
    proxy: { '/api': 'http://localhost:4000' },
    // Allows a free Cloudflare HTTPS tunnel, needed to test "install app" on a phone.
    allowedHosts: ['.trycloudflare.com'],
  },
});
