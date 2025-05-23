// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',               // ← чтобы пути работали из любого подкаталога GH Pages
  plugins: [
    react(),

    // Плагин автоматически создаст service-worker и подключит манифест
    VitePWA({
      registerType: 'autoUpdate',      // фоновые auto-обновления SW
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'favicon.ico'
      ],
      manifest: {
        name: 'Penalty Tracker',
        short_name: 'Penalties',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#6366f1',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // что именно положить в off-line кэш
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}']
      }
    })
  ]
});
